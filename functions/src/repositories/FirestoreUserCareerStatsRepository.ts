// repositories/FirestoreUserCareerStatsRepository.ts
import {Transaction, DocumentReference, DocumentSnapshot} from "firebase-admin/firestore";

import {db, logger, adminInstance} from "../config/admin";
import {UserStats} from "../types/ranking";

import {IUserCareerStatsRepository} from "./interfaces/IUserCareerStatsRepository";

const USERS_COLLECTION = "users";
const STATS_SUBCOLLECTION = "stats";
const STATS_DOC_ID = "summary";

export class FirestoreUserCareerStatsRepository implements IUserCareerStatsRepository {
  private getStatsDocRef(userId: string): DocumentReference {
    return db.collection(USERS_COLLECTION).doc(userId)
      .collection(STATS_SUBCOLLECTION).doc(STATS_DOC_ID);
  }

  async getStats(userId: string, transaction?: Transaction): Promise<UserStats | null> {
    const docRef = this.getStatsDocRef(userId);
    let docSnap: DocumentSnapshot;
    try {
      if (transaction) {
        docSnap = await transaction.get(docRef);
      } else {
        docSnap = await docRef.get();
      }

      if (!docSnap.exists) {
        logger.warn(`[FirestoreUserCareerStatsRepo] Stats summary for user ${userId} not found.`);
        return null;
      }
      return {userId: userId, ...docSnap.data()} as UserStats;
    } catch (error) {
      logger.error(`[FirestoreUserCareerStatsRepo] Error fetching stats summary for user ${userId}:`, error);
      throw error;
    }
  }

  async saveOrUpdateStats(userId: string, statsData: Partial<UserStats>, transaction?: Transaction): Promise<void> {
    const docRef = this.getStatsDocRef(userId);
    const {userId: dataUserId, ...restStatsData} = statsData;
    const dataToSave = {
      ...restStatsData,
      userId: userId,
      lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp(),
    };

    // Remove chaves com valor undefined para evitar erros com Firestore
    Object.keys(dataToSave).forEach((key) => (dataToSave as any)[key] === undefined && delete (dataToSave as any)[key]);

    try {
      if (transaction) {
        transaction.set(docRef, dataToSave, {merge: true});
      } else {
        await docRef.set(dataToSave, {merge: true});
      }
      logger.debug(`[FirestoreUserCareerStatsRepo] Stats summary saved/merged for user ${userId}.`);
    } catch (error) {
      logger.error(`[FirestoreUserCareerStatsRepo] Error saving/merging stats summary for user ${userId}:`, error);
      throw error;
    }
  }

  async initializeStats(userId: string, userName?: string, transaction?: Transaction): Promise<UserStats> {
    const initialStats: UserStats = {
      userId: userId,
      userName: userName || undefined,
      championships: 0,
      top3Finishes: 0,
      top10Finishes: 0,
      tournamentsParticipatedCount: 0,
      totalApprovedCatches: 0,
      totalApprovedCatchCm: 0,
      biggestFishEver: null,
      // achievements: [],
      averageCatchSize: 0,
      mostFrequentSpecies: undefined,
      firstTournamentDate: undefined,
      lastTournamentDate: undefined,
      lastUpdated: adminInstance.firestore.Timestamp.now(), // Placeholder
    };
    // Chama saveOrUpdateStats para CRIAR o documento se ele não existir
    // Importante: se chamado sem transação, cria imediatamente.
    // Se chamado COM transação, a criação só ocorre no commit da transação.
    await this.saveOrUpdateStats(userId, initialStats, transaction);

    // Retorna o objeto inicializado (o timestamp real será o do servidor)
    return initialStats;
  }
}
