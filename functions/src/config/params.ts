// src/config/params.ts
import { defineString, defineInt } from "firebase-functions/params";

/**
 * Parâmetros V2 para configuração das funções de Ranking.
 * Valores padrão vêm do seu .env no deploy, mas podem ser
 * sobrescritos em runtime ou via Secret Manager.
 */

// Região de deploy para todas as funções de ranking
export const RANKING_REGION = defineString("RANKING_REGION", {
  default: "southamerica-east1",
  label: "Região principal para funções de ranking",
  description:
    "Onde as funções de gatilho e processamento de ranking serão implantadas.",
});

// Delay antes de enfileirar a tarefa de ranking (Firestore → Cloud Tasks)
export const RANKING_TASK_DELAY_SECONDS = defineInt(
  "RANKING_TASK_DELAY_SECONDS",
  {
    default: 30,
    label: "Atraso para enfileirar tarefa de ranking (s)",
    description:
      "Tempo em segundos que o trigger aguardará antes de enfileirar.",
  }
);

// Configuração da fila gerenciada e runtime da função de processamento
export const RANKING_TASK_RETRY_ATTEMPTS = defineInt(
  "RANKING_TASK_RETRY_ATTEMPTS",
  {
    default: 5,
    label: "Máximo de retentativas da tarefa",
    description:
      "Quantas vezes re-tentar antes de dar fail permanente.",
  }
);
export const RANKING_TASK_MIN_BACKOFF = defineInt(
  "RANKING_TASK_MIN_BACKOFF",
  {
    default: 60,
    label: "Backoff mínimo (s)",
    description: "Espera mínima entre falha e nova tentativa.",
  }
);
export const RANKING_TASK_MAX_CONCURRENT = defineInt(
  "RANKING_TASK_MAX_CONCURRENT",
  {
    default: 6,
    label: "Concorrência máxima",
    description:
      "Número máximo de tarefas de ranking simultâneas.",
  }
);
export const RANKING_TASK_TIMEOUT = defineInt(
  "RANKING_TASK_TIMEOUT",
  {
    default: 300,
    label: "Timeout da tarefa (s)",
    description: "Tempo máximo de execução da função de ranking.",
  }
);

// ————— Parâmetros Pagar.me vindo do .env —————

// Chave da API Pagar.me (ex: sk_test_… ou sk_live_…)
export const PAGARME_API_KEY = defineString("PAGARME_API_KEY", {
  default: process.env.PAGARME_API_KEY ?? "",
  label: "Chave secreta da API Pagar.me",
});

// URL base da API v5
export const PAGARME_BASE_URL = defineString("PAGARME_BASE_URL", {
  default:
    process.env.PAGARME_BASE_URL ??
    "https://api.pagar.me/core/v5",
  label: "URL base da API Pagar.me v5",
});

// ID da conta Pagar.me (opcional)
export const PAGARME_ACCOUNT_ID = defineString(
  "PAGARME_ACCOUNT_ID",
  {
    default: process.env.PAGARME_ACCOUNT_ID ?? "",
    label: "ID da conta Pagar.me",
  }
);

// Timeout para requisições (ms)
export const PAGARME_TIMEOUT = defineInt("PAGARME_TIMEOUT", {
  default: parseInt(process.env.PAGARME_TIMEOUT ?? "5000", 10),
  label: "Timeout Pagar.me (ms)",
});