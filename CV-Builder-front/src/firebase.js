import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyChkSIJUKq9kmvlWFWNNCdc87daTsFGyGM",
  authDomain: "nebula--cv-builder.firebaseapp.com",
  projectId: "nebula--cv-builder",
  storageBucket: "nebula--cv-builder.firebasestorage.app",
  messagingSenderId: "1066853761197",
  appId: "1:1066853761197:web:dfbd463a433d78d99dc624"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();