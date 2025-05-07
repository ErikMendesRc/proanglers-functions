/**
 * @fileoverview Defines the structure for Catch documents in Firestore
 * and provides helper functions related to catch data.
 */

import {Timestamp} from "../config/admin";

import {CaptureStatusType} from "./enums";

/** Represents a fish capture document stored in Firestore. */
export interface Catch {
  id?: string;
  adjustmentNote?: string;
  catchDate: Timestamp;
  fishSpeciesName: string;
  length: number;
  photoUrl: string;
  rejectionReason?: string;
  sizeAdjustment?: number;
  status: CaptureStatusType;
  submitCatchDate: Timestamp;
  tournamentId: string;
  userId: string;
  updatedAt?: Timestamp;
  validatedAt?: Timestamp;
  validatedBy?: string;
  videoUrl?: string;
}

/**
 * Calculates the effective size of a catch, considering administrative adjustments.
 *
 * @param {Catch} c - The Catch object.
 * @return {number} The effective size in cm (using sizeAdjustment if valid; otherwise, the original length).
 */
export const getEffectiveSize = (c: Catch): number => {
  // Ensure sizeAdjustment is a number and positive before using it.
  const adjustedSize =
    typeof c.sizeAdjustment === "number" && c.sizeAdjustment > 0 ?
      c.sizeAdjustment :
      null;
  return adjustedSize ?? c.length;
};
