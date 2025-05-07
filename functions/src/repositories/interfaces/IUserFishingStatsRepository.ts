import {UserTournamentStats} from "../../types/ranking"; // Precisamos criar este tipo

export interface IUserFishingStatsRepository {
    saveOrUpdateStats(userId: string, tournamentId: string, statsData: Partial<UserTournamentStats>): Promise<void>;
}
