// src/repositories/FirestoreNationalRankingSegmentRepository.ts
import { db, logger, adminInstance } from "../config/admin";
import { INationalRankingSegmentRepository } from "./interfaces/INationalRankingSegmentRepository";
import { NationalRankingSegment } from "../types/ranking";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION_NAME = "national-segments";

export class FirestoreNationalRankingSegmentRepository implements INationalRankingSegmentRepository {
  public async getSegment(docId: string): Promise<NationalRankingSegment | null> {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(docId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        logger.warn(`[FirestoreNationalRankingSegmentRepo] Doc '${docId}' not found.`);
        return null;
      }

      const data = docSnap.data();
      const segment: NationalRankingSegment = {
        year: data?.year,
        type: data?.type,
        key: data?.key,
        rankingEntries: data?.rankingEntries || [],
        biggestFishOfYearBySpecies: data?.biggestFishOfYearBySpecies || {},
        lastUpdated: data?.lastUpdated instanceof Timestamp
          ? data.lastUpdated
          : Timestamp.now(),
      };
      return segment;
    } catch (error) {
      logger.error(`[FirestoreNationalRankingSegmentRepo] Error getting doc '${docId}':`, error);
      throw error;
    }
  }

  public async saveOrUpdateSegment(segment: NationalRankingSegment): Promise<void> {
    try {
      // Monta ID
      const docId = `${segment.year}-${segment.type}-${segment.key}`;
      const docRef = db.collection(COLLECTION_NAME).doc(docId);

      // Se quiser truncar rankingEntries para top 100, por exemplo:
      if (segment.rankingEntries.length > 100) {
        segment.rankingEntries = segment.rankingEntries.slice(0, 100);
      }

      // Converter lastUpdated para serverTimestamp
      const dataToSave = {
        ...segment,
        lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp(),
      };

      await docRef.set(dataToSave, { merge: true });
      logger.info(`[FirestoreNationalRankingSegmentRepo] Saved segment doc '${docId}' with ${segment.rankingEntries.length} entries.`);
    } catch (error) {
      logger.error("[FirestoreNationalRankingSegmentRepo] Error saving doc:", error);
      throw error;
    }
  }

  public async deleteSegment(docId: string): Promise<void> {
    try {
      await db.collection(COLLECTION_NAME).doc(docId).delete();
      logger.info(`[FirestoreNationalRankingSegmentRepo] Deleted segment doc '${docId}'.`);
    } catch (error) {
      logger.error(`[FirestoreNationalRankingSegmentRepo] Error deleting doc '${docId}':`, error);
      throw error;
    }
  }
}