import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Signing in as admin...");
    await signInWithEmailAndPassword(auth, "admin@royalblade.com", "admin_Cb!26");
    console.log("Sign in successful!");

    console.log("Deleting mock games from Firestore...");
    await deleteDoc(doc(db, "bolaoGames", "game_mock_1"));
    await deleteDoc(doc(db, "bolaoGames", "game_mock_2"));
    console.log("Mock games deleted successfully!");
  } catch (error) {
    console.error("Error deleting mock games:", error);
  }
}

run();
