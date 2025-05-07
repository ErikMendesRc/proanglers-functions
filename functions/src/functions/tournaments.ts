/**
 * @fileoverview Cloud Functions V2 trigger for Firestore events on the
 * 'tournaments' collection. Handles the tournament finalization process when its
 * status changes appropriately.
 */

import { ParamsOf } from "firebase-functions";
import {
  onDocumentUpdated,
  FirestoreEvent,
  Change,
  QueryDocumentSnapshot,
  DocumentOptions,
} from "firebase-functions/v2/firestore";

import { logger } from "../config/admin";
import { createDependencies } from "../config/dependencies";
import { TournamentStatus } from "../types/enums";
import { Tournament } from "../types/tournament";

// --- Constantes e Opções ---
const FUNCTION_REGION = process.env.FUNCTION_REGION || "southamerica-east1";
const TOURNAMENT_DOCUMENT_PATH = "tournaments/{tournamentId}";

const triggerOptions: DocumentOptions<typeof TOURNAMENT_DOCUMENT_PATH> = {
  document: TOURNAMENT_DOCUMENT_PATH,
  region: FUNCTION_REGION,
  memory: "256MiB",
  timeoutSeconds: 60,
};

// -------------------------

/**
 * Firestore V2 trigger that activates when a tournament document is updated.
 * If status changes to CLOSED, it instantiates RankingService and calls
 * the finalizeTournamentAndTriggerNationalUpdate method.
 */
export const onTournamentFinalizedUpdateNational = onDocumentUpdated<
  typeof TOURNAMENT_DOCUMENT_PATH
>(
  triggerOptions,
  async (
    event: FirestoreEvent<
      Change<QueryDocumentSnapshot> | undefined,
      ParamsOf<typeof TOURNAMENT_DOCUMENT_PATH>
    >
  ) => {
    const { tournamentId } = event.params;
    const functionPrefix = `[FinalizeTrigger-${tournamentId}]`;

    if (!event.data) {
      logger.warn(`${functionPrefix} No event data available. Skipping.`);
      return;
    }

    const afterData = event.data.after.data() as Tournament;

    if (
      typeof afterData?.status === "undefined"
    ) {
      logger.warn(`${functionPrefix} Missing afterData.status. Skipping.`);
      return;
    }

    // Verifica apenas o status final
    if (afterData.status?.toUpperCase() !== TournamentStatus.CLOSED) {
      const statusChangeInfo = `${afterData.status})`;
      logger.debug(
        `${functionPrefix} Status change ${statusChangeInfo} does not require finalization.`
      );
      return;
    }

    // Se chegou aqui, deve finalizar o torneio
    logger.info(
      `${functionPrefix} Status is CLOSED. Initiating finalization process...`
    );

    try {
      const { rankingService } = createDependencies();
      await rankingService.finalizeTournamentAndTriggerNationalUpdate(
        tournamentId
      );
      logger.info(
        `${functionPrefix} Finalization process triggered successfully.`
      );
    } catch (error) {
      logger.error(
        `${functionPrefix} Error during finalizeTournamentAndTriggerNationalUpdate:`,
        error
      );
    }
  }
);