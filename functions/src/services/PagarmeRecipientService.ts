import { logger } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import {
  PagarmeV5CreateRecipientPayload,
  PagarmeV5RecipientResponse,
} from "../types/dto/pagarmeRecipient.dto";

export interface IPagarmeRecipientService {
  createRecipient(
    payload: PagarmeV5CreateRecipientPayload
  ): Promise<PagarmeV5RecipientResponse>;
}

export class PagarmeRecipientService implements IPagarmeRecipientService {
  constructor(private readonly apiClient: PagarmeApiClient) {}

  async createRecipient(
    payload: PagarmeV5CreateRecipientPayload
  ): Promise<PagarmeV5RecipientResponse> {
    logger.info("[PagarmeRecipientService] Criando recebedor", {
      code: payload.code,
    });

    payload.transfer_settings = {
      transfer_enabled: "true",
      transfer_interval: "Weekly",
      transfer_day: "1",
    };

    payload.automatic_anticipation_settings = {
      enabled: "true",
      type: "full",
      volume_percentage: "100",
      delay: "29",
    };

    const response = await this.apiClient.post<
      PagarmeV5RecipientResponse,
      PagarmeV5CreateRecipientPayload
    >("/recipients", payload);

    return response.data;
  }
}
