/**
 * Centraliza a lógica de cálculo de valores para pagamentos parcelados.
 * • Taxas fixas definidas por quantidade de parcelas (máx. 6x).
 * • Retorna valores em centavos para evitar erros de ponto flutuante.
 */
export class PaymentCalculator {
  /** Taxas de juros por número de parcelas (1 a 6). */
  private static readonly RATES: Record<number, number> = {
    1: 0.0319, // 3,19%
    2: 0.0449, // 4,49%
    3: 0.0449,
    4: 0.0449,
    5: 0.0449,
    6: 0.0449,
  };

  /** Máximo de parcelas permitido. */
  public static readonly MAX_INSTALLMENTS = 6;

  /**
   * Calcula os valores para pagamentos com parcelas, aplicando juros fixos.
   * @param baseAmount Valor total da compra em centavos.
   * @param installments Número de parcelas (1 a 6).
   * @returns Dados de cálculo em centavos: total com juros, juros totais e valor da parcela.
   */
  static calculate(
    baseAmount: number,
    installments: number
  ): {
    baseAmount: number;
    installments: number;
    rate: number;
    totalWithInterest: number;
    totalInterest: number;
    installmentValue: number;
  } {
    if (installments < 1 || installments > this.MAX_INSTALLMENTS) {
      throw new Error(
        `Parcelamento permitido apenas entre 1 e ${this.MAX_INSTALLMENTS} vezes.`
      );
    }

    const rate = this.RATES[installments];
    // Valor total incluindo juros
    const totalWithInterest = Math.round(baseAmount * (1 + rate));
    // Juros totais em centavos
    const totalInterest = totalWithInterest - baseAmount;
    // Valor de cada parcela
    const installmentValue = Math.round(totalWithInterest / installments);

    return {
      baseAmount,
      installments,
      rate,
      totalWithInterest,
      totalInterest,
      installmentValue,
    };
  }
}
