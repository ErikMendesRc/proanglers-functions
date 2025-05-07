// src/services/RankingService.ts
/**
 * @fileoverview Service layer orchestrating tournament ranking updates,
 * finalization, national ranking, and user statistics updates (career and per-tournament).
 * Uses abstracted repositories and calculators following SOLID principles.
 */

// --- Core Dependencies ---
import { logger } from "../config/admin"; // Logger instance

// --- Type Definitions ---
import { Catch, getEffectiveSize } from "../types/catch"; // Certifique-se que getEffectiveSize e Catch usam 'length' ou 'lenght' CORRETAMENTE
import {
  TournamentStatus,
  CaptureStatusEnum,
} from "../types/enums";
import {
  RankedParticipant,
  ValidCatchInfo,
  BiggestFishRecord,
  TournamentTop10Result,
  UserTournamentStats,
  TournamentResultUpdateData,
  NationalRankingEntry,
  BiggestFishOfYearRecord,
  UserStats,
} from "../types/ranking";
import {
  Tournament,
  getNumericMinFishSize,
  getNumericMinimumQuota,
} from "../types/tournament";

// --- Abstractions (Interfaces) ---
import { ICatchRepository } from "../repositories/interfaces/ICatchRepository";
import { ICatchUpdaterRepository } from "../repositories/interfaces/ICatchUpdaterRepository";
import { ITournamentRepository } from "../repositories/interfaces/ITournamentRepository";
import { ITournamentResultsRepository } from "../repositories/interfaces/ITournamentResultsRepository";
import { IUserFishingStatsRepository } from "../repositories/interfaces/IUserFishingStatsRepository";
// import { IUserCareerStatsRepository } from '../repositories/interfaces/IUserCareerStatsRepository'; // Needed for finalization
// (Opcional) Se você quiser atualizar o ranking nacional, injete algo como:
import { INationalRankingSegmentRepository } from "../repositories/interfaces/INationalRankingSegmentRepository";
import { INationalRankingRepository } from "../repositories/interfaces/INationalRankingRepository";
// Se quiser as duas abordagens, você pode injetar ambas, ou escolher a que usar

// --- Concrete Implementations (Only for static calculation logic) ---
import { TournamentRankingCalculator } from "./TournamentRankingCalculator";
import { Timestamp } from "firebase-admin/firestore";
import { NationalSegmentType } from "../types/nationalRankingSegmentType";
import { IUserCareerStatsRepository } from "../repositories/interfaces/IUserCareerStatsRepository";

/**
 * Dependências necessárias para o RankingService.
 * Você pode adicionar repositórios de ranking nacional ou carreira aqui, se quiser.
 */
export interface RankingServiceDependencies {
  tournamentRepo: ITournamentRepository;
  catchRepo: ICatchRepository;
  resultsRepo: ITournamentResultsRepository;
  catchUpdaterRepo: ICatchUpdaterRepository;
  userFishingStatsRepo: IUserFishingStatsRepository;
  userCareerStatsRepo: IUserCareerStatsRepository;

  // (Opcional) para ranking nacional:
  nationalSegmentRepo: INationalRankingSegmentRepository;
  nationalRankingRepo: INationalRankingRepository;
}

export class RankingService {
  private readonly tournamentRepo: ITournamentRepository;
  private readonly catchRepo: ICatchRepository;
  private readonly resultsRepo: ITournamentResultsRepository;
  private readonly catchUpdaterRepo: ICatchUpdaterRepository;
  private readonly userFishingStatsRepo: IUserFishingStatsRepository;
  private readonly userCareerStatsRepo?: IUserCareerStatsRepository;

  // (Opcional) Repositórios de ranking nacional
  private readonly nationalSegmentRepo?: INationalRankingSegmentRepository;
  private readonly nationalRankingRepo?: INationalRankingRepository;

