import {Catch} from "../../types/catch";

export interface ICatchRepository {
    getAllApprovedCatches(tournamentId: string): Promise<Catch[]>;
    getAllCatchesForTournament(tournamentId: string): Promise<Catch[]>;
}
