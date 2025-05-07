// src/types/dto/pagarmeToken.dto.ts
// ======================================================
// DTOs – Criação de Token de Cartão na Pagar.me
// ======================================================

/**
 * Payload para a criação de um token de cartão.
 */
export interface PagarmeV5CreateTokenPayload {
  type: "card";
  card: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
    label?: string;
  };
}

/**
 * Resposta da Pagar.me ao criar um token.
 */
export interface PagarmeV5TokenResponse {
  id: string; // token_…
  type: "card";
  created_at: string;
  expires_at: string;
  card: {
    last_four_digits: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    brand: string;
    label?: string;
  };
}
