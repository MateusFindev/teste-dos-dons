import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJLYNwfVySiUR99hrfeQa3h4cWcbcV2g8",
  authDomain: "teste-dos-dons.firebaseapp.com",
  projectId: "teste-dos-dons",
  storageBucket: "teste-dos-dons.firebasestorage.app",
  messagingSenderId: "714706857609",
  appId: "1:714706857609:web:c223a93fc3ba0ed7a2a058",
  measurementId: "G-3TZHWZQ3NZ"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar Firestore
export const db = getFirestore(app)

export default app
