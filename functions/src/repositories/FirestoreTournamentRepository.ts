import {db, logger} from "../config/admin"; // Ajuste o path
import {Tournament} from "../types/tournament";

import {ITournamentRepository} from "./interfaces/ITournamentRepository";

const TOURNAMENTS_COLLECTION = "tournaments";

export class FirestoreTournamentRepository implements ITournamentRepository {
  async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const docRef = db.collection(TOURNAMENTS_COLLECTION).doc(tournamentId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        logger.warn(`[FirestoreTournamentRepo] Tournament ${tournamentId} not found.`);
        return null;
      }
      return {id: docSnap.id, ...docSnap.data()} as Tournament;
    } catch (error) {
      logger.error(`[FirestoreTournamentRepo] Error fetching tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  async updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void> {
    try {
      const docRef = db.collection(TOURNAMENTS_COLLECTION).doc(tournamentId);
      await docRef.update(data);
      logger.info(`[FirestoreTournamentRepo] Tournament ${tournamentId} updated with data:`, data);
    } catch (error) {
      logger.error(`[FirestoreTournamentRepo] Error updating tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}
