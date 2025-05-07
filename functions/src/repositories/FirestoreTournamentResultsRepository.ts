import {db, logger, adminInstance} from "../config/admin"; // Ajuste o path
import {TournamentResult} from "../types/ranking";

import {ITournamentResultsRepository, TournamentResultUpdateData} from "./interfaces/ITournamentResultsRepository";

const TOURNAMENT_RESULTS_COLLECTION = "tournament-results";

export class FirestoreTournamentResultsRepository implements ITournamentResultsRepository {
  async saveOrUpdateResults(tournamentId: string, data: TournamentResultUpdateData): Promise<void> {
    try {
      const docRef = db.collection(TOURNAMENT_RESULTS_COLLECTION).doc(tournamentId);
      const dataToSave = {
        ...data,
        lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp(),
      };
      await docRef.set(dataToSave, {merge: true});
      logger.debug(`[FirestoreResultsRepo] Results saved/merged for ${tournamentId}.`);
    } catch (error) {
      logger.error(`[FirestoreResultsRepo] Error saving results for ${tournamentId}:`, error);
      throw error;
    }
  }

  async getResults(tournamentId: string): Promise<TournamentResult | null> {
    try {
      const docRef = db.collection(TOURNAMENT_RESULTS_COLLECTION).doc(tournamentId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        logger.warn(`[FirestoreResultsRepo] Results not found for tournament ${tournamentId}.`);
        return null;
      }
      return { ...docSnap.data() } as TournamentResult;
    } catch (error) {
      logger.error(`[FirestoreResultsRepo] Error retrieving results for ${tournamentId}:`, error);
      throw error;
    }
  }

  async deleteResults(tournamentId: string): Promise<void> {
    try {
      const docRef = db.collection(TOURNAMENT_RESULTS_COLLECTION).doc(tournamentId);
      await docRef.delete();
      logger.info(`[FirestoreResultsRepo] Deleted results for orphan tournament ${tournamentId}.`);
    } catch (error) {
      logger.error(`[FirestoreResultsRepo] Error deleting results for ${tournamentId}:`, error);
      // Don't necessarily throw, maybe just log
    }
  }

  async updateStatus(tournamentId: string, status: TournamentResult["status"]): Promise<void> {
    try {
      const docRef = db.collection(TOURNAMENT_RESULTS_COLLECTION).doc(tournamentId);
      await docRef.update({
        status: status,
        lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp(),
      });
      logger.debug(`[FirestoreResultsRepo] Status updated to ${status} for ${tournamentId}.`);
    } catch (error) {
      logger.error(`[FirestoreResultsRepo] Error updating status for ${tournamentId}:`, error);
      throw error;
    }
  }
}
