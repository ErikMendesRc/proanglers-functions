// repositories/interfaces/IUserCareerStatsRepository.ts
import {Transaction} from "firebase-admin/firestore";

import {UserStats} from "../../types/ranking"; // Ajuste o path se necessário

/**
 * Interface for accessing and modifying user career statistics data.
 * Typically stored at users/{userId}/stats/summary.
 */
export interface IUserCareerStatsRepository {
    /**
     * Fetches the career stats summary document for a user.
     * Returns null if the document doesn't exist.
     * Can optionally be part of a Firestore transaction.
     *
     * @param userId - The ID of the user.
     * @param transaction - Optional Firestore transaction context.
     * @returns A Promise resolving to the UserStats object or null.
     */
    getStats(userId: string, transaction?: Transaction): Promise<UserStats | null>;

    /**
     * Saves or merges data into the user's career stats summary document.
     * Creates the document with merged data if it doesn't exist.
     * Automatically handles the 'lastUpdated' timestamp.
     * Can optionally be part of a Firestore transaction.
     *
     * @param userId - The ID of the user.
     * @param statsData - Partial UserStats data to save or merge.
     * @param transaction - Optional Firestore transaction context.
     * @returns A Promise that resolves when the operation is complete.
     */
    saveOrUpdateStats(userId: string, statsData: Partial<UserStats>, transaction?: Transaction): Promise<void>;

    /**
     * Initializes the career stats document for a user with default zero/null values.
     * Useful primarily within transactions to ensure a document exists before attempting
     * incremental updates, or for initializing a user upon first relevant action.
     * If the document already exists, this might overwrite existing data depending
     * on how saveOrUpdateStats is implemented (merge:true prevents overwrite).
     *
     * @param userId - The ID of the user.
     * @param userName - Optional user name to store during initialization.
     * @param transaction - Optional Firestore transaction context.
     * @returns A Promise resolving to the initialized UserStats object (with local timestamps).
     */
    initializeStats(userId: string, userName?: string, transaction?: Transaction): Promise<UserStats>;
}