  constructor(deps: RankingServiceDependencies) {
    // Validação robusta das dependências
    const missingDeps = Object.entries(deps)
      .filter(([_, value]) => value === undefined || value === null)
      .map(([key]) => key);
    if (missingDeps.length > 0) {
      const errorMsg = `RankingService: Missing required dependencies: ${missingDeps.join(
        ", "
      )}`;
      logger.error(errorMsg); // Log error before throwing
      throw new Error(errorMsg);
    }
    this.tournamentRepo = deps.tournamentRepo;
    this.catchRepo = deps.catchRepo;
    this.resultsRepo = deps.resultsRepo;
    this.catchUpdaterRepo = deps.catchUpdaterRepo;
    this.userFishingStatsRepo = deps.userFishingStatsRepo;
    this.userCareerStatsRepo = deps.userCareerStatsRepo;

    // Se quiser usar repositórios de ranking nacional:
    this.nationalSegmentRepo = deps.nationalSegmentRepo;
    this.nationalRankingRepo = deps.nationalRankingRepo;

    logger.info("RankingService: Initialized successfully.");
  }

  // ===========================================================================
  // 1) MÉTODO EXISTENTE: Atualização "live" durante o torneio
  // ===========================================================================
  public async updateLiveTournamentResults(
    tournamentId: string,
    triggeringCatchId: string | null = null,
    triggeringCatchAfterData: Catch | null = null
  ): Promise<void> {
    const fn = `[LiveUpdate-${tournamentId}]`;
    logger.info(`${fn} starting… trigger: ${triggeringCatchId ?? "manual"}`);

    try {
      // 1) fetch tournament
      const tournament = await this.tournamentRepo.getTournament(tournamentId);
      if (!tournament) throw new Error(`Tournament ${tournamentId} not found`);

      // skip if not ongoing
      if (
        ![
          TournamentStatus.REGISTRATION_OPEN,
          TournamentStatus.REGISTRATION_CLOSED,
        ].includes(tournament.status as TournamentStatus)
      ) {
        logger.info(`${fn} tournament status is ${tournament.status}; skipping`);
        return;
      }

      // 2) rule values
      const minSize = getNumericMinFishSize(tournament);
      const quota = getNumericMinimumQuota(tournament); // 1 | 3 | 5
      const quotaEnum = tournament.minimumFishCount;
      logger.info(`${fn} rules → minSize=${minSize}cm, quota=${quota}`);

      // 3) all catches
      let allCatches = await this.catchRepo.getAllCatchesForTournament(
        tournamentId
      );

      // 4) enforce quota before anything else
      const quotaViolations = await this.enforceQuota(allCatches, quota, triggeringCatchId);
      if (quotaViolations.length) {
        logger.info(`${fn} quota enforcement: ${quotaViolations.length} catches replaced`);
        // refresh local list after replacements so ranking uses the right set
        allCatches = allCatches.filter(
          (c) => !quotaViolations.includes(c.id as string)
        );
      }

      // 5) split counts & build approved list
      const approved: Catch[] = [];
      let pending = 0,
        rejected = 0,
        replaced = 0;
      for (const c of allCatches) {
        switch (c.status) {
          case CaptureStatusEnum.APPROVED:
            approved.push(c);
            break;
          case CaptureStatusEnum.PENDING:
            pending++;
            break;
          case CaptureStatusEnum.REJECTED:
            rejected++;
            break;
          case CaptureStatusEnum.REPLACED:
            replaced++;
            break;
          default:
            break;
        }
      }
      replaced += quotaViolations.length; // include new ones

      logger.info(`${fn} counts → app=${approved.length}, pen=${pending}, rej=${rejected}, rep=${replaced}`);

      const valid: ValidCatchInfo[] = approved
        .map((c) => {
          const size = getEffectiveSize(c);
          return typeof size === "number" && size >= minSize
            ? {
                catchId: c.id!,
                userId: c.userId,
                speciesName: c.fishSpeciesName,
                sizeCm: size,
                catchDate: c.catchDate,
              }
            : null;
        })
        .filter(Boolean) as ValidCatchInfo[];

      logger.info(`${fn} valid for ranking = ${valid.length}`);

      // 7) calculate ranking
      const { biggestFishOverall, biggestFishBySpecies } =
        TournamentRankingCalculator.findBiggestFishes(valid);
      const ranking = TournamentRankingCalculator.calculateRanking(valid, quota);

      // 8) save results
      const resultDoc: TournamentResultUpdateData = {
        tournamentId,
        tournamentName: tournament.name,
        status: TournamentStatus.REGISTRATION_OPEN,
        minFishSize: minSize,
        minimumFishCount: quotaEnum,
        ranking,
        biggestFishOverall: biggestFishOverall ?? null,
        biggestFishBySpecies,
        participantCount: new Set(approved.map((c) => c.userId)).size,
        rankedParticipantCount: ranking.length,
        totalCatchCount: allCatches.length,
        approvedCatchCount: approved.length,
        pendingCatchCount: pending,
        rejectedCatchCount: rejected,
        replacedCatchCount: replaced,
      };

      await this.resultsRepo.saveOrUpdateResults(tournamentId, resultDoc);
      logger.info(`${fn} results saved`);

      // 9) per‑user stats (uses *approved* list, already quota‑clean)
      await this.updateUserTournamentStats(
        tournamentId,
        approved,
        tournament.name,
        quota
      );
    } catch (err: any) {
      logger.error(`${fn} FAILED: ${err.message}`, err);
      await this.resultsRepo.updateStatus(tournamentId, TournamentStatus.RANKING_FAILED);
      throw err;
    }
  }

