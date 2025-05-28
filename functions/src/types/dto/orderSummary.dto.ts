export interface LastTransactionDto {
  id: string;
  gateway_id: string;
  transaction_type: string;
  status: string;
  success: boolean;
  amount: number;
  installments: number;
  acquirer_name: string;
  acquirer_tid: string;
  acquirer_nsu: string;
  acquirer_auth_code: string;
}

export interface OrderPaymentDto {
  payment_method: "pix" | "credit_card";
  paid_at: string;
  last_transaction: LastTransactionDto;
}

export interface OrderDto {
  order_id: string;
  order_code: string;
  amount: number;
  currency: string;
  status: string;
  tournament: string;
  payment: OrderPaymentDto;
}