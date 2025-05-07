// split comum a ambos
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

// PAYMENTS

// Pix
export interface PixPaymentDto {
  payment_method: "pix";
  pix: {
    expires_in: number;
    additional_information?: Array<{ name: string; value: string }>;
  };
  split: SplitRuleDto[];
}

// Cartão de crédito
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

// Union de payments
export type PaymentDto = PixPaymentDto | CreditCardPaymentDto;

// ITENS
export interface ItemDto {
  amount: number;
  description: string;
  quantity: number;
  code?: string;
}

// PAYLOAD
export interface PagarmeV5OrderPayload {
  code?: string; // opcional para cartão
  items: ItemDto[];
  customer_id: string;
  payments: PaymentDto[];
  closed?: boolean; // só para cartão, se quiser
}

// RESPONSE (campos comuns que o front lê)
export interface PagarmeV5OrderResponse {
  id: string;
  code?: string;
  amount: number;
  status: string; // pending, paid, etc.
  charges: Array<{
    last_transaction: {
      qr_code?: string;
      qr_code_url?: string;
      expires_at?: string;
      // para cartão:
      paid_at?: string;
      transaction_type?: string;
      brand_id?: string;
      // ...
    };
  }>;
}

// DTO do front
export interface CreateOrderPlatformRequestDto {
  method: "pix" | "credit_card";
  items: ItemDto[];
  customerId: string;
  // pix
  expiresIn?: number;
  additionalInformation?: Array<{ name: string; value: string }>;
  // cartão
  card?: CreditCardDto;
  installments?: number;
  statementDescriptor?: string;
  code?: string;
}
