// auth.js — Fizica Galaction
// Motorul de autentificare: înregistrare, login (email + Google), delogare, rol utilizator.
//
// Dependințe (de încărcat ÎNAINTE de acest fișier, în <head> sau înainte de </body>):
//   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"></script>
//   <script src="../assets/js/firebase-config.js"></script>   (ajustează calea relativă)
//   <script src="../assets/js/auth.js"></script>

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Înregistrare cu email + parolă.
 * Rolul implicit este întotdeauna "elev" — promovarea la "profesor" sau "admin"
 * se face manual din Firebase Console (vezi ghidul), NICIODATĂ din formularul de
 * înregistrare, ca să nu poată nimeni să-și acorde singur drepturi de profesor.
 */
async function inregistreazaCuEmail(email, parola, numeAfisat) {
  const cred = await auth.createUserWithEmailAndPassword(email, parola);
  await cred.user.updateProfile({ displayName: numeAfisat });
  await db.collection("users").doc(cred.user.uid).set({
    email: email,
    displayName: numeAfisat,
    role: "elev",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred.user;
}

/** Autentificare cu email + parolă. */
async function autentificaCuEmail(email, parola) {
  const cred = await auth.signInWithEmailAndPassword(email, parola);
  return cred.user;
}

/**
 * Autentificare/înregistrare cu Google.
 * Dacă e prima oară când acest utilizator se conectează, îi creăm automat
 * un document în "users" cu rolul implicit "elev".
 */
async function autentificaCuGoogle() {
  const cred = await auth.signInWithPopup(googleProvider);
  const refDoc = db.collection("users").doc(cred.user.uid);
  const docSnapshot = await refDoc.get();
  if (!docSnapshot.exists) {
    await refDoc.set({
      email: cred.user.email,
      displayName: cred.user.displayName || "",
      role: "elev",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  return cred.user;
}

/** Trimite email de resetare a parolei. */
async function reseteazaParola(email) {
  await auth.sendPasswordResetEmail(email);
}

/** Delogare + redirect spre pagina principală. */
async function delogare() {
  await auth.signOut();
  window.location.href = "/index.html";
}

/** Citește rolul unui utilizator din Firestore ("elev" | "profesor" | "admin"). */
async function obtineRol(uid) {
  const docSnapshot = await db.collection("users").doc(uid).get();
  return docSnapshot.exists ? docSnapshot.data().role : null;
}

/**
 * Ascultător global de stare autentificare.
 * callback primește { user, rol } dacă e conectat, sau null dacă nu e.
 *
 * Exemplu de folosire pe orice pagină:
 *   onSchimbareAutentificare((info) => {
 *     if (info) {
 *       console.log("Conectat ca", info.user.email, "rol:", info.rol);
 *     } else {
 *       console.log("Neautentificat");
 *     }
 *   });
 */
function onSchimbareAutentificare(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const rol = await obtineRol(user.uid);
      callback({ user: user, rol: rol });
    } else {
      callback(null);
    }
  });
}

/** Traduce codurile de eroare Firebase în mesaje ușor de înțeles, în română. */
function mesajEroareAutentificare(err) {
  const map = {
    "auth/email-already-in-use": "Există deja un cont cu acest email.",
    "auth/invalid-email": "Adresa de email nu este validă.",
    "auth/weak-password": "Parola trebuie să aibă cel puțin 6 caractere.",
    "auth/user-not-found": "Nu există niciun cont cu acest email.",
    "auth/wrong-password": "Parolă incorectă.",
    "auth/invalid-credential": "Email sau parolă incorectă.",
    "auth/too-many-requests": "Prea multe încercări. Încearcă din nou mai târziu.",
    "auth/popup-closed-by-user": "Fereastra de conectare Google a fost închisă."
  };
  return map[err.code] || ("A apărut o eroare: " + err.message);
}
