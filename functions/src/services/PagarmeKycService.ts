import { logger } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import { PagarmeV5CreateKycPayload, PagarmeV5KycLinkResponse } from "../types/dto/pagarmeKyc.dto";

export interface IPagarmeKycService {
  createKycLink(
    payload: PagarmeV5CreateKycPayload
  ): Promise<PagarmeV5KycLinkResponse>;
}

export class PagarmeKycService implements IPagarmeKycService {
  constructor(private readonly apiClient: PagarmeApiClient) {}

  async createKycLink(
    payload: PagarmeV5CreateKycPayload
  ): Promise<PagarmeV5KycLinkResponse> {
    logger.info("[PagarmeKycService] Criando link de KYC", {
      recipient_id: payload.recipient_id,
    });

    const path = `/recipients/${payload.recipient_id}/kyc_link`;

    const response = await this.apiClient.post<
      PagarmeV5KycLinkResponse,
      undefined
    >(path, undefined);

    return response.data;
  }
}
