// src/config/firebaseConfig.js
import { initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrekFf2ABBUcfj8PgAD1rHi2edDOXoXbs",
  authDomain: "reseausocial-4c1ee.firebaseapp.com",
  databaseURL: "https://reseausocial-4c1ee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "reseausocial-4c1ee",
  storageBucket: "reseausocial-4c1ee.firebasestorage.app",
  messagingSenderId: "229037301754",
  appId: "1:229037301754:web:588da20eeb158d29a40e43",
  measurementId: "G-4HZXRRPN2F"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };