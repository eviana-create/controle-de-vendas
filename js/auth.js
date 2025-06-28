// ✅ auth.js
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./js/firebaseConfig.js";

// 🔐 Função de login
export async function login(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const docRef = doc(db, "usuarios", user.uid);
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
