// Payload para solicitar link de KYC
export interface PagarmeV5CreateKycPayload {
  recipient_id: string;
}

// Resposta do Pagar.me
export interface PagarmeV5KycLinkResponse {
  url: string; // link para o fluxo de KYC
  base64_qrcode: string; // QR code em base64
  expires_at: string; // ISO timestamp de expiração
}

// Interface de entrada da função onCall
export type CreateRecipientKycPlatformRequestDto = PagarmeV5CreateKycPayload;
