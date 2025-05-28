import { onRequest } from "firebase-functions/v2/https";
import { db, logger } from "../config/admin";
import { updateFromWebhook } from "../mappers/orderMapper";
import { OrderDto } from "../types/dto/orderSummary.dto";

export const orderWebhook = onRequest(
  {
    region: "southamerica-east1",
    memory: "256MiB",
    timeoutSeconds: 15,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Método não permitido");
      return;
    }

    try {
      const { type, data } = req.body as { type: string; data: any };
      const handled = [
        "order.created",
        "order.paid",
        "order.payment_failed",
        "order.canceled",
        "order.closed",
        "order.updated",
      ];
      if (!handled.includes(type)) {
        res.status(200).send("ignorado");
        return;
      }

      const partial = updateFromWebhook(data);
      const ref = db.collection("orders").doc(partial.order_id!);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data() as OrderDto) : null;
        if (current?.status === "paid" && partial.status !== "paid") return;
        tx.set(ref, partial, { merge: true });
      });

      res.status(200).send("OK");
    } catch (err) {
      logger.error("webhook error", err);
      res.status(500).send("erro interno");
    }
  }
);