// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { app as mainApp } from "../js/firebaseConfig.js";
import { db as mainDb } from "../js/firebaseConfig.js";

// Firebase Auth app principal
const auth = getAuth(mainApp);

// App secundário para cadastro (evita logout do admin)
const secondaryApp = initializeApp(mainApp.options, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// 🔐 Função de login
export async function login(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const docRef = doc(mainDb, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const tipo = docSnap.data().tipo;
      return { success: true, tipo };
    } else {
      return { success: false, error: "Usuário sem perfil definido." };
    }

  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, error: "Email ou senha inválidos." };
  }
}

// 🔓 Função de logout
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Erro ao sair:", error);
    return { success: false, error };
  }
}

// 🔑 Função para cadastrar usuário sem deslogar admin
export async function cadastrarUsuario(email, senha, tipo, codigo) {
  try {
    // Exemplo de validação para admin (ajuste a chave conforme seu sistema)
    if (tipo === "admin") {
      const codigoCorreto = "ADMIN2025"; // substitua pela sua chave real
      if (codigo !== codigoCorreto) {
        return { success: false, error: "Código de autorização inválido para administrador." };
      }
    }

    // Cria usuário no app secundário (não desloga o admin principal)
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
    const uid = cred.user.uid;

    // Salva dados do usuário no Firestore principal
    await setDoc(doc(mainDb, "usuarios", uid), {
      email,
      tipo,
      criadoEm: serverTimestamp()
    });

    // Finaliza sessão do app secundário
    await signOut(secondaryAuth);

    return { success: true };

  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return { success: false, error: error.message };
  }
}

// Função para pegar usuário atual logado (exemplo simples)
export function getUsuarioAtual() {
  return auth.currentUser || {};
}

// Exporta auth e db para uso externo se quiser
export { auth, mainDb as db };
