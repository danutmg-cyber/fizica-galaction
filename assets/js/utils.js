// utils.js — Fizica Galaction
// Funcții ajutătoare comune, reutilizabile din orice pagină.
// IMPORTANT: acest fișier NU rulează nimic automat la încărcare —
// doar definește funcții. E sigur de inclus oriunde, inclusiv în locul
// vechii referințe către "assets/js/main.js" (fișier care nu mai există).

/**
 * Numără vizitele unei pagini/lecții în localStorage, o singură dată per sesiune
 * de navigare (folosind sessionStorage ca să nu numere de mai multe ori la
 * fiecare interacțiune din aceeași vizită).
 *
 * @param {string} cheie - identificator unic, ex: "vizitatori_lectia_10"
 * @param {string} idElementAfisare - id-ul elementului HTML unde se afișează numărul
 * @returns {number} numărul curent de vizite
 */
function actualizeazaContorVizitatori(cheie, idElementAfisare) {
  const cheieSesiune = cheie + "_numarat_sesiunea_curenta";
  let numar = Number(localStorage.getItem(cheie) || "0");

  if (!sessionStorage.getItem(cheieSesiune)) {
    numar += 1;
    localStorage.setItem(cheie, String(numar));
    sessionStorage.setItem(cheieSesiune, "1");
  }

  const element = document.getElementById(idElementAfisare);
  if (element) {
    element.textContent = String(numar);
  }

  return numar;
}

/**
 * Normalizează un răspuns numeric introdus de elev: acceptă atât virgulă
 * cât și punct zecimal ("5,00" sau "5.00"), elimină spațiile.
 * Vezi regulile din instructiuni_prof_fizica.md — REGULI CRITICE ITEMI NUMERICI.
 *
 * @param {string} textIntrodus
 * @returns {number|null} numărul rezultat, sau null dacă nu e un număr valid
 */
function normalizeazaRaspunsNumeric(textIntrodus) {
  if (typeof textIntrodus !== "string") return null;
  const curatat = textIntrodus.trim().replace(",", ".");
  if (curatat === "") return null;
  const numar = Number(curatat);
  return Number.isFinite(numar) ? numar : null;
}

/**
 * Verifică dacă răspunsul elevului e corect, cu toleranța standard de 0.15
 * definită în instructiuni_prof_fizica.md.
 *
 * @param {string} raspunsElev - text introdus de elev
 * @param {number} raspunsCorect - valoarea numerică așteptată
 * @param {number} [toleranta=0.15]
 * @returns {boolean}
 */
function esteRaspunsNumericCorect(raspunsElev, raspunsCorect, toleranta) {
  const t = typeof toleranta === "number" ? toleranta : 0.15;
  const valoare = normalizeazaRaspunsNumeric(raspunsElev);
  if (valoare === null) return false;
  return Math.abs(valoare - raspunsCorect) < t;
}

/**
 * Amestecă (shuffle) un array, fără să modifice originalul.
 * Util pentru randomizarea întrebărilor din teste (pool 30-50 întrebări).
 *
 * @param {Array} array
 * @returns {Array} un array nou, amestecat
 */
function amestecaArray(array) {
  const copie = array.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Alege N elemente aleatorii, distincte, dintr-un array (ex: N întrebări
 * dintr-un pool de 30-50, conform regulilor de randomizare).
 *
 * @param {Array} array
 * @param {number} n
 * @returns {Array}
 */
function alegeAleatoriu(array, n) {
  return amestecaArray(array).slice(0, n);
}

/**
 * Scroll lin către începutul paginii — folosit la schimbarea de pagină
 * într-o lecție paginată.
 */
function scrollSusLin() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
