import {TournamentResult} from "../../types/ranking";

export type TournamentResultUpdateData = Omit<Partial<TournamentResult>, "lastUpdated">;

export interface ITournamentResultsRepository {
    saveOrUpdateResults(tournamentId: string, data: TournamentResultUpdateData): Promise<void>;
    deleteResults(tournamentId: string): Promise<void>;
    updateStatus(tournamentId: string, status: TournamentResult["status"]): Promise<void>;
    getResults(tournamentId: string): Promise<TournamentResult | null>;
}
