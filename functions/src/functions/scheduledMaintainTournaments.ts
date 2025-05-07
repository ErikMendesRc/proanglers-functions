// functions/tournaments/scheduledMaintainTournaments.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger, db } from "../config/admin";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { TournamentStatus } from "../types/enums";
import { RANKING_REGION } from "../config/params";

// estados de ranking que NUNCA tocamos + CLOSED
const FINAL_STATES = [
  TournamentStatus.FINALIZING,
  TournamentStatus.FINALIZED_RANKED,
  TournamentStatus.RANKING_FAILED,
  TournamentStatus.CLOSED,
] as const;

export const scheduledMaintainTournaments = onSchedule(
  {
    schedule: "0 15 * * *", // todo dia às 15h
    region:   RANKING_REGION,
  },
  async () => {
    logger.info("[ScheduledMaintain] Iniciando varredura de torneios…");
    const now = dayjs();

    try {
      // pega só os torneios que ainda podem mudar de status
      const snap = await db
        .collection("tournaments")
        .where("status", "not-in", FINAL_STATES)
        .get();

      if (snap.empty) {
        logger.info("[ScheduledMaintain] Nenhum torneio para processar.");
        return;
      }

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        const data = doc.data() as {
          startDate: FirebaseFirestore.Timestamp | string;
          endDate:   FirebaseFirestore.Timestamp | string;
          status:    TournamentStatus;
          isOngoing?: boolean;
          acceptRegistrationAfterStart: boolean;
        };

        // parse das datas
        const start = dayjs(
          typeof data.startDate === "string"
            ? data.startDate
            : data.startDate.toDate()
        );
        const end = dayjs(
          typeof data.endDate === "string"
            ? data.endDate
            : data.endDate.toDate()
        );

        let newStatus: TournamentStatus;
        let newOngoing = false;

        if (now.isSameOrAfter(end)) {
          // terminou → fecha torneio
          newStatus  = TournamentStatus.CLOSED;
          newOngoing = false;
        } else if (now.isBefore(start)) {
          // antes de começar → abre inscrições
          newStatus  = TournamentStatus.REGISTRATION_OPEN;
          newOngoing = false;
        } else {
          // entre start e end → calcula inscrição
          newOngoing = true;
          newStatus  = data.acceptRegistrationAfterStart
            ? TournamentStatus.REGISTRATION_OPEN
            : TournamentStatus.REGISTRATION_CLOSED;
        }

        if (newStatus !== data.status || newOngoing !== data.isOngoing) {
          batch.update(doc.ref, { status: newStatus, isOngoing: newOngoing });
          logger.info(
            `[ScheduledMaintain] ${doc.id}: ${data.status} → ${newStatus}, isOngoing: ${data.isOngoing} → ${newOngoing}`
          );
        }
      });

      if ((batch as any)._ops?.length) {
        await batch.commit();
        logger.info("[ScheduledMaintain] Atualização concluída com sucesso.");
      } else {
        logger.info("[ScheduledMaintain] Nenhuma mudança necessária.");
      }
    } catch (err: any) {
      logger.error("[ScheduledMaintain] Erro ao manter torneios:", err);
    }
  }
);