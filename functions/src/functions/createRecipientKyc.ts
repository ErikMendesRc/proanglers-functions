// src/functions/createRecipientKyc.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger, db } from "../config/admin";
import admin from "firebase-admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import { PAGARME_API_KEY, PAGARME_BASE_URL } from "../config/params";
import { PagarmeKycService } from "../services/PagarmeKycService";
import {
  CreateRecipientKycPlatformRequestDto,
  PagarmeV5KycLinkResponse,
} from "../types/dto/pagarmeKyc.dto";

export const createRecipientKyc = onCall<CreateRecipientKycPlatformRequestDto>(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    //Autenticação
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    //Tenta obter recipientId do payload; senão busca no Firestore
    let recipientId: string | undefined = request.data?.recipient_id;
    if (!recipientId) {
      const userSnap = await db.collection("users").doc(uid).get();
      recipientId = userSnap.get("recipientId");
    }
    if (!recipientId) {
      throw new HttpsError(
        "invalid-argument",
        "Recipient ID não encontrado no payload nem no Firestore."
      );
    }

    //Configuração do Pagar.me
    const apiKey = PAGARME_API_KEY.value();
    const baseUrl = PAGARME_BASE_URL.value();
    if (!apiKey || !baseUrl) {
      logger.error("Configuração Pagar.me ausente.");
      throw new HttpsError("internal", "Configuração Pagar-me não definida.");
    }

    //Instancia cliente e serviço
    const pagarmeClient = new PagarmeApiClient(apiKey, baseUrl);
    const kycService = new PagarmeKycService(pagarmeClient);

    //Chama o Pagar.me para gerar o link de KYC
    let resp: PagarmeV5KycLinkResponse;
    try {
      logger.info("Gerando link de KYC para recebedor", { uid, recipientId });
      resp = await kycService.createKycLink({ recipient_id: recipientId });
    } catch (err: any) {
      logger.error("Erro ao gerar KYC link", { err, uid, recipientId });
      const message =
        err?.response?.data?.errors?.[0]?.message ||
        err.message ||
        "Falha ao gerar link de KYC.";
      throw new HttpsError("internal", message);
    }

    //Persiste no Firestore para controle de fluxo de KYC
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      {
        kyc: {
          url: resp.url,
          base64QrCode: resp.base64_qrcode,
          expiresAt: resp.expires_at,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    //Responde ao cliente
    return {
      url: resp.url,
      base64QrCode: resp.base64_qrcode,
      expiresAt: resp.expires_at,
      status: "pending",
    };
  }
);
