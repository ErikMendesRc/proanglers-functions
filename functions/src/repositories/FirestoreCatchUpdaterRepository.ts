import {db, logger, adminInstance} from "../config/admin"; // Ajuste o path
import {CaptureStatusEnum, CaptureStatusType} from "../types/enums"; // Ajuste o path

import {ICatchUpdaterRepository} from "./interfaces/ICatchUpdaterRepository";

const CATCHES_COLLECTION = "catches";

/**
 * Concrete implementation for updating catch document statuses in Firestore.
 */
export class FirestoreCatchUpdaterRepository implements ICatchUpdaterRepository {
  /**
     * Updates the status and updatedAt timestamp of a specific catch document.
     * @param catchId - The ID of the catch document to update.
     * @param status - The new status to set (must be a valid CaptureStatusType).
     * @returns A Promise that resolves when the update is complete.
     * @throws Throws an error if the Firestore update fails.
     */
  async updateCatchStatus(catchId: string, status: CaptureStatusType): Promise<void> {
    const functionPrefix = `[FirestoreCatchUpdater:updateStatus-${catchId}]`;
    logger.debug(`${functionPrefix} Attempting to update status to ${status}.`);
    try {
      const docRef = db.collection(CATCHES_COLLECTION).doc(catchId);
      await docRef.update({
        status: status,
        updatedAt: adminInstance.firestore.FieldValue.serverTimestamp(),
        // Consider adding validatedAt/validatedBy if status is APPROVED/REJECTED
      });
      logger.info(`${functionPrefix} Status successfully updated to ${status}.`);
    } catch (error) {
      logger.error(`${functionPrefix} Error updating status to ${status}:`, error);
      throw error; // Re-throw for the service layer to handle
    }
  }

  /**
     * Specifically marks a catch as REPLACED, setting its status and recording
     * the ID of the catch that caused the replacement. Also updates the timestamp.
     * @param catchId - The ID of the catch document to mark as replaced.
     * @param replacedBecauseOfCatchId - The ID of the newer catch that triggered this replacement.
     * @returns A Promise that resolves when the update is complete.
     * @throws Throws an error if the Firestore update fails.
     */
  async markCatchAsReplaced(catchId: string, replacedBecauseOfCatchId: string): Promise<void> {
    const functionPrefix = `[FirestoreCatchUpdater:markReplaced-${catchId}]`;
    logger.debug(`${functionPrefix} Attempting to mark as REPLACED due to ${replacedBecauseOfCatchId}.`);
    try {
      const docRef = db.collection(CATCHES_COLLECTION).doc(catchId);
      await docRef.update({
        status: CaptureStatusEnum.REPLACED, // Set specific status
        replacedBecauseOfCatchId: replacedBecauseOfCatchId, // Store the cause
        updatedAt: adminInstance.firestore.FieldValue.serverTimestamp(),
      });
      logger.info(`${functionPrefix} Successfully marked as REPLACED due to ${replacedBecauseOfCatchId}.`);
    } catch (error) {
      logger.error(`${functionPrefix} Error marking as REPLACED:`, error);
      throw error; // Re-throw for the service layer to handle
    }
  }
}
