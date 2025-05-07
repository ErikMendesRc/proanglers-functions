// src/services/PagarmeTokenService.ts
// ======================================================
// Serviço responsável por criar tokens de cartão
// na API Pagar.me v5 (endpoint /tokens).
// ======================================================

import { logger } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import { PAGARME_API_KEY } from "../config/params";
import { PagarmeV5CreateTokenPayload, PagarmeV5TokenResponse } from "../types/dto/pagarmeCardToken.dto";

/**
 * Interface para abstrair a criação de tokens.
 */
export interface IPagarmeTokenService {
  createCardToken(
    payload: PagarmeV5CreateTokenPayload
  ): Promise<PagarmeV5TokenResponse>;
}

/**
 * Implementação concreta de IPagarmeTokenService.
 */
export class PagarmeTokenService implements IPagarmeTokenService {
  private publicKey: string;

  constructor(private readonly apiClient: PagarmeApiClient) {
    this.publicKey = PAGARME_API_KEY.value();
    if (!this.publicKey) {
      throw new Error("PAGARME_PUBLIC_KEY não definida nos parâmetros.");
    }
  }

  /**
   * Cria um token de cartão usando a public_key.
   * Atenção: não envia a secret_key neste endpoint.
   */
  async createCardToken(
    payload: PagarmeV5CreateTokenPayload
  ): Promise<PagarmeV5TokenResponse> {
    logger.info("[PagarmeTokenService] Criando token de cartão", {
      type: payload.type,
    });

    // adiciona appId na query e remove auth para não enviar secret_key
    const response = await this.apiClient.post<
      PagarmeV5TokenResponse,
      PagarmeV5CreateTokenPayload
    >("/tokens", payload, {
      params: { appId: this.publicKey },
      auth: undefined,
    });

    return response.data;
  }
}
