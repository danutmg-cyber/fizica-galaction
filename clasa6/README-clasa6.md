# Fizica Galaction – Clasa a VI-a

Materiale educaționale interactive pentru studiul fizicii la clasa a VI-a.

Conținutul este organizat în lecții, fișe de lucru, recapitulări, teste și jocuri. Paginile trebuie să poată fi utilizate pe telefon, tabletă și calculator.

## Acces

Pagina principală a clasei a VI-a este:

```text
clasa6/index.html
```

## Structura clasei a VI-a

```text
clasa6/
├── 1-concepte-de-baza-in-fizica/
├── 2-unitati-de-masura/
├── 3-fenomene-mecanice/
├── 4-fenomene-termice/
├── 5-fenomene-electrice-si-magnetice/
├── 6-fenomene-optice/
├── 7-test-de-evaluare-finala/
├── 8-jocuri/
├── index.html
└── README.md
```

### Capitole

1. **Concepte de bază în fizică**
2. **Unități de măsură**
3. **Fenomene mecanice**
4. **Fenomene termice**
5. **Fenomene electrice și magnetice**
6. **Fenomene optice**
7. **Test de evaluare finală**
8. **Jocuri educaționale**

## Structura recomandată a unui capitol

Fiecare capitol trebuie să urmeze, pe cât posibil, aceeași structură:

```text
n-numele-capitolului/
├── index.html
├── lectii/
│   ├── index.html
│   ├── lectia-1.html
│   ├── lectia-2.html
│   └── imagini/
├── fise-de-lucru/
│   ├── index.html
│   ├── fisa-1.html
│   └── fisa-2.html
├── recapitulare/
│   └── index.html
├── test-final/
│   └── index.html
└── imagini/
```

Nu toate capitolele trebuie să aibă același număr de lecții sau fișe, dar indexurile trebuie să listeze toate fișierele existente.

## Reguli de denumire

Folosește denumiri previzibile și fără spații:

```text
lectia-1.html
lectia-2.html
fisa-1.html
fisa-2.html
index.html
```

Pentru directoare se folosesc litere mici și cratime:

```text
fenomene-mecanice
fise-de-lucru
test-final
```

Nu păstra copii ale fișelor în directorul `lectii`. Fiecare material trebuie să existe într-o singură locație.

## Lecțiile

O lecție trebuie să conțină:

- titlul și numărul lecției;
- obiective sau idei principale;
- explicații adaptate clasei a VI-a;
- exemple din viața de zi cu zi;
- pagini scurte și ușor de parcurs;
- butoane vizibile „Înapoi” și „Mergi mai departe”;
- verificare rapidă cu variante aliniate;
- feedback pentru răspunsuri;
- legături către fișa de lucru și indexul lecțiilor;
- mod zi/noapte, acolo unde este folosit de restul capitolului.

### Afișare pe dispozitive

Lecțiile trebuie să fie lizibile pe:

- telefon;
- tabletă;
- laptop;
- calculator desktop.

Folosește obligatoriu:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Butoanele trebuie să fie suficient de mari pentru ecrane tactile, iar textul trebuie să aibă contrast bun pe fundal închis.

## Fișele de lucru

Fișele interactive folosesc, de regulă, resursele comune:

```html
<link rel="stylesheet" href="../../../assets/css/lesson-app.css">

<script src="../../../assets/js/utils.js"></script>
<script src="../../../assets/js/worksheet-engine.js"></script>
```

Datele fișei sunt definite în obiectul:

```javascript
const FISA_DATA = {
  titlu: "Fișa ...",
  capitol: "...",
  linkuri: {
    inapoiLaLectii: "../lectii/index.html",
    vezicaLectie: "../lectii/lectia-N.html",
    toateFisele: "./index.html"
  },
  pagini: []
};
```

Pornirea fișei se face prin:

```javascript
initWorksheet({
  data: FISA_DATA,
  containerId: "worksheetApp",
  navId: "worksheetNav"
});
```

### Tipuri de exerciții folosite

- completare;
- alegere;
- adevărat/fals;
- selecție;
- răspuns numeric;
- răspuns liber.

Fiecare întrebare trebuie să aibă un identificator unic.

## Formule și fracții

Pentru formule, fracții și notație matematică se folosește MathJax.

Exemplu:

```html
<script>
  window.MathJax = {
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]]
    }
  };
</script>

<script
  defer
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
></script>
```

Exemple de formule:

```text
$I=\frac{Q}{t}$

$\rho=\frac{m}{V}$

$\frac{kx^2}{2}$
```

Exemplu numeric:

```text
$I=\frac{6\,C}{3\,s}=2\,A$
```

Nu scrie fracțiile sub forma `Q/t` atunci când formula trebuie evidențiată vizual.

## Imagini

Imaginile folosite în mai multe pagini ale capitolului se păstrează în:

```text
n-numele-capitolului/imagini/
```

Imaginile folosite numai de lecții pot fi păstrate în:

```text
n-numele-capitolului/lectii/imagini/
```

Nu păstra imaginile amestecate direct printre fișierele `lectia-N.html`.

Exemplu dintr-o lecție:

```html
<figure>
  <img
    src="./imagini/circuit-electric.png"
    alt="Schema unui circuit electric simplu"
    loading="lazy"
    decoding="async"
  >
  <figcaption>Circuit electric simplu închis.</figcaption>
</figure>
```

