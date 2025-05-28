import { FieldValue } from "firebase-admin/firestore";
import {
  OrderDto,
  OrderPaymentDto,
  LastTransactionDto,
} from "../types/dto/orderSummary.dto";
import { PagarmeV5OrderResponse } from "../types/dto/pagarmeOrder.dto";

/* -------- helpers defensivos -------- */
function buildLastTransaction(charge: any = {}): LastTransactionDto {
  const last = charge.last_transaction ?? {};
  return {
    id: last.id ?? "",
    gateway_id: last.gateway_id ?? "",
    transaction_type: last.transaction_type ?? "",
    status: last.status ?? "",
    success: last.success ?? false,
    amount: last.amount ?? 0,
    installments: last.installments ?? 0,
    acquirer_name: last.acquirer_name ?? "",
    acquirer_tid: last.acquirer_tid ?? "",
    acquirer_nsu: last.acquirer_nsu ?? "",
    acquirer_auth_code: last.acquirer_auth_code ?? "",
  };
}

function buildOrderPayment(charge: any = {}): OrderPaymentDto {
  return {
    payment_method: charge.payment_method ?? "pix",
    paid_at: charge.paid_at ?? "",
    last_transaction: buildLastTransaction(charge),
  };
}

/* -------- createOrder -> documento inicial -------- */
export function initialFromPagarme(
  resp: PagarmeV5OrderResponse,
  params: { userId: string; tournamentId: string }
): OrderDto & { user_id: string; createdAt: FieldValue } {
  return {
    order_id: resp.id,
    order_code: resp.code ?? "",
    amount: resp.amount,
    currency: resp.currency ?? "BRL",
    status: resp.status,
    tournament: params.tournamentId,
    payment: buildOrderPayment(resp.charges?.[0]),
    user_id: params.userId,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/* -------- webhook -> campos que podem mudar -------- */
export function updateFromWebhook(data: any): Partial<OrderDto> {
  const charge = data.charges?.[0] ?? {};
  return {
    order_id: data.id,
    order_code: data.code ?? "",
    amount: data.amount,
    currency: data.currency ?? "BRL",
    status: data.status ?? "",
    payment: buildOrderPayment(charge),
  };
}