import { onTaskDispatched, TaskQueueOptions } from "firebase-functions/v2/tasks";
import { logger } from "../config/admin";
import { createDependencies } from "../config/dependencies";
import { Catch } from "../types/catch";
import {
    RANKING_REGION,
    RANKING_TASK_RETRY_ATTEMPTS,
    RANKING_TASK_MIN_BACKOFF,
    RANKING_TASK_MAX_CONCURRENT,
    RANKING_TASK_TIMEOUT
} from "../config/params";
import { MemoryOption } from "firebase-functions";

// Interface para o payload esperado da tarefa
interface RankingTaskPayload {
    tournamentId?: string;
    triggeringCatchId?: string;
    triggeringCatchAfterData?: Catch | null;
}

const taskOptions: TaskQueueOptions & { memory?: MemoryOption } = {
    retryConfig: {
        maxAttempts: RANKING_TASK_RETRY_ATTEMPTS,
        minBackoffSeconds: RANKING_TASK_MIN_BACKOFF,
    },
    rateLimits: {
        maxConcurrentDispatches: RANKING_TASK_MAX_CONCURRENT,
    },
    region: RANKING_REGION,
    memory: "512MiB",
    timeoutSeconds: RANKING_TASK_TIMEOUT,
};

/**
 * Task Queue Function V2 para processar atualizações de ranking de torneio.
 */
export const processRankingUpdateTask = onTaskDispatched<RankingTaskPayload>(
    taskOptions,
    async (req) => {
        const { tournamentId, triggeringCatchId, triggeringCatchAfterData } = req.data;
        const functionPrefix = `[RankingTask-${tournamentId || "NoId"}]`;

        logger.info(`${functionPrefix} Received task for catch ${triggeringCatchId}.`);

        if (!tournamentId || typeof tournamentId !== "string" || tournamentId.trim() === "") {
            logger.warn(`${functionPrefix} Missing tournamentId. Discarding task.`);
            return;
        }

        if (!triggeringCatchId || typeof triggeringCatchId !== "string" || triggeringCatchId.trim() === "") {
            logger.warn(`${functionPrefix} Missing triggeringCatchId. Discarding task.`);
            return;
        }

        try {
            const { rankingService } = createDependencies();
            await rankingService.updateLiveTournamentResults(
                tournamentId,
                triggeringCatchId,
                triggeringCatchAfterData
            );
            logger.info(`${functionPrefix} Ranking update processed successfully.`);
        } catch (error: any) {
            logger.error(`${functionPrefix} Error processing ranking update:`, error);
            throw error;
        }
    }
);