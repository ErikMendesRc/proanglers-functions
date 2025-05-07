/**
 * @fileoverview Defines the structure for Tournament definition documents
 * in Firestore and provides helper functions for rule interpretation.
 */

import * as admin from "firebase-admin";

import {logger, Timestamp} from "../config/admin";

import {
  MinimumQuota, TournamentMode, TournamentModality, Gender, TournamentStatus,
} from "./enums"; // Line broken for length

/** Represents a tournament definition document stored in Firestore. */
export interface Tournament {
  /** Firestore document ID. */
  id: string;
  name: string;
  location: string;
  startDate: Timestamp | Date | string;
  endDate: Timestamp | Date | string;
  registrationFee: string;
  isOfficial: boolean;
  allowedSpecies: string[];
  photoUrl: string | null;
  description: string | null;
  mode: TournamentMode;
  modality: TournamentModality;
  minFishSize: string;
  minimumFishCount: MinimumQuota;
  organizerId: string;
  moderators: string[];
  passwordList: string[];
  weekPassword?: string;
  isVirtual: boolean;
  tournamentGender: Gender;
  acceptRegistrationAfterStart: boolean;
  status: TournamentStatus | string;
  createdAt: admin.firestore.Timestamp | Date | string;
  updatedAt: admin.firestore.Timestamp | Date | string;
  isVerified: boolean;
}

/**
 * Safely parses the minimum fish size from the tournament definition.
 * @param {Tournament} t The Tournament object.
 * @return {number} The minimum fish size as a number (cm),
 *   defaulting to 0 if invalid.
 */
export const getNumericMinFishSize = (t: Tournament): number => {
  const size = parseInt(t.minFishSize, 10);
  if (isNaN(size) || size < 0) {
    logger.warn(
      `[${t.id}] Invalid minFishSize '${t.minFishSize}'. Defaulting to 0.`
    ); // Line broken
    return 0;
  }
  return size;
};

/**
 * Safely parses the minimum fish quota from the tournament definition
 * string enum ('1', '3', '5') to its numeric literal type (1, 3, or 5).
 *
 * @param {Tournament} t The Tournament object.
 * @return {1 | 3 | 5} The minimum quota as a number (1, 3, or 5),
 *   defaulting to 1 if the value is invalid or unrecognized.
 */
export const getNumericMinimumQuota = (t: Tournament): 1 | 3 | 5 => {
  switch (t.minimumFishCount) {
  case MinimumQuota.ONE:
    return 1;
  case MinimumQuota.THREE:
    return 3;
  case MinimumQuota.FIVE:
    return 5;
  default:
    // Log a warning if the value from the DB doesn't match the enum
    logger.warn(
      `[${t.id}] Unrecognized minimumFishCount '${t.minimumFishCount}'. Defaulting to 1.`
    );
    return 1; // Default to 1 as the safest minimum
  }
};
