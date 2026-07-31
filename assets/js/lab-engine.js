from pathlib import Path

code = r'''/**
 * lab-engine.js — Fizica Galaction
 *
 * Motor reutilizabil pentru experimente, investigații și simulări.
 *
 * Funcționalități:
 * - generează activitatea din window.LAB_DATA / window.EXPERIMENT_DATA;
 * - afișează activitatea pe pași, cu „Înapoi” și „Mergi mai departe”;
 * - gestionează materiale, reguli de siguranță și obiective;
 * - include cronometru experimental;
 * - construiește tabele de măsurători;
 * - calculează coloane derivate fără eval();
 * - gestionează verificări rapide și concluzia elevului;
 * - salvează progresul în localStorage;
 * - actualizează formulele MathJax;
 * - emite evenimente pentru progres, rapoarte și Firebase;
 * - poate îmbunătăți și o pagină HTML existentă.
 *
 * Încărcare recomandată:
 *
 * <body data-page-type="lab">
 *   <main
 *     id="labApp"
 *     data-lab-engine
 *     data-lab-id="clasa7-determinarea-densitatii">
 *   </main>
 *
 *   <script src="../../../assets/js/lab-engine.js"></script>
 *   <script src="../../../assets/data/laborator/densitate.js"></script>
 *   <script src="../../../assets/js/app.js"></script>
 * </body>
 *
 * Structură minimală:
 *
 * window.LAB_DATA = {
 *   id: "clasa7-determinarea-densitatii",
 *   titlu: "Determinarea densității unui corp",
 *   pasi: [
 *     {
 *       titlu: "Pregătirea experimentului",
 *       continut: "Așază balanța pe o suprafață orizontală."
 *     }
 *   ]
 * };
 */

(function () {
  "use strict";

  const APP_NAME = "Fizica Galaction";
  const MODULE_NAME = "lab-engine";
  const STORAGE_PREFIX = "fizica-galaction:lab:";
  const DEFAULT_CONTAINER_SELECTORS = [
    "[data-lab-engine]",
    "[data-lab-root]",
    "#labApp",
    "#lab-app"
  ].join(",");

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  const instances = new WeakMap();
  let activeInstance = null;

  const DEFAULT_CONFIG = Object.freeze({
    saveProgress: true,
    restoreProgress: true,
    updateHash: true,
    keyboard: true,
    injectStyles: true,
    requireStepCompletion: false,
    requireQuickChecks: false,
    requireConclusion: false,
    requireMeasurements: false,
    minimumConclusionLength: 20,
    timerWarningSeconds: 10,
    maxMeasurementRows: 20,
    minMeasurementRows: 1,
    showRestartButton: true,
    showSaveStatus: true,
    showStepList: true,
    allowPrint: true,
    autoTypesetMath: true
  });

  /**
   * Returnează primul element care corespunde selectorului.
   *
   * @param {string | Element | null} target
   * @returns {Element | null}
   */
  function resolveElement(target) {
    if (target instanceof Element) {
      return target;
    }

    if (typeof target === "string" && target.trim()) {
      return document.querySelector(target);
    }

    return document.querySelector(
      DEFAULT_CONTAINER_SELECTORS
    );
  }

  /**
   * Transformă o valoare într-un text sigur pentru HTML.
   *
   * Datele lecțiilor sunt controlate de autor, dar această funcție
   * protejează componentele care includ răspunsuri introduse de elev.
   *
   * @param {unknown} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Elimină diacriticele și uniformizează un text.
   *
   * @param {unknown} value
   * @returns {string}
   */
  function normalizeText(value) {
    return String(value ?? "")
      .toLocaleLowerCase("ro-RO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?;:()[\]{}"'`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Normalizează un număr scris cu punct sau virgulă.
   *
   * @param {unknown} value
   * @returns {number}
   */
  function normalizeNumber(value) {
    if (typeof value === "number") {
      return value;
    }

    const normalized = String(value ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");

    if (!normalized) {
      return Number.NaN;
    }

    return Number(normalized);
  }

  /**
   * Limitează o valoare numerică.
   *
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(
      Math.max(value, min),
      max
    );
  }

  /**
   * Creează un identificator sigur pentru DOM.
   *
   * @param {unknown} value
   * @param {string} fallback
   * @returns {string}
   */
  function slugify(value, fallback = "element") {
    const result = normalizeText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return result || fallback;
  }

  /**
   * Citește JSON fără să arunce o eroare.
   *
   * @param {string | null} raw
   * @param {unknown} fallback
   * @returns {unknown}
   */
  function safeJsonParse(raw, fallback = null) {
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        `[${APP_NAME}] Date JSON invalide:`,
        error
      );
      return fallback;
    }
  }

  /**
   * Copie simplă pentru date serializabile.
   *
   * @param {unknown} value
   * @returns {unknown}
   */
  function cloneSerializable(value) {
    return safeJsonParse(
      JSON.stringify(value),
      value
    );
  }

  /**
   * Returnează data curentă în format ISO.
   *
   * @returns {string}
   */
  function nowIso() {
    return new Date().toISOString();
  }

  /**
   * Emite un eveniment personalizat pe document și container.
   *
   * @param {string} name
   * @param {object} detail
   * @param {Element | null} container
   */
  function emit(name, detail, container = null) {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true
    });

    if (container) {
      container.dispatchEvent(event);
      return;
    }

    document.dispatchEvent(event);
  }

  /**
   * Returnează o listă indiferent de forma valorii.
   *
   * @param {unknown} value
   * @returns {Array}
   */
  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (value === undefined || value === null) {
      return [];
    }

    return [value];
  }

  /**
   * Încarcă datele laboratorului.
   *
   * Prioritate:
   * 1. opțiunea data;
   * 2. window.LAB_DATA;
   * 3. window.EXPERIMENT_DATA;
   * 4. JSON din data-lab-data;
   * 5. URL din data-source.
   *
   * @param {Element} container
   * @param {object} options
   * @returns {Promise<object | null>}
   */
  async function loadData(container, options = {}) {
    if (options.data && typeof options.data === "object") {
      return options.data;
    }

    if (
      window.LAB_DATA &&
      typeof window.LAB_DATA === "object"
    ) {
      return window.LAB_DATA;
    }

    if (
      window.EXPERIMENT_DATA &&
      typeof window.EXPERIMENT_DATA === "object"
    ) {
      return window.EXPERIMENT_DATA;
    }

    const inlineData = container.dataset.labData;
    if (inlineData) {
      const parsed = safeJsonParse(inlineData);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }

    const source =
      options.source ||
      container.dataset.source ||
      container.dataset.labSource;

    if (!source) {
      return null;
    }

    const response = await fetch(source, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(
        `Datele laboratorului nu au putut fi încărcate (${response.status}).`
      );
    }

    return response.json();
  }

  /**
   * Normalizează configurația și datele unui laborator.
   *
   * @param {object} raw
   * @param {Element} container
   * @param {object} options
   * @returns {object}
   */
  function normalizeLabData(
    raw,
    container,
    options = {}
  ) {
    const rawConfig =
      raw?.config && typeof raw.config === "object"
        ? raw.config
        : {};

    const config = {
      ...DEFAULT_CONFIG,
      ...rawConfig,
      ...options.config
    };

    const id =
      raw?.id ||
      container.dataset.labId ||
      slugify(
        raw?.titlu ||
        raw?.title ||
        document.title,
        "laborator"
      );

    const steps =
      raw?.pasi ||
      raw?.steps ||
      raw?.secvente ||
      [];

    const measurements =
      raw?.masuratori ||
      raw?.measurements ||
      null;

    const quickChecks =
      raw?.verificari ||
      raw?.quickChecks ||
      [];

    const objectives =
      raw?.obiective ||
      raw?.objectives ||
      [];

    const materials =
      raw?.materiale ||
      raw?.materials ||
      [];

    const safety =
      raw?.siguranta ||
      raw?.safety ||
      raw?.reguliSiguranta ||
      [];

    return {
      id: String(id),
      titlu:
        raw?.titlu ||
        raw?.title ||
        "Activitate de laborator",
      subtitlu:
        raw?.subtitlu ||
        raw?.subtitle ||
        "",
      descriere:
        raw?.descriere ||
        raw?.description ||
        "",
      clasa:
        raw?.clasa ||
        raw?.grade ||
        "",
      capitol:
        raw?.capitol ||
        raw?.chapter ||
        "",
      durataMinute:
        raw?.durataMinute ??
        raw?.durationMinutes ??
        null,
      dificultate:
        raw?.dificultate ||
        raw?.difficulty ||
        "",
      obiective: toArray(objectives),
      materiale: toArray(materials),
      siguranta: toArray(safety),
      ipoteza:
        raw?.ipoteza ||
        raw?.hypothesis ||
        null,
      formule: toArray(
        raw?.formule ||
        raw?.formulas ||
        []
      ),
      pasi: toArray(steps).map(
        (step, index) =>
          normalizeStep(step, index)
      ),
      masuratori: normalizeMeasurements(
        measurements,
        config
      ),
      verificari: toArray(quickChecks).map(
        (check, index) =>
          normalizeQuickCheck(check, index)
      ),
      concluzie:
        raw?.concluzie ||
        raw?.conclusion ||
        {},
      linkuri:
        raw?.linkuri ||
        raw?.links ||
        {},
      config
    };
  }

  /**
   * Normalizează un pas experimental.
   *
   * @param {unknown} raw
   * @param {number} index
   * @returns {object}
   */
  function normalizeStep(raw, index) {
    const source =
      typeof raw === "string"
        ? { continut: raw }
        : raw || {};

    const id =
      source.id ||
      `pas-${index + 1}`;

    return {
      id: slugify(id, `pas-${index + 1}`),
      titlu:
        source.titlu ||
        source.title ||
        `Pasul ${index + 1}`,
      continut:
        source.continut ||
        source.content ||
        source.instructiuni ||
        source.instructions ||
        "",
      continutHtml:
        source.continutHtml ||
        source.contentHtml ||
        "",
      observatie:
        source.observatie ||
        source.observation ||
        "",
      atentionare:
        source.atentionare ||
        source.warning ||
        "",
      imagine:
        source.imagine ||
        source.image ||
        null,
      imagineAlt:
        source.imagineAlt ||
        source.imageAlt ||
        source.titlu ||
        `Ilustrație pentru pasul ${index + 1}`,
      lista: toArray(
        source.lista ||
        source.list ||
        []
      ),
      verificari: toArray(
        source.verificari ||
        source.checklist ||
        []
      ),
      cronometruSecunde:
        source.cronometruSecunde ??
        source.timerSeconds ??
        null,
      obligatoriu:
        source.obligatoriu ??
        source.required ??
        false
    };
  }

  /**
   * Normalizează configurația tabelului de măsurători.
   *
   * @param {unknown} raw
   * @param {object} config
   * @returns {object | null}
   */
  function normalizeMeasurements(raw, config) {
    if (!raw) {
      return null;
    }

    const source =
      Array.isArray(raw)
        ? { coloane: raw }
        : raw;

    const columns = toArray(
      source.coloane ||
      source.columns ||
      []
    ).map((column, index) => {
      const item =
        typeof column === "string"
          ? {
              cheie: slugify(column, `c${index + 1}`),
              eticheta: column
            }
          : column || {};

      const key =
        item.cheie ||
        item.key ||
        `c${index + 1}`;

      const calculation =
        item.calcul ||
        item.calculation ||
        null;

      return {
        cheie: slugify(key, `c${index + 1}`),
        eticheta:
          item.eticheta ||
          item.label ||
          key,
        unitate:
          item.unitate ||
          item.unit ||
          "",
        tip:
          item.tip ||
          item.type ||
          "number",
        min:
          item.min ?? null,
        max:
          item.max ?? null,
        pas:
          item.pas ??
          item.step ??
          "any",
        zecimale:
          item.zecimale ??
          item.decimals ??
          2,
        obligatoriu:
          item.obligatoriu ??
          item.required ??
          false,
        placeholder:
          item.placeholder ||
          "",
        calcul: calculation,
        doarCitire:
          Boolean(
            item.doarCitire ??
            item.readonly ??
            calculation
          )
      };
    });

    return {
      titlu:
        source.titlu ||
        source.title ||
        "Măsurători și observații",
      descriere:
        source.descriere ||
        source.description ||
        "",
      coloane: columns,
      randuriInitiale: clamp(
        Number(
          source.randuriInitiale ??
          source.initialRows ??
          config.minMeasurementRows
        ) || 1,
        1,
        config.maxMeasurementRows
      ),
      randuriMinime: clamp(
        Number(
          source.randuriMinime ??
          source.minimumRows ??
          config.minMeasurementRows
        ) || 1,
        1,
        config.maxMeasurementRows
      ),
      randuriMaxime: clamp(
        Number(
          source.randuriMaxime ??
          source.maximumRows ??
          config.maxMeasurementRows
        ) || config.maxMeasurementRows,
        1,
        100
      ),
      permiteAdaugare:
        source.permiteAdaugare ??
        source.allowAddRows ??
        true,
      permiteStergere:
        source.permiteStergere ??
        source.allowDeleteRows ??
        true
    };
  }

  /**
   * Normalizează o verificare rapidă.
   *
   * @param {unknown} raw
   * @param {number} index
   * @returns {object}
   */
  function normalizeQuickCheck(raw, index) {
    const source =
      typeof raw === "string"
        ? {
            intrebare: raw,
            tip: "text"
          }
        : raw || {};

    const options = toArray(
      source.optiuni ||
      source.options ||
      []
    );

    return {
      id: slugify(
        source.id ||
        `verificare-${index + 1}`,
        `verificare-${index + 1}`
      ),
      titlu:
        source.titlu ||
        source.title ||
        "Verificare rapidă",
      intrebare:
        source.intrebare ||
        source.question ||
        "",
      tip:
        source.tip ||
        source.type ||
        (options.length
          ? "single-choice"
          : "text"),
      optiuni: options,
      corect:
        source.corect ??
        source.correct ??
        null,
      raspunsuriAcceptate: toArray(
        source.raspunsuriAcceptate ||
        source.acceptedAnswers ||
        []
      ),
      toleranta:
        source.toleranta ??
        source.tolerance ??
        0.01,
      unitate:
        source.unitate ||
        source.unit ||
        "",
      explicatie:
        source.explicatie ||
        source.explanation ||
        "",
      obligatoriu:
        source.obligatoriu ??
        source.required ??
        true
    };
  }

  /**
   * Creează starea inițială.
   *
   * @param {object} data
   * @returns {object}
   */
  function createInitialState(data) {
    const measurementRows =
      data.masuratori
        ? Array.from(
            {
              length:
                data.masuratori.randuriInitiale
            },
            () =>
              createEmptyMeasurementRow(
                data.masuratori
              )
          )
        : [];

    return {
      version: 1,
      labId: data.id,
      currentStep: 0,
      completedSteps: {},
      checklist: {},
      timer: {
        stepId: null,
        initialSeconds: 0,
        remainingSeconds: 0,
        running: false
      },
      measurements: measurementRows,
      quickChecks: {},
      hypothesis: "",
      conclusion: "",
      notes: "",
      completed: false,
      startedAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null
    };
  }

  /**
   * Creează un rând gol pentru tabelul de măsurători.
   *
   * @param {object} measurements
   * @returns {object}
   */
  function createEmptyMeasurementRow(measurements) {
    const row = {
      id:
        "rand-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8)
    };

    for (const column of measurements.coloane) {
      row[column.cheie] = "";
    }

    return row;
  }

  /**
   * Validează și completează starea încărcată.
   *
   * @param {object} saved
   * @param {object} initial
   * @param {object} data
   * @returns {object}
   */
  function mergeSavedState(
    saved,
    initial,
    data
  ) {
    if (
      !saved ||
      typeof saved !== "object" ||
      saved.labId !== data.id
    ) {
      return initial;
    }

    const merged = {
      ...initial,
      ...saved,
      completedSteps: {
        ...initial.completedSteps,
        ...(saved.completedSteps || {})
      },
      checklist: {
        ...initial.checklist,
        ...(saved.checklist || {})
      },
      quickChecks: {
        ...initial.quickChecks,
        ...(saved.quickChecks || {})
      },
      timer: {
        ...initial.timer,
        ...(saved.timer || {}),
        running: false
      }
    };

    merged.currentStep = clamp(
      Number(merged.currentStep) || 0,
      0,
      Math.max(data.pasi.length - 1, 0)
    );

    if (
      !Array.isArray(merged.measurements)
    ) {
      merged.measurements =
        initial.measurements;
    }

    return merged;
  }

  /**
   * Motorul unei activități de laborator.
   */
  class LabEngine {
    /**
     * @param {Element} container
     * @param {object} data
     * @param {object} options
     */
    constructor(
      container,
      data,
      options = {}
    ) {
      this.container = container;
      this.data = normalizeLabData(
        data,
        container,
        options
      );
      this.config = this.data.config;
      this.storageKey =
        STORAGE_PREFIX + this.data.id;
      this.state = createInitialState(
        this.data
      );
      this.timerInterval = null;
      this.destroyed = false;
      this.bound = {
        click:
          this.handleClick.bind(this),
        input:
          this.handleInput.bind(this),
        change:
          this.handleChange.bind(this),
        keydown:
          this.handleKeydown.bind(this),
        beforeUnload:
          this.handleBeforeUnload.bind(this)
      };
    }

    /**
     * Inițializează motorul.
     *
     * @returns {LabEngine}
     */
    init() {
      if (this.destroyed) {
        return this;
      }

      this.container.dataset.labInitialized =
        "true";
      this.container.dataset.labId =
        this.data.id;

      if (this.config.injectStyles) {
        injectStyles();
      }

      if (this.config.restoreProgress) {
        this.restore();
      }

      this.render();
      this.bindEvents();
      this.recalculateMeasurements();
      this.updateView({
        announce: false,
        save: false
      });
      this.typesetMath();

      emit(
        "fizica:lab-ready",
        this.getPublicState(),
        this.container
      );

      return this;
    }

    /**
     * Atașează evenimentele.
     */
    bindEvents() {
      this.container.addEventListener(
        "click",
        this.bound.click
      );
      this.container.addEventListener(
        "input",
        this.bound.input
      );
      this.container.addEventListener(
        "change",
        this.bound.change
      );

      if (this.config.keyboard) {
        document.addEventListener(
          "keydown",
          this.bound.keydown
        );
      }

      window.addEventListener(
        "beforeunload",
        this.bound.beforeUnload
      );
    }

    /**
     * Elimină evenimentele și cronometrul.
     */
    destroy() {
      if (this.destroyed) {
        return;
      }

      this.stopTimer();

      this.container.removeEventListener(
        "click",
        this.bound.click
      );
      this.container.removeEventListener(
        "input",
        this.bound.input
      );
      this.container.removeEventListener(
        "change",
        this.bound.change
      );
      document.removeEventListener(
        "keydown",
        this.bound.keydown
      );
      window.removeEventListener(
        "beforeunload",
        this.bound.beforeUnload
      );

      this.container.removeAttribute(
        "data-lab-initialized"
      );

      instances.delete(this.container);
      this.destroyed = true;
    }

    /**
     * Construiește interfața.
     */
    render() {
      const hasSteps =
        this.data.pasi.length > 0;

      this.container.classList.add(
        "fg-lab"
      );

      this.container.innerHTML = `
        <div class="fg-lab__shell">
          ${this.renderHeader()}

          <div
            class="fg-lab__live-region"
            role="status"
            aria-live="polite"
            aria-atomic="true">
          </div>

          ${this.renderOverview()}

          ${
            hasSteps
              ? this.renderSteps()
              : this.renderEmptySteps()
          }

          ${this.renderMeasurements()}

          ${this.renderQuickChecks()}

          ${this.renderConclusion()}

          ${this.renderFinalActions()}
        </div>
      `;
    }

    /**
     * Antetul activității.
     *
     * @returns {string}
     */
    renderHeader() {
      const meta = [];

      if (this.data.clasa) {
        meta.push(
          `<span>${escapeHtml(
            this.data.clasa
          )}</span>`
        );
      }

      if (this.data.capitol) {
        meta.push(
          `<span>${escapeHtml(
            this.data.capitol
          )}</span>`
        );
      }

      if (this.data.durataMinute) {
        meta.push(
          `<span>⏱ ${escapeHtml(
            this.data.durataMinute
          )} min</span>`
        );
      }

      if (this.data.dificultate) {
        meta.push(
          `<span>${escapeHtml(
            this.data.dificultate
          )}</span>`
        );
      }

      return `
        <header class="fg-lab__header">
          <p class="fg-lab__eyebrow">
            Laborator de fizică
          </p>

          <h1 class="fg-lab__title">
            ${escapeHtml(this.data.titlu)}
          </h1>

          ${
            this.data.subtitlu
              ? `
                <p class="fg-lab__subtitle">
                  ${escapeHtml(
                    this.data.subtitlu
                  )}
                </p>
              `
              : ""
          }

          ${
            meta.length
              ? `
                <div
                  class="fg-lab__meta"
                  aria-label="Informații despre activitate">
                  ${meta.join("")}
                </div>
              `
              : ""
          }

          <div
            class="fg-lab__progress"
            aria-label="Progresul activității">
            <div class="fg-lab__progress-row">
              <span data-progress-label>
                Progres
              </span>
              <strong data-progress-value>
                0%
              </strong>
            </div>

            <div
              class="fg-lab__progress-track"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
              data-progress-bar>
              <span
                class="fg-lab__progress-fill"
                data-progress-fill>
              </span>
            </div>
          </div>
        </header>
      `;
    }

    /**
     * Prezentarea activității.
     *
     * @returns {string}
     */
    renderOverview() {
      const objectives =
        this.renderListCard(
          "🎯",
          "Obiective",
          this.data.obiective,
          "fg-lab__card--objectives"
        );

      const materials =
        this.renderChecklistCard(
          "🧰",
          "Materiale necesare",
          this.data.materiale,
          "material"
        );

      const safety =
        this.renderListCard(
          "⚠️",
          "Reguli de siguranță",
          this.data.siguranta,
          "fg-lab__card--safety"
        );

      const formulas =
        this.data.formule.length
          ? `
            <section class="fg-lab__card">
              <h2 class="fg-lab__card-title">
                <span aria-hidden="true">📐</span>
                Formule utile
              </h2>

              <div class="fg-lab__formula-list">
                ${this.data.formule
                  .map((formula) => {
                    if (
                      typeof formula === "object"
                    ) {
                      return `
                        <article class="fg-lab__formula">
                          ${
                            formula.titlu
                              ? `
                                <h3>
                                  ${escapeHtml(
                                    formula.titlu
                                  )}
                                </h3>
                              `
                              : ""
                          }
                          <div>
                            ${
                              formula.formula ||
                              formula.continut ||
                              ""
                            }
                          </div>
                          ${
                            formula.explicatie
                              ? `
                                <p>
                                  ${escapeHtml(
                                    formula.explicatie
                                  )}
                                </p>
                              `
                              : ""
                          }
                        </article>
                      `;
                    }

                    return `
                      <div class="fg-lab__formula">
                        ${String(formula)}
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
          : "";

      const hypothesis =
        this.data.ipoteza
          ? `
            <section class="fg-lab__card">
              <h2 class="fg-lab__card-title">
                <span aria-hidden="true">💭</span>
                Ipoteză
              </h2>

              ${
                typeof this.data.ipoteza ===
                "string"
                  ? `
                    <p>
                      ${escapeHtml(
                        this.data.ipoteza
                      )}
                    </p>
                  `
                  : ""
              }

              <label
                class="fg-lab__field-label"
                for="${escapeHtml(
                  this.data.id
                )}-hypothesis">
                Formulează ipoteza ta:
              </label>

              <textarea
                id="${escapeHtml(
                  this.data.id
                )}-hypothesis"
                class="fg-lab__textarea"
                data-lab-field="hypothesis"
                rows="3"
                placeholder="Cred că..."></textarea>
            </section>
          `
          : "";

      if (
        !this.data.descriere &&
        !objectives &&
        !materials &&
        !safety &&
        !formulas &&
        !hypothesis
      ) {
        return "";
      }

      return `
        <section
          class="fg-lab__overview"
          aria-label="Pregătirea activității">
          ${
            this.data.descriere
              ? `
                <section class="fg-lab__card">
                  <h2 class="fg-lab__card-title">
                    <span aria-hidden="true">🔎</span>
                    Despre activitate
                  </h2>
                  <p>
                    ${escapeHtml(
                      this.data.descriere
                    )}
                  </p>
                </section>
              `
              : ""
          }

          ${objectives}
          ${materials}
          ${safety}
          ${formulas}
          ${hypothesis}
        </section>
      `;
    }

    /**
     * Card cu listă.
     *
     * @param {string} icon
     * @param {string} title
     * @param {Array} items
     * @param {string} className
     * @returns {string}
     */
    renderListCard(
      icon,
      title,
      items,
      className = ""
    ) {
      if (!items.length) {
        return "";
      }

      return `
        <section
          class="fg-lab__card ${className}">
          <h2 class="fg-lab__card-title">
            <span aria-hidden="true">
              ${icon}
            </span>
            ${escapeHtml(title)}
          </h2>

          <ul class="fg-lab__list">
            ${items
              .map((item) => {
                const text =
                  typeof item === "object"
                    ? item.text ||
                      item.titlu ||
                      item.label ||
                      ""
                    : item;

                return `
                  <li>${escapeHtml(text)}</li>
                `;
              })
              .join("")}
          </ul>
        </section>
      `;
    }

    /**
     * Card cu elemente bifabile.
     *
     * @param {string} icon
     * @param {string} title
     * @param {Array} items
     * @param {string} group
     * @returns {string}
     */
    renderChecklistCard(
      icon,
      title,
      items,
      group
    ) {
      if (!items.length) {
        return "";
      }

      return `
        <section class="fg-lab__card">
          <h2 class="fg-lab__card-title">
            <span aria-hidden="true">
              ${icon}
            </span>
            ${escapeHtml(title)}
          </h2>

          <div class="fg-lab__checklist">
            ${items
              .map((item, index) => {
                const source =
                  typeof item === "object"
                    ? item
                    : { text: item };

                const text =
                  source.text ||
                  source.titlu ||
                  source.label ||
                  "";

                const id = `${group}-${index}`;

                return `
                  <label class="fg-lab__check-item">
                    <input
                      type="checkbox"
                      data-lab-checklist="${escapeHtml(
                        group
                      )}"
                      data-check-id="${escapeHtml(
                        id
                      )}">
                    <span>
                      ${escapeHtml(text)}
                    </span>
                  </label>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    }

    /**
     * Secțiunea pașilor experimentali.
     *
     * @returns {string}
     */
    renderSteps() {
      return `
        <section
          class="fg-lab__procedure"
          aria-labelledby="${escapeHtml(
            this.data.id
          )}-procedure-title">
          <div class="fg-lab__section-heading">
            <div>
              <p class="fg-lab__eyebrow">
                Procedură
              </p>
              <h2
                id="${escapeHtml(
                  this.data.id
                )}-procedure-title">
                Desfășurarea experimentului
              </h2>
            </div>

            ${
              this.config.showSaveStatus
                ? `
                  <span
                    class="fg-lab__save-status"
                    data-save-status>
                    Progres local
                  </span>
                `
                : ""
            }
          </div>

          ${
            this.config.showStepList
              ? this.renderStepList()
              : ""
          }

          <div class="fg-lab__step-stage">
            ${this.data.pasi
              .map((step, index) =>
                this.renderStep(step, index)
              )
              .join("")}
          </div>

          ${this.renderStepNavigation()}
        </section>
      `;
    }

    /**
     * Lista vizuală a pașilor.
     *
     * @returns {string}
     */
    renderStepList() {
      return `
        <ol
          class="fg-lab__step-list"
          aria-label="Pașii experimentului">
          ${this.data.pasi
            .map(
              (step, index) => `
                <li>
                  <button
                    type="button"
                    class="fg-lab__step-chip"
                    data-action="go-step"
                    data-step="${index}"
                    aria-label="Mergi la pasul ${
                      index + 1
                    }: ${escapeHtml(
                      step.titlu
                    )}">
                    <span class="fg-lab__step-number">
                      ${index + 1}
                    </span>
                    <span class="fg-lab__step-chip-title">
                      ${escapeHtml(
                        step.titlu
                      )}
                    </span>
                  </button>
                </li>
              `
            )
            .join("")}
        </ol>
      `;
    }

    /**
     * Afișează un singur pas.
     *
     * @param {object} step
     * @param {number} index
     * @returns {string}
     */
    renderStep(step, index) {
      const checklist =
        step.verificari.length
          ? `
            <div class="fg-lab__step-checklist">
              <h3>Confirmă înainte de a continua</h3>

              ${step.verificari
                .map((item, itemIndex) => {
                  const text =
                    typeof item === "object"
                      ? item.text ||
                        item.titlu ||
                        item.label ||
                        ""
                      : item;

                  const id =
                    `${step.id}-${itemIndex}`;

                  return `
                    <label class="fg-lab__check-item">
                      <input
                        type="checkbox"
                        data-lab-checklist="step"
                        data-step-id="${escapeHtml(
                          step.id
                        )}"
                        data-check-id="${escapeHtml(
                          id
                        )}">
                      <span>
                        ${escapeHtml(text)}
                      </span>
                    </label>
                  `;
                })
                .join("")}
            </div>
          `
          : "";

      const timer =
        Number(step.cronometruSecunde) > 0
          ? this.renderTimer(step)
          : "";

      return `
        <article
          class="fg-lab__step"
          data-lab-step
          data-step-index="${index}"
          data-step-id="${escapeHtml(
            step.id
          )}"
          ${
            index === 0
              ? ""
              : "hidden"
          }>
          <div class="fg-lab__step-header">
            <span class="fg-lab__step-badge">
              Pasul ${index + 1} din ${
                this.data.pasi.length
              }
            </span>

            <h3>
              ${escapeHtml(step.titlu)}
            </h3>
          </div>

          <div class="fg-lab__step-content">
            ${
              step.continutHtml
                ? step.continutHtml
                : step.continut
                  ? `
                    <p>
                      ${escapeHtml(
                        step.continut
                      )}
                    </p>
                  `
                  : ""
            }

            ${
              step.lista.length
                ? `
                  <ol class="fg-lab__instruction-list">
                    ${step.lista
                      .map(
                        (item) => `
                          <li>
                            ${escapeHtml(
                              typeof item ===
                              "object"
                                ? item.text ||
                                  item.titlu ||
                                  ""
                                : item
                            )}
                          </li>
                        `
                      )
                      .join("")}
                  </ol>
                `
                : ""
            }

            ${
              step.imagine
                ? `
                  <figure class="fg-lab__figure">
                    <img
                      src="${escapeHtml(
                        step.imagine
                      )}"
                      alt="${escapeHtml(
                        step.imagineAlt
                      )}"
                      loading="lazy">
                  </figure>
                `
                : ""
            }

            ${
              step.atentionare
                ? `
                  <div
                    class="fg-lab__notice fg-lab__notice--warning"
                    role="note">
                    <strong>Atenție:</strong>
                    ${escapeHtml(
                      step.atentionare
                    )}
                  </div>
                `
                : ""
            }

            ${
              step.observatie
                ? `
                  <div class="fg-lab__observation">
                    <strong>Observă:</strong>
                    ${escapeHtml(
                      step.observatie
                    )}
                  </div>
                `
                : ""
            }

            ${timer}
            ${checklist}
          </div>
        </article>
      `;
    }

    /**
     * Cronometru pentru un pas.
     *
     * @param {object} step
     * @returns {string}
     */
    renderTimer(step) {
      const seconds = Number(
        step.cronometruSecunde
      );

      return `
        <section
          class="fg-lab__timer"
          data-timer-for="${escapeHtml(
            step.id
          )}"
          data-timer-seconds="${seconds}">
          <h3>
            <span aria-hidden="true">⏱</span>
            Cronometru
          </h3>

          <output
            class="fg-lab__timer-display"
            data-timer-display>
            ${formatTime(seconds)}
          </output>

          <div class="fg-lab__timer-actions">
            <button
              type="button"
              class="fg-lab__button"
              data-action="timer-start">
              Pornește
            </button>

            <button
              type="button"
              class="fg-lab__button fg-lab__button--secondary"
              data-action="timer-pause">
              Pauză
            </button>

            <button
              type="button"
              class="fg-lab__button fg-lab__button--ghost"
              data-action="timer-reset">
              Resetează
            </button>
          </div>
        </section>
      `;
    }

    /**
     * Navigarea dintre pași.
     *
     * @returns {string}
     */
    renderStepNavigation() {
      return `
        <nav
          class="fg-lab__navigation"
          aria-label="Navigarea între pașii experimentului">
          <button
            type="button"
            class="fg-lab__button fg-lab__button--secondary"
            data-action="previous-step">
            <span aria-hidden="true">←</span>
            Înapoi
          </button>

          <span
            class="fg-lab__page-indicator"
            data-step-indicator>
            Pasul 1 din ${this.data.pasi.length}
          </span>

          <button
            type="button"
            class="fg-lab__button fg-lab__button--primary"
            data-action="next-step">
            Mergi mai departe
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      `;
    }

    /**
     * Mesaj când nu există pași configurați.
     *
     * @returns {string}
     */
    renderEmptySteps() {
      return `
        <section class="fg-lab__card">
          <h2>Activitate fără pași configurați</h2>
          <p>
            Adaugă proprietatea
            <code>pasi</code> în
            <code>window.LAB_DATA</code>
            sau marchează elementele existente cu
            <code>data-lab-step</code>.
          </p>
        </section>
      `;
    }

    /**
     * Tabelul măsurătorilor.
     *
     * @returns {string}
     */
    renderMeasurements() {
      const measurements =
        this.data.masuratori;

      if (!measurements) {
        return "";
      }

      return `
        <section
          class="fg-lab__measurements"
          aria-labelledby="${escapeHtml(
            this.data.id
          )}-measurements-title">
          <div class="fg-lab__section-heading">
            <div>
              <p class="fg-lab__eyebrow">
                Date experimentale
              </p>
              <h2
                id="${escapeHtml(
                  this.data.id
                )}-measurements-title">
                ${escapeHtml(
                  measurements.titlu
                )}
              </h2>
            </div>

            ${
              measurements.permiteAdaugare
                ? `
                  <button
                    type="button"
                    class="fg-lab__button fg-lab__button--secondary"
                    data-action="add-measurement-row">
                    + Adaugă măsurătoare
                  </button>
                `
                : ""
            }
          </div>

          ${
            measurements.descriere
              ? `
                <p>
                  ${escapeHtml(
                    measurements.descriere
                  )}
                </p>
              `
              : ""
          }

          <div
            class="fg-lab__table-wrap"
            tabindex="0"
            aria-label="Tabel de măsurători; derulează orizontal dacă este necesar">
            <table class="fg-lab__table">
              <thead>
                <tr>
                  <th scope="col">Nr.</th>

                  ${measurements.coloane
                    .map(
                      (column) => `
                        <th scope="col">
                          ${escapeHtml(
                            column.eticheta
                          )}
                          ${
                            column.unitate
                              ? `
                                <span class="fg-lab__unit">
                                  (${escapeHtml(
                                    column.unitate
                                  )})
                                </span>
                              `
                              : ""
                          }
                        </th>
                      `
                    )
                    .join("")}

                  ${
                    measurements.permiteStergere
                      ? `
                        <th scope="col">
                          Acțiuni
                        </th>
                      `
                      : ""
                  }
                </tr>
              </thead>

              <tbody data-measurement-body>
                ${this.state.measurements
                  .map((row, index) =>
                    this.renderMeasurementRow(
                      row,
                      index
                    )
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div
            class="fg-lab__measurement-message"
            data-measurement-message
            role="status"
            aria-live="polite">
          </div>
        </section>
      `;
    }

    /**
     * Rând în tabelul măsurătorilor.
     *
     * @param {object} row
     * @param {number} rowIndex
     * @returns {string}
     */
    renderMeasurementRow(
      row,
      rowIndex
    ) {
      const measurements =
        this.data.masuratori;

      return `
        <tr data-row-id="${escapeHtml(
          row.id
        )}">
          <th scope="row">
            ${rowIndex + 1}
          </th>

          ${measurements.coloane
            .map((column) => {
              const value =
                row[column.cheie] ?? "";

              if (column.doarCitire) {
                return `
                  <td>
                    <output
                      class="fg-lab__calculated"
                      data-measurement-output="${escapeHtml(
                        column.cheie
                      )}">
                      ${escapeHtml(value)}
                    </output>
                  </td>
                `;
              }

              if (
                column.tip === "text" ||
                column.tip === "textarea"
              ) {
                return `
                  <td>
                    <input
                      class="fg-lab__table-input"
                      type="text"
                      value="${escapeHtml(
                        value
                      )}"
                      placeholder="${escapeHtml(
                        column.placeholder
                      )}"
                      data-measurement-key="${escapeHtml(
                        column.cheie
                      )}"
                      ${
                        column.obligatoriu
                          ? "required"
                          : ""
                      }>
                  </td>
                `;
              }

              return `
                <td>
                  <input
                    class="fg-lab__table-input"
                    type="number"
                    inputmode="decimal"
                    value="${escapeHtml(
                      value
                    )}"
                    placeholder="${escapeHtml(
                      column.placeholder
                    )}"
                    data-measurement-key="${escapeHtml(
                      column.cheie
                    )}"
                    ${
                      column.min !== null
                        ? `min="${escapeHtml(
                            column.min
                          )}"`
                        : ""
                    }
                    ${
                      column.max !== null
                        ? `max="${escapeHtml(
                            column.max
                          )}"`
                        : ""
                    }
                    step="${escapeHtml(
                      column.pas
                    )}"
                    ${
                      column.obligatoriu
                        ? "required"
                        : ""
                    }>
                </td>
              `;
            })
            .join("")}

          ${
            measurements.permiteStergere
              ? `
                <td>
                  <button
                    type="button"
                    class="fg-lab__icon-button"
                    data-action="remove-measurement-row"
                    data-row-id="${escapeHtml(
                      row.id
                    )}"
                    aria-label="Șterge măsurătoarea ${
                      rowIndex + 1
                    }">
                    ×
                  </button>
                </td>
              `
              : ""
          }
        </tr>
      `;
    }

    /**
     * Verificările rapide.
     *
     * @returns {string}
     */
    renderQuickChecks() {
      if (!this.data.verificari.length) {
        return "";
      }

      return `
        <section
          class="fg-lab__quick-checks"
          aria-labelledby="${escapeHtml(
            this.data.id
          )}-checks-title">
          <div class="fg-lab__section-heading">
            <div>
              <p class="fg-lab__eyebrow">
                Verificare
              </p>
              <h2
                id="${escapeHtml(
                  this.data.id
                )}-checks-title">
                Verificare rapidă
              </h2>
            </div>
          </div>

          ${this.data.verificari
            .map((check, index) =>
              this.renderQuickCheck(
                check,
                index
              )
            )
            .join("")}
        </section>
      `;
    }

    /**
     * O verificare rapidă.
     *
     * @param {object} check
     * @param {number} index
     * @returns {string}
     */
    renderQuickCheck(check, index) {
      let input = "";

      if (
        check.tip === "single-choice" ||
        check.tip === "choice"
      ) {
        input = `
          <fieldset class="fg-lab__options">
            <legend class="fg-lab__sr-only">
              ${escapeHtml(check.intrebare)}
            </legend>

            ${check.optiuni
              .map(
                (option, optionIndex) => `
                  <label class="fg-lab__option">
                    <input
                      type="radio"
                      name="${escapeHtml(
                        check.id
                      )}"
                      value="${optionIndex}"
                      data-quick-check-input="${escapeHtml(
                        check.id
                      )}">
                    <span>
                      <strong>
                        ${String.fromCharCode(
                          65 + optionIndex
                        )}.
                      </strong>
                      ${
                        typeof option ===
                        "object"
                          ? option.html ||
                            escapeHtml(
                              option.text ||
                              option.label ||
                              ""
                            )
                          : escapeHtml(option)
                      }
                    </span>
                  </label>
                `
              )
              .join("")}
          </fieldset>
        `;
      } else if (
        check.tip === "true-false"
      ) {
        input = `
          <div class="fg-lab__options">
            <label class="fg-lab__option">
              <input
                type="radio"
                name="${escapeHtml(
                  check.id
                )}"
                value="true"
                data-quick-check-input="${escapeHtml(
                  check.id
                )}">
              <span>Adevărat</span>
            </label>

            <label class="fg-lab__option">
              <input
                type="radio"
                name="${escapeHtml(
                  check.id
                )}"
                value="false"
                data-quick-check-input="${escapeHtml(
                  check.id
                )}">
              <span>Fals</span>
            </label>
          </div>
        `;
      } else {
        input = `
          <label
            class="fg-lab__field-label"
            for="${escapeHtml(
              check.id
            )}-answer">
            Răspunsul tău
          </label>

          <div class="fg-lab__answer-row">
            <input
              id="${escapeHtml(
                check.id
              )}-answer"
              class="fg-lab__input"
              type="${
                check.tip === "numeric"
                  ? "text"
                  : "text"
              }"
              ${
                check.tip === "numeric"
                  ? 'inputmode="decimal"'
                  : ""
              }
              data-quick-check-input="${escapeHtml(
                check.id
              )}">

            ${
              check.unitate
                ? `
                  <span class="fg-lab__answer-unit">
                    ${escapeHtml(
                      check.unitate
                    )}
                  </span>
                `
                : ""
            }
          </div>
        `;
      }

      return `
        <article
          class="fg-lab__quick-check"
          data-quick-check="${escapeHtml(
            check.id
          )}">
          <div class="fg-lab__question-number">
            ${index + 1}
          </div>

          <div class="fg-lab__question-content">
            <h3>${escapeHtml(check.titlu)}</h3>

            <p class="fg-lab__question">
              ${escapeHtml(check.intrebare)}
            </p>

            ${input}

            <button
              type="button"
              class="fg-lab__button fg-lab__button--primary"
              data-action="check-answer"
              data-check-id="${escapeHtml(
                check.id
              )}">
              Verifică răspunsul
            </button>

            <div
              class="fg-lab__feedback"
              data-feedback-for="${escapeHtml(
                check.id
              )}"
              role="status"
              aria-live="polite">
            </div>
          </div>
        </article>
      `;
    }

    /**
     * Concluzia activității.
     *
     * @returns {string}
     */
    renderConclusion() {
      const source =
        typeof this.data.concluzie ===
        "string"
          ? {
              model: this.data.concluzie
            }
          : this.data.concluzie || {};

      const prompt =
        source.cerinta ||
        source.prompt ||
        "Scrie ce ai observat și ce concluzie rezultă din măsurători.";

      const model =
        source.model ||
        source.exemplu ||
        source.example ||
        "";

      return `
        <section
          class="fg-lab__conclusion"
          aria-labelledby="${escapeHtml(
            this.data.id
          )}-conclusion-title">
          <div class="fg-lab__section-heading">
            <div>
              <p class="fg-lab__eyebrow">
                Interpretare
              </p>
              <h2
                id="${escapeHtml(
                  this.data.id
                )}-conclusion-title">
                Concluzia experimentului
              </h2>
            </div>
          </div>

          <p>${escapeHtml(prompt)}</p>

          <label
            class="fg-lab__field-label"
            for="${escapeHtml(
              this.data.id
            )}-conclusion">
            Concluzia ta
          </label>

          <textarea
            id="${escapeHtml(
              this.data.id
            )}-conclusion"
            class="fg-lab__textarea"
            data-lab-field="conclusion"
            rows="6"
            placeholder="Din măsurătorile realizate rezultă că..."></textarea>

          <p
            class="fg-lab__character-count"
            data-conclusion-count>
            0 caractere
          </p>

          <label
            class="fg-lab__field-label"
            for="${escapeHtml(
              this.data.id
            )}-notes">
            Observații suplimentare
          </label>

          <textarea
            id="${escapeHtml(
              this.data.id
            )}-notes"
            class="fg-lab__textarea"
            data-lab-field="notes"
            rows="3"
            placeholder="Erori posibile, dificultăți, idei pentru repetarea experimentului..."></textarea>

          ${
            model
              ? `
                <details class="fg-lab__model-answer">
                  <summary>
                    Vezi un model de concluzie
                  </summary>
                  <p>${escapeHtml(model)}</p>
                </details>
              `
              : ""
          }
        </section>
      `;
    }

    /**
     * Acțiunile finale.
     *
     * @returns {string}
     */
    renderFinalActions() {
      return `
        <section class="fg-lab__final-actions">
          <div
            class="fg-lab__completion-message"
            data-completion-message
            role="status"
            aria-live="polite">
          </div>

          <div class="fg-lab__button-group">
            <button
              type="button"
              class="fg-lab__button fg-lab__button--primary fg-lab__button--large"
              data-action="complete-lab">
              Finalizează activitatea
            </button>

            ${
              this.config.allowPrint
                ? `
                  <button
                    type="button"
                    class="fg-lab__button fg-lab__button--secondary"
                    data-action="print-lab">
                    Tipărește rezultatele
                  </button>
                `
                : ""
            }

            ${
              this.config.showRestartButton
                ? `
                  <button
                    type="button"
                    class="fg-lab__button fg-lab__button--ghost"
                    data-action="reset-lab">
                    Reia activitatea
                  </button>
                `
                : ""
            }
          </div>

          ${
            this.data.linkuri?.inapoi
              ? `
                <a
                  class="fg-lab__back-link"
                  href="${escapeHtml(
                    this.data.linkuri.inapoi
                  )}">
                  ← Înapoi
                </a>
              `
              : ""
          }
        </section>
      `;
    }

    /**
     * Gestionează clickurile delegate.
     *
     * @param {MouseEvent} event
     */
    handleClick(event) {
      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) {
        return;
      }

      const action = button.dataset.action;

      switch (action) {
        case "previous-step":
          this.previousStep();
          break;

        case "next-step":
          this.nextStep();
          break;

        case "go-step":
          this.goToStep(
            Number(button.dataset.step)
          );
          break;

        case "timer-start":
          this.startTimerForCurrentStep();
          break;

        case "timer-pause":
          this.pauseTimer();
          break;

        case "timer-reset":
          this.resetTimerForCurrentStep();
          break;

        case "add-measurement-row":
          this.addMeasurementRow();
          break;

        case "remove-measurement-row":
          this.removeMeasurementRow(
            button.dataset.rowId
          );
          break;

        case "check-answer":
          this.checkAnswer(
            button.dataset.checkId
          );
          break;

        case "complete-lab":
          this.complete();
          break;

        case "reset-lab":
          this.reset();
          break;

        case "print-lab":
          window.print();
          break;

        default:
          break;
      }
    }

    /**
     * Gestionează câmpurile text și măsurătorile.
     *
     * @param {InputEvent} event
     */
    handleInput(event) {
      const field =
        event.target.dataset.labField;

      if (field) {
        if (field === "hypothesis") {
          this.state.hypothesis =
            event.target.value;
        } else if (field === "conclusion") {
          this.state.conclusion =
            event.target.value;
          this.updateConclusionCount();
        } else if (field === "notes") {
          this.state.notes =
            event.target.value;
        }

        this.touch();
        return;
      }

      const measurementKey =
        event.target.dataset.measurementKey;

      if (measurementKey) {
        const rowElement =
          event.target.closest(
            "[data-row-id]"
          );

        const rowId =
          rowElement?.dataset.rowId;

        this.updateMeasurement(
          rowId,
          measurementKey,
          event.target.value
        );
      }
    }

    /**
     * Gestionează bifele.
     *
     * @param {Event} event
     */
    handleChange(event) {
      const checklistType =
        event.target.dataset.labChecklist;

      if (!checklistType) {
        return;
      }

      const checkId =
        event.target.dataset.checkId;

      const stepId =
        event.target.dataset.stepId ||
        "general";

      const key =
        `${checklistType}:${stepId}:${checkId}`;

      this.state.checklist[key] =
        Boolean(event.target.checked);

      if (checklistType === "step") {
        this.updateStepCompletion(stepId);
      }

      this.touch();
      this.updateProgress();
    }

    /**
     * Navigare din tastatură.
     *
     * Alt + săgeată stânga/dreapta evită conflictele
     * cu introducerea textului în câmpuri.
     *
     * @param {KeyboardEvent} event
     */
    handleKeydown(event) {
      if (!event.altKey) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        this.nextStep();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.previousStep();
      }
    }

    /**
     * Salvează înainte de închiderea paginii.
     */
    handleBeforeUnload() {
      if (this.config.saveProgress) {
        this.save({
          silent: true
        });
      }
    }

    /**
     * Mergi la un pas.
     *
     * @param {number} index
     * @param {object} options
     * @returns {boolean}
     */
    goToStep(index, options = {}) {
      if (!this.data.pasi.length) {
        return false;
      }

      const target = clamp(
        Number(index) || 0,
        0,
        this.data.pasi.length - 1
      );

      if (
        target > this.state.currentStep &&
        this.config.requireStepCompletion &&
        !this.canLeaveCurrentStep()
      ) {
        this.announce(
          "Bifează cerințele pasului înainte de a continua."
        );
        this.focusFirstIncompleteChecklist();
        return false;
      }

      this.state.currentStep = target;
      this.touch();

      if (this.config.updateHash) {
        const hash = `#pas-${target + 1}`;

        if (window.location.hash !== hash) {
          history.replaceState(
            null,
            "",
            hash
          );
        }
      }

      this.updateView({
        announce:
          options.announce !== false,
        save:
          options.save !== false
      });

      return true;
    }

    /**
     * Pasul următor.
     *
     * @returns {boolean}
     */
    nextStep() {
      if (
        this.state.currentStep >=
        this.data.pasi.length - 1
      ) {
        this.scrollToSection(
          ".fg-lab__measurements, .fg-lab__quick-checks, .fg-lab__conclusion"
        );
        return false;
      }

      return this.goToStep(
        this.state.currentStep + 1
      );
    }

    /**
     * Pasul anterior.
     *
     * @returns {boolean}
     */
    previousStep() {
      if (this.state.currentStep <= 0) {
        return false;
      }

      return this.goToStep(
        this.state.currentStep - 1
      );
    }

    /**
     * Verifică dacă pasul curent poate fi părăsit.
     *
     * @returns {boolean}
     */
    canLeaveCurrentStep() {
      const step =
        this.data.pasi[
          this.state.currentStep
        ];

      if (!step) {
        return true;
      }

      if (!step.verificari.length) {
        return true;
      }

      return step.verificari.every(
        (_, index) => {
          const key =
            `step:${step.id}:${step.id}-${index}`;

          return Boolean(
            this.state.checklist[key]
          );
        }
      );
    }

    /**
     * Actualizează starea completării pasului.
     *
     * @param {string} stepId
     */
    updateStepCompletion(stepId) {
      const step =
        this.data.pasi.find(
          (item) => item.id === stepId
        );

      if (!step) {
        return;
      }

      const complete =
        step.verificari.length === 0 ||
        step.verificari.every(
          (_, index) =>
            Boolean(
              this.state.checklist[
                `step:${step.id}:${step.id}-${index}`
              ]
            )
        );

      this.state.completedSteps[stepId] =
        complete;
    }

    /**
     * Focus pe prima bifă incompletă.
     */
    focusFirstIncompleteChecklist() {
      const currentStep =
        this.container.querySelector(
          `[data-step-index="${this.state.currentStep}"]`
        );

      const unchecked =
        currentStep?.querySelector(
          'input[type="checkbox"]:not(:checked)'
        );

      unchecked?.focus();
    }

    /**
     * Actualizează interfața după schimbarea stării.
     *
     * @param {object} options
     */
    updateView({
      announce = true,
      save = true
    } = {}) {
      const steps =
        this.container.querySelectorAll(
          "[data-lab-step]"
        );

      steps.forEach((element, index) => {
        const active =
          index === this.state.currentStep;

        element.hidden = !active;
        element.setAttribute(
          "aria-hidden",
          String(!active)
        );
      });

      const chips =
        this.container.querySelectorAll(
          "[data-action='go-step']"
        );

      chips.forEach((chip, index) => {
        const active =
          index === this.state.currentStep;

        const step =
          this.data.pasi[index];

        const complete =
          Boolean(
            this.state.completedSteps[
              step?.id
            ]
          );

        chip.classList.toggle(
          "is-active",
          active
        );
        chip.classList.toggle(
          "is-complete",
          complete
        );

        if (active) {
          chip.setAttribute(
            "aria-current",
            "step"
          );
        } else {
          chip.removeAttribute(
            "aria-current"
          );
        }
      });

      const previousButton =
        this.container.querySelector(
          "[data-action='previous-step']"
        );

      const nextButton =
        this.container.querySelector(
          "[data-action='next-step']"
        );

      if (previousButton) {
        previousButton.disabled =
          this.state.currentStep === 0;
      }

      if (nextButton) {
        const isLast =
          this.state.currentStep ===
          this.data.pasi.length - 1;

        nextButton.innerHTML = isLast
          ? `
            Continuă la rezultate
            <span aria-hidden="true">↓</span>
          `
          : `
            Mergi mai departe
            <span aria-hidden="true">→</span>
          `;
      }

      const indicator =
        this.container.querySelector(
          "[data-step-indicator]"
        );

      if (indicator && this.data.pasi.length) {
        indicator.textContent =
          `Pasul ${
            this.state.currentStep + 1
          } din ${this.data.pasi.length}`;
      }

      this.restoreFormValues();
      this.updateTimerDisplay();
      this.updateProgress();
      this.updateConclusionCount();

      if (save) {
        this.save();
      }

      if (announce && this.data.pasi.length) {
        const step =
          this.data.pasi[
            this.state.currentStep
          ];

        this.announce(
          `Pasul ${
            this.state.currentStep + 1
          } din ${
            this.data.pasi.length
          }: ${step.titlu}`
        );

        const activeStep =
          this.container.querySelector(
            `[data-step-index="${this.state.currentStep}"]`
          );

        activeStep
          ?.querySelector("h3")
          ?.focus?.({
            preventScroll: true
          });
      }

      this.typesetMath();

      emit(
        "fizica:lab-step-change",
        this.getPublicState(),
        this.container
      );

      emit(
        "fizica:content-updated",
        {
          root: this.container,
          source: MODULE_NAME
        }
      );
    }

    /**
     * Restabilește valorile câmpurilor după randare.
     */
    restoreFormValues() {
      const hypothesis =
        this.container.querySelector(
          '[data-lab-field="hypothesis"]'
        );

      const conclusion =
        this.container.querySelector(
          '[data-lab-field="conclusion"]'
        );

      const notes =
        this.container.querySelector(
          '[data-lab-field="notes"]'
        );

      if (hypothesis) {
        hypothesis.value =
          this.state.hypothesis || "";
      }

      if (conclusion) {
        conclusion.value =
          this.state.conclusion || "";
      }

      if (notes) {
        notes.value =
          this.state.notes || "";
      }

      const checkboxes =
        this.container.querySelectorAll(
          "[data-lab-checklist]"
        );

      checkboxes.forEach((checkbox) => {
        const type =
          checkbox.dataset.labChecklist;
        const stepId =
          checkbox.dataset.stepId ||
          "general";
        const checkId =
          checkbox.dataset.checkId;

        const key =
          `${type}:${stepId}:${checkId}`;

        checkbox.checked = Boolean(
          this.state.checklist[key]
        );
      });

      for (
        const [checkId, answer]
        of Object.entries(
          this.state.quickChecks
        )
      ) {
        this.restoreQuickCheck(
          checkId,
          answer
        );
      }
    }

    /**
     * Actualizează un rând de măsurători.
     *
     * @param {string} rowId
     * @param {string} key
     * @param {string} value
     */
    updateMeasurement(
      rowId,
      key,
      value
    ) {
      const row =
        this.state.measurements.find(
          (item) => item.id === rowId
        );

      if (!row) {
        return;
      }

      row[key] = value;
      this.calculateRow(row);
      this.updateCalculatedRow(row);
      this.touch();
      this.save();

      emit(
        "fizica:lab-measurement-change",
        {
          labId: this.data.id,
          row: cloneSerializable(row),
          measurements:
            cloneSerializable(
              this.state.measurements
            )
        },
        this.container
      );
    }

    /**
     * Recalculează toate rândurile.
     */
    recalculateMeasurements() {
      if (!this.data.masuratori) {
        return;
      }

      for (
        const row
        of this.state.measurements
      ) {
        this.calculateRow(row);
      }

      this.renderMeasurementBody();
    }

    /**
     * Calculează coloanele derivate ale unui rând.
     *
     * Sunt acceptate operațiile:
     * add, subtract, multiply, divide, average, square,
     * square-root, percent, custom.
     *
     * Pentru custom se poate furniza o funcție:
     * calcul: { operatie: "custom", compute(row, helpers) {} }
     *
     * @param {object} row
     */
    calculateRow(row) {
      const measurements =
        this.data.masuratori;

      if (!measurements) {
        return;
      }

      for (
        const column
        of measurements.coloane
      ) {
        if (!column.calcul) {
          continue;
        }

        const result =
          calculateDerivedValue(
            row,
            column.calcul
          );

        row[column.cheie] =
          Number.isFinite(result)
            ? formatNumber(
                result,
                column.zecimale
              )
            : "";
      }
    }

    /**
     * Actualizează outputurile calculate ale unui rând.
     *
     * @param {object} row
     */
    updateCalculatedRow(row) {
      const rowElement =
        this.container.querySelector(
          `[data-row-id="${cssEscape(
            row.id
          )}"]`
        );

      if (!rowElement) {
        return;
      }

      rowElement
        .querySelectorAll(
          "[data-measurement-output]"
        )
        .forEach((output) => {
          const key =
            output.dataset.measurementOutput;

          output.textContent =
            row[key] ?? "";
        });
    }

    /**
     * Adaugă un rând de măsurare.
     *
     * @returns {boolean}
     */
    addMeasurementRow() {
      const measurements =
        this.data.masuratori;

      if (!measurements) {
        return false;
      }

      if (
        this.state.measurements.length >=
        measurements.randuriMaxime
      ) {
        this.showMeasurementMessage(
          `Poți introduce cel mult ${measurements.randuriMaxime} măsurători.`,
          "warning"
        );
        return false;
      }

      this.state.measurements.push(
        createEmptyMeasurementRow(
          measurements
        )
      );

      this.renderMeasurementBody();
      this.touch();
      this.save();

      const inputs =
        this.container.querySelectorAll(
          "[data-measurement-key]"
        );

      inputs[inputs.length - 1]?.focus();

      this.showMeasurementMessage(
        "A fost adăugat un rând nou.",
        "success"
      );

      return true;
    }

    /**
     * Șterge un rând de măsurare.
     *
     * @param {string} rowId
     * @returns {boolean}
     */
    removeMeasurementRow(rowId) {
      const measurements =
        this.data.masuratori;

      if (!measurements) {
        return false;
      }

      if (
        this.state.measurements.length <=
        measurements.randuriMinime
      ) {
        this.showMeasurementMessage(
          `Trebuie păstrate cel puțin ${measurements.randuriMinime} măsurători.`,
          "warning"
        );
        return false;
      }

      const before =
        this.state.measurements.length;

      this.state.measurements =
        this.state.measurements.filter(
          (row) => row.id !== rowId
        );

      if (
        this.state.measurements.length ===
        before
      ) {
        return false;
      }

      this.renderMeasurementBody();
      this.touch();
      this.save();

      this.showMeasurementMessage(
        "Măsurătoarea a fost ștearsă.",
        "success"
      );

      return true;
    }

    /**
     * Reafișează corpul tabelului.
     */
    renderMeasurementBody() {
      const body =
        this.container.querySelector(
          "[data-measurement-body]"
        );

      if (
        !body ||
        !this.data.masuratori
      ) {
        return;
      }

      body.innerHTML =
        this.state.measurements
          .map((row, index) =>
            this.renderMeasurementRow(
              row,
              index
            )
          )
          .join("");
    }

    /**
     * Mesaj pentru tabel.
     *
     * @param {string} message
     * @param {"success" | "warning" | "error"} type
     */
    showMeasurementMessage(
      message,
      type = "success"
    ) {
      const element =
        this.container.querySelector(
          "[data-measurement-message]"
        );

      if (!element) {
        return;
      }

      element.textContent = message;
      element.dataset.type = type;
    }

    /**
     * Pornește cronometrul pasului curent.
     */
    startTimerForCurrentStep() {
      const step =
        this.data.pasi[
          this.state.currentStep
        ];

      const seconds = Number(
        step?.cronometruSecunde
      );

      if (!step || !(seconds > 0)) {
        return;
      }

      if (
        this.state.timer.stepId !==
        step.id
      ) {
        this.state.timer = {
          stepId: step.id,
          initialSeconds: seconds,
          remainingSeconds: seconds,
          running: false
        };
      }

      if (
        this.state.timer.remainingSeconds <=
        0
      ) {
        this.state.timer.remainingSeconds =
          seconds;
      }

      if (this.state.timer.running) {
        return;
      }

      this.state.timer.running = true;
      this.updateTimerDisplay();

      this.timerInterval =
        window.setInterval(() => {
          this.state.timer.remainingSeconds =
            Math.max(
              0,
              this.state.timer
                .remainingSeconds - 1
            );

          this.updateTimerDisplay();

          if (
            this.state.timer
              .remainingSeconds <= 0
          ) {
            this.stopTimer();
            this.announce(
              "Timpul s-a încheiat."
            );

            emit(
              "fizica:lab-timer-complete",
              {
                labId: this.data.id,
                stepId: step.id
              },
              this.container
            );
          }
        }, 1000);

      emit(
        "fizica:lab-timer-start",
        {
          labId: this.data.id,
          stepId: step.id,
          seconds:
            this.state.timer
              .remainingSeconds
        },
        this.container
      );
    }

    /**
     * Pune cronometrul pe pauză.
     */
    pauseTimer() {
      if (!this.state.timer.running) {
        return;
      }

      this.stopTimer();
      this.save();

      emit(
        "fizica:lab-timer-pause",
        {
          labId: this.data.id,
          stepId:
            this.state.timer.stepId,
          seconds:
            this.state.timer
              .remainingSeconds
        },
        this.container
      );
    }

    /**
     * Oprește intervalul.
     */
    stopTimer() {
      if (this.timerInterval) {
        window.clearInterval(
          this.timerInterval
        );
        this.timerInterval = null;
      }

      this.state.timer.running = false;
      this.updateTimerDisplay();
    }

    /**
     * Resetează cronometrul pasului curent.
     */
    resetTimerForCurrentStep() {
      const step =
        this.data.pasi[
          this.state.currentStep
        ];

      const seconds = Number(
        step?.cronometruSecunde
      );

      if (!step || !(seconds > 0)) {
        return;
      }

      this.stopTimer();

      this.state.timer = {
        stepId: step.id,
        initialSeconds: seconds,
        remainingSeconds: seconds,
        running: false
      };

      this.touch();
      this.updateTimerDisplay();
      this.save();
    }

    /**
     * Actualizează afișajul cronometrului.
     */
    updateTimerDisplay() {
      const step =
        this.data.pasi[
          this.state.currentStep
        ];

      if (!step) {
        return;
      }

      const timerElement =
        this.container.querySelector(
          `[data-timer-for="${cssEscape(
            step.id
          )}"]`
        );

      if (!timerElement) {
        return;
      }

      const configuredSeconds = Number(
        timerElement.dataset.timerSeconds
      );

      if (
        this.state.timer.stepId !==
        step.id
      ) {
        this.state.timer = {
          stepId: step.id,
          initialSeconds:
            configuredSeconds,
          remainingSeconds:
            configuredSeconds,
          running: false
        };
      }

      const output =
        timerElement.querySelector(
          "[data-timer-display]"
        );

      if (output) {
        output.textContent = formatTime(
          this.state.timer
            .remainingSeconds
        );

        output.classList.toggle(
          "is-warning",
          this.state.timer
            .remainingSeconds > 0 &&
          this.state.timer
            .remainingSeconds <=
            this.config
              .timerWarningSeconds
        );

        output.classList.toggle(
          "is-complete",
          this.state.timer
            .remainingSeconds === 0
        );
      }

      const startButton =
        timerElement.querySelector(
          "[data-action='timer-start']"
        );

      const pauseButton =
        timerElement.querySelector(
          "[data-action='timer-pause']"
        );

      if (startButton) {
        startButton.disabled =
          this.state.timer.running;
        startButton.textContent =
          this.state.timer
            .remainingSeconds <
          configuredSeconds
            ? "Continuă"
            : "Pornește";
      }

      if (pauseButton) {
        pauseButton.disabled =
          !this.state.timer.running;
      }
    }

    /**
     * Verifică răspunsul la o întrebare.
     *
     * @param {string} checkId
     * @returns {boolean}
     */
    checkAnswer(checkId) {
      const check =
        this.data.verificari.find(
          (item) => item.id === checkId
        );

      const card =
        this.container.querySelector(
          `[data-quick-check="${cssEscape(
            checkId
          )}"]`
        );

      if (!check || !card) {
        return false;
      }

      const inputs = Array.from(
        card.querySelectorAll(
          `[data-quick-check-input="${cssEscape(
            checkId
          )}"]`
        )
      );

      let answer = "";

      if (
        check.tip === "single-choice" ||
        check.tip === "choice" ||
        check.tip === "true-false"
      ) {
        answer =
          inputs.find(
            (input) => input.checked
          )?.value ?? "";
      } else {
        answer = inputs[0]?.value ?? "";
      }

      if (answer === "") {
        this.showFeedback(
          check,
          false,
          "Selectează sau scrie un răspuns."
        );
        return false;
      }

      const correct =
        evaluateAnswer(check, answer);

      const previous =
        this.state.quickChecks[checkId];

      this.state.quickChecks[checkId] = {
        answer,
        correct,
        checkedAt: nowIso(),
        attempts:
          Number(previous?.attempts || 0) +
          1
      };

      this.touch();
      this.save();

      this.showFeedback(
        check,
        correct
      );

      emit(
        "fizica:lab-answer-checked",
        {
          labId: this.data.id,
          checkId,
          correct,
          answer,
          attempts:
            this.state.quickChecks[
              checkId
            ].attempts
        },
        this.container
      );

      return correct;
    }

    /**
     * Afișează feedbackul.
     *
     * @param {object} check
     * @param {boolean} correct
     * @param {string} customMessage
     */
    showFeedback(
      check,
      correct,
      customMessage = ""
    ) {
      const feedback =
        this.container.querySelector(
          `[data-feedback-for="${cssEscape(
            check.id
          )}"]`
        );

      if (!feedback) {
        return;
      }

      feedback.className =
        "fg-lab__feedback " +
        (correct
          ? "is-correct"
          : "is-incorrect");

      const heading = customMessage
        ? customMessage
        : correct
          ? "✓ Corect."
          : "✗ Răspunsul nu este corect.";

      feedback.innerHTML = `
        <strong>${escapeHtml(
          heading
        )}</strong>
        ${
          check.explicatie
            ? `
              <p>
                ${escapeHtml(
                  check.explicatie
                )}
              </p>
            `
            : ""
        }
      `;

      feedback.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }

    /**
     * Restabilește răspunsul și feedbackul.
     *
     * @param {string} checkId
     * @param {object} saved
     */
    restoreQuickCheck(
      checkId,
      saved
    ) {
      if (!saved) {
        return;
      }

      const check =
        this.data.verificari.find(
          (item) => item.id === checkId
        );

      const card =
        this.container.querySelector(
          `[data-quick-check="${cssEscape(
            checkId
          )}"]`
        );

      if (!check || !card) {
        return;
      }

      const inputs =
        card.querySelectorAll(
          `[data-quick-check-input="${cssEscape(
            checkId
          )}"]`
        );

      if (
        check.tip === "single-choice" ||
        check.tip === "choice" ||
        check.tip === "true-false"
      ) {
        inputs.forEach((input) => {
          input.checked =
            input.value ===
            String(saved.answer);
        });
      } else if (inputs[0]) {
        inputs[0].value =
          saved.answer ?? "";
      }

      this.showFeedback(
        check,
        Boolean(saved.correct)
      );
    }

    /**
     * Validează activitatea înainte de finalizare.
     *
     * @returns {{valid: boolean, errors: string[]}}
     */
    validateCompletion() {
      const errors = [];

      if (
        this.config
          .requireStepCompletion
      ) {
        for (
          const step
          of this.data.pasi
        ) {
          if (
            step.verificari.length &&
            !this.state.completedSteps[
              step.id
            ]
          ) {
            errors.push(
              `Pasul „${step.titlu}” nu este confirmat complet.`
            );
          }
        }
      }

      if (
        this.config.requireMeasurements &&
        !this.hasRequiredMeasurements()
      ) {
        errors.push(
          "Completează măsurătorile obligatorii."
        );
      }

      if (
        this.config.requireQuickChecks
      ) {
        const incomplete =
          this.data.verificari.filter(
            (check) =>
              check.obligatoriu &&
              !this.state.quickChecks[
                check.id
              ]?.correct
          );

        if (incomplete.length) {
          errors.push(
            "Rezolvă corect verificările rapide obligatorii."
          );
        }
      }

      if (
        this.config.requireConclusion &&
        this.state.conclusion.trim()
          .length <
          this.config
            .minimumConclusionLength
      ) {
        errors.push(
          `Concluzia trebuie să conțină cel puțin ${this.config.minimumConclusionLength} caractere.`
        );
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }

    /**
     * Verifică măsurătorile obligatorii.
     *
     * @returns {boolean}
     */
    hasRequiredMeasurements() {
      const measurements =
        this.data.masuratori;

      if (!measurements) {
        return true;
      }

      const requiredColumns =
        measurements.coloane.filter(
          (column) =>
            column.obligatoriu &&
            !column.doarCitire
        );

      if (!requiredColumns.length) {
        return (
          this.state.measurements.length >=
          measurements.randuriMinime
        );
      }

      const completedRows =
        this.state.measurements.filter(
          (row) =>
            requiredColumns.every(
              (column) =>
                String(
                  row[column.cheie] ?? ""
                ).trim() !== ""
            )
        );

      return (
        completedRows.length >=
        measurements.randuriMinime
      );
    }

    /**
     * Finalizează activitatea.
     *
     * @returns {boolean}
     */
    complete() {
      const validation =
        this.validateCompletion();

      const message =
        this.container.querySelector(
          "[data-completion-message]"
        );

      if (!validation.valid) {
        if (message) {
          message.className =
            "fg-lab__completion-message is-error";

          message.innerHTML = `
            <strong>
              Activitatea nu poate fi finalizată încă.
            </strong>
            <ul>
              ${validation.errors
                .map(
                  (error) => `
                    <li>
                      ${escapeHtml(error)}
                    </li>
                  `
                )
                .join("")}
            </ul>
          `;
        }

        this.announce(
          validation.errors.join(" ")
        );

        return false;
      }

      this.state.completed = true;
      this.state.completedAt = nowIso();
      this.touch();
      this.save();

      if (message) {
        message.className =
          "fg-lab__completion-message is-success";

        message.innerHTML = `
          <strong>
            ✓ Activitate finalizată.
          </strong>
          <p>
            Măsurătorile și concluzia au fost salvate local pe acest dispozitiv.
          </p>
        `;
      }

      this.updateProgress();
      this.announce(
        "Activitatea a fost finalizată."
      );

      const result =
        this.getResult();

      emit(
        "fizica:lab-complete",
        result,
        this.container
      );

      if (
        this.data.linkuri
          ?.urmatoareaActivitate
      ) {
        const nextLink =
          document.createElement("a");

        nextLink.className =
          "fg-lab__button fg-lab__button--primary fg-lab__next-activity";
        nextLink.href =
          this.data.linkuri
            .urmatoareaActivitate;
        nextLink.textContent =
          "Activitatea următoare →";

        message?.appendChild(nextLink);
      }

      return true;
    }

    /**
     * Returnează rezultatul activității.
     *
     * @returns {object}
     */
    getResult() {
      const correctChecks =
        Object.values(
          this.state.quickChecks
        ).filter(
          (item) => item.correct
        ).length;

      return {
        labId: this.data.id,
        titlu: this.data.titlu,
        completed:
          this.state.completed,
        completedAt:
          this.state.completedAt,
        startedAt:
          this.state.startedAt,
        updatedAt:
          this.state.updatedAt,
        progress:
          this.calculateProgress(),
        hypothesis:
          this.state.hypothesis,
        measurements:
          cloneSerializable(
            this.state.measurements
          ),
        quickChecks: {
          correct: correctChecks,
          total:
            this.data.verificari.length,
          answers:
            cloneSerializable(
              this.state.quickChecks
            )
        },
        conclusion:
          this.state.conclusion,
        notes:
          this.state.notes
      };
    }

    /**
     * Resetează activitatea.
     *
     * @param {object} options
     */
    reset(options = {}) {
      const shouldConfirm =
        options.confirm !== false;

      if (
        shouldConfirm &&
        !window.confirm(
          "Sigur dorești să reiei activitatea? Progresul local va fi șters."
        )
      ) {
        return;
      }

      this.stopTimer();
      localStorage.removeItem(
        this.storageKey
      );

      this.state =
        createInitialState(this.data);

      this.render();
      this.recalculateMeasurements();
      this.updateView({
        announce: false,
        save: true
      });

      this.announce(
        "Activitatea a fost resetată."
      );

      emit(
        "fizica:lab-reset",
        {
          labId: this.data.id
        },
        this.container
      );
    }

    /**
     * Salvează progresul local.
     *
     * @param {object} options
     * @returns {boolean}
     */
    save({ silent = false } = {}) {
      if (!this.config.saveProgress) {
        return false;
      }

      try {
        this.state.updatedAt = nowIso();

        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.state)
        );

        if (!silent) {
          this.showSaveStatus(
            "Salvat local",
            "success"
          );
        }

        emit(
          "fizica:lab-progress-saved",
          this.getPublicState(),
          this.container
        );

        return true;
      } catch (error) {
        console.warn(
          `[${APP_NAME}] Progresul laboratorului nu a putut fi salvat.`,
          error
        );

        if (!silent) {
          this.showSaveStatus(
            "Salvarea locală nu este disponibilă",
            "error"
          );
        }

        return false;
      }
    }

    /**
     * Restabilește progresul.
     *
     * @returns {boolean}
     */
    restore() {
      try {
        const saved = safeJsonParse(
          localStorage.getItem(
            this.storageKey
          )
        );

        this.state =
          mergeSavedState(
            saved,
            createInitialState(this.data),
            this.data
          );

        const hashMatch =
          window.location.hash.match(
            /^#pas-(\d+)$/
          );

        if (
          this.config.updateHash &&
          hashMatch
        ) {
          this.state.currentStep =
            clamp(
              Number(hashMatch[1]) - 1,
              0,
              Math.max(
                this.data.pasi.length - 1,
                0
              )
            );
        }

        return Boolean(saved);
      } catch (error) {
        console.warn(
          `[${APP_NAME}] Progresul laboratorului nu a putut fi citit.`,
          error
        );
        return false;
      }
    }

    /**
     * Starea publică, fără obiecte DOM.
     *
     * @returns {object}
     */
    getPublicState() {
      return {
        labId: this.data.id,
        currentStep:
          this.state.currentStep,
        totalSteps:
          this.data.pasi.length,
        progress:
          this.calculateProgress(),
        completed:
          this.state.completed,
        updatedAt:
          this.state.updatedAt
      };
    }

    /**
     * Marchează modificarea stării.
     */
    touch() {
      this.state.updatedAt = nowIso();
    }

    /**
     * Calculează progresul.
     *
     * @returns {number}
     */
    calculateProgress() {
      if (this.state.completed) {
        return 100;
      }

      const parts = [];

      if (this.data.pasi.length) {
        const stepProgress =
          ((this.state.currentStep + 1) /
            this.data.pasi.length) *
          55;

        parts.push(stepProgress);
      }

      if (this.data.masuratori) {
        parts.push(
          this.hasRequiredMeasurements()
            ? 15
            : 0
        );
      }

      if (this.data.verificari.length) {
        const correct =
          Object.values(
            this.state.quickChecks
          ).filter(
            (item) => item.correct
          ).length;

        parts.push(
          (correct /
            this.data.verificari.length) *
            15
        );
      }

      if (
        this.state.conclusion.trim()
          .length >=
        this.config
          .minimumConclusionLength
      ) {
        parts.push(15);
      }

      const raw = parts.reduce(
        (sum, value) => sum + value,
        0
      );

      return clamp(
        Math.round(raw),
        0,
        99
      );
    }

    /**
     * Actualizează bara de progres.
     */
    updateProgress() {
      const progress =
        this.calculateProgress();

      const value =
        this.container.querySelector(
          "[data-progress-value]"
        );
      const bar =
        this.container.querySelector(
          "[data-progress-bar]"
        );
      const fill =
        this.container.querySelector(
          "[data-progress-fill]"
        );

      if (value) {
        value.textContent =
          `${progress}%`;
      }

      if (bar) {
        bar.setAttribute(
          "aria-valuenow",
          String(progress)
        );
      }

      if (fill) {
        fill.style.width =
          `${progress}%`;
      }
    }

    /**
     * Actualizează numărul caracterelor concluziei.
     */
    updateConclusionCount() {
      const count =
        this.container.querySelector(
          "[data-conclusion-count]"
        );

      if (!count) {
        return;
      }

      const length =
        this.state.conclusion.length;

      count.textContent =
        `${length} ${
          length === 1
            ? "caracter"
            : "caractere"
        }`;

      count.classList.toggle(
        "is-valid",
        length >=
          this.config
            .minimumConclusionLength
      );
    }

    /**
     * Starea salvării.
     *
     * @param {string} message
     * @param {"success" | "error"} type
     */
    showSaveStatus(
      message,
      type = "success"
    ) {
      const element =
        this.container.querySelector(
          "[data-save-status]"
        );

      if (!element) {
        return;
      }

      element.textContent = message;
      element.dataset.type = type;

      window.clearTimeout(
        this.saveStatusTimeout
      );

      this.saveStatusTimeout =
        window.setTimeout(() => {
          element.textContent =
            "Progres local";
          element.removeAttribute(
            "data-type"
          );
        }, 1800);
    }

    /**
     * Anunță un mesaj.
     *
     * @param {string} message
     */
    announce(message) {
      const region =
        this.container.querySelector(
          ".fg-lab__live-region"
        );

      if (!region) {
        return;
      }

      region.textContent = "";

      window.requestAnimationFrame(
        () => {
          region.textContent = message;
        }
      );
    }

    /**
     * Derulează la prima secțiune găsită.
     *
     * @param {string} selector
     */
    scrollToSection(selector) {
      this.container
        .querySelector(selector)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }

    /**
     * Actualizează MathJax.
     *
     * @returns {Promise<void>}
     */
    async typesetMath() {
      if (
        !this.config.autoTypesetMath
      ) {
        return;
      }

      try {
        const utility =
          app.utils?.afiseazaMathJax ||
          app.app?.typesetMath;

        if (
          typeof utility === "function"
        ) {
          await utility(this.container);
          return;
        }

        if (
          window.MathJax?.typesetPromise
        ) {
          if (
            typeof window.MathJax
              .typesetClear === "function"
          ) {
            window.MathJax.typesetClear([
              this.container
            ]);
          }

          await window.MathJax.typesetPromise([
            this.container
          ]);
        }
      } catch (error) {
        console.warn(
          `[${APP_NAME}] MathJax nu a putut actualiza laboratorul.`,
          error
        );
      }
    }
  }

  /**
   * Evaluează un răspuns.
   *
   * @param {object} check
   * @param {unknown} answer
   * @returns {boolean}
   */
  function evaluateAnswer(
    check,
    answer
  ) {
    if (
      check.tip === "single-choice" ||
      check.tip === "choice"
    ) {
      return (
        Number(answer) ===
        Number(check.corect)
      );
    }

    if (check.tip === "true-false") {
      return (
        String(answer) ===
        String(check.corect)
      );
    }

    if (check.tip === "numeric") {
      const value =
        normalizeNumber(answer);
      const expected =
        normalizeNumber(check.corect);

      return (
        Number.isFinite(value) &&
        Number.isFinite(expected) &&
        Math.abs(value - expected) <=
          Number(check.toleranta || 0.01)
      );
    }

    const accepted =
      check.raspunsuriAcceptate.length
        ? check.raspunsuriAcceptate
        : [check.corect];

    const normalized =
      normalizeText(answer);

    return accepted.some(
      (value) =>
        normalizeText(value) ===
        normalized
    );
  }

  /**
   * Calculează o coloană derivată.
   *
   * @param {object} row
   * @param {object | Function} calculation
   * @returns {number}
   */
  function calculateDerivedValue(
    row,
    calculation
  ) {
    if (
      typeof calculation === "function"
    ) {
      const result = calculation(
        row,
        {
          normalizeNumber,
          clamp
        }
      );

      return Number(result);
    }

    if (
      !calculation ||
      typeof calculation !== "object"
    ) {
      return Number.NaN;
    }

    const operation =
      calculation.operatie ||
      calculation.operation ||
      "custom";

    const operands = toArray(
      calculation.operanzi ||
      calculation.operands ||
      calculation.campuri ||
      calculation.fields ||
      []
    ).map((key) =>
      normalizeNumber(row[key])
    );

    if (
      typeof calculation.compute ===
      "function"
    ) {
      return Number(
        calculation.compute(
          row,
          {
            normalizeNumber,
            operands,
            clamp
          }
        )
      );
    }

    if (
      operands.some(
        (value) =>
          !Number.isFinite(value)
      )
    ) {
      return Number.NaN;
    }

    switch (operation) {
      case "add":
      case "suma":
        return operands.reduce(
          (sum, value) => sum + value,
          0
        );

      case "subtract":
      case "diferenta":
        return (
          operands[0] - operands[1]
        );

      case "multiply":
      case "produs":
        return operands.reduce(
          (product, value) =>
            product * value,
          1
        );

      case "divide":
      case "raport":
        return operands[1] === 0
          ? Number.NaN
          : operands[0] / operands[1];

      case "average":
      case "medie":
        return (
          operands.reduce(
            (sum, value) => sum + value,
            0
          ) / operands.length
        );

      case "square":
      case "patrat":
        return operands[0] ** 2;

      case "square-root":
      case "radical":
        return operands[0] < 0
          ? Number.NaN
          : Math.sqrt(operands[0]);

      case "percent":
      case "procent":
        return operands[1] === 0
          ? Number.NaN
          : (operands[0] /
              operands[1]) *
              100;

      default:
        return Number.NaN;
    }
  }

  /**
   * Formatează un număr în stil românesc.
   *
   * @param {number} value
   * @param {number} decimals
   * @returns {string}
   */
  function formatNumber(
    value,
    decimals = 2
  ) {
    if (!Number.isFinite(value)) {
      return "";
    }

    const safeDecimals = clamp(
      Number(decimals) || 0,
      0,
      10
    );

    return new Intl.NumberFormat(
      "ro-RO",
      {
        maximumFractionDigits:
          safeDecimals,
        minimumFractionDigits: 0
      }
    ).format(value);
  }

  /**
   * Formatează secunde ca mm:ss.
   *
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const safe = Math.max(
      0,
      Number(seconds) || 0
    );

    const minutes = Math.floor(
      safe / 60
    );
    const remaining =
      Math.floor(safe % 60);

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remaining).padStart(2, "0")
    );
  }

  /**
   * Escape pentru selector CSS.
   *
   * @param {string} value
   * @returns {string}
   */
  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(
        String(value)
      );
    }

    return String(value).replace(
      /["\\]/g,
      "\\$&"
    );
  }

  /**
   * Stiluri minime injectate o singură dată.
   *
   * Pot fi mutate ulterior într-un fișier CSS dedicat.
   */
  function injectStyles() {
    if (
      document.getElementById(
        "fg-lab-engine-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "fg-lab-engine-styles";

    style.textContent = `
      .fg-lab {
        --lab-bg: var(--page-bg, #f8fafc);
        --lab-surface: var(--surface, #ffffff);
        --lab-surface-soft: var(--surface-soft, #f1f5f9);
        --lab-text: var(--text, #172033);
        --lab-muted: var(--muted-text, #475569);
        --lab-border: var(--border, #cbd5e1);
        --lab-primary: var(--primary, #0369a1);
        --lab-primary-text: #ffffff;
        --lab-success: #166534;
        --lab-success-bg: #dcfce7;
        --lab-warning: #854d0e;
        --lab-warning-bg: #fef9c3;
        --lab-danger: #991b1b;
        --lab-danger-bg: #fee2e2;
        color: var(--lab-text);
        font: inherit;
        line-height: 1.6;
      }

      body.dark .fg-lab,
      [data-theme="dark"] .fg-lab {
        --lab-surface: #1e293b;
        --lab-surface-soft: #0f172a;
        --lab-text: #f8fafc;
        --lab-muted: #cbd5e1;
        --lab-border: #475569;
        --lab-primary: #38bdf8;
        --lab-primary-text: #082f49;
        --lab-success: #bbf7d0;
        --lab-success-bg: #14532d;
        --lab-warning: #fef08a;
        --lab-warning-bg: #713f12;
        --lab-danger: #fecaca;
        --lab-danger-bg: #7f1d1d;
      }

      .fg-lab *,
      .fg-lab *::before,
      .fg-lab *::after {
        box-sizing: border-box;
      }

      .fg-lab__shell {
        width: min(100%, 980px);
        margin-inline: auto;
        padding: clamp(12px, 3vw, 28px);
      }

      .fg-lab__header,
      .fg-lab__card,
      .fg-lab__procedure,
      .fg-lab__measurements,
      .fg-lab__quick-checks,
      .fg-lab__conclusion,
      .fg-lab__final-actions {
        background: var(--lab-surface);
        border: 1px solid var(--lab-border);
        border-radius: 18px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        margin-block: 18px;
        padding: clamp(18px, 4vw, 32px);
      }

      .fg-lab__header {
        border-top: 5px solid var(--lab-primary);
      }

      .fg-lab__eyebrow {
        color: var(--lab-primary);
        font-size: 0.86rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 0 0 4px;
        text-transform: uppercase;
      }

      .fg-lab__title {
        font-size: clamp(1.65rem, 4vw, 2.6rem);
        line-height: 1.18;
        margin: 0;
      }

      .fg-lab__subtitle {
        color: var(--lab-muted);
        font-size: 1.05rem;
        margin: 10px 0 0;
      }

      .fg-lab__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }

      .fg-lab__meta span,
      .fg-lab__step-badge,
      .fg-lab__save-status {
        background: var(--lab-surface-soft);
        border: 1px solid var(--lab-border);
        border-radius: 999px;
        color: var(--lab-muted);
        font-size: 0.88rem;
        font-weight: 700;
        padding: 6px 11px;
      }

      .fg-lab__progress {
        margin-top: 24px;
      }

      .fg-lab__progress-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 7px;
      }

      .fg-lab__progress-track {
        background: var(--lab-surface-soft);
        border-radius: 999px;
        height: 12px;
        overflow: hidden;
      }

      .fg-lab__progress-fill {
        background: var(--lab-primary);
        display: block;
        height: 100%;
        transition: width 220ms ease;
        width: 0;
      }

      .fg-lab__overview {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .fg-lab__overview .fg-lab__card {
        margin: 0;
      }

      .fg-lab__card-title,
      .fg-lab__section-heading h2,
      .fg-lab__step h3,
      .fg-lab__quick-check h3 {
        line-height: 1.25;
        margin-top: 0;
      }

      .fg-lab__card-title {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .fg-lab__card--safety {
        border-left: 5px solid #eab308;
      }

      .fg-lab__list,
      .fg-lab__instruction-list {
        padding-left: 1.35rem;
      }

      .fg-lab__list li,
      .fg-lab__instruction-list li {
        margin-block: 8px;
      }

      .fg-lab__checklist,
      .fg-lab__step-checklist {
        display: grid;
        gap: 9px;
      }

      .fg-lab__check-item,
      .fg-lab__option {
        align-items: flex-start;
        background: var(--lab-surface-soft);
        border: 1px solid var(--lab-border);
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        gap: 12px;
        min-height: 48px;
        padding: 12px 14px;
      }

      .fg-lab__check-item:hover,
      .fg-lab__option:hover {
        border-color: var(--lab-primary);
      }

      .fg-lab__check-item input,
      .fg-lab__option input {
        flex: 0 0 auto;
        height: 20px;
        margin-top: 2px;
        width: 20px;
      }

      .fg-lab__formula-list {
        display: grid;
        gap: 12px;
      }

      .fg-lab__formula {
        background: var(--lab-surface-soft);
        border-radius: 12px;
        overflow-x: auto;
        padding: 14px;
        text-align: center;
      }

      .fg-lab__section-heading {
        align-items: flex-start;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .fg-lab__section-heading h2 {
        margin-bottom: 0;
      }

      .fg-lab__step-list {
        display: flex;
        gap: 10px;
        list-style: none;
        margin: 0 0 22px;
        overflow-x: auto;
        padding: 4px 2px 12px;
        scroll-snap-type: x proximity;
      }

      .fg-lab__step-list li {
        flex: 0 0 auto;
        scroll-snap-align: start;
      }

      .fg-lab__step-chip {
        align-items: center;
        background: var(--lab-surface-soft);
        border: 2px solid transparent;
        border-radius: 14px;
        color: var(--lab-text);
        cursor: pointer;
        display: flex;
        gap: 9px;
        min-height: 48px;
        padding: 8px 12px;
      }

      .fg-lab__step-chip.is-active {
        border-color: var(--lab-primary);
      }

      .fg-lab__step-chip.is-complete .fg-lab__step-number {
        background: var(--lab-success);
      }

      .fg-lab__step-number {
        background: var(--lab-primary);
        border-radius: 50%;
        color: var(--lab-primary-text);
        display: grid;
        font-weight: 800;
        height: 30px;
        place-items: center;
        width: 30px;
      }

      .fg-lab__step {
        outline: none;
      }

      .fg-lab__step-header {
        border-bottom: 1px solid var(--lab-border);
        margin-bottom: 18px;
        padding-bottom: 14px;
      }

      .fg-lab__step-header h3 {
        font-size: clamp(1.3rem, 3vw, 1.75rem);
        margin: 12px 0 0;
      }

      .fg-lab__step-content {
        font-size: 1.05rem;
      }

      .fg-lab__figure {
        margin: 22px auto;
        text-align: center;
      }

      .fg-lab__figure img {
        border-radius: 14px;
        height: auto;
        max-width: 100%;
      }

      .fg-lab__notice,
      .fg-lab__observation {
        border-left: 5px solid var(--lab-primary);
        border-radius: 10px;
        margin-block: 18px;
        padding: 14px 16px;
      }

      .fg-lab__notice--warning {
        background: var(--lab-warning-bg);
        border-color: #eab308;
        color: var(--lab-warning);
      }

      .fg-lab__observation {
        background: var(--lab-surface-soft);
      }

      .fg-lab__timer {
        background: var(--lab-surface-soft);
        border: 1px solid var(--lab-border);
        border-radius: 14px;
        margin-block: 20px;
        padding: 18px;
        text-align: center;
      }

      .fg-lab__timer-display {
        display: block;
        font-size: clamp(2.3rem, 8vw, 4.5rem);
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        line-height: 1;
        margin-block: 14px;
      }

      .fg-lab__timer-display.is-warning {
        color: #ca8a04;
      }

      .fg-lab__timer-display.is-complete {
        color: var(--lab-danger);
      }

      .fg-lab__timer-actions,
      .fg-lab__button-group,
      .fg-lab__navigation {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .fg-lab__navigation {
        align-items: center;
        background: var(--lab-surface);
        border-top: 1px solid var(--lab-border);
        bottom: 0;
        justify-content: space-between;
        margin: 24px -8px -12px;
        padding: 14px 8px 8px;
        position: sticky;
        z-index: 10;
      }

      .fg-lab__button,
      .fg-lab__icon-button {
        align-items: center;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-weight: 800;
        justify-content: center;
        min-height: 48px;
        padding: 10px 16px;
        text-decoration: none;
      }

      .fg-lab__button--primary,
      .fg-lab__button:not(.fg-lab__button--secondary):not(.fg-lab__button--ghost) {
        background: var(--lab-primary);
        color: var(--lab-primary-text);
      }

      .fg-lab__button--secondary {
        background: var(--lab-surface-soft);
        border-color: var(--lab-border);
        color: var(--lab-text);
      }

      .fg-lab__button--ghost {
        background: transparent;
        border-color: var(--lab-border);
        color: var(--lab-text);
      }

      .fg-lab__button--large {
        font-size: 1.05rem;
        min-height: 54px;
      }

      .fg-lab__button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .fg-lab__button:focus-visible,
      .fg-lab__step-chip:focus-visible,
      .fg-lab__icon-button:focus-visible,
      .fg-lab input:focus-visible,
      .fg-lab textarea:focus-visible,
      .fg-lab summary:focus-visible {
        outline: 3px solid var(--lab-primary);
        outline-offset: 3px;
      }

      .fg-lab__page-indicator {
        color: var(--lab-muted);
        font-weight: 800;
        text-align: center;
      }

      .fg-lab__table-wrap {
        overflow-x: auto;
      }

      .fg-lab__table {
        border-collapse: collapse;
        min-width: 640px;
        width: 100%;
      }

      .fg-lab__table th,
      .fg-lab__table td {
        border: 1px solid var(--lab-border);
        padding: 10px;
        text-align: center;
      }

      .fg-lab__table thead {
        background: var(--lab-surface-soft);
      }

      .fg-lab__unit {
        color: var(--lab-muted);
        display: block;
        font-size: 0.82rem;
      }

      .fg-lab__table-input,
      .fg-lab__input,
      .fg-lab__textarea {
        background: var(--lab-surface);
        border: 2px solid var(--lab-border);
        border-radius: 10px;
        color: var(--lab-text);
        font: inherit;
        min-height: 46px;
        padding: 10px 12px;
        width: 100%;
      }

      .fg-lab__textarea {
        line-height: 1.55;
        resize: vertical;
      }

      .fg-lab__calculated {
        font-variant-numeric: tabular-nums;
        font-weight: 800;
      }

      .fg-lab__icon-button {
        background: var(--lab-danger-bg);
        color: var(--lab-danger);
        min-height: 42px;
        min-width: 42px;
        padding: 6px;
      }

      .fg-lab__measurement-message[data-type="success"] {
        color: var(--lab-success);
      }

      .fg-lab__measurement-message[data-type="warning"],
      .fg-lab__measurement-message[data-type="error"] {
        color: var(--lab-danger);
      }

      .fg-lab__quick-check {
        align-items: flex-start;
        border-top: 1px solid var(--lab-border);
        display: grid;
        gap: 14px;
        grid-template-columns: auto 1fr;
        padding-block: 22px;
      }

      .fg-lab__quick-check:first-of-type {
        border-top: 0;
      }

      .fg-lab__question-number {
        background: var(--lab-primary);
        border-radius: 50%;
        color: var(--lab-primary-text);
        display: grid;
        font-weight: 900;
        height: 38px;
        place-items: center;
        width: 38px;
      }

      .fg-lab__question {
        font-size: 1.08rem;
        font-weight: 700;
      }

      .fg-lab__options {
        border: 0;
        display: grid;
        gap: 10px;
        margin: 14px 0;
        padding: 0;
      }

      .fg-lab__answer-row {
        align-items: center;
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
      }

      .fg-lab__answer-unit {
        font-weight: 800;
      }

      .fg-lab__field-label {
        display: block;
        font-weight: 800;
        margin: 12px 0 7px;
      }

      .fg-lab__feedback {
        border-radius: 12px;
        margin-top: 12px;
        padding: 0;
      }

      .fg-lab__feedback.is-correct,
      .fg-lab__feedback.is-incorrect {
        padding: 14px;
      }

      .fg-lab__feedback.is-correct {
        background: var(--lab-success-bg);
        color: var(--lab-success);
      }

      .fg-lab__feedback.is-incorrect {
        background: var(--lab-danger-bg);
        color: var(--lab-danger);
      }

      .fg-lab__character-count {
        color: var(--lab-muted);
        font-size: 0.9rem;
        text-align: right;
      }

      .fg-lab__character-count.is-valid {
        color: var(--lab-success);
      }

      .fg-lab__model-answer {
        background: var(--lab-surface-soft);
        border: 1px solid var(--lab-border);
        border-radius: 12px;
        margin-top: 18px;
        padding: 12px 14px;
      }

      .fg-lab__model-answer summary {
        cursor: pointer;
        font-weight: 800;
      }

      .fg-lab__completion-message {
        border-radius: 12px;
        margin-bottom: 16px;
      }

      .fg-lab__completion-message.is-success,
      .fg-lab__completion-message.is-error {
        padding: 16px;
      }

      .fg-lab__completion-message.is-success {
        background: var(--lab-success-bg);
        color: var(--lab-success);
      }

      .fg-lab__completion-message.is-error {
        background: var(--lab-danger-bg);
        color: var(--lab-danger);
      }

      .fg-lab__next-activity {
        margin-top: 10px;
      }

      .fg-lab__back-link {
        color: var(--lab-primary);
        display: inline-block;
        font-weight: 800;
        margin-top: 18px;
      }

      .fg-lab__save-status[data-type="success"] {
        color: var(--lab-success);
      }

      .fg-lab__save-status[data-type="error"] {
        color: var(--lab-danger);
      }

      .fg-lab__live-region,
      .fg-lab__sr-only {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      @media (max-width: 640px) {
        .fg-lab__shell {
          padding: 10px;
        }

        .fg-lab__header,
        .fg-lab__card,
        .fg-lab__procedure,
        .fg-lab__measurements,
        .fg-lab__quick-checks,
        .fg-lab__conclusion,
        .fg-lab__final-actions {
          border-radius: 14px;
          padding: 18px;
        }

        .fg-lab__step-chip-title {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fg-lab__navigation {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .fg-lab__page-indicator {
          grid-column: 1 / -1;
          grid-row: 1;
        }

        .fg-lab__navigation .fg-lab__button {
          width: 100%;
        }

        .fg-lab__quick-check {
          grid-template-columns: 1fr;
        }

        .fg-lab__question-number {
          height: 34px;
          width: 34px;
        }

        .fg-lab__button-group {
          display: grid;
        }

        .fg-lab__button-group .fg-lab__button {
          width: 100%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .fg-lab *,
        .fg-lab *::before,
        .fg-lab *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }

      @media print {
        .fg-lab__navigation,
        .fg-lab__timer-actions,
        .fg-lab__button-group,
        .fg-lab__step-list,
        .fg-lab__icon-button,
        [data-action="add-measurement-row"] {
          display: none !important;
        }

        .fg-lab__step[hidden] {
          display: block !important;
        }

        .fg-lab__header,
        .fg-lab__card,
        .fg-lab__procedure,
        .fg-lab__measurements,
        .fg-lab__quick-checks,
        .fg-lab__conclusion,
        .fg-lab__final-actions {
          box-shadow: none;
          break-inside: avoid;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Îmbunătățește o pagină HTML existentă atunci când
   * nu există LAB_DATA.
   *
   * Sunt recunoscute:
   * - [data-lab-step];
   * - [data-lab-timer];
   * - [data-action="next-step"];
   * - [data-action="previous-step"].
   *
   * @param {Element} container
   * @returns {object}
   */
  function enhanceExistingMarkup(
    container
  ) {
    const steps = Array.from(
      container.querySelectorAll(
        "[data-lab-step]"
      )
    );

    let current = 0;
    let timerInterval = null;

    function show(index) {
      if (!steps.length) {
        return;
      }

      current = clamp(
        index,
        0,
        steps.length - 1
      );

      steps.forEach((step, i) => {
        step.hidden = i !== current;
      });

      const indicator =
        container.querySelector(
          "[data-step-indicator]"
        );

      if (indicator) {
        indicator.textContent =
          `Pasul ${current + 1} din ${
            steps.length
          }`;
      }

      const previous =
        container.querySelector(
          "[data-action='previous-step']"
        );

      if (previous) {
        previous.disabled =
          current === 0;
      }

      emit(
        "fizica:lab-step-change",
        {
          currentStep: current,
          totalSteps: steps.length
        },
        container
      );
    }

    function click(event) {
      const action =
        event.target.closest(
          "[data-action]"
        )?.dataset.action;

      if (action === "next-step") {
        show(current + 1);
      }

      if (action === "previous-step") {
        show(current - 1);
      }

      if (action === "go-step") {
        const target =
          event.target.closest(
            "[data-step]"
          );

        show(
          Number(target?.dataset.step)
        );
      }
    }

    container.addEventListener(
      "click",
      click
    );

    show(0);

    return {
      container,
      nextStep() {
        show(current + 1);
      },
      previousStep() {
        show(current - 1);
      },
      goToStep: show,
      getState() {
        return {
          currentStep: current,
          totalSteps: steps.length
        };
      },
      destroy() {
        container.removeEventListener(
          "click",
          click
        );

        if (timerInterval) {
          clearInterval(timerInterval);
        }
      }
    };
  }

  /**
   * Inițializează un container.
   *
   * @param {string | Element | null} target
   * @param {object} options
   * @returns {Promise<LabEngine | object | null>}
   */
  async function init(
    target = null,
    options = {}
  ) {
    const container =
      resolveElement(target);

    if (!container) {
      return null;
    }

    if (instances.has(container)) {
      activeInstance =
        instances.get(container);
      return activeInstance;
    }

    try {
      const rawData =
        await loadData(
          container,
          options
        );

      if (!rawData) {
        const enhanced =
          enhanceExistingMarkup(
            container
          );

        instances.set(
          container,
          enhanced
        );
        activeInstance = enhanced;

        emit(
          "fizica:lab-ready",
          {
            mode: "enhanced-markup"
          },
          container
        );

        return enhanced;
      }

      const engine =
        new LabEngine(
          container,
          rawData,
          options
        );

      instances.set(
        container,
        engine
      );
      activeInstance = engine;

      return engine.init();
    } catch (error) {
      console.error(
        `[${APP_NAME}] Eroare la inițializarea laboratorului:`,
        error
      );

      container.innerHTML = `
        <section
          class="fg-lab__card"
          role="alert">
          <h2>
            Activitatea nu a putut fi încărcată
          </h2>
          <p>
            ${escapeHtml(
              error?.message ||
              "A apărut o eroare necunoscută."
            )}
          </p>
        </section>
      `;

      emit(
        "fizica:app-error",
        {
          modul: MODULE_NAME,
          eroare: error
        },
        container
      );

      return null;
    }
  }

  /**
   * Inițializează toate containerele de pe pagină.
   *
   * @param {object} options
   * @returns {Promise<Array>}
   */
  async function initAll(
    options = {}
  ) {
    const containers = Array.from(
      document.querySelectorAll(
        DEFAULT_CONTAINER_SELECTORS
      )
    );

    const result = [];

    for (const container of containers) {
      result.push(
        await init(
          container,
          options
        )
      );
    }

    return result.filter(Boolean);
  }

  /**
   * API public.
   */
  const api = {
    init,
    initAll,

    getActiveInstance() {
      return activeInstance;
    },

    getInstance(target = null) {
      const container =
        resolveElement(target);

      return container
        ? instances.get(container) ||
            null
        : activeInstance;
    },

    nextStep() {
      return activeInstance?.nextStep?.();
    },

    previousStep() {
      return activeInstance?.previousStep?.();
    },

    goToStep(index) {
      return activeInstance?.goToStep?.(
        index
      );
    },

    addMeasurementRow() {
      return activeInstance
        ?.addMeasurementRow?.();
    },

    save() {
      return activeInstance?.save?.();
    },

    complete() {
      return activeInstance?.complete?.();
    },

    reset(options) {
      return activeInstance?.reset?.(
        options
      );
    },

    getState() {
      return activeInstance
        ?.getPublicState?.() ||
        activeInstance?.getState?.() ||
        null;
    },

    getResult() {
      return activeInstance
        ?.getResult?.() ||
        null;
    },

    destroy(target = null) {
      const instance =
        this.getInstance(target);

      instance?.destroy?.();

      if (instance === activeInstance) {
        activeInstance = null;
      }
    },

    refresh(target = null) {
      const instance =
        this.getInstance(target);

      instance?.typesetMath?.();
      return instance;
    },

    helpers: {
      normalizeText,
      normalizeNumber,
      formatNumber,
      formatTime,
      calculateDerivedValue
    }
  };

  app.labEngine = api;

  /*
   * Funcție globală de compatibilitate cu app.js.
   */
  window.initLabEngine = function () {
    return api.initAll();
  };
})();
'''

path = Path("/mnt/data/assets/js/lab-engine.js")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(code, encoding="utf-8")

print(f"Creat: {path}")
print(f"Linii: {len(code.splitlines())}")
print(f"Caractere: {len(code)}")
// lab-engine.js
