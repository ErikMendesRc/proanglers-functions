import {db, logger, adminInstance} from "../config/admin";
import {UserTournamentStats} from "../types/ranking";

import {IUserFishingStatsRepository} from "./interfaces/IUserFishingStatsRepository";

const USERS_COLLECTION = "users";
const FISHING_STATS_SUBCOLLECTION = "fishingStats";

export class FirestoreUserFishingStatsRepository implements IUserFishingStatsRepository {
  async saveOrUpdateStats(userId: string, tournamentId: string, statsData: Partial<UserTournamentStats>): Promise<void> {
    try {
      const docRef = db.collection(USERS_COLLECTION).doc(userId)
        .collection(FISHING_STATS_SUBCOLLECTION).doc(tournamentId);

      const dataToSave = {
        ...statsData,
        userId: userId,
        tournamentId: tournamentId,
        lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp(),
      };

      await docRef.set(dataToSave, {merge: true});
      logger.debug(`[FirestoreUserStatsRepo] User tournament stats saved for user ${userId}, tournament ${tournamentId}.`);
    } catch (error) {
      logger.error(`[FirestoreUserStatsRepo] Error saving user tournament stats for user ${userId}, tournament ${tournamentId}:`, error);
      throw error;
    }
  }
}
