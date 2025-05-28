import {
  CreateOrderPlatformRequestDto,
  PagarmeV5OrderPayload,
  PaymentDto,
  SplitRuleDto,
  ItemDto,
  CreditCardDto,
} from "../types/dto/pagarmeOrder.dto";
import {
  PLATFORM_FEE_PERCENTAGE,
  PLATFORM_RECIPIENT_ID,
} from "../config/params";
import { PaymentCalculator } from "../utils/PaymentCalculator";

/* ----------------------------- Contexto externo ----------------------------- */
export interface OrderBuildContext {
  buyerCustomerId: string; // customer_id do comprador
  ownerRecipientId: string; // recipient_id do organizador
}

/* ------------------------- Builder (juros vão para a plataforma) ------------------------ */
export class PagarmeOrderPayloadBuilder {
  private readonly dto: Omit<
    CreateOrderPlatformRequestDto,
    "statementDescriptor" | "code" | "additionalInformation" | "expiresIn"
  >;
  private readonly ctx: OrderBuildContext;
  private readonly feePct: number;

  constructor(dto: CreateOrderPlatformRequestDto, ctx: OrderBuildContext) {
    const {
      statementDescriptor,
      code,
      additionalInformation,
      expiresIn,
      ...allowed
    } = dto as any;
    if (statementDescriptor || code || additionalInformation || expiresIn) {
      throw new Error(
        "Campos statementDescriptor, code, additionalInformation e expiresIn devem ser definidos apenas no backend."
      );
    }
    this.dto = allowed;
    this.ctx = ctx;
    this.feePct = Number(PLATFORM_FEE_PERCENTAGE.value());
  }

  build(): PagarmeV5OrderPayload {
    // 0) calcula o valor base original (sem taxa nem juros)
    const baseTotalWithoutFee = this.dto.items.reduce(
      (sum, it) => sum + it.amount * it.quantity,
      0
    );

    // 1) aplica a taxa fixa da plataforma
    const itemsWithFee = this.applyPlatformFee(this.dto.items);

    // 2) aplica juros de parcelamento (se houver)
    // roda exatamente a mesma função, mas ignora o warning
    const { items: itemsFinal, interestTotal: _interestTotal } =
      this.applyInstallmentInterest(itemsWithFee);

    // 3) monta split: organizador ganha baseTotalWithoutFee, plataforma ganha o resto (taxa + juros)
    const { splitRules } = this.buildSplit(itemsFinal, baseTotalWithoutFee);

    // 4) constrói objeto de pagamento
    const payment: PaymentDto =
      this.dto.method === "pix"
        ? this.buildPixPayment(splitRules)
        : this.buildCreditCardPayment(splitRules);

    // 5) payload final
    return {
      code:
        this.dto.method === "credit_card" ? this.dto.tournamentId : undefined,
      items: itemsFinal,
      customer_id: this.ctx.buyerCustomerId,
      payments: [payment],
      closed: this.dto.method === "credit_card",
    };
  }

  private applyPlatformFee(items: ItemDto[]): ItemDto[] {
    return items.map((it) => ({
      ...it,
      amount: Math.ceil(it.amount * (1 + this.feePct / 100)),
      code: it.code ?? this.dto.tournamentId,
    }));
  }

  private applyInstallmentInterest(items: ItemDto[]): {
    items: ItemDto[];
    interestTotal: number;
  } {
    if (
      this.dto.method !== "credit_card" ||
      (this.dto.installments ?? 1) === 1
    ) {
      return { items, interestTotal: 0 };
    }

    const totalWithFee = items.reduce(
      (sum, it) => sum + it.amount * it.quantity,
      0
    );

    const { totalInterest } = PaymentCalculator.calculate(
      totalWithFee,
      this.dto.installments!
    );

    if (totalInterest === 0) {
      return { items, interestTotal: 0 };
    }

    const interestItem: ItemDto = {
      name: "Taxa de parcelamento",
      description: "Juros de parcelamento repassados ao cliente",
      amount: totalInterest,
      quantity: 1,
      code: this.dto.tournamentId,
    };

    return { items: [...items, interestItem], interestTotal: totalInterest };
  }

  private buildSplit(
    items: ItemDto[],
    baseTotalWithoutFee: number
  ): { splitRules: SplitRuleDto[] } {
    // soma tudo (item + taxa + juros) em centavos
    const totalWithFeeAndInterest = items.reduce(
      (sum, it) => sum + it.amount * it.quantity,
      0
    );

    // plataforma fica com diferença: taxa + juros
    const platformTotal = totalWithFeeAndInterest - baseTotalWithoutFee;

    const splitRules: SplitRuleDto[] = [
      {
        amount: baseTotalWithoutFee,
        recipient_id: this.ctx.ownerRecipientId,
        type: "flat",
        options: {
          liable: true,
          charge_processing_fee: false,
          charge_remainder_fee: false,
        },
      },
      {
        amount: platformTotal,
        recipient_id: PLATFORM_RECIPIENT_ID.value(),
        type: "flat",
        options: {
          liable: false,
          charge_processing_fee: true,
          charge_remainder_fee: true,
        },
      },
    ];

    return { splitRules };
  }

  private buildPixPayment(splitRules: SplitRuleDto[]): PaymentDto {
    return {
      payment_method: "pix",
      pix: {
        expires_in: 600,
        additional_information: this.buildAdditionalInformation(),
      },
      split: splitRules,
    };
  }

  private buildCreditCardPayment(splitRules: SplitRuleDto[]): PaymentDto {
    return {
      payment_method: "credit_card",
      credit_card: {
        card: this.dto.card as CreditCardDto,
        operation_type: "auth_and_capture",
        installments: this.dto.installments ?? 1,
        statement_descriptor: this.buildStatementDescriptor(),
      },
      split: splitRules,
    };
  }

  private buildAdditionalInformation() {
    const firstItem = this.dto.items[0];
    return [
      { name: "Comprador", value: this.ctx.buyerCustomerId },
      { name: "Descrição", value: firstItem.description },
      { name: "Torneio", value: this.dto.tournamentId },
    ];
  }

  private buildStatementDescriptor() {
    return `PRO ANGLERS`.substring(0, 22);
  }
}
