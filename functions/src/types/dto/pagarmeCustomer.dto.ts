// src/dtos/pagarmeCustomer.dto.ts

// --- DTOs para a Plataforma (Entrada para os Controllers) ---
export interface PlatformPhoneDto {
    countryCode: string;
    areaCode: string;
    number: string;
}

export interface PlatformAddressDto {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
}

export interface CreateCustomerPlatformRequestDto { // Renomeado para clareza (Request DTO)
    userId: string;
    name: string;
    email: string;
    cpf: string;
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
    address: PlatformAddressDto;
    phone: PlatformPhoneDto;
    metadata?: Record<string, any>;
}

export interface UpdateCustomerPlatformRequestDto { // Renomeado para clareza (Request DTO)
    name?: string;
    email?: string;
    gender?: "male" | "female" | "other";
    address?: Partial<PlatformAddressDto>;
    birthdate?: string;
    phones?: {
        home_phone?: PlatformPhoneDto;
        mobile_phone?: PlatformPhoneDto;
    };
    metadata?: Record<string, any>;
    default_card_id?: string;
}

export interface ListCustomersPlatformParamsDto {
    page?: number;
    size?: number;
    name?: string;
    email?: string;
    code?: string;
    document?: string;
}

// --- DTOs de Interface com a API Pagar.me (Tipos internos para o Serviço Pagar.me) ---
// Estes descrevem a comunicação direta com a API Pagar.me.

export interface PagarmeV5Phone {
    country_code: string;
    area_code: string;
    number: string;
}

export interface PagarmeV5AddressPayload {
    line_1: string;
    line_2?: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
}

export interface PagarmeV5CreateCustomerPayload { // Para o corpo da requisição POST /customers
    name: string;
    email: string;
    code: string;
    document: string;
    document_type: "CPF" | "CNPJ" | "PASSPORT";
    type: "individual" | "company";
    gender?: "male" | "female" | "other";
    address?: PagarmeV5AddressPayload;
    birthdate?: string;
    phones?: {
        home_phone?: PagarmeV5Phone;
        mobile_phone?: PagarmeV5Phone;
    };
    metadata?: Record<string, any>;
}

// O payload de PUT para /customers/{id} é um subconjunto opcional do de criação
export type PagarmeV5UpdateCustomerPayload = Partial<PagarmeV5CreateCustomerPayload>;


export interface PagarmeV5AddressResponse extends PagarmeV5AddressPayload {
    id: string;
    status: "active" | "deleted" | string;
    created_at: string;
    updated_at: string;
}

export interface PagarmeV5CustomerResponse { // Resposta da API Pagar.me para GET, POST, PUT
    id: string;
    name: string;
    email: string;
    code: string;
    document: string;
    document_type: "CPF" | "CNPJ" | "PASSPORT";
    type: "individual" | "company";
    gender?: "male" | "female" | "other";
    delinquent: boolean;
    address?: PagarmeV5AddressResponse;
    created_at: string;
    updated_at: string;
    birthdate?: string;
    phones?: {
        home_phone?: PagarmeV5Phone;
        mobile_phone?: PagarmeV5Phone;
    };
    metadata?: Record<string, any>;
}

export interface PagarmeV5PagingResponse {
    total: number;
    page?: number;
    size?: number;
}

export interface PagarmeV5ListCustomersResponse { // Resposta da API Pagar.me para GET /customers (lista)
    data: PagarmeV5CustomerResponse[];
    paging: PagarmeV5PagingResponse;
}