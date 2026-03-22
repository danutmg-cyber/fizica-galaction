# 🧠 INSTRUCȚIUNI AVANSATE – PROIECT „FIZICA GALACTION”

---

## 🎯 SCOP
Crearea unui portal educațional pentru fizică (clasele VI–VIII), cu:
- lecții
- fișe de lucru
- recapitulări
- teste interactive
- laborator de fizică

Accent pe:
- logică
- claritate
- utilizare pe telefon (mobile-first)

---

## 🧩 PRINCIPIU FUNDAMENTAL
„Fizica nu este o materie dominată de formule, ci de logică”

---

## 🧱 STRUCTURA GENERALĂ

fizica-galaction/
- index.html
- sitemap.md
- assets/
  - css/
  - js/
  - img/
  - data/
- clasa6/
- clasa7/
- clasa8/
- progres-elevi/
- resurse-profesor/

---

## 📁 STRUCTURA PE CAPITOL

/capitol/
- index.html
- lectii/index.html
- fise-de-lucru/index.html
- recapitulare/index.html
- test-final/index.html
- imagini/

---

## 📦 FOLDERUL assets – CONȚINUT ȘI ROL

assets/
- css/
- js/
- img/
- data/

---

### 🎨 assets/css
- main.css → stil general
- layout.css → structură pagină
- lessons.css → lecții
- tests.css → teste
- mobile.css → adaptare telefon

REGULĂ:
Nu repeta CSS în fiecare HTML. Mută stilurile comune aici.

---

### ⚙️ assets/js
- app.js → funcții generale
- navigation.js → navigare
- test-engine.js → motor teste
- lesson-viewer.js → lecții
- lab-engine.js → laborator
- progress.js → progres
- utils.js → funcții ajutătoare

REGULĂ:
Funcțiile comune NU se repetă în pagini → se mută aici.

---

### 🖼️ assets/img
- common/
- icons/
- banners/
- backgrounds/

REGULĂ:
- imagini generale → assets
- imagini capitol → folderul capitolului

---

### 🗂️ assets/data
- clase.json
- capitole.json
- structura-site.json

---

## 🔗 LEGĂTURI ÎNTRE PAGINI

### index.html →
- clasa6/
- clasa7/
- clasa8/
- resurse-profesor/
- progres-elevi/

---

### clasaX/index.html →
- laborator-fizica/
- capitole/

---

### capitol/index.html →
- lectii/
- fise-de-lucru/
- recapitulare/
- test-final/

---

### lectii/index.html →
- lecții individuale sau lecție unică

---

### test-final/index.html →
- testul interactiv concret

---

## ♻️ REGULĂ ANTI-REPETARE

NU repeta:
- CSS
- JS
- validări
- header/footer

Mută în:
- assets/css
- assets/js

---

## 📘 LECȚII

Reguli:
- foarte condensate
- ușor de înțeles

Structură:
- definiție
- explicație
- exemplu
- „Reține”

---

## 🧪 TESTE – STRUCTURĂ

- 20 itemi total:
  - 10 teoretici
  - 10 numerici
- 100 puncte
- întrebări amestecate

---

## 🔀 RANDOMIZARE

- pool mare (30–50 întrebări)
- valori variabile
- minim 100 variante

---

## 🔢 ITEMI NUMERICI – REGULI CRITICE

Rezultate:
- max 2 zecimale

---

### VALIDARE

Acceptă:
- 5
- 5.0
- 5.00
- 5,00

---

### TOLERANȚĂ

|răspuns elev - răspuns corect| < 0.15

---

### REGULI IMPORTANTE

- NU penaliza lipsa zecimalelor
- NU afișa regula elevului

---

## 🧠 FEEDBACK FINAL

Afișează:
- scor
- notă

+ obligatoriu:

„Ce trebuie să revezi”
(pe baza greșelilor)

---

## 🧾 INSCRIPȚII STANDARD (TESTE)

Apar DOAR la început:

ȘCOALA GIMNAZIALĂ „GALA GALACTION” MANGALIA  
Prof. DĂNUȚ ANDRONIE  

FIZICA NU ESTE O MATERIE DOMINATĂ DE FORMULE CI DE LOGICĂ

---

## 🧠 INDICAȚIE PENTRU ELEV

Scrie doar valoarea numerică.  
Rezultatul poate avea maximum 2 zecimale.

---

## ⚠️ REGULI UI

- fullscreen
- mobile-first
- butoane mari
- input vizibil

---

## ⚠️ REGULI TEST

- formula apare DOAR dacă elevul greșește
- fără explicații inițiale

---

## 🔬 LABORATOR

/laborator-fizica/
- experimente/
- simulari/
- imagini/

---

## ⚙️ COD

HTML:
- pagini separate
- responsive

CSS:
- dark mode
- lizibil

JS:
- simplu
- fără librării externe

---

## ❗ ERORI DE EVITAT

- butoane nefuncționale
- validare greșită

CORECT:
b₍F₎

GREȘIT:
Fd

---

## 🧠 MODURI CHATGPT

GENERARE LECȚIE:
- scurt
- clar

GENERARE TEST:
- random
- corect numeric

GENERARE HTML:
- responsive
- stil unitar

---

## 🚀 OBIECTIV FINAL

Platformă completă:
- lecții
- teste
- laborator
- progres elev

---

## ✅ REGULĂ FINALĂ

ChatGPT trebuie:
- să simplifice
- să respecte structura
- să optimizeze pentru elevi

NU trebuie:
- să complice
- să ignore regulile numerice
- să rupă consistența proiectului
