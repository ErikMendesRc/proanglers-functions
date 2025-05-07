// src/repositories/interfaces/INationalRankingSegmentRepository.ts
import { NationalRankingSegment } from "../../types/ranking";

export interface INationalRankingSegmentRepository {
  /**
   * Retorna um segmento de ranking (um doc).
   * O ID pode ser montado a partir de year, type, key, ou pode-se passar direto.
   */
  getSegment(docId: string): Promise<NationalRankingSegment | null>;

  /**
   * Cria ou atualiza um segmento de ranking.
   */
  saveOrUpdateSegment(segment: NationalRankingSegment): Promise<void>;

  /**
   * Remove um segmento inteiro, se necessário.
   */
  deleteSegment(docId: string): Promise<void>;
}