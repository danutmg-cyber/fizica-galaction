from pathlib import Path
import subprocess
import hashlib

code = r'''/**
 * config.js — Fizica Galaction
 *
 * Configurația centrală a platformei.
 *
 * Acest fișier trebuie încărcat înaintea tuturor celorlalte module:
 *
 * <script defer src="assets/js/config.js"></script>
 * <script defer src="assets/js/theme-toggle.js"></script>
 * <script defer src="assets/js/navigation.js"></script>
 * <script defer src="assets/js/progress.js"></script>
 * <script defer src="assets/js/app.js"></script>
 *
 * API:
 *
 * window.FizicaGalactionConfig
 * window.FizicaGalaction.config.data
 * window.FizicaGalaction.config.get("tests.numericAnswers.tolerance")
 * window.FizicaGalaction.config.resolve("assets/css/main.css")
 * window.FizicaGalaction.config.isNumericAnswerCorrect(answer, expected)
 */

(function () {
  "use strict";

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  /**
   * Determină rădăcina site-ului pornind de la locația acestui fișier:
   *
   * site/
   * └── assets/
   *     └── js/
   *         └── config.js
   */
  const scriptUrl =
    document.currentScript?.src || "";

  const siteRoot = scriptUrl
    ? new URL("../../", scriptUrl).href
    : new URL("./", document.baseURI).href;

  const sitePathname =
    new URL(siteRoot).pathname;

  const CONFIG = {
    version: "1.0.0",
    updatedAt: "2026-07-31",

    site: {
      id: "fizica-galaction",
      title: "Fizica Galaction",
      language: "ro",
      locale: "ro-RO",
      description:
        "Platformă educațională interactivă pentru studiul fizicii la gimnaziu.",
      institution:
        "Școala Gimnazială „Gala Galaction” Mangalia",
      teacher: "Prof. Dănuț Andronie",
      motto:
        "Fizica nu este o materie dominată de formule, ci de logică.",
      repository:
        "https://github.com/danutmg-cyber/fizica-galaction"
    },

    environment: {
      siteRoot,
      basePath: sitePathname,
      githubPagesProject:
        "fizica-galaction",
      developmentHosts: [
        "localhost",
        "127.0.0.1"
      ]
    },

    routes: {
      home: "index.html",
      grade6: "clasa6/index.html",
      grade7: "clasa7/index.html",
      grade8: "clasa8/index.html",
      laboratory:
        "laborator-fizica/index.html",
      login: "login/index.html",
      siteStructure:
        "assets/data/structura-site.json",
      classesData:
        "assets/data/clase.json",
      chaptersData:
        "assets/data/capitole.json",
      header:
        "assets/components/header.html",
      footer:
        "assets/components/footer.html"
    },

    storage: {
      theme:
        "fizica-galaction-theme",
      guestId:
        "fizica-galaction:guest-id",
      progressIndex:
        "fizica-galaction:progress:index",
      progressSettings:
        "fizica-galaction:progress:settings",
      progressEntryPrefix:
        "fizica-galaction:progress:entry",
      lessonPrefix:
        "fizica-galaction:lesson:",
      worksheetPrefix:
        "fizica-galaction:worksheet:",
      testPrefix:
        "fizica-galaction:test:",
      laboratoryPrefix:
        "fizica-galaction:lab:"
    },

    theme: {
      default: "system",
      available: [
        "light",
        "dark",
        "system"
      ],
      resolvedThemes: [
        "light",
        "dark"
      ],
      bodyClasses: [
        "light",
        "dark"
      ],
      dataAttribute: "data-theme",
      buttonSelector: ".theme-toggle",
      storageKey:
        "fizica-galaction-theme",
      labels: {
        light:
          "Activează tema întunecată",
        dark:
          "Activează tema luminoasă",
        system:
          "Folosește tema dispozitivului"
      },
      icons: {
        light: "🌙",
        dark: "☀️",
        system: "◐"
      },
      followSystemChanges: true
    },

    ui: {
      labels: {
        next: "Mergi mai departe",
        previous: "Înapoi",
        finishLesson:
          "Finalizează lecția",
        finishTest:
          "Finalizează testul",
        checkAnswer:
          "Verifică răspunsul",
        restart:
          "Reia activitatea",
        print:
          "Tipărește rezultatul",
        correct: "Corect.",
        incorrect: "Mai încearcă.",
        saved: "Salvat local",
        progress: "Progres"
      },

      minimumTouchTargetPx: 44,
      baseFontSizePx: 16,
      maximumContentWidthPx: 980,
      stickyNavigation: true,
      respectReducedMotion: true,
      showVisibleFocus: true
    },

    accessibility: {
      allowZoom: true,
      keyboardNavigation: true,
      visibleFocus: true,
      highContrastText: true,
      announceDynamicChanges: true,
      feedbackUsesTextAndColor: true,
      minimumTouchTargetPx: 44,
      minimumBodyFontSizePx: 16
    },

    mathJax: {
      enabled: true,
      processDynamicContent: true,
      inlineDelimiters: [
        ["\\(", "\\)"],
        ["$", "$"]
      ],
      displayDelimiters: [
        ["\\[", "\\]"],
        ["$$", "$$"]
      ],
      visualFractions: true,
      example:
        String.raw`E_c=\frac{mv^2}{2}`,
      numericExample:
        String.raw`E_c=\frac{2\cdot4^2}{2}=16\,J`
    },

    content: {
      mobileFirst: true,
      pageTypes: [
        "page",
        "lesson",
        "worksheet",
        "recap",
        "test",
        "lab",
        "simulation",
        "game"
      ],
      devices: [
        "phone",
        "tablet",
        "desktop",
        "interactive-board"
      ],
      avoidInlineCss: true,
      avoidInlineJavaScript: true,
      useSharedHeader: true,
      useSharedFooter: true
    },

    lessons: {
      paginated: true,
      showProgress: true,
      showNavigation: true,
      nextLabel:
        "Mergi mai departe",
      previousLabel: "Înapoi",
      finishLabel:
        "Finalizează lecția",
      saveProgress: true,
      restoreProgress: true,
      updateHash: true,
      keyboardNavigation: true,
      requireQuickCheckBeforeNext:
        false,
      structure: [
        "definition",
        "explanation",
        "example",
        "remember"
      ]
    },

    quickChecks: {
      alignedOptions: true,
      immediateFeedback: true,
      requireSelection: true,
      feedbackOnlyByColor: false,
      checkLabel:
        "Verifică răspunsul",
      correctLabel: "Corect.",
      incorrectLabel:
        "Mai încearcă."
    },

    worksheets: {
      saveProgress: true,
      restoreProgress: true,
      recalculateScore: true,
      preventDuplicateScoring: true,
      acceptedDecimalSeparators: [
        ".",
        ","
      ],
      numericAnswers: {
        tolerance: 0.15,
        comparison:
          "absolute-difference-strict",
        maximumDecimals: 2
      }
    },

    tests: {
      questionsPerTest: 20,
      theoryQuestions: 10,
      numericQuestions: 10,
      totalPoints: 100,
      shuffleQuestions: true,
      shuffleOptions: true,
      questionPool: {
        minimum: 30,
        maximum: 50,
        minimumVariants: 100
      },

      numericAnswers: {
        tolerance: 0.15,
        comparison:
          "absolute-difference-strict",
        acceptedDecimalSeparators: [
          ".",
          ","
        ],
        maximumDecimals: 2,
        requireUnitInInput: false,
        studentInstruction:
          "Scrie doar valoarea numerică. Rezultatul poate avea maximum 2 zecimale.",
        exposeToleranceToStudent:
          false
      },

      feedback: {
        showScore: true,
        showGrade: true,
        reviewTitle:
          "Ce trebuie să revezi",
        showFormulaInitially: false,
        showFormulaAfterError: true
      },

      grading: {
        minimumGrade: 1,
        maximumGrade: 10,
        passingGrade: 5,
        pointsByOffice: 0
      },

      ui: {
        fullscreen: true,
        mobileFirst: true,
        largeButtons: true,
        visibleInputs: true
      },

      saveProgress: true,
      restoreProgress: true,
      requireAllAnswers: true,
      confirmBeforeSubmit: true,
      autoSubmitOnTimeout: true
    },

    laboratory: {
      paginatedSteps: true,
      saveProgress: true,
      restoreProgress: true,
      showSafetyRules: true,
      showMaterials: true,
      allowTimer: true,
      allowMeasurementRows: true,
      allowPrint: true,
      requireConclusion: false,
      minimumConclusionLength: 20
    },

    progress: {
      enabled: true,
      localStorage: true,
      remoteSync: false,
      syncAcrossTabs: true,
      keepBestScore: true,
      keepAttempts: true,
      maximumEntries: 1500
    },

    loadingOrder: {
      common: [
        "assets/js/config.js",
        "assets/js/theme-toggle.js",
        "assets/js/navigation.js",
        "assets/js/progress.js"
      ],
      last:
        "assets/js/app.js"
    },

    events: {
      configReady:
        "fizica:config-ready",
      appReady:
        "fizica:app-ready",
      contentUpdated:
        "fizica:content-updated",
      themeChanged:
        "fizica:theme-change",
      lessonComplete:
        "fizica:lesson-complete",
      worksheetComplete:
        "fizica:worksheet-complete",
      testComplete:
        "fizica:test-complete",
      laboratoryComplete:
        "fizica:lab-complete"
    },

    features: {
      firebase: false,
      visitorCounter: false,
      offlineMode: false,
      remoteProgress: false
    }
  };

  /**
   * Îngheață recursiv configurația, pentru ca modulele să nu
   * modifice accidental valorile comune.
   *
   * @param {object} value
   * @returns {object}
   */
  function deepFreeze(value) {
    if (
      !value ||
      typeof value !== "object" ||
      Object.isFrozen(value)
    ) {
      return value;
    }

    Object.getOwnPropertyNames(value)
      .forEach((property) => {
        deepFreeze(value[property]);
      });

    return Object.freeze(value);
  }

  /**
   * Citește o valoare prin cale:
   *
   * get("tests.numericAnswers.tolerance", 0.15)
   *
   * @param {string} path
   * @param {unknown} fallback
   * @returns {unknown}
   */
  function get(path, fallback = undefined) {
    if (
      typeof path !== "string" ||
      !path.trim()
    ) {
      return fallback;
    }

    const value = path
      .split(".")
      .reduce(
        (current, key) =>
          current?.[key],
        CONFIG
      );

    return value === undefined
      ? fallback
      : value;
  }

  /**
   * Construiește o adresă absolută raportată la rădăcina site-ului.
   *
   * @param {string} path
   * @returns {string}
   */
  function resolve(path = "") {
    const normalized = String(path)
      .trim()
      .replace(/^\/+/, "");

    return new URL(
      normalized,
      CONFIG.environment.siteRoot
    ).href;
  }

  /**
   * Normalizează un număr introdus cu punct sau virgulă.
   *
   * @param {unknown} value
   * @returns {number}
   */
  function normalizeNumber(value) {
    if (typeof value === "number") {
      return value;
    }

    const normalized = String(
      value ?? ""
    )
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");

    return normalized
      ? Number(normalized)
      : Number.NaN;
  }

  /**
   * Aplică regula numerică centrală:
   *
   * |răspuns - rezultat corect| < 0.15
   *
   * @param {unknown} answer
   * @param {unknown} expected
   * @param {number} tolerance
   * @returns {boolean}
   */
  function isNumericAnswerCorrect(
    answer,
    expected,
    tolerance =
      CONFIG.tests.numericAnswers
        .tolerance
  ) {
    const numericAnswer =
      normalizeNumber(answer);
    const numericExpected =
      normalizeNumber(expected);
    const numericTolerance =
      Number(tolerance);

    return (
      Number.isFinite(
        numericAnswer
      ) &&
      Number.isFinite(
        numericExpected
      ) &&
      Number.isFinite(
        numericTolerance
      ) &&
      Math.abs(
        numericAnswer -
        numericExpected
      ) < numericTolerance
    );
  }

  /**
   * Returnează tema efectivă, rezolvând valoarea „system”.
   *
   * @param {"light" | "dark" | "system"} preference
   * @returns {"light" | "dark"}
   */
  function resolveTheme(
    preference =
      CONFIG.theme.default
  ) {
    if (
      preference === "light" ||
      preference === "dark"
    ) {
      return preference;
    }

    return window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  }

  deepFreeze(CONFIG);

  const api = Object.freeze({
    data: CONFIG,
    get,
    resolve,
    normalizeNumber,
    isNumericAnswerCorrect,
    resolveTheme
  });

  /*
   * Alias simplu pentru modulele care doresc numai valorile.
   */
  window.FizicaGalactionConfig =
    CONFIG;

  /*
   * API-ul principal folosit de modulele platformei.
   */
  app.config = api;

  document.dispatchEvent(
    new CustomEvent(
      CONFIG.events.configReady,
      {
        detail: {
          version: CONFIG.version,
          siteRoot:
            CONFIG.environment.siteRoot
        }
      }
    )
  );
})();
'''

path = Path("/mnt/data/assets/js/config.js")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(code, encoding="utf-8")

check = subprocess.run(
    ["node", "--check", str(path)],
    capture_output=True,
    text=True,
    timeout=30
)

if check.returncode != 0:
    raise RuntimeError(
        (check.stderr or check.stdout).strip()
    )

print(f"Creat: {path}")
print(f"Linii: {len(code.splitlines())}")
print(f"Dimensiune: {path.stat().st_size} octeți")
print("Sintaxă JavaScript: validă")
print(
    "SHA-256:",
    hashlib.sha256(
        path.read_bytes()
    ).hexdigest()
)
