import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger, db } from "../config/admin";
import { PAGARME_API_KEY, PAGARME_BASE_URL } from "../config/params";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import { PagarmeOrderService } from "../services/PagarmeOrderService";
import {
  CreateOrderPlatformRequestDto,
  PagarmeV5OrderResponse,
} from "../types/dto/pagarmeOrder.dto";
import { PaymentCalculator } from "../utils/PaymentCalculator";
import {
  OrderBuildContext,
  PagarmeOrderPayloadBuilder,
} from "../builders/orderPayloadBuilder";
import { initialFromPagarme } from "../mappers/orderMapper";
import { OrderDto } from "../types/dto/orderSummary.dto";

/**
 * Callable – cria pedido na Pagar.me e grava rascunho no Firestore
 */
export const createOrder = onCall<CreateOrderPlatformRequestDto>(
  {
    region: "southamerica-east1",
    memory: "512MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<any> => {
    /* ---------------- Validação & Auth ---------------- */
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Usuário não autenticado.");

    const {
      method,
      items,
      tournamentId,
      card,
      installments = 1,
    } = request.data ?? ({} as Partial<CreateOrderPlatformRequestDto>);

    if (!tournamentId || !items?.length)
      throw new HttpsError("invalid-argument", "Campos obrigatórios: items[], tournamentId.");

    if (!["pix", "credit_card"].includes(method as string))
      throw new HttpsError("invalid-argument", "method deve ser 'pix' ou 'credit_card'.");

    if (
      method === "credit_card" &&
      (installments < 1 || installments > PaymentCalculator.MAX_INSTALLMENTS)
    ) {
      throw new HttpsError(
        "invalid-argument",
        `installments deve ser entre 1 e ${PaymentCalculator.MAX_INSTALLMENTS}.`
      );
    }

    /* ---------------- Busca dados do comprador ---------------- */
    const buyerSnap = await db.collection("users").doc(uid).get();
    const customerId = buyerSnap.get("customerId") as string | undefined;
    if (!customerId)
      throw new HttpsError("failed-precondition", "Usuário sem customerId cadastrado.");

    /* ---------------- Busca dados do organizador ---------------- */
    const tournamentSnap = await db.collection("tournaments").doc(tournamentId).get();
    const organizerId = tournamentSnap.get("organizerId") as string | undefined;
    if (!organizerId)
      throw new HttpsError("failed-precondition", "Torneio sem organizerId definido.");

    const organizerSnap = await db.collection("users").doc(organizerId).get();
    const ownerRid = organizerSnap.get("recipientId") as string | undefined;
    if (!ownerRid)
      throw new HttpsError("failed-precondition", "Organizador sem recipientId definido.");

    /* ---------------- Monta payload para Pagar.me ---------------- */
    const buildCtx: OrderBuildContext = {
      buyerCustomerId: customerId,
      ownerRecipientId: ownerRid,
    };

    const builder = new PagarmeOrderPayloadBuilder(
      {
        method,
        items,
        userId: uid,
        tournamentId,
        card,
        installments,
      } as CreateOrderPlatformRequestDto,
      buildCtx
    );

    let payload;
    try {
      payload = builder.build();
      // metadados úteis para rastreamento
      payload.metadata = {
        firestoreUserId: uid,
        tournamentId,
        createdAt: Date.now(),
      };
    } catch (err: any) {
      logger.warn("Payload builder validation failed", { err: err.message });
      throw new HttpsError("invalid-argument", err.message);
    }

    /* ---------------- Chama Pagar.me ---------------- */
    const apiKey = PAGARME_API_KEY.value();
    const baseUrl = PAGARME_BASE_URL.value();
    if (!apiKey || !baseUrl)
      throw new HttpsError("internal", "Config Pagar.me não definida.");

    const pagarmeSvc = new PagarmeOrderService(new PagarmeApiClient(apiKey, baseUrl));

    let resp: PagarmeV5OrderResponse;
    try {
      resp = await pagarmeSvc.createOrder(payload);
    } catch (err: any) {
      logger.error("Erro ao criar pedido na Pagar.me", err);
      const msg =
        err?.response?.data?.errors?.[0]?.message || err.message || "Falha ao criar pedido.";
      throw new HttpsError("internal", msg);
    }

    /* ---------------- Grava rascunho no Firestore ---------------- */
    try {
      const fullDoc: OrderDto & { user_id: string; createdAt: any } = initialFromPagarme(resp, {
        userId: uid,
        tournamentId,
      });
      await db.collection("orders").doc(resp.id).set(fullDoc, { merge: true });
    } catch (err) {
      logger.error("Erro ao gravar pedido no Firestore", err);
    }

    /* ---------------- Resposta ao front ---------------- */
    const tx = resp.charges?.[0]?.last_transaction ?? {};
    return {
      orderId: resp.id,
      status: resp.status,
      amount: resp.amount,
      ...(method === "pix"
        ? {
            pixQrCode: tx.qr_code,
            pixQrCodeUrl: tx.qr_code_url,
            expiresAt: tx.expires_at,
          }
        : {
            paidAt: tx.paid_at,
            transactionType: tx.transaction_type,
          }),
    };
  }
);