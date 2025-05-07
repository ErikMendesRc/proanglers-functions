import { logger } from '../config/admin'; // Ajuste o caminho se necessário
import { PagarmeApiClient, PagarmeApiClientError } from '../lib/PagarmeApiClient'; // Ajuste o caminho
import { PlatformPhoneDto, PagarmeV5Phone, CreateCustomerPlatformRequestDto, PagarmeV5CreateCustomerPayload, PagarmeV5AddressPayload, UpdateCustomerPlatformRequestDto, PagarmeV5UpdateCustomerPayload, PagarmeV5CustomerResponse, ListCustomersPlatformParamsDto, PagarmeV5ListCustomersResponse } from '../types/dto/pagarmeCustomer.dto';


function formatBirthdateForPagarme(inputDate?: string): string | undefined {
    if (!inputDate) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) return inputDate;
    const parts = inputDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
    return inputDate;
}

function mapPlatformPhoneToPagarmeV5(platformPhone?: PlatformPhoneDto): PagarmeV5Phone | undefined {
    if (!platformPhone) return undefined;
    return {
        country_code: platformPhone.countryCode,
        area_code: platformPhone.areaCode,
        number: platformPhone.number.replace(/\D/g, ''),
    };
}

export class PagarmeCustomerService {
    private apiClient: PagarmeApiClient;

    constructor(apiClient: PagarmeApiClient) {
        this.apiClient = apiClient;
    }

    private mapPlatformToPagarmeCreatePayload(
        dto: CreateCustomerPlatformRequestDto
    ): PagarmeV5CreateCustomerPayload {
        const addressPayload: PagarmeV5AddressPayload = {
            line_1: `${dto.address.street}, ${dto.address.number}`,
            line_2: dto.address.complement,
            zip_code: dto.address.zipCode.replace(/\D/g, ''),
            city: dto.address.city || '',
            state: dto.address.state.toUpperCase(),
            country: "BR",
        };
        return {
            name: dto.name,
            email: dto.email,
            code: dto.userId,
            document: dto.cpf.replace(/\D/g, ''),
            document_type: "CPF",
            type: "individual",
            gender: dto.gender,
            birthdate: formatBirthdateForPagarme(dto.dateOfBirth),
            phones: { mobile_phone: mapPlatformPhoneToPagarmeV5(dto.phone) },
            address: addressPayload,
            metadata: dto.metadata || { platformUserId: dto.userId },
        };
    }

    private mapPlatformToPagarmeUpdatePayload(
        dto: UpdateCustomerPlatformRequestDto
    ): PagarmeV5UpdateCustomerPayload {
        const payload: PagarmeV5UpdateCustomerPayload = {};
        if (dto.name !== undefined) payload.name = dto.name;
        if (dto.email !== undefined) payload.email = dto.email;
        if (dto.gender !== undefined) payload.gender = dto.gender;
        if (dto.birthdate !== undefined) payload.birthdate = formatBirthdateForPagarme(dto.birthdate);
        if (dto.metadata !== undefined) payload.metadata = dto.metadata;

        if (dto.address) {
            payload.address = {
                line_1: dto.address.street && dto.address.number ? `${dto.address.street}, ${dto.address.number}` : '',
                line_2: dto.address.complement,
                zip_code: dto.address.zipCode ? dto.address.zipCode.replace(/\D/g, '') : '',
                city: dto.address.city || '',
                state: dto.address.state?.toUpperCase() || '',
                country: "BR",
            };
            Object.keys(payload.address).forEach(key => payload.address![key as keyof PagarmeV5AddressPayload] === undefined && delete payload.address![key as keyof PagarmeV5AddressPayload]);
            if (Object.keys(payload.address).length === 0) delete payload.address;
        }
        if (dto.phones) {
            payload.phones = {};
            if (dto.phones.home_phone) payload.phones.home_phone = mapPlatformPhoneToPagarmeV5(dto.phones.home_phone);
            if (dto.phones.mobile_phone) payload.phones.mobile_phone = mapPlatformPhoneToPagarmeV5(dto.phones.mobile_phone);
            if (Object.keys(payload.phones).length === 0) delete payload.phones;
        }
        return payload;
    }

    async createCustomer(dto: CreateCustomerPlatformRequestDto): Promise<PagarmeV5CustomerResponse> {
        const payload = this.mapPlatformToPagarmeCreatePayload(dto);
        logger.info("PagarmeCustomerService: Creating Pagar.me customer", { email: payload.email, code: payload.code });
        try {
            const response = await this.apiClient.post<PagarmeV5CustomerResponse, PagarmeV5CreateCustomerPayload>('/customers', payload);
            return response.data;
        } catch (error) {
            // O PagarmeApiClient já logou o erro. O serviço pode adicionar contexto se necessário.
            logger.error("PagarmeCustomerService: Error creating customer.", { originalError: error });
            throw error; // Re-lança para o controller/handler tratar a resposta HTTP
        }
    }

    async getCustomerById(customerId: string): Promise<PagarmeV5CustomerResponse | null> {
        logger.info(`PagarmeCustomerService: Getting Pagar.me customer by ID: ${customerId}`);
        try {
            const response = await this.apiClient.get<PagarmeV5CustomerResponse>(`/customers/${customerId}`);
            return response.data;
        } catch (error) {
            if (error instanceof PagarmeApiClientError && error.statusCode === 404) return null;
            logger.error(`PagarmeCustomerService: Error getting customer ${customerId}.`, { originalError: error });
            throw error;
        }
    }

    async updateCustomer(customerId: string, dto: UpdateCustomerPlatformRequestDto): Promise<PagarmeV5CustomerResponse> {
        const payload = this.mapPlatformToPagarmeUpdatePayload(dto);
        logger.info(`PagarmeCustomerService: Updating Pagar.me customer ID: ${customerId}`);
        if (Object.keys(payload).length === 0) {
             logger.warn("PagarmeCustomerService: Update customer called with an empty effective payload.");
        }
        try {
            const response = await this.apiClient.put<PagarmeV5CustomerResponse, PagarmeV5UpdateCustomerPayload>(
                `/customers/${customerId}`, payload
            );
            return response.data;
        } catch (error) {
            logger.error(`PagarmeCustomerService: Error updating customer ${customerId}.`, { originalError: error });
            throw error;
        }
    }

    async listCustomers(params: ListCustomersPlatformParamsDto): Promise<PagarmeV5ListCustomersResponse> {
        logger.info("PagarmeCustomerService: Listing Pagar.me customers", { params });
        const queryParams: Record<string, string | number | undefined> = { ...params };
        if (params.page) queryParams.page = Number(params.page); // Assegura que é número
        if (params.size) queryParams.size = Number(params.size); // Assegura que é número

        try {
            const response = await this.apiClient.get<PagarmeV5ListCustomersResponse>(
                '/customers', { params: queryParams }
            );
            return response.data;
        } catch (error) {
            logger.error("PagarmeCustomerService: Error listing customers.", { originalError: error });
            throw error;
        }
    }
}