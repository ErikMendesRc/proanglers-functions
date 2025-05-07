// src/lib/PagarmeApiClient.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { logger } from "../config/admin";

/**
 * Detalhes do erro retornado pela API Pagar.me.
 */
export interface PagarmeApiErrorData {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Erro customizado para encapsular falhas na chamada à API Pagar.me.
 */
export class PagarmeApiClientError extends Error {
  public statusCode: number;
  public errorData?: PagarmeApiErrorData;
  public requestConfig?: AxiosRequestConfig;

  constructor(
    friendlyMessage: string,
    statusCode: number,
    errorData?: PagarmeApiErrorData,
    requestConfig?: AxiosRequestConfig
  ) {
    super(friendlyMessage);
    this.name = "PagarmeApiClientError";
    this.statusCode = statusCode;
    this.errorData = errorData;
    this.requestConfig = requestConfig;
    Object.setPrototypeOf(this, PagarmeApiClientError.prototype);
  }
}

export class PagarmeApiClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseUrl: string, timeoutMs = 5000) {
    if (!apiKey) {
      throw new Error("PagarmeApiClient: API Key é obrigatória.");
    }
    if (!baseUrl) {
      throw new Error("PagarmeApiClient: Base URL é obrigatória.");
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      auth: { username: apiKey, password: "" },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<PagarmeApiErrorData>) => {
        const { response, message, config } = error;
        const statusCode = response?.status ?? 500;
        const errorData = response?.data;
        const friendlyMessage = this.buildFriendlyMessage(
          statusCode,
          errorData,
          message
        );

        logger.error("PagarmeApiClient - Erro na API", {
          friendlyMessage,
          statusCode,
          url: config?.url,
          method: config?.method,
          pagarmeErrorData: errorData,
        });

        return Promise.reject(
          new PagarmeApiClientError(
            friendlyMessage,
            statusCode,
            errorData,
            config
          )
        );
      }
    );
  }

  public async request<T = any, D = any>(
    config: AxiosRequestConfig<D>
  ): Promise<AxiosResponse<T>> {
    logger.info(
      `PagarmeApiClient - Request: ${config.method?.toUpperCase()} ${
        config.url
      }`,
      {
        params: config.params ? JSON.stringify(config.params) : undefined,
        dataIsPresent: !!config.data,
      }
    );
    return this.client.request<T, AxiosResponse<T>, D>(config);
  }

  public async get<T = any>(
    url: string,
    config?: Omit<AxiosRequestConfig, "method" | "url">
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  public async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: Omit<AxiosRequestConfig<D>, "method" | "url" | "data">
  ): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: "POST", url, data });
  }

  public async put<T = any, D = any>(
    url: string,
    data?: D,
    config?: Omit<AxiosRequestConfig<D>, "method" | "url" | "data">
  ): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: "PUT", url, data });
  }

  public async patch<T = any, D = any>(
    url: string,
    data?: D,
    config?: Omit<AxiosRequestConfig<D>, "method" | "url" | "data">
  ): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: "PATCH", url, data });
  }

  public async delete<T = any>(
    url: string,
    config?: Omit<AxiosRequestConfig, "method" | "url">
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * Monta mensagem amigável a partir do payload de erro.
   */
  private buildFriendlyMessage(
    statusCode: number,
    errorData?: PagarmeApiErrorData,
    fallbackMessage?: string
  ): string {
    if (!errorData) {
      return `Erro de conexão com Pagar.me: ${fallbackMessage}`;
    }
    if (errorData.errors && Object.keys(errorData.errors).length > 0) {
      const details = Object.entries(errorData.errors)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join("; ");
      return `${errorData.message ?? "Erro de validação"}: ${details}`;
    }
    return `Erro do Pagar.me (${statusCode}): ${errorData.message}`;
  }
}