Fiecare imagine trebuie să aibă:

- atribut `alt`;
- dimensiune adaptabilă;
- legendă, când ajută la înțelegerea lecției;
- cale relativă corectă;
- nume de fișier clar.

## Căi relative către resurse

Pentru o lecție sau fișă aflată la trei niveluri sub rădăcina proiectului:

```text
clasa6/capitol/lectii/lectia-1.html
clasa6/capitol/fise-de-lucru/fisa-1.html
```

calea uzuală către resursele comune este:

```text
../../../assets/
```

Exemple:

```html
<link rel="stylesheet" href="../../../assets/css/lesson-app.css">
<script src="../../../assets/js/utils.js"></script>
```

Pentru legături în interiorul capitolului:

```html
<a href="./index.html">Toate lecțiile</a>
<a href="../fise-de-lucru/fisa-1.html">Fișa de lucru</a>
<a href="../recapitulare/index.html">Recapitulare</a>
<a href="../test-final/index.html">Test final</a>
```

## Resurse comune

Proiectul folosește resurse partajate din:

```text
assets/css/
assets/js/
```

Fișiere importante:

```text
assets/css/lesson-app.css
assets/css/layout.css
assets/css/lessons.css
assets/css/main.css
assets/css/mobile.css

assets/js/utils.js
assets/js/worksheet-engine.js
assets/js/test-engine.js
assets/js/lesson-viewer.js
```

Înainte de a adăuga stiluri sau funcții duplicate într-o pagină, verifică dacă funcționalitatea există deja în resursele comune.

## Adăugarea unei lecții noi

1. Creează fișierul `lectia-N.html` în directorul `lectii`.
2. Folosește titlul și conținutul lecției din programa capitolului.
3. Organizează lecția pe pagini scurte.
4. Adaugă butoanele „Înapoi” și „Mergi mai departe”.
5. Adaugă o verificare rapidă.
6. Adaugă legătura spre fișa corespunzătoare.
7. Adaugă lecția în `lectii/index.html`.
8. Verifică toate imaginile și căile relative.
9. Testează pagina pe telefon și calculator.

## Adăugarea unei fișe noi

1. Creează `fisa-N.html` în `fise-de-lucru`.
2. Leagă fișa de `lectia-N.html`.
3. Folosește întrebări potrivite conținutului lecției.
4. Verifică punctajul total.
5. Folosește identificatori unici pentru itemi.
6. Adaugă fișa în `fise-de-lucru/index.html`.
7. Verifică butonul „Mergi mai departe”.
8. Verifică pagina finală de evaluare.

## Recapitulări și teste

Recapitulările și testele trebuie să includă:

- întrebări din întregul capitol;
- variante aliniate;
- feedback clar;
- calcularea scorului;
- buton de reluare;
- legătură către capitol;
- afișare adaptată dispozitivelor mobile.

Pentru testele care folosesc motorul comun:

```html
<script src="../../../assets/js/test-engine.js"></script>
```

## Verificare înainte de publicare

### Structură

- [ ] Toate lecțiile sunt listate în `lectii/index.html`.
- [ ] Toate fișele sunt listate în `fise-de-lucru/index.html`.
- [ ] Nu există fișiere duplicate în directoare diferite.
- [ ] Numele fișierelor respectă convenția proiectului.

### Legături

- [ ] Butonul „Înapoi” funcționează.
- [ ] Butonul „Mergi mai departe” funcționează.
- [ ] Legătura către fișa de lucru funcționează.
- [ ] Legăturile spre recapitulare și test funcționează.
- [ ] Nicio legătură nu returnează eroare 404.

### Conținut

- [ ] Titlul lecției este corect.
- [ ] Conținutul corespunde lecției.
- [ ] Formulele sunt afișate prin MathJax.
- [ ] Exemplele numerice au unități de măsură.
- [ ] Variantele verificării rapide sunt aliniate.

### Imagini

- [ ] Fiecare imagine se încarcă.
- [ ] Fiecare imagine are text alternativ.
- [ ] Imaginile sunt responsive.
- [ ] Nu există imagini nefolosite în directorul lecțiilor.

### Accesibilitate și design

- [ ] Textul este vizibil pe fundal închis.
- [ ] Butoanele sunt suficient de mari pentru telefon.
- [ ] Pagina poate fi navigată și cu tastatura.
- [ ] Feedbackul nu este transmis doar prin culoare.
- [ ] Pagina nu depășește lățimea ecranului.

### Funcționalitate

- [ ] Toate întrebările pot fi completate.
- [ ] Răspunsurile corecte sunt recunoscute.
- [ ] Răspunsurile greșite primesc feedback.
- [ ] Scorul final este calculat corect.
- [ ] Resetarea exercițiilor funcționează.

## Testare locală

Site-ul poate fi testat cu un server local simplu.

Exemplu cu Python:

```bash
python -m http.server 8000
```

Apoi se deschide în browser:

```text
http://localhost:8000/clasa6/
```

Nu testa toate paginile numai prin deschiderea directă a fișierelor cu `file://`, deoarece unele funcții se pot comporta diferit față de un server web.

## Autor

**Prof. Dănuț Andronie**

E-mail: `danutmg@gmail.com`
