import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "../config/admin";
import { PagarmeApiClient } from "../lib/PagarmeApiClient";
import {
  CreateCustomerPlatformRequestDto,
  UpdateCustomerPlatformRequestDto,
  PlatformAddressDto,
  PlatformPhoneDto,
} from "../types/dto/pagarmeCustomer.dto";
import { PagarmeCustomerService } from "../services/PagarmeService";
import { PAGARME_API_KEY, PAGARME_BASE_URL } from "../config/params";

export const onUserWritePagarmeCustomer = onDocumentWritten(
  { document: "users/{userId}",
    region: "southamerica-east1",
  },
  
  async (event) => {
    const apiKey = PAGARME_API_KEY.value();
    const baseUrl = PAGARME_BASE_URL.value();

    if (!apiKey || !baseUrl) {
      logger.error("Configuração do Pagar.me ausente.");
      throw new Error("PAGARME_API_KEY e PAGARME_BASE_URL devem estar definidos como parâmetros.");
    }

    const pagarmeApiClient = new PagarmeApiClient(apiKey, baseUrl);
    const pagarmeCustomerService = new PagarmeCustomerService(pagarmeApiClient);

    const docChange = event.data;
    if (!docChange) return;

    const beforeSnapshot = docChange.before;
    const afterSnapshot = docChange.after;
    const userId = event.params.userId;

    // === CRIAÇÃO ===
    if (!beforeSnapshot.exists && afterSnapshot.exists) {
      const newUserData = afterSnapshot.data()!;

      const platformAddress: PlatformAddressDto = {
        street: newUserData.address.street,
        number: newUserData.address.number,
        complement: newUserData.address.complement,
        neighborhood: newUserData.address.neighborhood,
        city: newUserData.address.city,
        state: newUserData.address.state,
        zipCode: newUserData.address.zipCode,
      };

      const platformPhone: PlatformPhoneDto = {
        countryCode: newUserData.countryCode,
        areaCode: newUserData.ddd,
        number: newUserData.telephoneNumber,
      };

      const createCustomerDto: CreateCustomerPlatformRequestDto = {
        userId,
        name: newUserData.name,
        email: newUserData.email,
        cpf: newUserData.cpf,
        dateOfBirth: newUserData.dateOfBirth,
        gender: newUserData.gender,
        address: platformAddress,
        phone: platformPhone,
        metadata: { firebaseUid: userId },
      };

      try {
        const createdCustomer = await pagarmeCustomerService.createCustomer(createCustomerDto);
        await afterSnapshot.ref.set(
          { pagarmeCustomerId: createdCustomer.id },
          { merge: true }
        );
        logger.info(`Pagar.me customer criado: ${createdCustomer.id}`, { userId });
      } catch (error) {
        logger.error(`Erro ao criar customer no Pagar.me para user ${userId}`, error);
      }

    // === ATUALIZAÇÃO ===
    } else if (beforeSnapshot.exists && afterSnapshot.exists) {
      const previousUserData = beforeSnapshot.data()!;
      const currentUserData = afterSnapshot.data()!;
      const customerId: string | undefined = previousUserData.pagarmeCustomerId;

      if (!customerId) {
        logger.warn(`Usuário ${userId} não tinha pagarmeCustomerId; ignorando update.`);
        return;
      }

      const updateCustomerDto: UpdateCustomerPlatformRequestDto = {};

      if (currentUserData.name !== previousUserData.name) {
        updateCustomerDto.name = currentUserData.name;
      }
      if (currentUserData.email !== previousUserData.email) {
        updateCustomerDto.email = currentUserData.email;
      }
      if (currentUserData.gender !== previousUserData.gender) {
        updateCustomerDto.gender = currentUserData.gender;
      }
      if (currentUserData.dateOfBirth !== previousUserData.dateOfBirth) {
        updateCustomerDto.birthdate = currentUserData.dateOfBirth;
      }

      const addressChanged =
        JSON.stringify(currentUserData.address) !== JSON.stringify(previousUserData.address);
      if (addressChanged) {
        updateCustomerDto.address = {
          street: currentUserData.address.street,
          number: currentUserData.address.number,
          complement: currentUserData.address.complement,
          neighborhood: currentUserData.address.neighborhood,
          city: currentUserData.address.city,
          state: currentUserData.address.state,
          zipCode: currentUserData.address.zipCode,
        };
      }

      const phoneChanged =
        currentUserData.ddd !== previousUserData.ddd ||
        currentUserData.telephoneNumber !== previousUserData.telephoneNumber;

      if (phoneChanged) {
        updateCustomerDto.phones = {
          mobile_phone: {
            countryCode: currentUserData.countryCode,
            areaCode: currentUserData.ddd,
            number: currentUserData.telephoneNumber,
          },
        };
      }

      if (Object.keys(updateCustomerDto).length === 0) {
        return; // nenhum campo alterado
      }

      try {
        await pagarmeCustomerService.updateCustomer(customerId, updateCustomerDto);
        logger.info(`Pagar.me customer atualizado: ${customerId}`, { userId });
      } catch (error) {
        logger.error(`Erro ao atualizar customer ${customerId} no Pagar.me`, error);
      }
    }
  }
);