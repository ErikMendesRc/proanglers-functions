import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "localhost",
  projectId: "proanglers-148ad",
};

const app = initializeApp(firebaseConfig);

// Autenticação
const auth = getAuth(app);
connectAuthEmulator(auth, "http://localhost:9099");

// Funções
const functions = getFunctions(app, "southamerica-east1");
connectFunctionsEmulator(functions, "localhost", 5001);

async function callCreateRecipient() {
  try {
    // Login do usuário de teste (precisa existir no emulator)
    await signInWithEmailAndPassword(auth, "pagarme@teste.com", "pagarme123");

    const createRecipient = httpsCallable(functions, "createRecipient");

    const response = await createRecipient({
      register_information: {
        name: "João da Silva",
        email: "joao.silva@example.com",
        document: "12345678909",
        type: "individual",
        phone_numbers: [{ ddd: "11", number: "912345678", type: "mobile" }],
        address: {
          street: "Av. General Justo",
          complementary: "Bloco A",
          street_number: "375",
          neighborhood: "Centro",
          city: "Rio de Janeiro",
          state: "RJ",
          zip_code: "20021130",
          reference_point: "Ao lado da banca de jornal",
        },
        birthdate: "01/01/1990",
        monthly_income: "5000",
        mother_name: "Maria da Silva",
        professional_occupation: "Desenvolvedor",
      },
      default_bank_account: {
        holder_name: "João da Silva",
        holder_type: "individual",
        holder_document: "12345678909",
        bank: "001",
        branch_number: "1234",
        account_number: "567890",
        account_check_digit: "1",
        type: "checking",
      },
      code: "joao-silva-rec",
      description: "Recebedor João da Silva",
    });

    console.log("✅ Sucesso:", response.data);
  } catch (err: any) {
    console.error("❌ Erro ao chamar createRecipient:", err.message || err);
  }
}

callCreateRecipient();
