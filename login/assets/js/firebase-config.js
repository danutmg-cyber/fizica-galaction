// firebase-config.js
// Fizica Galaction — configurația proiectului Firebase
//
// IMPORTANT: Înlocuiește valorile de mai jos cu cele din Firebase Console:
// Project settings (⚙️) → General → "Your apps" → Web app → SDK setup and configuration
//
// Aceste valori NU sunt secrete în sensul unei parole — sunt identificatori publici
// ai proiectului Firebase, e normal să apară în cod client-side și în repo public.
// Securitatea reală vine din Firestore Security Rules (fișierul firestore.rules),
// nu din ascunderea acestor valori.

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
 // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCV66NlRO6XO5OdiQ7QoGceIyiRSzl5NxE",
  authDomain: "fizica-galaction.firebaseapp.com",
  projectId: "fizica-galaction",
  storageBucket: "fizica-galaction.firebasestorage.app",
  messagingSenderId: "705547484914",
  appId: "1:705547484914:web:299e8afa54209764a9da6b",
  measurementId: "G-K2SGZ47S6P"
};
