from pathlib import Path

content = """# Harta proiectului – Fizica Galaction

> Platformă educațională interactivă pentru studiul fizicii la gimnaziu  
> Școala Gimnazială „Gala Galaction” Mangalia  
> Autor: Prof. Dănuț Andronie  
> Ultima actualizare a hărții: 31 iulie 2026

## 1. Acces rapid

- [Pagina principală](./index.html)
- [Fizică – Clasa a VI-a](./clasa6/index.html)
- [Fizică – Clasa a VII-a](./clasa7/index.html)
- [Fizică – Clasa a VIII-a](./clasa8/index.html)
- [Laborator de fizică](./laborator-fizica/index.html)
- [Autentificare](./login/index.html)

---

## 2. Clasa a VI-a

Punct de intrare: [`clasa6/index.html`](./clasa6/index.html)

### Capitole și activități

1. [Concepte de bază în fizică](./clasa6/1-concepte-de-baza-in-fizica/)
2. [Unități de măsură](./clasa6/2-unitati-de-masura/)
3. [Fenomene mecanice](./clasa6/3-fenomene-mecanice/)
4. [Fenomene termice](./clasa6/4-fenomene-termice/)
5. [Fenomene electrice și magnetice](./clasa6/5-fenomene-electrice-si-magnetice/)
6. [Fenomene optice](./clasa6/6-fenomene-optice/)
7. [Test de evaluare finală](./clasa6/7-test-de-evaluare-finala/)
8. [Jocuri educaționale](./clasa6/8-jocuri/)

Documentație: [`clasa6/README.md`](./clasa6/README.md)

---

## 3. Clasa a VII-a

Punct de intrare: [`clasa7/index.html`](./clasa7/index.html)

### Capitole

1. [Concepte de bază în fizică](./clasa7/1-concepte-de-baza-in-fizica/)
2. [Interacțiuni](./clasa7/2-interactiuni/)
3. [Lucrul mecanic, puterea mecanică și randamentul](./clasa7/3-lucrul-mecanic-puterea-mecanica-randamentul/)
4. [Energia mecanică](./clasa7/4-energia-mecanica/)
5. [Echilibrul corpurilor](./clasa7/5-echilibrul-corpurilor/)
6. [Statica fluidelor](./clasa7/6-statica-fluidelor/)
7. [Unde mecanice](./clasa7/7-unde-mecanice/)
8. [Test de evaluare finală](./clasa7/8-test-de-evaluare-finala/)

Documentație: [`clasa7/README.md`](./clasa7/README.md)

---

## 4. Clasa a VIII-a

Punct de intrare: [`clasa8/index.html`](./clasa8/index.html)

### Capitole existente în repository

1. [Fenomene termice](./clasa8/1-fenomene-termice/)
2. [Electrostatică](./clasa8/2-electrostatica/)
3. [Electrocinetică](./clasa8/3-electrocinetica/)
6. [Reflexia și refracția luminii](./clasa8/6-reflexia-si-refractia/)
7. [Lentile subțiri](./clasa8/7-lentile-subtiri/)
8. [Energia și viața](./clasa8/8-energia-si-viata/)
9. [Test de evaluare finală](./clasa8/9-test-de-evaluare-finala/)

> **Notă:** în structura actuală nu apar directoarele numerotate `4-...` și `5-...`.  
> Dacă vor fi adăugate ulterior, această hartă trebuie actualizată.

Documentație: [`clasa8/README.md`](./clasa8/README.md)

---

## 5. Structura recomandată a unui capitol

Fiecare capitol educațional ar trebui să urmeze, pe cât posibil, aceeași structură:

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
