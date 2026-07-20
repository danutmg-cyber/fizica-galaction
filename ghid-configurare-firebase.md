# Ghid pas-cu-pas — Configurare Firebase pentru autentificare

Acest ghid acoperă tot ce trebuie făcut din Firebase Console (fără linie de comandă) ca să funcționeze fișierele `login/index.html`, `auth.js`, `auth-guard.js` și `firestore.rules` deja generate.

---

## Pasul 1 — Creează proiectul Firebase

1. Mergi pe [console.firebase.google.com](https://console.firebase.google.com) și conectează-te cu contul Google pe care vrei să-l folosești pentru administrare.
2. Click pe **„Add project" / „Adaugă proiect"**.
3. Dă-i un nume, de exemplu `fizica-galaction`. Firebase va genera automat un Project ID (îl poți edita dacă vrei unul anume).
4. La pasul despre Google Analytics — nu e necesar pentru autentificare/Firestore; poți dezactiva „Enable Google Analytics" ca să simplifici procesul (îl poți activa oricând mai târziu).
5. Așteaptă câteva secunde cât se creează proiectul, apoi „Continue".

## Pasul 2 — Adaugă o aplicație Web în proiect

1. În dashboard-ul proiectului, click pe iconița **`</>`** (Web) din secțiunea „Get started by adding Firebase to your app".
2. Dă un nickname aplicației (ex: `fizica-galaction-web`).
3. **Nu** bifa „Also set up Firebase Hosting" — site-ul tău e deja găzduit pe GitHub Pages.
4. Firebase îți afișează un bloc de cod cu `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
5. **Copiază exact aceste valori** în fișierul `assets/js/firebase-config.js` pe care îl ai deja, înlocuind textele `COMPLETEAZĂ_AICI`.

## Pasul 3 — Activează metodele de autentificare

1. Din meniul din stânga, click pe **Authentication**, apoi **„Get started"** (dacă e prima oară).
2. Tab-ul **„Sign-in method"** → click pe **„Add new provider"** (sau lista de provideri, în funcție de versiunea consolei).
3. **Email/Password**: click pe el, activează primul toggle („Email/Password"), Save.
4. **Google**: click pe el, activează toggle-ul „Enable", alege un „Project support email" (adresa ta), Save.

## Pasul 4 — Autorizează domeniul unde va rula site-ul

Firebase blochează implicit autentificarea de pe domenii neautorizate (măsură de securitate).

1. Tot în **Authentication → Settings → Authorized domains**.
2. Verifică dacă domeniul tău GitHub Pages (ceva de forma `numeutilizator.github.io`) apare deja în listă. De obicei `localhost` e deja acolo automat, util pentru testare locală.
3. Dacă lipsește, click **„Add domain"** și adaugă exact domeniul (fără `https://`, fără slash la final), de exemplu:
   ```
   numeutilizator.github.io
   ```
4. Dacă folosești un domeniu propriu (custom domain) pentru site, adaugă-l și pe acela.

## Pasul 5 — Creează baza de date Firestore

1. Din meniul din stânga, **Firestore Database** → **„Create database"**.
2. Alege locația serverului (orice regiune din Europa e o alegere bună pentru latență din România, de exemplu `eur3` sau `europe-west`).
3. La modul de pornire, alege **„Start in production mode"** (nu „test mode" — modul test lasă baza de date complet deschisă timp de 30 de zile, ceea ce nu vrei).

## Pasul 6 — Publică regulile de securitate

1. În Firestore Database, tab-ul **„Rules"**.
2. Șterge conținutul implicit și lipește tot conținutul din fișierul `firestore.rules` generat anterior.
3. Click **„Publish"**.
4. Testează rapid cu simulatorul de reguli din consolă (butonul „Rules playground") dacă vrei să verifici înainte de a publica live — opțional, dar util.

## Pasul 7 — Testează întregul flux

1. Deschide `login/index.html` din site-ul tău live (sau local, cu `localhost`, dacă ai un server local — deschiderea directă din `file://` nu funcționează cu popup-ul Google).
2. Creează un cont de test cu email + parolă. Verifică în Firebase Console → Authentication → Users că a apărut, și în Firestore Database → users că s-a creat documentul cu `role: "elev"`.
3. Testează și „Continuă cu Google".
4. Deloghează-te și reautentifică-te, ca să confirmi că merge și fluxul de login (nu doar înregistrare).

## Pasul 8 — Promovează-te pe tine la rolul de „admin"

Rolul de admin/profesor **nu se poate obține din formular** — e o decizie de securitate (altfel oricine și-ar putea acorda singur drepturi). Se face manual:

1. Firestore Database → colecția `users` → găsește documentul cu UID-ul tău (îl identifici după câmpul `email`).
2. Click pe document → editează câmpul `role` → schimbă valoarea din `"elev"` în `"admin"`.
3. Salvează. Data viitoare când te loghezi, `auth-guard.js` te va recunoaște ca admin.

Pentru profesorii pe care vrei să-i adaugi ulterior: le ceri să-și creeze cont normal (vor primi automat rolul „elev"), apoi tu le schimbi manual rolul în `"profesor"` din același loc.

## Pasul 9 — Protejează paginile care au nevoie de un rol anume

Pe orice pagină care trebuie să fie accesibilă doar profesorilor (de exemplu un viitor dashboard), adaugă în `<head>` sau înainte de `</body>`, după `auth.js`:

```html
<script src="../assets/js/auth-guard.js" data-rol-necesar="profesor"></script>
```

Pentru pagini care cer doar autentificare (orice rol), omite `data-rol-necesar`:

```html
<script src="../assets/js/auth-guard.js"></script>
```

---

## Listă de verificare finală

- [ ] `firebase-config.js` are valorile reale din consolă (nu mai are `COMPLETEAZĂ_AICI`)
- [ ] Email/Password și Google sunt activate în Authentication
- [ ] Domeniul GitHub Pages e în lista de domenii autorizate
- [ ] Firestore e creat în modul „production" (nu „test")
- [ ] Regulile din `firestore.rules` sunt publicate
- [ ] Un cont de test funcționează cu email+parolă și cu Google
- [ ] Documentul din `users` s-a creat automat cu `role: "elev"`
- [ ] Te-ai promovat manual la `"admin"` pentru propriul cont

## Ce urmează, dincolo de acest ghid

Autentificarea de bază e completă după acești pași. Următoarele lucruri **nu** sunt incluse aici și rămân pentru o etapă viitoare (le putem aborda separat, când ești gata):

- Un dashboard de profesor care citește progresul elevilor din colecția `progress`
- Afișarea stării de autentificare în `header.html` (nume utilizator, buton de delogare)
- Migrarea sistemului actual de progres din `localStorage` către colecția `progress` din Firestore, ca progresul să fie legat de cont, nu de dispozitiv
