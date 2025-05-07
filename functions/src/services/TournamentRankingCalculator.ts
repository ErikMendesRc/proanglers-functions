/**
 * @fileoverview Contains pure logic for calculating tournament rankings
 * and finding biggest fishes based on provided catch data.
 */

import {logger} from "../config/admin"; // Assuming logger setup
import {
  RankedParticipant,
  ValidCatchInfo,
  BiggestFishRecord,
  ParticipantRankingData,
} from "../types/ranking"; // Adjust path if needed

export class TournamentRankingCalculator {
  /**
     * Finds the overall biggest fish and biggest fish per species from a list of valid catches.
     * Pure function: Depends only on its inputs.
     * @param {ValidCatchInfo[]} validCatches - An array of valid catches (already filtered for minSize).
     * @returns {{ biggestFishOverall?: BiggestFishRecord, biggestFishBySpecies: Record<string, BiggestFishRecord> }}
     */
  public static findBiggestFishes(validCatches: ValidCatchInfo[]): {
        biggestFishOverall?: BiggestFishRecord;
        biggestFishBySpecies: Record<string, BiggestFishRecord>;
    } {
    let biggestFishOverall: BiggestFishRecord | undefined = undefined;
    const biggestFishBySpecies: Record<string, BiggestFishRecord> = {};

    if (!validCatches || validCatches.length === 0) {
      logger.debug("[Calculator.findBiggestFishes] No valid catches provided.");
      return {biggestFishOverall: undefined, biggestFishBySpecies: {}};
    }

    for (const fish of validCatches) {
      // Check for overall biggest
      if (!biggestFishOverall || fish.sizeCm > biggestFishOverall.sizeCm) {
        biggestFishOverall = {
          userId: fish.userId,
          speciesName: fish.speciesName,
          sizeCm: fish.sizeCm,
          catchId: fish.catchId,
          catchDate: fish.catchDate,
        };
      }
      // Check for biggest by species
      const species = fish.speciesName;
      if (!biggestFishBySpecies[species] || fish.sizeCm > biggestFishBySpecies[species].sizeCm) {
        biggestFishBySpecies[species] = {
          userId: fish.userId,
          speciesName: species,
          sizeCm: fish.sizeCm,
          catchId: fish.catchId,
          catchDate: fish.catchDate,
        };
      }
    }
    logger.debug(`[Calculator.findBiggestFishes] Found overall: ${biggestFishOverall?.sizeCm}cm, Species: ${Object.keys(biggestFishBySpecies).length}`);
    return {biggestFishOverall, biggestFishBySpecies};
  }

  /**
     * Calculates tournament ranking based on valid catches and rules.
     * Pure function: Depends only on its inputs.
     * @param {ValidCatchInfo[]} validCatches - Array of approved catches meeting the minimum size.
     * @param {1 | 3 | 5} minQuota - The minimum number of catches required (parsed numerically).
     * @returns {RankedParticipant[]} The calculated and sorted ranking list.
     */
  public static calculateRanking(
    validCatches: ValidCatchInfo[],
    minQuota: 1 | 3 | 5 // Use the numeric type directly
  ): RankedParticipant[] {
    if (!validCatches || validCatches.length === 0) {
      logger.debug("[Calculator.calculateRanking] No valid catches, returning empty ranking.");
      return [];
    }

    // 1. Group valid catches by user
    const catchesByUser = validCatches.reduce((acc, cur) => {
      (acc[cur.userId] = acc[cur.userId] || []).push(cur);
      return acc;
    }, {} as Record<string, ValidCatchInfo[]>);

    const participantUserIds = Object.keys(catchesByUser);

    // 2. Calculate preliminary data for each participant
    const preliminaryData: ParticipantRankingData[] = participantUserIds.map((userId) => {
      const userCatches = catchesByUser[userId];
      userCatches.sort((a, b) => b.sizeCm - a.sizeCm); // Sort user's catches

      const numberOfValidCatches = userCatches.length;
      const quotaMet = numberOfValidCatches >= minQuota;

      const topCatchesForQuota = userCatches.slice(0, minQuota);
      let quotaAverageSize = 0;
      if (quotaMet && topCatchesForQuota.length > 0) {
        const sum = topCatchesForQuota.reduce((acc, c) => acc + c.sizeCm, 0);
        quotaAverageSize = parseFloat((sum / minQuota).toFixed(2)); // Divide by actual quota
      }

      const biggestSingleFishSize = numberOfValidCatches > 0 ? userCatches[0].sizeCm : 0;

      return {
        userId,
        validCatches: userCatches,
        quotaMet,
        quotaAverageSize,
        biggestSingleFishSize,
        numberOfValidCatches,
      };
    });

    // 3. Separate and Sort participants
    const participantsWhoMetQuota = preliminaryData.filter((p) => p.quotaMet);
    const participantsBelowQuota = preliminaryData.filter((p) => !p.quotaMet);

    // Sort met quota: Avg Size DESC, then Biggest Fish DESC
    participantsWhoMetQuota.sort((a, b) => {
      if (b.quotaAverageSize !== a.quotaAverageSize) {
        return b.quotaAverageSize - a.quotaAverageSize;
      }
      return b.biggestSingleFishSize - a.biggestSingleFishSize;
    });

    // Sort below quota: Num Catches DESC, then Sum Sizes DESC, then Biggest Fish DESC
    participantsBelowQuota.sort((a, b) => {
      if (b.numberOfValidCatches !== a.numberOfValidCatches) {
        return b.numberOfValidCatches - a.numberOfValidCatches;
      }
      const sumA = a.validCatches.reduce((s, c) => s + c.sizeCm, 0);
      const sumB = b.validCatches.reduce((s, c) => s + c.sizeCm, 0);
      if (sumB !== sumA) {
        return sumB - sumA;
      }
      return b.biggestSingleFishSize - a.biggestSingleFishSize;
    });

    // 4. Combine sorted lists
    const sortedParticipants = [...participantsWhoMetQuota, ...participantsBelowQuota];

    // 5. Assign final positions and format output
    const finalRanking: RankedParticipant[] = sortedParticipants.map((p, index) => {
      const contributingCatches = p.validCatches.slice(0, minQuota); // Show top N contributing catches
      return {
        userId: p.userId,
        position: index + 1,
        averageSize: p.quotaAverageSize, // 0 if quota not met
        biggestSingleFishSize: p.biggestSingleFishSize,
        numberOfValidCatches: p.numberOfValidCatches,
        topCatchesInfo: contributingCatches.map((c) => ({
          catchId: c.catchId,
          sizeCm: c.sizeCm,
          speciesName: c.speciesName,
        })),
        metMinimumQuota: p.quotaMet,
      };
    });

    logger.debug(`[Calculator.calculateRanking] Calculated ranking for ${finalRanking.length} participants.`);
    return finalRanking;
  }
}
