// src/functions/createOrder.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger, db } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import {
  PAGARME_API_KEY,
  PAGARME_BASE_URL,
  PLATFORM_RECIPIENT_ID,
  PLATFORM_FEE_PERCENTAGE,
} from "../config/params";
import { PagarmeOrderService } from "../services/PagarmeOrderService";
import {
  CreateOrderPlatformRequestDto,
  PagarmeV5OrderPayload,
  PagarmeV5OrderResponse,
  SplitRuleDto,
} from "../types/dto/pagarmeOrder.dto";

export const createOrder = onCall<CreateOrderPlatformRequestDto>(
  {
    region: "southamerica-east1",
    memory: "512MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<any> => {
    const uid = request.auth?.uid;
    if (!uid)
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");

    const {
      method,
      items,
      customerId,
      expiresIn = 7200,
      additionalInformation = [],
      card,
      installments,
      statementDescriptor,
      code,
    } = request.data ?? {};

    if (!["pix", "credit_card"].includes(method))
      throw new HttpsError(
        "invalid-argument",
        "method deve ser 'pix' ou 'credit_card'."
      );
    if (!items?.length || !customerId)
      throw new HttpsError(
        "invalid-argument",
        "Campos obrigatórios: items[], customerId."
      );
    if (method === "credit_card" && (installments == null || installments < 1))
      throw new HttpsError(
        "invalid-argument",
        "installments obrigatórios para cartão."
      );

    // 1️⃣ marcação de 10% sobre cada item
    const feePct = Number(PLATFORM_FEE_PERCENTAGE.value());
    const itemsWithFee = items.map((it) => ({
      ...it,
      amount: Math.ceil(it.amount * (1 + feePct / 100)),
    }));

    const baseTotal = items.reduce((s, it) => s + it.amount * it.quantity, 0);
    const totalWithFee = itemsWithFee.reduce(
      (s, it) => s + it.amount * it.quantity,
      0
    );
    const platformFeeTotal = totalWithFee - baseTotal;

    // recipient dinâmico (dono do torneio)
    const userSnap = await db.collection("users").doc(uid).get();
    const ownerRid = userSnap.get("recipientId") as string;
    if (!ownerRid)
      throw new HttpsError("failed-precondition", "Usuário sem recipientId.");

    const platformRid = PLATFORM_RECIPIENT_ID.value();
    const splitRules: SplitRuleDto[] = [
      {
        amount: baseTotal,
        recipient_id: ownerRid,
        type: "flat",
        options: {
          liable: true,
          charge_processing_fee: false,
          charge_remainder_fee: false,
        },
      },
      {
        amount: platformFeeTotal,
        recipient_id: platformRid,
        type: "flat",
        options: {
          liable: false,
          charge_processing_fee: true,
          charge_remainder_fee: true,
        },
      },
    ];

    // monta o payment genérico
    let payment: any;
    if (method === "pix") {
      payment = {
        payment_method: "pix" as const,
        pix: {
          expires_in: expiresIn,
          additional_information: additionalInformation,
        },
        split: splitRules,
      };
    } else {
      // cartão
      payment = {
        payment_method: "credit_card" as const,
        credit_card: {
          card: card!,
          operation_type: "auth_and_capture" as const,
          installments: installments!,
          statement_descriptor: statementDescriptor,
        },
        split: splitRules,
      };
    }

    // payload final
    const payload: PagarmeV5OrderPayload = {
      code: method === "credit_card" ? code : undefined,
      items: itemsWithFee,
      customer_id: customerId,
      payments: [payment],
      closed: method === "credit_card" ? true : undefined,
    };

    // chamada ao Pagar.me
    const apiKey = PAGARME_API_KEY.value(),
      baseUrl = PAGARME_BASE_URL.value();
    if (!apiKey || !baseUrl)
      throw new HttpsError("internal", "Config Pagar.me não definida.");
    const svc = new PagarmeOrderService(new PagarmeApiClient(apiKey, baseUrl));

    let resp: PagarmeV5OrderResponse;
    try {
      resp = await svc.createOrder(payload);
    } catch (err: any) {
      logger.error("Erro ao criar pedido", { err, uid });
      const msg =
        err?.response?.data?.errors?.[0]?.message ||
        err.message ||
        "Falha ao criar pedido.";
      throw new HttpsError("internal", msg);
    }

    // retorna campos relevantes
    const tx = resp.charges[0]?.last_transaction || {};
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
        : { paidAt: tx.paid_at, transactionType: tx.transaction_type }),
    };
  }
);
