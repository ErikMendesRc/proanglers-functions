import { logger } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import {
  PagarmeV5OrderPayload,
  PagarmeV5OrderResponse,
} from "../types/dto/pagarmeOrder.dto";

export interface IPagarmeOrderService {
  createOrder(payload: PagarmeV5OrderPayload): Promise<PagarmeV5OrderResponse>;
}

export class PagarmeOrderService implements IPagarmeOrderService {
  constructor(private readonly apiClient: PagarmeApiClient) {}

  async createOrder(
    payload: PagarmeV5OrderPayload
  ): Promise<PagarmeV5OrderResponse> {
    logger.info("[PagarmeOrderService] Criando pedido", {
      method: payload.payments[0].payment_method,
    });
    const response = await this.apiClient.post<
      PagarmeV5OrderResponse,
      PagarmeV5OrderPayload
    >("/orders", payload);
    return response.data;
  }
}
