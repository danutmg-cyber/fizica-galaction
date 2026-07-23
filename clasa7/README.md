from pathlib import Path
import re

output_path = Path("/mnt/data/README.md")

readme = r'''# Fizică – Clasa a VII-a

Materiale educaționale interactive pentru disciplina **Fizică, clasa a VII-a**, organizate pe capitole, lecții, recapitulări, fișe de lucru și teste.

Platforma este concepută pentru utilizare pe:

- telefon;
- tabletă;
- calculator;
- tablă interactivă.

Materialele sunt realizate pentru **Școala Gimnazială „Gala Galaction” Mangalia**.

**Autor:** Prof. Dănuț Andronie  
**Contact:** danutmg@gmail.com

---

## 1. Punctul de intrare

Pagina principală a clasei a VII-a este:

```text
clasa7/index.html
clasa7/
├── index.html
├── README.md
├── 1-concepte-de-baza-in-fizica/
├── 2-interactiuni/
├── 3-lucrul-mecanic-puterea-mecanica-randamentul/
├── 4-energia-mecanica/
├── 5-echilibrul-corpurilor/
├── 6-statica-fluidelor/
├── 7-unde-mecanice/
└── 8-test-de-evaluare-finala/
n-numele-capitolului/
├── index.html
├── imagini/
├── lectii/
│   ├── index.html
│   ├── lectia-1.html
│   ├── lectia-2.html
│   └── ...
├── fise-de-lucru/
│   ├── index.html
│   ├── fisa-1.html
│   ├── fisa-2.html
│   └── ...
├── recapitulare/
│   └── index.html
└── test-final/
    └── index.html
8-test-de-evaluare-finala/
├── index.html
├── imagini/
├── recapitulare/
│   └── index.html
└── test-final/
    └── index.html
Meniul capitolului
        ↓
Lista lecțiilor
        ↓
Lecții parcurse în ordine
        ↓
Fișe de lucru
        ↓
Recapitulare
        ↓
Test final
<article class="lesson-shell">
  <header class="hero">
    <p class="eyebrow">Capitolul 4 · Lecția 4</p>
    <h1>Energia mecanică</h1>
  </header>

  <div class="progress-area">
    <!-- progresul lecției -->
  </div>

  <div class="page-stage">
    <section class="lesson-page active" data-page="1">
      <!-- conținut -->
    </section>

    <section class="lesson-page" data-page="2" hidden>
      <!-- conținut -->
    </section>
  </div>
</article>
