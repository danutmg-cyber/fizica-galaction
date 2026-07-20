/**
 * app.js — Fizica Galaction
 *
 * Punctul central de inițializare al platformei.
 *
 * Responsabilități:
 * - detectează tipul paginii;
 * - pornește modulele disponibile;
 * - evită inițializarea multiplă;
 * - gestionează conținutul încărcat dinamic;
 * - reafișează formulele MathJax;
 * - emite evenimente pentru celelalte componente.
 *
 * IMPORTANT:
 * Acest fișier trebuie încărcat ultimul, după celelalte fișiere JavaScript.
 */

(function () {
  "use strict";

  const NUME_APLICATIE = "Fizica Galaction";

  /**
   * Spațiu global comun pentru modulele platformei.
   *
   * Modulele viitoare pot fi definite astfel:
   *
   * window.FizicaGalaction.navigation = {
   *   init() {},
   *   refresh() {}
   * };
   */
  const aplicatie =
    window.FizicaGalaction =
    window.FizicaGalaction || {};

  const stare =
    aplicatie.state =
    aplicatie.state || {
      pornita: false,
      tipPagina: "generala",
      moduleInitializate: new Set()
    };

  const selectoriPagina = {
    lectie: [
      '[data-page-type="lesson"]',
      "[data-lesson-viewer]",
      "[data-lesson-page]"
    ].join(","),

    test: [
      '[data-page-type="test"]',
      "[data-test-engine]",
      "[data-test-root]",
      "form[data-test]"
    ].join(","),

    laborator: [
      '[data-page-type="lab"]',
      "[data-lab-engine]",
      "[data-lab-root]"
    ].join(",")
  };

  /**
   * Returnează true dacă există cel puțin un element
   * care corespunde selectorului primit.
   *
   * @param {string} selector
   * @returns {boolean}
   */
  function existaElement(selector) {
    return Boolean(document.querySelector(selector));
  }

  /**
   * Caută o funcție după una dintre căile primite.
   *
   * Exemplu:
   * gasesteFunctie([
   *   "FizicaGalaction.navigation.init",
   *   "initNavigation"
   * ]);
   *
   * @param {string[]} cai
   * @returns {{ functie: Function, context: Object } | null}
   */
  function gasesteFunctie(cai) {
    for (const cale of cai) {
      const parti = cale.split(".");
      const numeFunctie = parti.pop();

      let context = window;

      for (const parte of parti) {
        context = context?.[parte];

        if (!context) {
          break;
        }
      }

      const functie = context?.[numeFunctie];

      if (typeof functie === "function") {
        return {
          functie,
          context
        };
      }
    }

    return null;
  }

  /**
   * Raportează o eroare fără să oprească întreaga aplicație.
   *
   * @param {string} modul
   * @param {unknown} eroare
   */
  function raporteazaEroare(modul, eroare) {
    console.error(
      `[${NUME_APLICATIE}] Eroare în modulul „${modul}”:`,
      eroare
    );

    document.dispatchEvent(
      new CustomEvent("fizica:app-error", {
        detail: {
          modul,
          eroare
        }
      })
    );
  }

  /**
   * Apelează o funcție opțională.
   *
   * @param {string[]} cai
   * @param {...unknown} argumente
   * @returns {unknown}
   */
  function apeleazaOptional(cai, ...argumente) {
    const rezultatCautare = gasesteFunctie(cai);

    if (!rezultatCautare) {
      return undefined;
    }

    const { functie, context } = rezultatCautare;

    try {
      return functie.call(context, ...argumente);
    } catch (eroare) {
      raporteazaEroare(cai[0], eroare);
      return undefined;
    }
  }

  /**
   * Inițializează un modul o singură dată.
   *
   * Dacă funcția modulului nu există încă, aplicația continuă
   * fără să afișeze o eroare.
   *
   * @param {string} numeModul
   * @param {string[]} caiFunctie
   * @param {boolean} conditie
   * @returns {boolean}
   */
  function initializeazaModul(
    numeModul,
    caiFunctie,
    conditie = true
  ) {
    if (!conditie) {
      return false;
    }

    if (stare.moduleInitializate.has(numeModul)) {
      return true;
    }

    const rezultatCautare = gasesteFunctie(caiFunctie);

    if (!rezultatCautare) {
      return false;
    }

    const { functie, context } = rezultatCautare;

    /*
     * Modulul este marcat înainte de apel pentru a preveni
     * inițializarea recursivă.
     */
    stare.moduleInitializate.add(numeModul);

    try {
      const rezultat = functie.call(context);

      /*
       * Sunt acceptate atât funcții obișnuite,
       * cât și funcții async.
       */
      if (rezultat && typeof rezultat.then === "function") {
        rezultat.catch((eroare) => {
          stare.moduleInitializate.delete(numeModul);
          raporteazaEroare(numeModul, eroare);
        });
      }

      return true;
    } catch (eroare) {
      stare.moduleInitializate.delete(numeModul);
      raporteazaEroare(numeModul, eroare);
      return false;
    }
  }

  /**
   * Detectează tipul paginii curente.
   *
   * Tipul poate fi stabilit explicit:
   *
   * <body data-page-type="lesson">
   * <body data-page-type="test">
   * <body data-page-type="lab">
   *
   * @returns {"lectie" | "test" | "laborator" | "generala"}
   */
  function detecteazaTipPagina() {
    const tipExplicit =
      document.body?.dataset.pageType?.trim().toLowerCase();

    const corespondentaTipuri = {
      lesson: "lectie",
      lectie: "lectie",
      test: "test",
      quiz: "test",
      lab: "laborator",
      laborator: "laborator"
    };

    if (tipExplicit && corespondentaTipuri[tipExplicit]) {
      return corespondentaTipuri[tipExplicit];
    }

    if (existaElement(selectoriPagina.lectie)) {
      return "lectie";
    }

    if (existaElement(selectoriPagina.test)) {
      return "test";
    }

    if (existaElement(selectoriPagina.laborator)) {
      return "laborator";
    }

    return "generala";
  }

  /**
   * Reafișează formulele matematice dintr-un element.
   *
   * Funcționează atât cu o funcție proprie din utils.js,
   * cât și direct cu MathJax.
   *
   * @param {HTMLElement | Document} radacina
   * @returns {Promise<void>}
   */
  async function afiseazaFormule(
    radacina = document.body
  ) {
    if (!radacina) {
      return;
    }

    const functieUtilitara = gasesteFunctie([
      "FizicaGalaction.utils.afiseazaMathJax",
      "afiseazaMathJax"
    ]);

    if (functieUtilitara) {
      try {
        await functieUtilitara.functie.call(
          functieUtilitara.context,
          radacina
        );
      } catch (eroare) {
        raporteazaEroare("MathJax", eroare);
      }

      return;
    }

    if (window.MathJax?.typesetPromise) {
      try {
        /*
         * Elimină mai întâi formulele procesate anterior,
         * atunci când API-ul MathJax permite acest lucru.
         */
        if (typeof window.MathJax.typesetClear === "function") {
          window.MathJax.typesetClear([radacina]);
        }

        await window.MathJax.typesetPromise([radacina]);
      } catch (eroare) {
        raporteazaEroare("MathJax", eroare);
      }
    }
  }

  /**
   * Reîmprospătează componentele după ce se încarcă
   * headerul, footerul sau alt conținut dinamic.
   *
   * @param {Event} eveniment
   */
  function actualizeazaContinutDinamic(eveniment) {
    const radacina =
      eveniment?.detail?.container ||
      eveniment?.detail?.root ||
      document.body;

    apeleazaOptional([
      "FizicaGalaction.navigation.refresh",
      "refreshNavigation",
      "actualizeazaNavigare"
    ]);

    apeleazaOptional([
      "FizicaGalaction.theme.reconnectButton",
      "themeManager.reconnectButton"
    ]);

    afiseazaFormule(radacina);
  }

  /**
   * Pornește toate modulele necesare paginii curente.
   */
  function pornesteAplicatia() {
    if (stare.pornita) {
      return;
    }

    stare.pornita = true;
    stare.tipPagina = detecteazaTipPagina();

    document.documentElement.classList.add("js");

    if (document.body) {
      document.body.dataset.detectedPageType = stare.tipPagina;
    }

    /*
     * Navigarea și progresul pot exista pe orice pagină.
     */
    initializeazaModul("navigation", [
      "FizicaGalaction.navigation.init",
      "initNavigation"
    ]);

    initializeazaModul("progress", [
      "FizicaGalaction.progress.init",
      "initProgress"
    ]);

    /*
     * Modulele următoare sunt pornite numai pe paginile
     * pentru care sunt necesare.
     */
    initializeazaModul(
      "lesson-viewer",
      [
        "FizicaGalaction.lessonViewer.init",
        "initLessonViewer"
      ],
      stare.tipPagina === "lectie"
    );

    initializeazaModul(
      "test-engine",
      [
        "FizicaGalaction.testEngine.init",
        "initTestEngine"
      ],
      stare.tipPagina === "test"
    );

    initializeazaModul(
      "lab-engine",
      [
        "FizicaGalaction.labEngine.init",
        "initLabEngine"
      ],
      stare.tipPagina === "laborator"
    );

    afiseazaFormule(document.body);

    /*
     * Eveniment disponibil pentru orice script care trebuie
     * să ruleze după inițializarea aplicației.
     */
    document.dispatchEvent(
      new CustomEvent("fizica:app-ready", {
        detail: {
          tipPagina: stare.tipPagina,
          moduleInitializate: Array.from(
            stare.moduleInitializate
          )
        }
      })
    );
  }

  /**
   * API public minimal.
   */
  aplicatie.app = {
    start: pornesteAplicatia,

    refresh(radacina = document.body) {
      actualizeazaContinutDinamic({
        detail: {
          root: radacina
        }
      });
    },

    typesetMath: afiseazaFormule,

    getPageType() {
      return stare.tipPagina;
    },

    isModuleInitialized(numeModul) {
      return stare.moduleInitializate.has(numeModul);
    },

    notifyContentUpdated(radacina = document.body) {
      document.dispatchEvent(
        new CustomEvent("fizica:content-updated", {
          detail: {
            root: radacina
          }
        })
      );
    }
  };

  /*
   * Evenimente emise de load-header.js și load-footer.js.
   */
  document.addEventListener(
    "headerLoaded",
    actualizeazaContinutDinamic
  );

  document.addEventListener(
    "footerLoaded",
    actualizeazaContinutDinamic
  );

  /*
   * Eveniment utilizabil după schimbarea paginii unei lecții,
   * afișarea unei întrebări sau actualizarea unui laborator.
   */
  document.addEventListener(
    "fizica:content-updated",
    actualizeazaContinutDinamic
  );

  /*
   * Pornire sigură, indiferent dacă scriptul este încărcat
   * cu defer sau la finalul elementului body.
   */
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      pornesteAplicatia,
      { once: true }
    );
  } else {
    pornesteAplicatia();
  }
})();// app.js
