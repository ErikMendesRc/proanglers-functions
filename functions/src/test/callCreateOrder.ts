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
const auth = getAuth(app);
connectAuthEmulator(auth, "http://localhost:9099");

const functions = getFunctions(app, "southamerica-east1");
connectFunctionsEmulator(functions, "localhost", 5001);

const TOURNAMENT_ID = "tid456";

async function callCreateOrder(method: "pix" | "credit_card") {
  try {
    await signInWithEmailAndPassword(auth, "pagarme@teste.com", "pagarme123");

    const createOrder = httpsCallable(functions, "createOrder");

    const sharedItems = [
      {
        amount: 15000,
        description: "Torneio Pro Anglers 2025",
        quantity: 1,
        code: "00001",
      },
    ];

    const payload =
      method === "pix"
        ? {
            method,
            items: sharedItems,
            tournamentId: TOURNAMENT_ID,
          }
        : {
            method,
            items: sharedItems,
            tournamentId: TOURNAMENT_ID,
            installments: 3,
            card: {
              number: "4000000000000010",
              holder_name: "Tony Stark",
              holder_document: "11111111111",
              exp_month: 1,
              exp_year: 30,
              cvv: "3531",
              brand: "visa",
              billing_address: {
                line_1: "10880 Malibu Point",
                line_2: "ap 220",
                zip_code: "90265",
                city: "Malibu",
                state: "CA",
                country: "US",
              },
            },
          };

    const response = await createOrder(payload);

    console.log("✅ Pedido criado com sucesso!");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err: any) {
    console.error("❌ Erro ao criar pedido:", err.message || err);
  }
}

callCreateOrder("credit_card");