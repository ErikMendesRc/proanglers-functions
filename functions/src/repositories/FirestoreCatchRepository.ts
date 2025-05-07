import {db, logger} from "../config/admin";
import {Catch} from "../types/catch";
import {CaptureStatusEnum} from "../types/enums";

import {ICatchRepository} from "./interfaces/ICatchRepository";

const CATCHES_COLLECTION = "catches";

export class FirestoreCatchRepository implements ICatchRepository {
  async getAllApprovedCatches(tournamentId: string): Promise<Catch[]> {
    try {
      const snapshot = await db
        .collection(CATCHES_COLLECTION)
        .where("tournamentId", "==", tournamentId)
        .where("status", "==", CaptureStatusEnum.APPROVED)
        .get();

      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as Catch));
    } catch (error) {
      logger.error(`[FirestoreCatchRepo] Error fetching approved catches for ${tournamentId}:`, error);
      throw error;
    }
  }

  async getAllCatchesForTournament(tournamentId: string): Promise<Catch[]> {
    try {
      const snapshot = await db
        .collection(CATCHES_COLLECTION)
        .where("tournamentId", "==", tournamentId)
        .get();

      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as Catch));
    } catch (error) {
      logger.error(`[FirestoreCatchRepo] Error fetching all catches for ${tournamentId}:`, error);
      throw error;
    }
  }
}
