from pathlib import Path

readme = r"""# Fizica Galaction

Platformă educațională interactivă pentru studiul fizicii la gimnaziu, realizată pentru elevii claselor a VI-a, a VII-a și a VIII-a.

Materialele sunt concepute pentru a fi utilizate pe telefon, tabletă, calculator și tablă interactivă.

> **„Fizica nu este o materie dominată de formule, ci de logică.”**

**Autor:** Prof. Dănuț Andronie  
**Școala:** Școala Gimnazială „Gala Galaction” Mangalia  
**Contact:** [danutmg@gmail.com](mailto:danutmg@gmail.com)

---

## Cuprins

- [Despre proiect](#despre-proiect)
- [Funcționalități](#funcționalități)
- [Tehnologii](#tehnologii)
- [Structura repository-ului](#structura-repository-ului)
- [Rulare locală](#rulare-locală)
- [Organizarea conținutului](#organizarea-conținutului)
- [Crearea unei lecții](#crearea-unei-lecții)
- [Formule cu MathJax](#formule-cu-mathjax)
- [Fișe interactive](#fișe-interactive)
- [Teste și evaluări](#teste-și-evaluări)
- [Design responsiv și accesibilitate](#design-responsiv-și-accesibilitate)
- [Progresul elevilor](#progresul-elevilor)
- [Firebase](#firebase)
- [Publicare](#publicare)
- [Verificări înainte de publicare](#verificări-înainte-de-publicare)
- [Convenții de lucru](#convenții-de-lucru)
- [Contribuții](#contribuții)
- [Licență](#licență)

---

## Despre proiect

**Fizica Galaction** este o colecție de resurse educaționale pentru fizica de gimnaziu:

- lecții interactive;
- explicații și exemple rezolvate;
- formule redate cu MathJax;
- fișe de lucru;
- recapitulări;
- teste;
- experimente;
- simulări;
- jocuri educaționale;
- activități pentru laborator.

Platforma folosește pagini HTML statice și resurse comune CSS și JavaScript. Nu este necesar un proces de compilare pentru rularea conținutului de bază.

### Obiective

Platforma urmărește:

1. prezentarea fizicii într-un limbaj clar;
2. organizarea lecțiilor în secvențe scurte;
3. învățarea prin observare, experiment, concluzie și aplicare;
4. verificarea rapidă după fiecare noțiune importantă;
5. utilizarea corectă a mărimilor și unităților de măsură;
6. dezvoltarea gândirii logice și a capacității de rezolvare a problemelor;
7. accesarea materialelor de pe orice dispozitiv.

---

## Funcționalități

### Lecții pe pagini

Lecțiile pot fi împărțite în mai multe ecrane, cu:

- indicator de progres;
- buton „Înapoi”;
- buton „Mergi mai departe”;
- salvarea locală a ultimei pagini;
- navigare cu tastatura;
- actualizarea formulelor MathJax;
- revenire la ultima pagină vizualizată.

### Verificări rapide

Lecțiile pot conține:

- variante cu alegere simplă;
- adevărat sau fals;
- răspuns numeric;
- completare;
- feedback imediat;
- explicația răspunsului corect.

### Fișe de lucru

Fișele interactive pot include:

- câmpuri text;
- răspunsuri numerice;
- liste de selectare;
- itemi cu variante;
- verificarea răspunsurilor;
- calcularea scorului;
- resetarea activității.

### Teste

Testele pot fi organizate cu:

- identificarea elevului;
- întrebări teoretice;
- probleme numerice;
- punctaj;
- notă;
- feedback final;
- salvarea sau trimiterea rezultatului, atunci când este configurată.

### Temă luminoasă și întunecată

Platforma poate utiliza mod luminos și mod întunecat. Textul și elementele interactive trebuie să rămână lizibile în ambele moduri.

---

## Tehnologii

- **HTML5** – structura paginilor;
- **CSS3** – aspect, responsive design și teme;
- **JavaScript** – lecții, fișe, teste și navigare;
- **MathJax** – afișarea formulelor matematice;
- **Firebase Authentication** – autentificare opțională;
- **Cloud Firestore** – salvarea opțională a progresului;
- **Firebase Hosting sau GitHub Pages** – publicare statică;
- **Python** – scripturi auxiliare pentru administrarea fișierelor.

---

## Structura repository-ului

```text
fizica-galaction/
├── assets/
│   ├── components/
│   ├── css/
│   ├── data/
│   ├── img/
│   └── js/
├── clasa6/
├── clasa7/
├── clasa8/
├── laborator-fizica/
├── login/
├── templates/
├── README.md
├── sitemap.md
├── index.html
├── firestore.rules
├── ghid-configurare-firebase.md
├── instructiuni_prof_fizica.md
└── adauga-app-js.py
