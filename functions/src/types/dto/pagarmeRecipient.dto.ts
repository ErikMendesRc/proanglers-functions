// Dados de endereço
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
  type: "mobile" | "home" | "work";
}

// Informação cadastral do recebedor
export interface RegisterInformationDto {
  phone_numbers: PhoneNumberDto[];
  address: AddressDto;
  name: string;
  email: string;
  document: string;
  type: "individual" | "corporation";
  site_url?: string;
  mother_name?: string;
  birthdate?: string; // formato DD/MM/YYYY
  monthly_income?: number;
  professional_occupation?: string;
}

// Conta bancária padrão do recebedor
export interface DefaultBankAccountDto {
  holder_name: string;
  holder_type: "individual" | "corporation";
  holder_document: string;
  bank: string; // código numérico do banco
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit?: string;
  type: "checking" | "savings";
}

// Configurações de transferência automática
export interface TransferSettingsDto {
  transfer_enabled: boolean | "true" | "false";
  transfer_interval: "Daily" | "Weekly" | "Monthly";
  transfer_day: number;
}

// Configurações de antecipação automática
export interface AutomaticAnticipationSettingsDto {
  enabled: boolean | "true" | "false";
  type: "full" | "manual";
  volume_percentage: number | string;
  delay: number | string | null;
}

// Payload para criação de recebedor
export interface PagarmeV5CreateRecipientPayload {
  register_information: RegisterInformationDto;
  default_bank_account: DefaultBankAccountDto;
  transfer_settings?: TransferSettingsDto;
  automatic_anticipation_settings?: AutomaticAnticipationSettingsDto;
  code?: string;
}

// Resposta do Pagar.me ao criar recebedor
export interface PagarmeV5RecipientResponse {
  id: string;
  name: string;
  email: string;
  code: string;
  document: string;
  type: string;
  payment_mode: string;
  status: string;
  created_at: string;
  updated_at: string;
  transfer_settings: {
    transfer_enabled: boolean;
    transfer_interval: string;
    transfer_day: number;
  };
  default_bank_account: {
    id: string;
    holder_name: string;
    holder_type: string;
    holder_document: string;
    bank: string;
    branch_number: string;
    branch_check_digit: string;
    account_number: string;
    account_check_digit: string;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
  };
  gateway_recipients?: Array<{
    gateway: string;
    status: string;
    pgid: string;
    createdAt: string;
    updatedAt: string;
  }>;
  automatic_anticipation_settings: {
    enabled: boolean;
    type: string;
    volume_percentage: number;
    delay: number;
  };
  metadata?: Record<string, unknown>;
  register_information: RegisterInformationDto;
}

// DTO usado pela função onCall
export type CreateRecipientPlatformRequestDto = PagarmeV5CreateRecipientPayload;
