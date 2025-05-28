export interface SplitRuleDto {
  amount: number;
  type: "flat" | "percentage";
  recipient_id: string;
  options: {
    liable: boolean;
    charge_processing_fee: boolean;
    charge_remainder_fee: boolean;
  };
}

// PIX ----------------------------------------------------------------------
export interface PixPaymentDto {
  payment_method: "pix";
  pix: {
    expires_in: number;
    additional_information?: Array<{ name: string; value: string }>;
  };
  split: SplitRuleDto[];
}

// CARTÃO -------------------------------------------------------------------
export interface CreditCardDto {
  billing_address: {
    line_1: string;
    line_2?: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
  };
  number: string;
  holder_name: string;
  holder_document: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  brand: string;
}

export interface CreditCardPaymentDto {
  payment_method: "credit_card";
  credit_card: {
    card: CreditCardDto;
    operation_type: "auth_and_capture" | "auth_only";
    installments: number;
    statement_descriptor?: string;
  };
  split: SplitRuleDto[];
}

export type PaymentDto = PixPaymentDto | CreditCardPaymentDto;

// ITENS --------------------------------------------------------------------
export interface ItemDto {
  name: string;
  amount: number;
  description: string;
  quantity: number;
  code?: string;
}

// PAYLOAD ------------------------------------------------------------------
export interface PagarmeV5OrderPayload {
  code?: string;
  items: ItemDto[];
  customer_id: string;
  payments: PaymentDto[];
  closed?: boolean;
  metadata?: Record<string, unknown>;
}

// RESPOSTA resumida que o front usa logo após criar o pedido ----------------
export interface PagarmeV5OrderResponse {
  id: string;
  code?: string;
  amount: number;
  currency?: string;
  status: string;
  charges: Array<{
    payment_method: "pix" | "credit_card";
    paid_at?: string;
    installments?: number;
    last_transaction: {
      id?: string;
      gateway_id?: string;
      transaction_type?: string;
      status?: string;
      success?: boolean;
      amount?: number;
      installments?: number;
      acquirer_name?: string;
      acquirer_tid?: string;
      acquirer_nsu?: string;
      acquirer_auth_code?: string;
      qr_code?: string;
      qr_code_url?: string;
      expires_at?: string;
      paid_at?: string;
      brand_id?: string;
      card?: { brand?: string; last_four_digits?: string };
    };
  }>;
}

// DTO enviado PELO FRONT para criar o pedido --------------------------------
export interface CreateOrderPlatformRequestDto {
  method: "pix" | "credit_card";
  items: ItemDto[];
  userId: string;
  tournamentId: string;
  card?: CreditCardDto;
  installments?: number;
}
