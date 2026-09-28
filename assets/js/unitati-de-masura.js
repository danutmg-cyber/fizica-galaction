/**
 * unitati-de-masura.js — Fizica Galaction
 *
 * Conținutul specific jocului „Campionii Unităților de Măsură”.
 *
 * Acest fișier NU gestionează localStorage și NU desenează interfața testului.
 * El definește doar:
 * - cele 3 niveluri;
 * - regulile de progresie;
 * - câmpurile elevului;
 * - generarea celor 20 de exerciții;
 * - configurația transmisă către test-engine.js.
 *
 * Ordinea recomandată în HTML:
 *   1. test-storage.js
 *   2. unitati-de-masura.js
 *   3. test-engine.js
 *   4. initTestEngine()
 */

(function (window) {
  "use strict";

  const GROUP_ID = "unitati-de-masura";
  const QUESTION_COUNT = 20;

  /* =========================================================
     NIVELURI
  ========================================================= */

  const LEVELS = Object.freeze({
    1: {
      name: "MEDIU",
      icon: "🟢",
      multiplier: 1,
      description:
        "Conversii directe de bază între unități de măsură."
    },

    2: {
      name: "RIDICAT",
      icon: "🟡",
      multiplier: 1.5,
      description:
        "Conversii cu arie, volum, masă și timp."
    },

    3: {
      name: "AVANSAT",
      icon: "🔴",
      multiplier: 2,
      description:
        "Conversii combinate și rezultate cu zecimale."
    }
  });

  /* =========================================================
     UNITĂȚI DE MĂSURĂ
  ========================================================= */

  const UNITS = Object.freeze({
    length: {
      name: "lungime",

      factor: {
        mm: 0.001,
        cm: 0.01,
        dm: 0.1,
        m: 1,
        km: 1000
      }
    },

    mass: {
      name: "masă",

      factor: {
        mg: 0.000001,
        g: 0.001,
        kg: 1,
        q: 100,
        t: 1000
      }
    },

    time: {
      name: "timp",

      factor: {
        s: 1,
        min: 60,
        h: 3600
      }
    },

    area: {
      name: "arie",

      factor: {
        "cm²": 0.0001,
        "dm²": 0.01,
        "m²": 1
      }
    },

    volume: {
      name: "volum",

      factor: {
        "cm³": 0.000001,
        mL: 0.000001,
        "dm³": 0.001,
        L: 0.001,
        "m³": 1
      }
    }
  });

  /* =========================================================
     REGULILE COMUNE CELOR 3 NIVELURI
  ========================================================= */

  const BASE_PROGRESSION = Object.freeze({
    groupId: GROUP_ID,

    totalLevels: 3,

    /*
     * Diploma se deblochează numai
     * după parcurgerea Nivelului 3.
     */
    diplomaRequiredLevel: 3,

    /*
     * Terminarea nivelului curent
     * deblochează nivelul următor.
     */
    unlockNextOnComplete: true,

    /*
     * La 100% se trece automat
     * la nivelul următor.
     */
    autoAdvance: true,
    autoAdvancePercent: 100,
    autoAdvanceDelayMs: 1800
  });

  /* =========================================================
     FUNCȚII UTILE
  ========================================================= */

  function clamp(value, min, max) {
    return Math.min(
      max,
      Math.max(min, value)
    );
  }

  /*
   * Hash simplu utilizat ca fallback
   * pentru generarea seed-ului.
   */
  function hashString(text) {
    let hash = 2166136261;

    for (
      let i = 0;
      i < text.length;
      i += 1
    ) {
      hash ^= text.charCodeAt(i);

      hash =
        Math.imul(
          hash,
          16777619
        );
    }

    return hash >>> 0;
  }

  /*
   * Generator pseudo-aleator determinist.
   *
   * Avantaj:
   * dacă elevul reîncarcă pagina în timpul
   * testului, putem genera exact aceleași
   * întrebări.
   */
  function mulberry32(seed) {
    let a = seed >>> 0;

    return function random() {
      a |= 0;

      a =
        (
          a +
          0x6D2B79F5
        ) | 0;

      let t =
        Math.imul(
          a ^ (a >>> 15),
          1 | a
        );

      t =
        (
          t +
          Math.imul(
            t ^ (t >>> 7),
            61 | t
          )
        ) ^ t;

      return (
        (
          t ^
          (t >>> 14)
        ) >>> 0
      ) / 4294967296;
    };
  }

  function randomSeed() {
    try {
      if (
        window.crypto &&
        typeof window.crypto
          .getRandomValues === "function"
      ) {
        const values =
          new Uint32Array(1);

        window.crypto
          .getRandomValues(values);

        return values[0] >>> 0;
      }
    } catch (_) {
      // fallback mai jos
    }

    return (
      Date.now() ^
      Math.floor(
        Math.random() *
        0xffffffff
      )
    ) >>> 0;
  }

  function seedKey(level) {
    return (
      "fizica-galaction:" +
      "question-seed:" +
      `${GROUP_ID}:nivel-${level}`
    );
  }

  function getSeed(level) {
    const key =
      seedKey(level);

    try {
      const saved =
        Number(
          localStorage
            .getItem(key)
        );

      if (
        Number.isFinite(saved) &&
        saved > 0
      ) {
        return saved >>> 0;
      }

      const seed =
        randomSeed();

      localStorage.setItem(
        key,
        String(seed)
      );

      return seed;

    } catch (_) {

      return hashString(
        `${GROUP_ID}:${level}:${Date.now()}`
      );
    }
  }

  function clearSeed(level) {
    try {
      localStorage.removeItem(
        seedKey(level)
      );

    } catch (_) {
      /*
       * Nu blocăm testul dacă
       * localStorage nu este disponibil.
       */
    }
  }

  /* =========================================================
     NIVELUL CURENT
  ========================================================= */

  function getUnlockedLevel() {
    const storage =
      window.FizicaGalaction
        ?.testStorage;

    if (
      !storage ||
      typeof storage
        .getUnlockedLevel !==
        "function"
    ) {
      return 1;
    }

    try {

      return clamp(
        Number(
          storage.getUnlockedLevel(
            GROUP_ID,
            BASE_PROGRESSION
          )
        ) || 1,

        1,
        3
      );

    } catch (_) {

      return 1;
    }
  }

  /*
   * URL-uri posibile:
   *
   * unitati-de-masura.html?nivel=1
   * unitati-de-masura.html?nivel=2
   * unitati-de-masura.html?nivel=3
   *
   * Dacă nu este precizat nivelul,
   * deschidem cel mai mare nivel
   * deja deblocat.
   */
  function detectLevel() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const requested =
      Number(
        params.get("nivel")
      );

    if (
      [1, 2, 3]
        .includes(requested)
    ) {
      return requested;
    }

    return getUnlockedLevel();
  }

  const LEVEL =
    detectLevel();

  const LEVEL_INFO =
    LEVELS[LEVEL];

  const RANDOM =
    mulberry32(
      getSeed(LEVEL)
    );

  /* =========================================================
     RANDOM
  ========================================================= */

  function pick(values) {
    return values[
      Math.floor(
        RANDOM() *
        values.length
      )
    ];
  }

  function shuffle(values) {
    const result =
      [...values];

    for (
      let i =
        result.length - 1;

      i > 0;

      i -= 1
    ) {
      const j =
        Math.floor(
          RANDOM() *
          (i + 1)
        );

      [
        result[i],
        result[j]
      ] = [
        result[j],
        result[i]
      ];
    }

    return result;
  }

  /* =========================================================
     NUMERE
  ========================================================= */

  function round(
    value,
    decimals = 8
  ) {
    const factor =
      10 ** decimals;

    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
        factor
      ) /
      factor
    );
  }

  function displayNumber(value) {
    const number =
      round(
        Number(value),
        8
      );

    if (
      !Number.isFinite(number)
    ) {
      return String(value);
    }

    return String(number)
      .replace(".", ",");
  }

  /* =========================================================
     CONVERSII
  ========================================================= */

  function convert(
    category,
    value,
    from,
    to
  ) {
    const unitGroup =
      UNITS[category];

    if (!unitGroup) {
      throw new Error(
        "Categorie de unități necunoscută: " +
        category
      );
    }

    const fromFactor =
      unitGroup
        .factor[from];

    const toFactor =
      unitGroup
        .factor[to];

    if (
      !Number.isFinite(
        fromFactor
      ) ||
      !Number.isFinite(
        toFactor
      )
    ) {
      throw new Error(
        `Conversie necunoscută: ${from} → ${to}`
      );
    }

    return (
      Number(value) *
      fromFactor /
      toFactor
    );
  }

  /* =========================================================
     GENERATOR:
     CONVERSIE DIRECTĂ
  ========================================================= */

  function directConversion(
    category,
    from,
    to,
    values
  ) {
    const value =
      pick(values);

    const answer =
      round(
        convert(
          category,
          value,
          from,
          to
        )
      );

    return {
      title:
        "Conversie de " +
        UNITS[category].name,

      prompt:
        `Transformă ${displayNumber(value)} ${from} în ${to}.`,

      unit:
        to,

      answer,

      explanation:
        `${displayNumber(value)} ${from} = ` +
        `${displayNumber(answer)} ${to}.`
    };
  }

  /* =========================================================
     GENERATOR:
     CONVERSIE COMBINATĂ
  ========================================================= */

  function combinedConversion(
    category,
    firstUnit,
    secondUnit,
    targetUnit,
    firstValues,
    secondValues,
    operator = "+"
  ) {
    const first =
      pick(firstValues);

    const second =
      pick(secondValues);

    const x =
      convert(
        category,
        first,
        firstUnit,
        targetUnit
      );

    const y =
      convert(
        category,
        second,
        secondUnit,
        targetUnit
      );

    const answer =
      round(
        operator === "-"
          ? x - y
          : x + y
      );

    const action =
      operator === "-"
        ? "Calculează diferența"
        : "Calculează suma";

    return {
      title:
        "Conversie combinată",

      prompt:
        `${action}: ` +
        `${displayNumber(first)} ${firstUnit} ` +
        `${operator} ` +
        `${displayNumber(second)} ${secondUnit}. ` +
        `Exprimă rezultatul în ${targetUnit}.`,

      unit:
        targetUnit,

      answer,

      explanation:
        `${displayNumber(first)} ${firstUnit} = ` +
        `${displayNumber(round(x))} ${targetUnit}; ` +

        `${displayNumber(second)} ${secondUnit} = ` +
        `${displayNumber(round(y))} ${targetUnit}; ` +

        `rezultatul este ` +
        `${displayNumber(answer)} ${targetUnit}.`
    };
  }

  /* =========================================================
     NIVELUL 1 — MEDIU
  ========================================================= */

  function mediumPool() {
    return [

      () =>
        directConversion(
          "length",
          "m",
          "cm",
          [
            0.5,
            1,
            1.2,
            1.5,
            2,
            2.5,
            3,
            4,
            5,
            7.5
          ]
        ),

      () =>
        directConversion(
          "length",
          "cm",
          "m",
          [
            50,
            100,
            150,
            200,
            250,
            300,
            500,
            750
          ]
        ),

      () =>
        directConversion(
          "length",
          "km",
          "m",
          [
            0.2,
            0.5,
            1,
            1.5,
            2,
            2.5,
            3
          ]
        ),

      () =>
        directConversion(
          "length",
          "m",
          "mm",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3,
            4
          ]
        ),

      () =>
        directConversion(
          "mass",
          "kg",
          "g",
          [
            0.5,
            1,
            1.2,
            1.5,
            2,
            2.5,
            3,
            3.5
          ]
        ),

      () =>
        directConversion(
          "mass",
          "g",
          "kg",
          [
            500,
            1000,
            1200,
            1500,
            2000,
            2500,
            3000
          ]
        ),

      () =>
        directConversion(
          "time",
          "min",
          "s",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3,
            4,
            5,
            10
          ]
        ),

      () =>
        directConversion(
          "time",
          "h",
          "min",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3
          ]
        ),

      () =>
        directConversion(
          "volume",
          "L",
          "mL",
          [
            0.5,
            1,
            1.2,
            1.5,
            2,
            2.5,
            3
          ]
        ),

      () =>
        directConversion(
          "volume",
          "mL",
          "L",
          [
            500,
            1000,
            1500,
            2000,
            2500,
            3000
          ]
        )
    ];
  }

  /* =========================================================
     NIVELUL 2 — RIDICAT
  ========================================================= */

  function highPool() {
    return [

      () =>
        directConversion(
          "length",
          "dm",
          "cm",
          [
            1,
            1.5,
            2,
            2.5,
            3,
            4,
            5,
            8
          ]
        ),

      () =>
        directConversion(
          "length",
          "mm",
          "cm",
          [
            10,
            20,
            50,
            100,
            150,
            250,
            500
          ]
        ),

      () =>
        directConversion(
          "length",
          "dm",
          "m",
          [
            5,
            10,
            15,
            20,
            25,
            30,
            50
          ]
        ),

      () =>
        directConversion(
          "mass",
          "q",
          "kg",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3,
            5
          ]
        ),

      () =>
        directConversion(
          "mass",
          "kg",
          "q",
          [
            50,
            100,
            150,
            200,
            250,
            500
          ]
        ),

      () =>
        directConversion(
          "mass",
          "t",
          "kg",
          [
            0.5,
            1,
            1.2,
            1.5,
            2,
            2.5
          ]
        ),

      () =>
        directConversion(
          "mass",
          "kg",
          "t",
          [
            500,
            1000,
            1500,
            2000,
            2500
          ]
        ),

      () =>
        directConversion(
          "time",
          "h",
          "s",
          [
            0.5,
            1,
            1.5,
            2,
            2.5
          ]
        ),

      () =>
        directConversion(
          "time",
          "s",
          "min",
          [
            30,
            60,
            90,
            120,
            180,
            300,
            600
          ]
        ),

      () =>
        directConversion(
          "area",
          "m²",
          "dm²",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3
          ]
        ),

      () =>
        directConversion(
          "area",
          "dm²",
          "cm²",
          [
            1,
            1.5,
            2,
            2.5,
            4,
            5,
            10
          ]
        ),

      () =>
        directConversion(
          "area",
          "dm²",
          "m²",
          [
            10,
            15,
            20,
            25,
            50,
            75,
            100
          ]
        ),

      () =>
        directConversion(
          "volume",
          "m³",
          "dm³",
          [
            0.1,
            0.2,
            0.3,
            0.5,
            1,
            1.5
          ]
        ),

      () =>
        directConversion(
          "volume",
          "dm³",
          "cm³",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            3
          ]
        ),

      () =>
        directConversion(
          "volume",
          "cm³",
          "mL",
          [
            10,
            50,
            100,
            250,
            500,
            750,
            1000
          ]
        )
    ];
  }

  /* =========================================================
     NIVELUL 3 — AVANSAT
  ========================================================= */

  function advancedPool() {
    return [

      () =>
        combinedConversion(
          "length",
          "m",
          "cm",
          "cm",
          [
            0.5,
            1,
            1.2,
            1.5,
            2,
            2.5
          ],
          [
            20,
            40,
            75,
            100,
            150
          ]
        ),

      () =>
        combinedConversion(
          "length",
          "km",
          "m",
          "m",
          [
            0.2,
            0.5,
            1,
            1.2,
            1.5
          ],
          [
            50,
            150,
            200,
            500
          ]
        ),

      () =>
        combinedConversion(
          "mass",
          "kg",
          "g",
          "kg",
          [
            0.5,
            1,
            1.2,
            1.5,
            2.5
          ],
          [
            100,
            250,
            500,
            750
          ]
        ),

      () =>
        combinedConversion(
          "mass",
          "t",
          "kg",
          "kg",
          [
            0.5,
            1,
            1.5,
            2
          ],
          [
            100,
            200,
            500,
            750
          ]
        ),

      () =>
        combinedConversion(
          "time",
          "h",
          "min",
          "min",
          [
            0.5,
            1,
            1.5,
            2,
            2.5
          ],
          [
            15,
            30,
            45,
            90
          ]
        ),

      () =>
        combinedConversion(
          "volume",
          "L",
          "mL",
          "L",
          [
            0.5,
            1,
            1.2,
            1.5,
            2
          ],
          [
            100,
            250,
            500,
            750
          ]
        ),

      () =>
        directConversion(
          "area",
          "cm²",
          "m²",
          [
            1000,
            1500,
            2000,
            2500,
            4000,
            7500,
            10000
          ]
        ),

      () =>
        directConversion(
          "area",
          "m²",
          "cm²",
          [
            0.1,
            0.2,
            0.5,
            1,
            1.5,
            2
          ]
        ),

      () =>
        directConversion(
          "volume",
          "cm³",
          "L",
          [
            250,
            500,
            750,
            1000,
            1500,
            2500
          ]
        ),

      () =>
        directConversion(
          "volume",
          "m³",
          "L",
          [
            0.1,
            0.2,
            0.3,
            0.5,
            1,
            1.2
          ]
        ),

      () =>
        directConversion(
          "mass",
          "g",
          "q",
          [
            5000,
            10000,
            15000,
            25000,
            50000
          ]
        ),

      () =>
        directConversion(
          "mass",
          "q",
          "t",
          [
            0.5,
            1,
            1.5,
            2,
            2.5,
            5,
            10
          ]
        ),

      () =>
        combinedConversion(
          "area",
          "m²",
          "dm²",
          "dm²",
          [
            0.5,
            1,
            1.5,
            2
          ],
          [
            10,
            50,
            75,
            100
          ]
        ),

      () =>
        combinedConversion(
          "volume",
          "dm³",
          "cm³",
          "cm³",
          [
            0.5,
            1,
            1.5,
            2.5
          ],
          [
            100,
            500,
            750,
            1000
          ]
        )
    ];
  }

  function poolForLevel(level) {
    if (level === 1) {
      return mediumPool();
    }

    if (level === 2) {
      return highPool();
    }

    return advancedPool();
  }

  /* =========================================================
     GENERAREA CELOR 20 DE ÎNTREBĂRI
  ========================================================= */

  function buildQuestionSet(level) {
    const pool =
      poolForLevel(level);

    const questions = [];

    const seen =
      new Set();

    let safety = 0;

    while (
      questions.length <
        QUESTION_COUNT &&
      safety < 1000
    ) {
      safety += 1;

      const question =
        pick(pool)();

      const key =
        `${question.prompt}|${question.unit}`;

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      questions.push(
        question
      );
    }

    /*
     * Fallback foarte puțin probabil.
     */
    while (
      questions.length <
      QUESTION_COUNT
    ) {
      questions.push(
        pick(pool)()
      );
    }

    return shuffle(
      questions
    ).map(
      (
        question,
        index
      ) => ({
        id:
          `u${level}-q${index + 1}`,

        tip:
          "numeric",

        intrebare:
          question.prompt,

        instructiune:
          "Scrie doar valoarea numerică. " +
          "Poți folosi virgulă sau punct pentru zecimale.",

        unitate:
          question.unit,

        raspunsCorect:
          question.answer,

        toleranta:
          0.000001,

        tolerantaRelativa:
          0.000000001,

        /*
         * Punctaj:
         *
         * Nivel 1 → 100 p
         * Nivel 2 → 150 p
         * Nivel 3 → 200 p
         */
        punctaj:
          Math.round(
            100 *
            LEVELS[level]
              .multiplier
          ),

        explicatie:
          question.explanation,

        mesajCorect:
          "Corect!",

        mesajGresit:
          "Răspunsul nu este corect. " +
          "Verifică transformarea unităților.",

        placeholder:
          "Răspuns numeric"
      })
    );
  }

  /* =========================================================
     NAVIGARE ÎNTRE NIVELURI
  ========================================================= */

  const nextUrl =
    LEVEL < 3
      ? (
          "unitati-de-masura.html" +
          `?nivel=${LEVEL + 1}`
        )
      : "";

  /* =========================================================
     DATELE TESTULUI
  ========================================================= */

  window.TEST_DATA = {

    /*
     * Fiecare nivel are propriul ID,
     * pentru ca sesiunea neterminată
     * să fie salvată separat.
     */
    id:
      `unitati-de-masura-nivel-${LEVEL}`,

    titlu:
      "Campionii Unităților de Măsură",

    subtitlu:
      `${LEVEL_INFO.icon} ` +
      `Nivelul ${LEVEL} — ` +
      LEVEL_INFO.name,

    descriere:
      LEVEL_INFO.description +
      " Testul conține 20 de exerciții " +
      "și păstrează progresul în acest browser.",

    disciplina:
      "Fizică",

    clasa:
      "Clasa a VI-a",

    capitol:
      "Mărimi fizice și unități de măsură",

    /*
     * 0 = fără cronometru.
     */
    durataMinute: 0,

    /* =====================================================
       INSTRUCȚIUNI
    ===================================================== */

    instructiuni: [

      "Rezolvă toate cele 20 de exerciții.",

      "Scrie doar răspunsul numeric; " +
      "unitatea cerută este afișată lângă câmp.",

      "Pentru zecimale poți folosi atât virgula, cât și punctul.",

      "Nivelul următor se deblochează numai după ce termini nivelul curent.",

      "Dacă obții 100%, vei fi trimis automat la nivelul următor.",

      "Diploma se deblochează numai după ce ai parcurs cel puțin o dată Nivelul 3 — AVANSAT."
    ],

    /* =====================================================
       DATELE ELEVULUI
    ===================================================== */

    campuriElev: [

      {
        id: "nume",
        label: "Numele și prenumele",
        type: "text",
        required: true,
        placeholder:
          "Ex.: Andrei Popescu"
      },

      {
        id: "clasa",
        label: "Clasa",
        type: "text",
        required: true,
        placeholder:
          "Ex.: VI A"
      },

      {
        id: "scoala",
        label: "Școala",
        type: "text",
        required: true,
        placeholder:
          "Ex.: Liceul Teoretic Callatis"
      },

      {
        id: "localitate",
        label: "Localitatea",
        type: "text",
        required: true,
        placeholder:
          "Ex.: Mangalia"
      }
    ],

    /* =====================================================
       PROGRESIE
    ===================================================== */

    progression: {

      ...BASE_PROGRESSION,

      level:
        LEVEL,

      nextUrl,

      levelUrls: {

        1:
          "unitati-de-masura.html?nivel=1",

        2:
          "unitati-de-masura.html?nivel=2",

        3:
          "unitati-de-masura.html?nivel=3"
      },

      levelNames: {

        1:
          "Nivelul 1 — MEDIU",

        2:
          "Nivelul 2 — RIDICAT",

        3:
          "Nivelul 3 — AVANSAT"
      },

      showProgressionStatus:
        true
    },

    /* =====================================================
       LINKURI
    ===================================================== */

    linkuri: {

      inapoi:
        "index.html"
    },

    /* =====================================================
       CONFIGURAȚIA MOTORULUI
    ===================================================== */

    config: {

      /*
       * O întrebare pe ecran.
       */
      questionsPerPage: 1,

      /*
       * Întrebările sunt deja
       * randomizate de acest fișier.
       */
      shuffleQuestions: false,
      shuffleOptions: false,

      requireAllAnswers: true,

      /*
       * Elevul poate reveni la o
       * întrebare anterioară.
       */
      allowBack: true,

      /*
       * Feedback după fiecare exercițiu.
       */
      immediateFeedback: true,

      /*
       * După verificare răspunsul
       * nu mai poate fi schimbat.
       */
      lockAfterCheck: true,

      showCorrectAnswers: true,
      showExplanations: true,
      showQuestionPoints: true,

      /*
       * Salvarea unui test neterminat.
       */
      saveProgress: true,
      restoreProgress: true,

      /*
       * Numele, clasa, școala și
       * localitatea se păstrează
       * între niveluri.
       */
      persistStudentProfile: true,

      injectStyles: true,
      updateHash: true,
      keyboard: true,

      showTimer: false,
      autoSubmitOnTimeout: false,

      confirmBeforeSubmit: true,

      allowRestart: true,
      allowPrint: true,

      startImmediately: false,

      minimumGrade: 1,
      maximumGrade: 10,
      passingGrade: 5,

      /*
       * Testul neterminat se poate
       * restaura timp de maximum
       * 7 zile.
       */
      maxSavedAgeHours: 168
    },

    /* =====================================================
       ÎNTREBĂRILE
    ===================================================== */

    intrebari:
      buildQuestionSet(
        LEVEL
      )
  };

  /* =========================================================
     SCHIMBAREA SETULUI DUPĂ FINALIZARE
  ========================================================= */

  /*
   * După finalizarea unui nivel ștergem
   * seed-ul setului curent.
   *
   * Astfel:
   *
   * - dacă elevul reîncarcă pagina în
   *   timpul testului → primește aceleași întrebări;
   *
   * - dacă termină testul și îl face din nou
   *   după reîncărcare → primește alt set.
   */
  document.addEventListener(
    "fizica:test-complete",

    function (event) {

      const detail =
        event.detail || {};

      if (
        detail.testId ===
        `unitati-de-masura-nivel-${LEVEL}`
      ) {
        clearSeed(LEVEL);
      }
    }
  );

  /* =========================================================
     API OPȚIONAL PENTRU DEBUG
  ========================================================= */

  window.UnitatiDeMasura =
    Object.freeze({

      groupId:
        GROUP_ID,

      level:
        LEVEL,

      levels:
        LEVELS,

      questionCount:
        QUESTION_COUNT,

      buildQuestionSet
    });

})(window);
