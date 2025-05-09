// Endereço
export interface AddressDto {
  street: string;
  complementary?: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
}

// Telefone
export interface PhoneNumberDto {
  ddd: string;
  number: string;
  type: "mobile" | "landline";
}

// Dados cadastrais do recebedor (somente PF)
export interface RegisterInformationDto {
  email: string;
  document: string;
  type: "individual";
  phone_numbers: PhoneNumberDto[];
  address: AddressDto;
  name: string;
  mother_name?: string;
  birthdate: string;
  monthly_income: string;
  professional_occupation?: string;
}

// Conta bancária padrão (somente PF)
export interface DefaultBankAccountDto {
  holder_name: string;
  holder_type: "individual"; // fixado como PF
  holder_document: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit?: string;
  type: "checking" | "savings";
}

// Configurações de transferência automática
export interface TransferSettingsDto {
  transfer_enabled: "true" | "false";
  transfer_interval: "Daily" | "Weekly" | "Monthly";
  transfer_day: string; // como string
}

// Configurações de antecipação automática
export interface AutomaticAnticipationSettingsDto {
  enabled: "true" | "false";
  type: "full" | "manual";
  volume_percentage: string;
  delay: string; // pode ser "null"
}

// Payload para criação de recebedor
export interface PagarmeV5CreateRecipientPayload {
  register_information: RegisterInformationDto;
  default_bank_account: DefaultBankAccountDto;
  transfer_settings?: TransferSettingsDto;
  automatic_anticipation_settings?: AutomaticAnticipationSettingsDto;
  code?: string;
  description?: string;
}
// Resposta do Pagar.me ao criar recebedor
export interface PagarmeV5RecipientResponse {
  id: string; // Ex: "rp_XXXXXXXXXXXXXXXX"
  name: string;
  email: string;
  document: string;
  description: string;
  type: "individual" | "company";
  status:
    | "registration"
    | "affiliation"
    | "active"
    | "refused"
    | "suspended"
    | "blocked"
    | "inactive";
  created_at: string; // formato UTC ISO-8601
  updated_at: string; // formato UTC ISO-8601

  default_bank_account: {
    id: string;
    holder_name: string;
    holder_type: "individual" | "company";
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit: string;
    account_number: string;
    account_check_digit: string;
    type: "checking" | "savings";
    status: string;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
  };

  transfer_settings: {
    transfer_enabled: boolean;
    transfer_interval: "Daily" | "Weekly" | "Monthly";
    transfer_day: number;
  };

  automatic_anticipation_settings: {
    enabled: boolean;
    type: "full" | "manual";
    volume_percentage: number;
    delay: number;
  };

  gateway_recipients?: Array<{
    gateway: string;
    status: string;
    pgid: string;
    createdAt: string;
    updatedAt: string;
  }>;

  metadata?: Record<string, unknown>;
}

export type CreateRecipientPlatformRequestDto = PagarmeV5CreateRecipientPayload;
