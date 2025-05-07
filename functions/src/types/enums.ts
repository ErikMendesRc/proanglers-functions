/**
 * @fileoverview Defines various enums used across the application
 * for standardized status codes, types, and categories.
 */

/** Status possibilities for a tournament. */
export enum TournamentStatus {
  REGISTRATION_OPEN = "REGISTRATION_OPEN",
  REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
  CLOSED = "CLOSED",
  FINALIZED_RANKED = "FINALIZED_RANKED",
  RANKING_FAILED = "RANKING_FAILED",
  FINALIZING = "FINALIZING",
}

/** Minimum number of fish required to meet the tournament quota. */
export enum MinimumQuota {
  ONE = "1",
  THREE = "3",
  FIVE = "5",
}

/** Mode of participation in a tournament. */
export enum TournamentMode {
  TEAM = "Em times",
  SOLO = "Individual",
}

/** Type of fishing modality for the tournament. */
export enum TournamentModality {
  CAIAQUE = "Caiaque",
  BARCO = "Barco",
  PRAIA = "Praia",
  PESQUEIRO = "Pesqueiro",
  DESEMBARCADO = "Desembarcado",
}

/** Status possibilities for a submitted fish capture. */
export type CaptureStatusType =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REPLACED";
/** Enum mapping for CaptureStatusType values (useful for comparisons if needed). */
export const CaptureStatusEnum: Record<string, CaptureStatusType> = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REPLACED: "REPLACED",
} as const;

/** Gender constraints or focus for a tournament. */
export enum Gender {
  MASCULINO = "Masculino",
  FEMININO = "Feminino",
  AMBOS = "Ambos",
}
