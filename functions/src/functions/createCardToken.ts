// src/functions/createCardToken.ts
/**
 * Cloud Function v2 – createCardToken
 * ---------------------------------------------------------------
 * Gera um token de cartão via Pagar.me (/tokens), salva apenas
 * o token e os 4 últimos dígitos no Firestore e devolve ao client.
 * ---------------------------------------------------------------
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger, db } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import { PAGARME_API_KEY, PAGARME_BASE_URL } from "../config/params";
import { PagarmeTokenService } from "../services/PagarmeTokenCardService";
import { PagarmeV5CreateTokenPayload, PagarmeV5TokenResponse } from "../types/dto/pagarmeCardToken.dto";

// DTO de entrada (plataforma → backend)
export interface CreateTokenPlatformRequestDto {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  label?: string;
}

export const createCardToken = onCall<CreateTokenPlatformRequestDto>(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    tokenId: string;
    lastFour: string;
    brand: string;
  }> => {
    //Autenticação
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    //Validação dos dados do cartão
    const { number, holderName, expMonth, expYear, cvv, label } =
      request.data ?? {};
    if (
      !number ||
      !holderName ||
      !expMonth ||
      !expYear ||
      !cvv
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Todos os campos do cartão são obrigatórios: number, holderName, expMonth, expYear, cvv."
      );
    }

    //Instancia Pagar.me token service
    const apiKey = PAGARME_API_KEY.value();
    const baseUrl = PAGARME_BASE_URL.value();
    if (!apiKey || !baseUrl) {
      logger.error("Configuração Pagar.me ausente.");
      throw new HttpsError(
        "internal",
        "Configuração Pagar-me não definida."
      );
    }
    const pagarmeClient = new PagarmeApiClient(apiKey, baseUrl);
    const tokenService = new PagarmeTokenService(pagarmeClient);

    //Monta payload para /tokens
    const tokenPayload: PagarmeV5CreateTokenPayload = {
      type: "card",
      card: {
        number,
        holder_name: holderName,
        exp_month: expMonth,
        exp_year: expYear,
        cvv,
        label,
      },
    };

    //Chama API Pagar.me (/tokens)
    let tokenResp: PagarmeV5TokenResponse;
    try {
      tokenResp = await tokenService.createCardToken(tokenPayload);
      logger.info("Token de cartão criado", {
        tokenId: tokenResp.id,
        uid,
      });
    } catch (err) {
      logger.error("Erro ao criar token de cartão", { err, uid });
      throw new HttpsError(
        "internal",
        "Falha ao gerar token de cartão."
      );
    }

    //Atualiza Firestore (somente token e 4 últimos dígitos)
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      {
        cardTokenId: tokenResp.id,
        cardLastFour: tokenResp.card.last_four_digits,
      },
      { merge: true }
    );

    //Retorna dados essenciais ao frontend
    return {
      tokenId: tokenResp.id,
      lastFour: tokenResp.card.last_four_digits,
      brand: tokenResp.card.brand,
    };
  }
);