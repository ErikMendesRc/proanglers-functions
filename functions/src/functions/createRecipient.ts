// --- Função Atualizada ---

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger, db } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import {
  PAGARME_API_KEY,
  PAGARME_BASE_URL,
} from "../config/params";
import { PagarmeRecipientService } from "../services/PagarmeRecipientService";
import {
  CreateRecipientPlatformRequestDto,
  PagarmeV5RecipientResponse,
  PagarmeV5CreateRecipientPayload,
} from "../types/dto/pagarmeRecipient.dto";

export const createRecipient = onCall<CreateRecipientPlatformRequestDto>(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    recipientId: string;
    defaultBankId: string;
    status: string;
  }> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const data = request.data;
    if (!data?.register_information || !data?.default_bank_account) {
      throw new HttpsError(
        "invalid-argument",
        "Payload incompleto: register_information e default_bank_account são obrigatórios."
      );
    }

    const apiKey = PAGARME_API_KEY.value();
    const baseUrl = PAGARME_BASE_URL.value();
    if (!apiKey || !baseUrl) {
      logger.error("Configuração Pagar.me ausente.");
      throw new HttpsError("internal", "Configuração Pagar-me não definida.");
    }

    const pagarmeClient = new PagarmeApiClient(apiKey, baseUrl);
    const recipientService = new PagarmeRecipientService(pagarmeClient);

    let resp: PagarmeV5RecipientResponse;
    try {
      logger.info("Criando recebedor no Pagar.me", { uid });
      resp = await recipientService.createRecipient(
        data as PagarmeV5CreateRecipientPayload
      );
    } catch (err: any) {
      logger.error("Erro ao criar recebedor", { err, uid });
      throw new HttpsError(
        "internal",
        err?.response?.data?.errors?.[0]?.message ||
          err.message ||
          "Falha ao criar recebedor no Pagar.me."
      );
    }

    await db.collection("users").doc(uid).set(
      {
        recipientId: resp.id,
        defaultBankId: resp.default_bank_account.id,
      },
      { merge: true }
    );

    return {
      recipientId: resp.id,
      defaultBankId: resp.default_bank_account.id,
      status: resp.status,
    };
  }
);
