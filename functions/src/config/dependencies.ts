// src/config/dependencies.ts
import { FirestoreCatchRepository } from "../repositories/FirestoreCatchRepository";
import { FirestoreCatchUpdaterRepository } from "../repositories/FirestoreCatchUpdaterRepository";
import { FirestoreNationalRankingRepository } from "../repositories/FirestoreNationalRankingRepository";
import { FirestoreNationalRankingSegmentRepository } from "../repositories/FirestoreNationalRankingSegmentRepository";
import { FirestoreTournamentRepository } from "../repositories/FirestoreTournamentRepository";
import { FirestoreTournamentResultsRepository } from "../repositories/FirestoreTournamentResultsRepository";
import { FirestoreUserCareerStatsRepository } from "../repositories/FirestoreUserCareerStatsRepository";
import { FirestoreUserFishingStatsRepository } from "../repositories/FirestoreUserFishingStatsRepository";
import { RankingService, RankingServiceDependencies } from "../services/RankingService";

export function createDependencies(): { rankingService: RankingService } {
  const tournamentRepo = new FirestoreTournamentRepository();
  const catchRepo = new FirestoreCatchRepository();
  const resultsRepo = new FirestoreTournamentResultsRepository();
  const catchUpdaterRepo = new FirestoreCatchUpdaterRepository();
  const userFishingStatsRepo = new FirestoreUserFishingStatsRepository();
  const nationalRankingRepo = new FirestoreNationalRankingRepository();
  const nationalSegmentRepo = new FirestoreNationalRankingSegmentRepository();
  const userCareerStatsRepo = new FirestoreUserCareerStatsRepository();

  const rankingServiceDeps: RankingServiceDependencies = {
    tournamentRepo,
    catchRepo,
    resultsRepo,
    catchUpdaterRepo,
    userFishingStatsRepo,
    nationalRankingRepo,
    nationalSegmentRepo,
    userCareerStatsRepo
  };

  const rankingService = new RankingService(rankingServiceDeps);

  return {
    rankingService,
  };
}