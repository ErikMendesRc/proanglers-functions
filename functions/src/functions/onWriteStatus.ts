// functions/tournaments/onWriteStatus.ts
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "../config/admin";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { TournamentStatus } from "../types/enums";
import { RANKING_REGION } from "../config/params";

// estados de ranking que NUNCA mexemos aqui
const FINAL_STATES = [
  TournamentStatus.FINALIZING,
  TournamentStatus.FINALIZED_RANKED,
  TournamentStatus.RANKING_FAILED,
] as const;

export const onTournamentWrite = onDocumentWritten(
  { document: "tournaments/{id}", region: RANKING_REGION },
  async (event) => {
    const change = event.data;
    if (!change) return;

    const beforeSnap = change.before;
    const afterSnap  = change.after;
    const beforeData = beforeSnap.data() ?? {};
    const afterData  = afterSnap.data();
    const isCreate   = !beforeSnap.exists;

    // 1) respeita estados finais e torneios já encerrados
    if (!afterData || FINAL_STATES.includes(afterData.status) || afterData.status === TournamentStatus.CLOSED) {
      return;
    }

    // 2) só reage a criação ou mudança de startDate/endDate/acceptRegistrationAfterStart
    const relevant =
      isCreate ||
      beforeData.startDate?.toString() !== afterData.startDate?.toString() ||
      beforeData.endDate?.toString()   !== afterData.endDate?.toString()   ||
      beforeData.acceptRegistrationAfterStart !== afterData.acceptRegistrationAfterStart;
    if (!relevant) return;

    // 3) monta datas
    const now   = dayjs();
    const start = dayjs(typeof afterData.startDate === "string"
      ? afterData.startDate
      : afterData.startDate.toDate());
    const end   = dayjs(typeof afterData.endDate === "string"
      ? afterData.endDate
      : afterData.endDate.toDate());

    // 4) calcula só OPEN vs REGISTRATION_CLOSED (nunca fecha o torneio aqui)
    let newStatus: TournamentStatus;
    if (now.isBefore(start)) {
      newStatus = TournamentStatus.REGISTRATION_OPEN;
    } else {
      newStatus = afterData.acceptRegistrationAfterStart
        ? TournamentStatus.REGISTRATION_OPEN
        : TournamentStatus.REGISTRATION_CLOSED;
    }

    // 5) calcula isOngoing
    const isOngoing = now.isSameOrAfter(start) && now.isBefore(end);

    // 6) atualiza somente se mudou
    if (newStatus !== afterData.status || isOngoing !== afterData.isOngoing) {
      await afterSnap.ref.update({ status: newStatus, isOngoing });
      logger.info(
        `[onWriteStatus] ${afterSnap.id}: status ${afterData.status} → ${newStatus}, isOngoing=${isOngoing}`
      );
    }
  }
);