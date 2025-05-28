import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGYZrZ9GQQviargSMHCY_pkfXpSG9IHWU",
  authDomain: "medsage-4648b.firebaseapp.com",
  projectId: "medsage-4648b",
  storageBucket: "medsage-4648b.firebasestorage.app",
  messagingSenderId: "443645559024",
  appId: "1:443645559024:web:309d9cfb04982f8a920235",
  measurementId: "G-2ME1VQV1CX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider, analytics };
export default app; 