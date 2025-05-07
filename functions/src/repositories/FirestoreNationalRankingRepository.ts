// src/repositories/FirestoreNationalRankingRepository.ts
import { db, logger, adminInstance } from "../config/admin";
import { NationalRankingEntry } from "../types/ranking";
import { INationalRankingRepository } from "./interfaces/INationalRankingRepository";

const NATIONAL_RANKING_COLLECTION = "national-ranking";

export class FirestoreNationalRankingRepository implements INationalRankingRepository {
    async getAllEntries(): Promise<NationalRankingEntry[]> {
        const snapshot = await db.collection(NATIONAL_RANKING_COLLECTION).get();
        return snapshot.docs.map(doc => doc.data() as NationalRankingEntry);
    }

    async getEntryByUserId(userId: string): Promise<NationalRankingEntry | null> {
        const docRef = db.collection(NATIONAL_RANKING_COLLECTION).doc(userId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return null;
        return docSnap.data() as NationalRankingEntry;
    }

    async saveOrUpdateEntry(userId: string, data: Partial<NationalRankingEntry>): Promise<void> {
        const docRef = db.collection(NATIONAL_RANKING_COLLECTION).doc(userId);
        const dataToSave = {
            ...data,
            userId,
            lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp()
        };
        await docRef.set(dataToSave, { merge: true });
        logger.debug(`[FirestoreNationalRankingRepo] Saved/merged ranking entry for user ${userId}.`);
    }

    async saveAllEntries(entries: NationalRankingEntry[]): Promise<void> {
        const batch = db.batch();
        entries.forEach(entry => {
            const docRef = db.collection(NATIONAL_RANKING_COLLECTION).doc(entry.userId);
            batch.set(docRef, { ...entry, lastUpdated: adminInstance.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
        await batch.commit();
        logger.info(`[FirestoreNationalRankingRepo] Batch updated ${entries.length} national ranking entries.`);
    }
}
