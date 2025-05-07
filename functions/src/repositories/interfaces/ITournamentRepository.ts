import {Tournament} from "../../types/tournament"; // Ajuste o path

export interface ITournamentRepository {
    getTournament(tournamentId: string): Promise<Tournament | null>;
    updateTournament(tournamentId: string, data: Partial<Tournament>): Promise<void>;
}
