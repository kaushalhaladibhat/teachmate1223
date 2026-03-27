import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBg4lX_8ZMKSjdbzdV5dI1_dZOipJ56MK0",
  authDomain: "teachmate12.firebaseapp.com",
  databaseURL: "https://teachmate12-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teachmate12",
  storageBucket: "teachmate12.firebasestorage.app",
  messagingSenderId: "216135007161",
  appId: "1:216135007161:web:d00a41bfca86b776e41468",
  measurementId: "G-5K8CPJRNDJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
