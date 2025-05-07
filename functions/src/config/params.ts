// src/config/params.ts
import { defineString, defineInt } from "firebase-functions/params";

/**
 * Parâmetros V2 para configuração das funções de Ranking.
 * Os valores padrão são lidos de arquivos .env no deploy,
 * mas podem ser sobrescritos por configuração de runtime ou secrets.
 */

// --- Parâmetros Globais / Gatilho ---

export const RANKING_REGION = defineString("RANKING_REGION", {
  default: "southamerica-east1",
  label: "Região principal para funções de ranking",
  description: "Define a região onde as funções de gatilho e processamento de tarefas de ranking serão implantadas.",
});

export const RANKING_TASK_DELAY_SECONDS = defineInt("RANKING_TASK_DELAY_SECONDS", {
  default: 30, // Mantendo seu valor original
  label: "Atraso para Enfileirar Tarefa de Ranking (segundos)",
  description: "Tempo em segundos que o gatilho Firestore aguardará antes de enfileirar a tarefa de atualização.",
});


// --- Parâmetros para a Função de Tarefa (onTaskDispatched) ---
// Estes parâmetros configuram tanto a fila gerenciada no Cloud Tasks
// quanto o runtime da função 'processRankingUpdateTask'.

export const RANKING_TASK_RETRY_ATTEMPTS = defineInt("RANKING_TASK_RETRY_ATTEMPTS", {
  default: 5, // Valor do .env
  label: "Tentativas Máximas da Tarefa de Ranking",
  description: "Número máximo de vezes que uma tarefa será retentada em caso de falha.",
});

export const RANKING_TASK_MIN_BACKOFF = defineInt("RANKING_TASK_MIN_BACKOFF", {
  default: 60, // Valor do .env
  label: "Backoff Mínimo da Tarefa (segundos)",
  description: "Tempo mínimo de espera (em segundos) antes de uma nova tentativa após falha.",
});

export const RANKING_TASK_MAX_CONCURRENT = defineInt("RANKING_TASK_MAX_CONCURRENT", {
  default: 6, // Valor do .env
  label: "Despachos Concorrentes Máximos",
  description: "Número máximo de tarefas de ranking que podem ser executadas simultaneamente.",
});

export const RANKING_TASK_TIMEOUT = defineInt("RANKING_TASK_TIMEOUT", {
  default: 300, // Valor do .env
  label: "Timeout da Função de Tarefa (segundos)",
  description: "Tempo máximo (em segundos) permitido para a execução da função de processamento de tarefa.",
});
