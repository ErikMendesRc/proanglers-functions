/**
 * @fileoverview Defines structures related to ranking calculations,
 * tournament results, national rankings, and user statistics.
 */

// Importe o alias Timestamp do seu arquivo de configuração central
import {Timestamp} from "../config/admin"; // Ajuste o caminho se necessário
import {NationalSegmentType} from "./nationalRankingSegmentType";

import {MinimumQuota, TournamentStatus} from "./enums";

// --- Tournament Ranking Related Types ---

/** Represents essential info of a catch validated for ranking purposes. */
export interface ValidCatchInfo {
    catchId: string;
    userId: string;
    speciesName: string;
    sizeCm: number;
    catchDate: Timestamp; // Usa o alias Timestamp importado
}

/** Intermediate data structure used during ranking calculation for a participant. */
export interface ParticipantRankingData {
    userId: string;
    validCatches: ValidCatchInfo[];
    quotaMet: boolean;
    quotaAverageSize: number;
    biggestSingleFishSize: number;
    numberOfValidCatches: number;
}

/** Represents a participant's final standing within a specific tournament ranking. */
export interface RankedParticipant {
    userId: string;
    position: number;
    averageSize: number;
    biggestSingleFishSize: number;
    numberOfValidCatches: number;
    topCatchesInfo: { catchId: string; sizeCm: number; speciesName: string }[];
    metMinimumQuota: boolean;
}

/** Represents the record for the biggest fish (overall or per species) in a tournament. */
export interface BiggestFishRecord {
    userId: string;
    speciesName: string;
    sizeCm: number;
    catchId: string;
    catchDate: Timestamp; // Usa o alias Timestamp importado
}

/** Defines the structure of the document stored in the `tournament-results` collection. */
export interface TournamentResult {
    tournamentId: string;
    tournamentName: string;
    status: TournamentStatus
    lastUpdated: Timestamp;
    minFishSize: number;
    minimumFishCount: MinimumQuota;
    ranking: RankedParticipant[];
    biggestFishOverall: BiggestFishRecord | null;
    biggestFishBySpecies: Record<string, BiggestFishRecord>;
    participantCount: number; // Usuários com >= 1 captura APROVADA
    rankedParticipantCount: number; // Usuários no ranking (captura APROVADA >= minSize)
    totalCatchCount?: number; // Total de submissões
    approvedCatchCount?: number; // Total APROVADAS
    pendingCatchCount?: number; // Total PENDENTES
    rejectedCatchCount?: number; // Total REJEITADAS
    replacedCatchCount?: number; // Total SUBSTITUÍDAS
    tournamentWeight: number;
}

/**
 * Helper type for updating TournamentResult.
 * It's a Partial<TournamentResult> excluding 'lastUpdated'
 * because the repository handles that automatically.
 */
export type TournamentResultUpdateData = Omit<Partial<TournamentResult>, "lastUpdated">;

// --- National Ranking (Pro Anglers) Related Types ---

/** Contains summarized info of a top 10 finish used for national ranking updates. */
export interface TournamentTop10Result {
    userId: string;
    position: number;
    tournamentId: string;
    totalRankedParticipantsInTournament: number;
}

/** Represents a single entry (user) within a specific national ranking segment. */
export interface NationalRankingEntry {
    userId: string;
    userName?: string;
    totalPoints: number;
    firstPlaces: number;
    podiums: number;
    top10Finishes: number;
    bestSingleTournamentScore: number;
    tournamentsParticipated: string[];
}

/** Represents the record for the biggest fish of a species within a year for a national ranking segment. */
export interface BiggestFishOfYearRecord {
    userId: string;
    userName?: string; // Opcional
    sizeCm: number;
    tournamentId: string;
    catchDate: Timestamp; // Usa o alias Timestamp importado
}

/** Defines the structure of a document in the `pro-anglers-ranking` collection (representing one segment). */
export interface NationalRankingSegment {
    year: number;
    type: NationalSegmentType
    key: string; // e.g., 'overall', 'kayak', 'male'
    rankingEntries: NationalRankingEntry[];
    biggestFishOfYearBySpecies: Record<string, BiggestFishOfYearRecord>; // speciesName -> record
    lastUpdated: Timestamp; // Usa o alias Timestamp importado
}


// --- User Statistics Related Types ---

/** Represents the record for a user's single largest fish ever caught across all tournaments. */
export interface UserBiggestFishEver {
    sizeCm: number;
    speciesName: string;
    tournamentId: string;
    catchId: string;
    catchDate: Timestamp; // Usa o alias Timestamp importado
}

/** Defines the structure of a document in the `user-stats` collection. */
export interface UserStats {
    userId: string; // Adicionado para consistência, embora seja o ID do doc pai
    userName?: string; // Pode ser útil buscar aqui para evitar joins
    championships: number; // Títulos oficiais (1º lugar)
    top3Finishes: number; // Pódios (top 3)
    top10Finishes: number; // Top 10
    tournamentsParticipatedCount: number; // Torneios com captura aprovada
    totalApprovedCatches: number; // Total de capturas aprovadas na carreira
    totalApprovedCatchCm: number; // Soma total dos cm das capturas aprovadas
    biggestFishEver: UserBiggestFishEver | null; // Maior peixe da carreira
    lastUpdated: Timestamp;
    averageCatchSize?: number;
    mostFrequentSpecies?: string;
    firstTournamentDate?: Timestamp;
    lastTournamentDate?: Timestamp;
}

/** Represents summary statistics for a user within a single tournament. */
export interface UserTournamentStats {
    tournamentId: string;
    tournamentName: string;
    userId: string;
    finalPosition?: number;
    approvedCatchCount: number;
    totalApprovedCatchCm: number;
    biggestFishInTournament: {
        catchId: string;
        speciesName: string;
        sizeCm: number;
        catchDate: Timestamp;
    } | null;
    metMinimumQuota: boolean;
    lastUpdated: Timestamp;
}
