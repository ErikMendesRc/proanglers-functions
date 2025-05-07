import {
  onDocumentWritten,
  FirestoreEvent,
  Change,
  DocumentSnapshot,
  DocumentOptions
} from "firebase-functions/v2/firestore";
import { getFunctions } from 'firebase-admin/functions';
import { logger } from "../config/admin";
import { Catch } from "../types/catch";
import { CaptureStatusEnum } from "../types/enums";
import { RANKING_REGION, RANKING_TASK_DELAY_SECONDS } from "../config/params";

const CATCH_DOCUMENT_PATH = "catches/{catchId}" as const;

const triggerOptions: DocumentOptions<typeof CATCH_DOCUMENT_PATH> = {
  document: CATCH_DOCUMENT_PATH,
  region: RANKING_REGION,
  cpu: 'gcf_gen1',
};

/**
 * Gatilho Firestore V2 para escritas na coleção 'catches'.
 * Enfileira uma tarefa para a função 'processRankingUpdateTask'
 * se a mudança for relevante para o ranking.
 */
export const onCatchWriteEnqueueUpdate = onDocumentWritten(
  triggerOptions,
  async (event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { catchId: string }>) => {
    const { catchId } = event.params;
    const beforeData = event.data?.before.exists ? (event.data.before.data() as Catch) : null;
    const afterData = event.data?.after.exists ? (event.data.after.data() as Catch) : null;

    const wasApproved = beforeData?.status === CaptureStatusEnum.APPROVED;
    const isApproved = afterData?.status === CaptureStatusEnum.APPROVED;
    const wasDeleted = !afterData;
    const needsRecalculation = (isApproved !== wasApproved) || (wasApproved && wasDeleted);

    if (needsRecalculation) {
      const tournamentId = afterData?.tournamentId || beforeData?.tournamentId;
      if (!tournamentId) {
        logger.error(`[CatchTrigger-${catchId}] Tournament ID not found. Aborting task enqueue.`);
        return;
      }

      const functionPrefix = `[CatchTrigger-${catchId}][Tourn-${tournamentId}]`;
      logger.info(`${functionPrefix} Change requires recalculation. Enqueuing update task.`);

      const taskScheduleDelaySeconds = RANKING_TASK_DELAY_SECONDS.value();
      const functionRegion = RANKING_REGION.value();

      const payload = {
        tournamentId: tournamentId,
        triggeringCatchId: catchId,
        triggeringCatchAfterData: afterData
      };

      try {
        const functionResourceName = `locations/${functionRegion}/functions/processRankingUpdateTask`;
        const queue = getFunctions().taskQueue(functionResourceName);
        await queue.enqueue(payload, {
          scheduleDelaySeconds: taskScheduleDelaySeconds,
        });
        logger.info(`${functionPrefix} Task enqueued successfully with ${taskScheduleDelaySeconds}s delay.`);
      } catch (error: any) {
        logger.error(`${functionPrefix} Failed to enqueue ranking update task:`, error);
      }
    }
  }
);