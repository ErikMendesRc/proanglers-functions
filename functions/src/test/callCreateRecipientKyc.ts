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

async function callCreateRecipientKyc() {
  try {
    await signInWithEmailAndPassword(auth, "pagarme@teste.com", "pagarme123");

    const createRecipientKyc = httpsCallable(functions, "createRecipientKyc");

    const response = await createRecipientKyc({
      recipient_id: "re_cmah6tb8p00920l9t9qcqoxfd",
    });
    const data = response.data as {
      url: string;
      base64QrCode: string;
      expiresAt: string;
      status: string;
    };

    console.log("✅ Link de KYC criado com sucesso!");
    console.log("🔗 URL:", data.url);
    console.log("🕒 Expira em:", data.expiresAt);
    console.log("📷 QR Code (base64):", data.base64QrCode.slice(0, 50) + "...");
  } catch (err: any) {
    console.error("❌ Erro ao criar link de KYC:", err.message || err);
  }
}

callCreateRecipientKyc();
