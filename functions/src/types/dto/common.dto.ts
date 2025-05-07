/**
 * DTO padrão para respostas de Firebase Functions HTTP.
 * Promove consistência nas respostas da API.
 */
export interface FunctionResponseDto<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | object;
}
