import { NationalRankingEntry } from "../../types/ranking";

export interface INationalRankingRepository {
    getAllEntries(): Promise<NationalRankingEntry[]>;
    getEntryByUserId(userId: string): Promise<NationalRankingEntry | null>;
    saveOrUpdateEntry(userId: string, data: Partial<NationalRankingEntry>): Promise<void>;
    saveAllEntries(entries: NationalRankingEntry[]): Promise<void>;
}