  private async enforceQuota(
    allCatches: Catch[],
    quota: 1 | 3 | 5,
    triggerCatchId: string | null
  ): Promise<string[]> {
    const fn = `[Quota]`;

    // group approved by user
    const byUser: Record<string, Catch[]> = {};
    for (const c of allCatches) {
      if (c.status !== CaptureStatusEnum.APPROVED) continue;
      if (!c.userId) continue;
      (byUser[c.userId] = byUser[c.userId] || []).push(c);
    }

    const toReplace: string[] = [];

    for (const userId of Object.keys(byUser)) {
      const list = byUser[userId].sort(
        (a, b) => getEffectiveSize(b) - getEffectiveSize(a)
      );
      const extras = list.slice(quota); // everything after quota
      extras.forEach((c) => {
        if (c.id) toReplace.push(c.id);
      });
    }

    if (!toReplace.length) return [];

    // write in firestore (parallel)
    await Promise.allSettled(
      toReplace.map((id) =>
        this.catchUpdaterRepo.markCatchAsReplaced(
          id,
          triggerCatchId ?? "quota_exceeded"
        )
      )
    );

    logger.info(`${fn} marked ${toReplace.length} catches as REPLACED`);
    return toReplace;
  }

  // ===========================================================================
  // 2) MÉTODO EXISTENTE: Update de stats de cada usuário no torneio
  // ===========================================================================
  private async updateUserTournamentStats(
    tournamentId: string,
    approvedCatchesInput: Catch[],
    tournamentName: string,
    minQuota: 1 | 3 | 5
  ): Promise<void> {
    const functionPrefix = `[UserTournStats-${tournamentId}]`;
    logger.info(
      `${functionPrefix} Updating user-tournament stats based on ${approvedCatchesInput.length} approved catches...`
    );

    const catchesByUser = approvedCatchesInput.reduce((acc, cur) => {
      if (!cur || !cur.userId) {
        logger.warn(
          `${functionPrefix} Skipping an approved catch due to missing userId. ID: ${
            cur?.id ?? "N/A"
          }`
        );
        return acc;
      }
      (acc[cur.userId] = acc[cur.userId] || []).push(cur);
      return acc;
    }, {} as Record<string, Catch[]>);

    const userIds = Object.keys(catchesByUser);
    logger.info(
      `${functionPrefix} Found ${userIds.length} distinct users with approved catches.`
    );
    const userStatPromises: Promise<void>[] = [];

    for (const userId of userIds) {
      const userCatches = catchesByUser[userId];
      logger.debug(
        `${functionPrefix} Processing stats for user ${userId} with ${userCatches.length} approved catches.`
      );

      if (!userCatches || userCatches.length === 0) {
        logger.warn(
          `${functionPrefix} User ${userId} listed but has no catches. Skipping stats update.`
        );
        continue;
      }

      userCatches.sort((a, b) => {
        const sizeA = getEffectiveSize(a);
        const sizeB = getEffectiveSize(b);
        if (typeof sizeB !== "number") return -1;
        if (typeof sizeA !== "number") return 1;
        return sizeB - sizeA;
      });

      const approvedCatchCount = userCatches.length;
      let totalApprovedCatchCmSum = 0;
      let validCatchesForSum = 0;
      userCatches.forEach((c) => {
        const size = getEffectiveSize(c);
        if (typeof size === "number" && !isNaN(size)) {
          totalApprovedCatchCmSum += size;
          validCatchesForSum++;
        } else {
          logger.warn(
            `${functionPrefix} User ${userId}, Catch ID ${c.id}: Invalid size (${size}). Excluding from sum.`
          );
        }
      });
      const totalApprovedCatchCm = parseFloat(
        totalApprovedCatchCmSum.toFixed(2)
      );

      // Maior peixe
      const biggestFishInList = userCatches[0];
      let biggestFishDataForStats: UserTournamentStats["biggestFishInTournament"] =
        null;
      if (biggestFishInList) {
        const biggestSize = getEffectiveSize(biggestFishInList);
        if (
          biggestFishInList.id &&
          biggestFishInList.fishSpeciesName &&
          typeof biggestSize === "number" &&
          biggestFishInList.catchDate
        ) {
          biggestFishDataForStats = {
            catchId: biggestFishInList.id,
            speciesName: biggestFishInList.fishSpeciesName,
            sizeCm: biggestSize,
            catchDate: biggestFishInList.catchDate,
          };
        }
      }

      const metMinimumQuota = approvedCatchCount >= minQuota;

      const statsData: Partial<UserTournamentStats> = {
        tournamentName: tournamentName,
        approvedCatchCount: approvedCatchCount,
        totalApprovedCatchCm: totalApprovedCatchCm,
        biggestFishInTournament: biggestFishDataForStats,
        metMinimumQuota: metMinimumQuota,
      };

      userStatPromises.push(
        this.userFishingStatsRepo
          .saveOrUpdateStats(userId, tournamentId, statsData)
          .catch((err: any) =>
            logger.error(
              `${functionPrefix} FAILED stats update for user ${userId}. Error: ${err.message}`,
              {
                error: err,
                userId,
                tournamentId,
                statsData,
              }
            )
          )
      );
    }

    const results = await Promise.allSettled(userStatPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - successCount;

    if (failedCount > 0) {
      logger.warn(
        `${functionPrefix} User-tournament stats update finished for ${userIds.length} users. Success: ${successCount}, Failed: ${failedCount}. Check previous errors.`
      );
    } else {
      logger.info(
        `${functionPrefix} User-tournament stats update successfully finished for all ${userIds.length} users.`
      );
    }
  }

  // ===========================================================================
  // 3) FINALIZAR TORNEIO E DISPARAR ATUALIZAÇÃO NACIONAL
  // ===========================================================================
  public async finalizeTournamentAndTriggerNationalUpdate(
  tournamentId: string
): Promise<void> {
  const fn = `[Finalize-${tournamentId}]`;
  logger.warn(`${fn} Starting finalization logic…`);

  try {
    /* 1 ─ Resultados finais já calculados ------------------------------ */
    const finalResults = await this.resultsRepo.getResults(tournamentId);
    if (!finalResults)
      throw new Error(`No final results for ${tournamentId}`);

    /* 2 ─ Dados do torneio -------------------------------------------- */
    const tournamentData = await this.tournamentRepo.getTournament(
      tournamentId
    );
    if (!tournamentData)
      throw new Error(`Tournament ${tournamentId} not found`);

    /* 3 ─ Trava o torneio (marca como FINALIZING) --------------------- */
    await this.tournamentRepo.updateTournament(tournamentId, {
      status: TournamentStatus.FINALIZED_RANKED,
    });
    logger.info(`${fn} Tournament status set to FINALIZING.`);

    /* 4 ─ Calcula peso uma única vez ---------------------------------- */
    const minQuota = getNumericMinimumQuota(tournamentData);
    const minSize = getNumericMinFishSize(tournamentData);
    const tournamentWeight = RankingService.calculateTournamentWeight(
      minQuota,
      minSize
    );
    logger.info(`${fn} Calculated tournamentWeight = ${tournamentWeight}.`);

    /* 5 ─ Atualiza doc tournament-results com o peso ------------------ */
    await this.resultsRepo.saveOrUpdateResults(tournamentId, {
      tournamentWeight,
      status: TournamentStatus.FINALIZED_RANKED
    });

    /* 6 ─ Extrai Top-10 (sem peso) ------------------------------------ */
    const fullRanking = finalResults.ranking ?? [];
    const totalRanked = fullRanking.length;

    const top10: TournamentTop10Result[] = fullRanking
      .slice(0, 10)
      .map((rp) => ({
        userId: rp.userId,
        tournamentId: tournamentId,
        position: rp.position,
        totalRankedParticipantsInTournament: totalRanked,
      }));

    /* 7 ─ Recordes de maior peixe ------------------------------------- */
    const biggestFishRecords: BiggestFishRecord[] = [];
    if (finalResults.biggestFishOverall)
      biggestFishRecords.push(finalResults.biggestFishOverall);
    if (finalResults.biggestFishBySpecies)
      biggestFishRecords.push(
        ...Object.values(finalResults.biggestFishBySpecies)
      );

    /* 8 ─ Ranking nacional / estatísticas ----------------------------- */
    await this.updateNationalRankingAndUserCareerStats(
      top10,
      biggestFishRecords,
      tournamentData
    );

    /* 9 ─ Finaliza ----------------------------------------------------- */
    await this.tournamentRepo.updateTournament(tournamentId, {
      status: TournamentStatus.FINALIZED_RANKED as any,
    });
    logger.info(`${fn} Tournament status set to FINALIZED_RANKED.`);
  } catch (err: any) {
    logger.error(`${fn} Error: ${err.message}`, err);
    await this.tournamentRepo
      .updateTournament(tournamentId, {
        status: TournamentStatus.RANKING_FAILED as any,
      })
      .catch((e) =>
        logger.error(
          `${fn} Also failed setting RANKING_FAILED: ${e.message}`,
          e
        )
      );
    throw err;
  }
}


  // ===========================================================================
  // 4) ATUALIZAÇÃO DO RANKING NACIONAL (USANDO REGRAS DE PONTUAÇÃO)
  // ===========================================================================
  // Inside src/services/RankingService.ts
  public async updateNationalRankingAndUserCareerStats(
    top10Results: TournamentTop10Result[],
    biggestFishRecords: BiggestFishRecord[],
    tournamentData: Tournament
  ): Promise<void> {
    const fn = `[NtlUpdate-${tournamentData.id}]`;
    logger.warn(`${fn} Updating national rankings…`);

    try {
      // 1 ─ Fetch tournament weight
      const finalResults = await this.resultsRepo.getResults(tournamentData.id);
      const tournamentWeight = finalResults?.tournamentWeight ?? 1;
      logger.info(`${fn} tournamentWeight = ${tournamentWeight}.`);

      // 2 ─ Build entries from Top-10
      const updatedEntries: NationalRankingEntry[] = top10Results.map(
        (item) => {
          const basePts = RankingService.calculateBaseNationalPoints(
            item.position,
            item.totalRankedParticipantsInTournament
          );
          const totalPts = parseFloat((basePts * tournamentWeight).toFixed(2));

          return {
            userId: item.userId,
            totalPoints: totalPts,
            firstPlaces: item.position === 1 ? 1 : 0,
            podiums: item.position <= 3 ? 1 : 0,
            top10Finishes: 1,
            bestSingleTournamentScore: totalPts,
            tournamentsParticipated: [tournamentData.id],
          };
        }
      );

      // 3 ─ Persist / merge by user across all tournaments
      if (this.nationalRankingRepo) {
        for (const entry of updatedEntries) {
          const existing = await this.nationalRankingRepo.getEntryByUserId(
            entry.userId
          );
          if (existing) {
            existing.totalPoints += entry.totalPoints;
            existing.firstPlaces += entry.firstPlaces;
            existing.podiums += entry.podiums;
            existing.top10Finishes += entry.top10Finishes;
            existing.bestSingleTournamentScore = Math.max(
              existing.bestSingleTournamentScore,
              entry.bestSingleTournamentScore
            );
            existing.tournamentsParticipated = Array.from(
              new Set([
                ...existing.tournamentsParticipated,
                ...entry.tournamentsParticipated,
              ])
            );
            await this.nationalRankingRepo.saveOrUpdateEntry(
              existing.userId,
              existing
            );
          } else {
            await this.nationalRankingRepo.saveOrUpdateEntry(
              entry.userId,
              entry
            );
          }
        }

        // Batch sort and save
        const allEntries = await this.nationalRankingRepo.getAllEntries();
        RankingService.sortNationalRankingEntries(allEntries);
        await this.nationalRankingRepo.saveAllEntries(allEntries);
        logger.info(
          `${fn} ${allEntries.length} entries saved & sorted in national-ranking.`
        );
      }

      if (this.userCareerStatsRepo) {
        await this.updateUserCareerStatsSummary(
          top10Results.map(
            (rp) =>
              ({
                userId: rp.userId,
                position: rp.position,
              } as RankedParticipant)
          ),
          biggestFishRecords,
          tournamentData
        );
      }

      // 4 ─ Prepare segment IDs: overall + by modality
      const startDate =
        tournamentData.startDate instanceof Timestamp
          ? tournamentData.startDate.toDate()
          : new Date(tournamentData.startDate);
      const year = startDate.getFullYear();
      const overallDocId = `${year}-overall-ALL`;
      const modalityKey = tournamentData.modality; // uses TournamentModality enum values
      const modalityDocId = `${year}-${modalityKey}-ALL`;

      // 5 ─ Upsert helper for segments
      const upsertSegment = async (docId: string, key: string) => {
        const base = await this.nationalSegmentRepo!.getSegment(docId);
        const segment = base || {
          year,
          type: NationalSegmentType.Overall,
          key,
          rankingEntries: [] as NationalRankingEntry[],
          biggestFishOfYearBySpecies: {} as Record<
            string,
            BiggestFishOfYearRecord
          >,
          lastUpdated: Timestamp.fromDate(new Date()),
        };

        // Merge ranking entries
        for (const entry of updatedEntries) {
          const existing = segment.rankingEntries.find(
            (e) => e.userId === entry.userId
          );
          if (existing) {
            existing.totalPoints += entry.totalPoints;
            existing.firstPlaces += entry.firstPlaces;
            existing.podiums += entry.podiums;
            existing.top10Finishes += entry.top10Finishes;
            existing.bestSingleTournamentScore = Math.max(
              existing.bestSingleTournamentScore,
              entry.bestSingleTournamentScore
            );
            existing.tournamentsParticipated = Array.from(
              new Set([
                ...existing.tournamentsParticipated,
                ...entry.tournamentsParticipated,
              ])
            );
          } else {
            segment.rankingEntries.push({ ...entry });
          }
        }

        // Sort before saving
        RankingService.sortNationalRankingEntries(segment.rankingEntries);

        // Update biggest fish records
        for (const bf of biggestFishRecords) {
          const sp = bf.speciesName;
          const current = segment.biggestFishOfYearBySpecies[sp];
          if (!current || bf.sizeCm > current.sizeCm) {
            segment.biggestFishOfYearBySpecies[sp] = {
              userId: bf.userId,
              sizeCm: bf.sizeCm,
              tournamentId: tournamentData.id,
              catchDate: bf.catchDate,
            };
          }
        }

        // Finalize and save
        segment.lastUpdated = Timestamp.fromDate(new Date());
        await this.nationalSegmentRepo!.saveOrUpdateSegment(segment);
        logger.info(`${fn} Segment '${docId}' saved & sorted.`);
      };

      // 6 ─ Upsert both segments
      if (this.nationalSegmentRepo) {
        await upsertSegment(overallDocId, "ALL");
        await upsertSegment(modalityDocId, modalityKey);
      }

      logger.warn(`${fn} National rankings updated successfully.`);
    } catch (err: any) {
      logger.error(`${fn} Error: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Atualiza o sumário de carreira de cada usuário pós-torneio
   */
  private async updateUserCareerStatsSummary(
    fullRanking: RankedParticipant[],
    biggestFishRecords: BiggestFishRecord[],
    tournamentData: Tournament
  ): Promise<void> {
    const fn = `[CareerUpdate-${tournamentData.id}]`;
    logger.info(
      `${fn} Updating career stats for ${fullRanking.length} usuários…`
    );

    if (!this.userCareerStatsRepo) return;

    // Índice de recordes de peixe por usuário
    const biggestFishByUser = biggestFishRecords.reduce<
      Record<string, BiggestFishRecord>
    >((acc, bf) => {
      if (!acc[bf.userId] || bf.sizeCm > acc[bf.userId].sizeCm) {
        acc[bf.userId] = bf;
      }
      return acc;
    }, {});

    const tournamentDate =
      tournamentData.startDate instanceof Timestamp
        ? tournamentData.startDate.toDate()
        : new Date(tournamentData.startDate);

    for (const rp of fullRanking) {
      const uid = rp.userId;
      try {
        // 1) busca ou inicializa o doc de stats
        let career =
          (await this.userCareerStatsRepo.getStats(uid)) ??
          (await this.userCareerStatsRepo.initializeStats(uid));

        // 2) calcula deltas básicos
        const partial: Partial<UserStats> = {
          tournamentsParticipatedCount:
            (career.tournamentsParticipatedCount ?? 0) + 1,
          top10Finishes:
            (career.top10Finishes ?? 0) + (rp.position <= 10 ? 1 : 0),
          top3Finishes: (career.top3Finishes ?? 0) + (rp.position <= 3 ? 1 : 0),
          championships:
            (career.championships ?? 0) + (rp.position === 1 ? 1 : 0),
          lastTournamentDate: Timestamp.fromDate(tournamentDate),
          firstTournamentDate:
            career.firstTournamentDate ??
            (tournamentDate instanceof Date
              ? Timestamp.fromDate(tournamentDate)
              : tournamentDate),
        };

        // 3) atualiza maior peixe de carreira, se houver
        const bf = biggestFishByUser[uid];
        if (bf) {
          const current = career.biggestFishEver;
          if (!current || bf.sizeCm > current.sizeCm) {
            partial.biggestFishEver = {
              sizeCm: bf.sizeCm,
              speciesName: bf.speciesName,
              catchDate: bf.catchDate,
              tournamentId: tournamentData.id,
              catchId: bf.catchId,
            };
          }
        }

        // 4) persiste merge no Firestore
        await this.userCareerStatsRepo.saveOrUpdateStats(uid, partial);
        logger.debug(`${fn} Career stats updated for user ${uid}.`);
      } catch (err: any) {
        logger.error(
          `${fn} Failed updating career for user ${uid}: ${err.message}`,
          err
        );
      }
    }

    logger.info(`${fn} Career stats update concluído.`);
  }

  // ===========================================================================
  // 5) MÉTODOS ESTÁTICOS (PONTUAÇÃO E ORDENAÇÃO) - NÃO REMOVIDOS
  // ===========================================================================
  /** Calculates tournament weight based on quota and min size. */
  private static calculateTournamentWeight(
    minimumFishCount: 1 | 3 | 5,
    minFishSize: number
  ): number {
    let cotaWeight = 1.0;
    if (minimumFishCount === 1) cotaWeight = 0.8;
    else if (minimumFishCount === 5) cotaWeight = 1.2;
    const baseSize = 30;
    const maxSizeImpact = 60;
    let sizeWeight = 1.0;
    if (minFishSize < baseSize) {
      sizeWeight = 0.9;
    } else if (minFishSize > baseSize && maxSizeImpact > baseSize) {
      const increaseFactor = Math.min(
        0.3,
        ((minFishSize - baseSize) / (maxSizeImpact - baseSize)) * 0.3
      );
      sizeWeight = 1.0 + increaseFactor;
    }
    return parseFloat((cotaWeight * sizeWeight).toFixed(3));
  }

  /** Calculates base national points for a position. */
  private static calculateBaseNationalPoints(
    position: number,
    totalParticipants: number
  ): number {
    if (position < 1 || position > 10 || totalParticipants <= 0) return 0;
    const effectiveTotal = Math.max(position, totalParticipants);
    const FIXED_POINTS: Record<number, number> = {
      1: 100,
      2: 90,
      3: 80,
      4: 70,
      5: 60,
      6: 50,
      7: 40,
      8: 30,
      9: 20,
      10: 10,
    };
    const fixedPoints = FIXED_POINTS[position] || 0;
    const decimalPart =
      effectiveTotal > 0 ? (effectiveTotal - position + 1) / effectiveTotal : 0;
    return parseFloat((fixedPoints + decimalPart).toFixed(4));
  }

  /** Sorts national ranking entries based on tie-breaking rules. */
  private static sortNationalRankingEntries(
    ranking: NationalRankingEntry[]
  ): NationalRankingEntry[] {
    ranking.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
      if (b.podiums !== a.podiums) return b.podiums - a.podiums;
      if (b.top10Finishes !== a.top10Finishes)
        return b.top10Finishes - a.top10Finishes;
      if (b.bestSingleTournamentScore !== a.bestSingleTournamentScore)
        return b.bestSingleTournamentScore - a.bestSingleTournamentScore;
      return a.userId.localeCompare(b.userId);
    });
    return ranking;
  }
}
