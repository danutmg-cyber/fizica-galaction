/**
 * lab-engine.js — Fizica Galaction
 * Motor pentru experimente și simulări pe pași.
 *
 * Date:
 * window.LAB_DATA = {
 *   id: "densitate",
 *   titlu: "Determinarea densității",
 *   pasi: [{ titlu: "Măsoară masa", continut: "...", cronometruSecunde: 60 }],
 *   masuratori: {
 *     coloane: [
 *       { cheie: "m", eticheta: "Masă", unitate: "g", obligatoriu: true },
 *       { cheie: "V", eticheta: "Volum", unitate: "cm³", obligatoriu: true },
 *       { cheie: "rho", eticheta: "Densitate", unitate: "g/cm³",
 *         calcul: { operatie: "divide", operanzi: ["m", "V"] }, zecimale: 2 }
 *     ]
 *   }
 * };
 */
(function () {
  "use strict";

  const NS = window.FizicaGalaction = window.FizicaGalaction || {};
  const SELECTOR = "[data-lab-engine],[data-lab-root],#labApp,#lab-app";
  const STORAGE_PREFIX = "fizica-galaction:lab:";
  const instances = new WeakMap();
  let activeInstance = null;

  const DEFAULTS = {
    saveProgress: true,
    restoreProgress: true,
    updateHash: true,
    keyboard: true,
    injectStyles: true,
    requireStepCompletion: false,
    requireMeasurements: false,
    requireQuickChecks: false,
    requireConclusion: false,
    minimumConclusionLength: 20,
    maxMeasurementRows: 20,
    autoTypesetMath: true
  };

  const arr = value => Array.isArray(value) ? value : value == null ? [] : [value];
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const now = () => new Date().toISOString();

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .toLocaleLowerCase("ro-RO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?;:()[\]{}"'`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeNumber(value) {
    const normalized = String(value ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    return normalized ? Number(normalized) : Number.NaN;
  }

  function slug(value, fallback = "laborator") {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
  }

  function safeJson(raw, fallback = null) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (error) {
      console.warn("[Fizica Galaction] Date JSON invalide.", error);
      return fallback;
    }
  }

  function emit(name, detail, container) {
    (container || document).dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
  }

  function formatNumber(value, decimals = 2) {
    if (!Number.isFinite(value)) return "";
    return new Intl.NumberFormat("ro-RO", {
      maximumFractionDigits: clamp(Number(decimals) || 0, 0, 8)
    }).format(value);
  }

  function calculateValue(row, config) {
    if (typeof config === "function") return Number(config(row, { normalizeNumber }));
    if (!config || typeof config !== "object") return Number.NaN;
    if (typeof config.compute === "function") {
      return Number(config.compute(row, { normalizeNumber }));
    }

    const operation = config.operatie || config.operation;
    const keys = arr(config.operanzi || config.operands || config.campuri || config.fields);
    const values = keys.map(key => normalizeNumber(row[key]));
    if (!values.length || values.some(value => !Number.isFinite(value))) return Number.NaN;

    switch (operation) {
      case "add":
      case "suma": return values.reduce((sum, value) => sum + value, 0);
      case "subtract":
      case "diferenta": return values[0] - values[1];
      case "multiply":
      case "produs": return values.reduce((product, value) => product * value, 1);
      case "divide":
      case "raport": return values[1] === 0 ? Number.NaN : values[0] / values[1];
      case "average":
      case "medie": return values.reduce((sum, value) => sum + value, 0) / values.length;
      case "square":
      case "patrat": return values[0] ** 2;
      case "square-root":
      case "radical": return values[0] < 0 ? Number.NaN : Math.sqrt(values[0]);
      case "percent":
      case "procent": return values[1] === 0 ? Number.NaN : values[0] / values[1] * 100;
      default: return Number.NaN;
    }
  }

  async function loadData(container, options = {}) {
    if (options.data) return options.data;
    if (window.LAB_DATA) return window.LAB_DATA;
    if (window.EXPERIMENT_DATA) return window.EXPERIMENT_DATA;

    const inline = safeJson(container.dataset.labData);
    if (inline) return inline;

    const source = options.source || container.dataset.source || container.dataset.labSource;
    if (!source) return null;

    const response = await fetch(source, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Datele laboratorului nu au putut fi încărcate (${response.status}).`);
    return response.json();
  }

  function normalizeStep(step, index) {
    const source = typeof step === "string" ? { continut: step } : step || {};
    return {
      id: slug(source.id || `pas-${index + 1}`, `pas-${index + 1}`),
      titlu: source.titlu || source.title || `Pasul ${index + 1}`,
      continut: source.continut || source.content || source.instructiuni || source.instructions || "",
      continutHtml: source.continutHtml || source.contentHtml || "",
      lista: arr(source.lista || source.list),
      verificari: arr(source.verificari || source.checklist),
      observatie: source.observatie || source.observation || "",
      atentionare: source.atentionare || source.warning || "",
      imagine: source.imagine || source.image || "",
      imagineAlt: source.imagineAlt || source.imageAlt || source.titlu || "",
      cronometruSecunde: source.cronometruSecunde ?? source.timerSeconds ?? null
    };
  }

  function normalizeMeasurements(raw, config) {
    if (!raw) return null;
    const source = Array.isArray(raw) ? { coloane: raw } : raw;
    const columns = arr(source.coloane || source.columns).map((column, index) => {
      const item = typeof column === "string"
        ? { cheie: slug(column, `c${index + 1}`), eticheta: column }
        : column || {};
      const calculation = item.calcul || item.calculation || null;
      return {
        cheie: slug(item.cheie || item.key || `c${index + 1}`, `c${index + 1}`),
        eticheta: item.eticheta || item.label || item.cheie || item.key || `Coloana ${index + 1}`,
        unitate: item.unitate || item.unit || "",
        tip: item.tip || item.type || "number",
        min: item.min ?? null,
        max: item.max ?? null,
        pas: item.pas ?? item.step ?? "any",
        zecimale: item.zecimale ?? item.decimals ?? 2,
        obligatoriu: item.obligatoriu ?? item.required ?? false,
        placeholder: item.placeholder || "",
        calcul: calculation,
        doarCitire: Boolean(item.doarCitire ?? item.readonly ?? calculation)
      };
    });

    return {
      titlu: source.titlu || source.title || "Măsurători și observații",
      descriere: source.descriere || source.description || "",
      coloane: columns,
      randuriInitiale: clamp(Number(source.randuriInitiale ?? source.initialRows ?? 1) || 1, 1, config.maxMeasurementRows),
      randuriMinime: clamp(Number(source.randuriMinime ?? source.minimumRows ?? 1) || 1, 1, config.maxMeasurementRows),
      randuriMaxime: clamp(Number(source.randuriMaxime ?? source.maximumRows ?? config.maxMeasurementRows) || config.maxMeasurementRows, 1, 100),
      permiteAdaugare: source.permiteAdaugare ?? source.allowAddRows ?? true,
      permiteStergere: source.permiteStergere ?? source.allowDeleteRows ?? true
    };
  }

  function normalizeCheck(check, index) {
    const source = typeof check === "string" ? { intrebare: check, tip: "text" } : check || {};
    const options = arr(source.optiuni || source.options);
    return {
      id: slug(source.id || `verificare-${index + 1}`, `verificare-${index + 1}`),
      titlu: source.titlu || source.title || "Verificare rapidă",
      intrebare: source.intrebare || source.question || "",
      tip: source.tip || source.type || (options.length ? "single-choice" : "text"),
      optiuni: options,
      corect: source.corect ?? source.correct ?? null,
      raspunsuriAcceptate: arr(source.raspunsuriAcceptate || source.acceptedAnswers),
      toleranta: source.toleranta ?? source.tolerance ?? 0.01,
      unitate: source.unitate || source.unit || "",
      explicatie: source.explicatie || source.explanation || "",
      obligatoriu: source.obligatoriu ?? source.required ?? true
    };
  }

  function normalizeData(raw, container, options = {}) {
    const config = { ...DEFAULTS, ...(raw.config || {}), ...(options.config || {}) };
    return {
      id: String(raw.id || container.dataset.labId || slug(raw.titlu || raw.title || document.title)),
      titlu: raw.titlu || raw.title || "Activitate de laborator",
      subtitlu: raw.subtitlu || raw.subtitle || "",
      descriere: raw.descriere || raw.description || "",
      clasa: raw.clasa || raw.grade || "",
      capitol: raw.capitol || raw.chapter || "",
      durataMinute: raw.durataMinute ?? raw.durationMinutes ?? null,
      obiective: arr(raw.obiective || raw.objectives),
      materiale: arr(raw.materiale || raw.materials),
      siguranta: arr(raw.siguranta || raw.safety || raw.reguliSiguranta),
      formule: arr(raw.formule || raw.formulas),
      ipoteza: raw.ipoteza || raw.hypothesis || "",
      pasi: arr(raw.pasi || raw.steps || raw.secvente).map(normalizeStep),
      masuratori: normalizeMeasurements(raw.masuratori || raw.measurements, config),
      verificari: arr(raw.verificari || raw.quickChecks).map(normalizeCheck),
      concluzie: raw.concluzie || raw.conclusion || {},
      linkuri: raw.linkuri || raw.links || {},
      config
    };
  }

  function emptyRow(measurements) {
    const row = { id: `rand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` };
    measurements.coloane.forEach(column => { row[column.cheie] = ""; });
    return row;
  }

  function initialState(data) {
    return {
      version: 1,
      labId: data.id,
      currentStep: 0,
      completedSteps: {},
      checklist: {},
      timer: { stepId: null, initialSeconds: 0, remainingSeconds: 0, running: false },
      measurements: data.masuratori
        ? Array.from({ length: data.masuratori.randuriInitiale }, () => emptyRow(data.masuratori))
        : [],
      quickChecks: {},
      hypothesis: "",
      conclusion: "",
      notes: "",
      completed: false,
      startedAt: now(),
      updatedAt: now(),
      completedAt: null
    };
  }

  function evaluate(check, answer) {
    if (check.tip === "single-choice" || check.tip === "choice") {
      return Number(answer) === Number(check.corect);
    }
    if (check.tip === "true-false") return String(answer) === String(check.corect);
    if (check.tip === "numeric") {
      const value = normalizeNumber(answer);
      const expected = normalizeNumber(check.corect);
      return Number.isFinite(value) && Number.isFinite(expected) &&
        Math.abs(value - expected) <= Number(check.toleranta || 0.01);
    }
    const accepted = check.raspunsuriAcceptate.length ? check.raspunsuriAcceptate : [check.corect];
    return accepted.some(value => normalizeText(value) === normalizeText(answer));
  }

  class LabEngine {
    constructor(container, rawData, options = {}) {
      this.container = container;
      this.data = normalizeData(rawData, container, options);
      this.config = this.data.config;
      this.storageKey = STORAGE_PREFIX + this.data.id;
      this.state = initialState(this.data);
      this.timerInterval = null;
      this.boundClick = this.handleClick.bind(this);
      this.boundInput = this.handleInput.bind(this);
      this.boundChange = this.handleChange.bind(this);
      this.boundKeydown = this.handleKeydown.bind(this);
    }

    init() {
      this.container.dataset.labInitialized = "true";
      this.container.dataset.labId = this.data.id;
      if (this.config.injectStyles) injectStyles();
      if (this.config.restoreProgress) this.restore();
      this.render();
      this.bind();
      this.recalculate();
      this.updateView(false);
      this.typesetMath();
      emit("fizica:lab-ready", this.publicState(), this.container);
      return this;
    }

    bind() {
      this.container.addEventListener("click", this.boundClick);
      this.container.addEventListener("input", this.boundInput);
      this.container.addEventListener("change", this.boundChange);
      if (this.config.keyboard) document.addEventListener("keydown", this.boundKeydown);
    }

    destroy() {
      this.stopTimer();
      this.container.removeEventListener("click", this.boundClick);
      this.container.removeEventListener("input", this.boundInput);
      this.container.removeEventListener("change", this.boundChange);
      document.removeEventListener("keydown", this.boundKeydown);
      instances.delete(this.container);
    }

    render() {
      this.container.classList.add("fg-lab");
      this.container.innerHTML = `
        <div class="fg-lab__shell">
          ${this.renderHeader()}
          <div class="fg-lab__live" role="status" aria-live="polite"></div>
          ${this.renderOverview()}
          ${this.renderProcedure()}
          ${this.renderMeasurements()}
          ${this.renderChecks()}
          ${this.renderConclusion()}
          ${this.renderFinal()}
        </div>`;
    }

    renderHeader() {
      const meta = [
        this.data.clasa,
        this.data.capitol,
        this.data.durataMinute ? `⏱ ${this.data.durataMinute} min` : ""
      ].filter(Boolean);
      return `
        <header class="fg-lab__header">
          <p class="fg-lab__eyebrow">Laborator de fizică</p>
          <h1>${escapeHtml(this.data.titlu)}</h1>
          ${this.data.subtitlu ? `<p class="fg-lab__subtitle">${escapeHtml(this.data.subtitlu)}</p>` : ""}
          ${meta.length ? `<div class="fg-lab__meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
          <div class="fg-lab__progress">
            <div><span>Progres</span><strong data-progress-value>0%</strong></div>
            <div class="fg-lab__progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-progress-bar>
              <span data-progress-fill></span>
            </div>
          </div>
        </header>`;
    }

    renderOverview() {
      const listCard = (icon, title, items, extra = "") => items.length ? `
        <section class="fg-lab__card ${extra}">
          <h2>${icon} ${escapeHtml(title)}</h2>
          <ul>${items.map(item => `<li>${escapeHtml(typeof item === "object" ? item.text || item.titlu || item.label || "" : item)}</li>`).join("")}</ul>
        </section>` : "";

      const materials = this.data.materiale.length ? `
        <section class="fg-lab__card">
          <h2>🧰 Materiale necesare</h2>
          <div class="fg-lab__checklist">
            ${this.data.materiale.map((item, index) => `
              <label><input type="checkbox" data-check="material:general:${index}">
                <span>${escapeHtml(typeof item === "object" ? item.text || item.titlu || "" : item)}</span>
              </label>`).join("")}
          </div>
        </section>` : "";

      const formulas = this.data.formule.length ? `
        <section class="fg-lab__card">
          <h2>📐 Formule utile</h2>
          ${this.data.formule.map(item => `<div class="fg-lab__formula">${
            typeof item === "object" ? item.formula || item.continut || "" : String(item)
          }</div>`).join("")}
        </section>` : "";

      const hypothesis = this.data.ipoteza ? `
        <section class="fg-lab__card">
          <h2>💭 Ipoteză</h2>
          ${typeof this.data.ipoteza === "string" ? `<p>${escapeHtml(this.data.ipoteza)}</p>` : ""}
          <label class="fg-lab__field-label" for="${escapeHtml(this.data.id)}-hypothesis">Ipoteza ta</label>
          <textarea id="${escapeHtml(this.data.id)}-hypothesis" data-field="hypothesis" rows="3" placeholder="Cred că..."></textarea>
        </section>` : "";

      if (!this.data.descriere && !this.data.obiective.length && !this.data.materiale.length &&
          !this.data.siguranta.length && !this.data.formule.length && !this.data.ipoteza) return "";

      return `
        <section class="fg-lab__overview">
          ${this.data.descriere ? `<section class="fg-lab__card"><h2>🔎 Despre activitate</h2><p>${escapeHtml(this.data.descriere)}</p></section>` : ""}
          ${listCard("🎯", "Obiective", this.data.obiective)}
          ${materials}
          ${listCard("⚠️", "Reguli de siguranță", this.data.siguranta, "fg-lab__safety")}
          ${formulas}
          ${hypothesis}
        </section>`;
    }

    renderProcedure() {
      if (!this.data.pasi.length) return `<section class="fg-lab__card"><h2>Procedură</h2><p>Nu există pași configurați.</p></section>`;
      return `
        <section class="fg-lab__procedure">
          <div class="fg-lab__section-heading"><div><p class="fg-lab__eyebrow">Procedură</p><h2>Desfășurarea experimentului</h2></div><span data-save-status>Progres local</span></div>
          <ol class="fg-lab__step-list">
            ${this.data.pasi.map((step, index) => `<li><button type="button" data-action="go-step" data-step="${index}">
              <span>${index + 1}</span><small>${escapeHtml(step.titlu)}</small></button></li>`).join("")}
          </ol>
          <div>
            ${this.data.pasi.map((step, index) => this.renderStep(step, index)).join("")}
          </div>
          <nav class="fg-lab__navigation" aria-label="Navigarea între pași">
            <button type="button" class="fg-lab__button fg-lab__button--secondary" data-action="previous-step">← Înapoi</button>
            <span data-step-indicator>Pasul 1 din ${this.data.pasi.length}</span>
            <button type="button" class="fg-lab__button" data-action="next-step">Mergi mai departe →</button>
          </nav>
        </section>`;
    }

    renderStep(step, index) {
      const checklist = step.verificari.length ? `
        <div class="fg-lab__step-checklist"><h4>Confirmă înainte de a continua</h4>
          ${step.verificari.map((item, itemIndex) => `
            <label><input type="checkbox" data-check="step:${step.id}:${itemIndex}">
              <span>${escapeHtml(typeof item === "object" ? item.text || item.titlu || "" : item)}</span></label>`).join("")}
        </div>` : "";

      const timer = Number(step.cronometruSecunde) > 0 ? `
        <section class="fg-lab__timer" data-timer-step="${escapeHtml(step.id)}" data-timer-seconds="${Number(step.cronometruSecunde)}">
          <h4>⏱ Cronometru</h4><output data-timer-display>${formatTime(step.cronometruSecunde)}</output>
          <div><button type="button" class="fg-lab__button" data-action="timer-start">Pornește</button>
          <button type="button" class="fg-lab__button fg-lab__button--secondary" data-action="timer-pause">Pauză</button>
          <button type="button" class="fg-lab__button fg-lab__button--ghost" data-action="timer-reset">Resetează</button></div>
        </section>` : "";

      return `
        <article class="fg-lab__step" data-lab-step data-step-index="${index}" data-step-id="${escapeHtml(step.id)}" ${index ? "hidden" : ""}>
          <span class="fg-lab__badge">Pasul ${index + 1} din ${this.data.pasi.length}</span>
          <h3>${escapeHtml(step.titlu)}</h3>
          ${step.continutHtml ? step.continutHtml : step.continut ? `<p>${escapeHtml(step.continut)}</p>` : ""}
          ${step.lista.length ? `<ol>${step.lista.map(item => `<li>${escapeHtml(typeof item === "object" ? item.text || item.titlu || "" : item)}</li>`).join("")}</ol>` : ""}
          ${step.imagine ? `<figure><img src="${escapeHtml(step.imagine)}" alt="${escapeHtml(step.imagineAlt)}" loading="lazy"></figure>` : ""}
          ${step.atentionare ? `<div class="fg-lab__notice"><strong>Atenție:</strong> ${escapeHtml(step.atentionare)}</div>` : ""}
          ${step.observatie ? `<div class="fg-lab__observation"><strong>Observă:</strong> ${escapeHtml(step.observatie)}</div>` : ""}
          ${timer}${checklist}
        </article>`;
    }

    renderMeasurements() {
      const m = this.data.masuratori;
      if (!m) return "";
      return `
        <section class="fg-lab__measurements">
          <div class="fg-lab__section-heading"><div><p class="fg-lab__eyebrow">Date experimentale</p><h2>${escapeHtml(m.titlu)}</h2></div>
            ${m.permiteAdaugare ? `<button type="button" class="fg-lab__button fg-lab__button--secondary" data-action="add-row">+ Adaugă măsurătoare</button>` : ""}
          </div>
          ${m.descriere ? `<p>${escapeHtml(m.descriere)}</p>` : ""}
          <div class="fg-lab__table-wrap" tabindex="0">
            <table><thead><tr><th>Nr.</th>
              ${m.coloane.map(c => `<th>${escapeHtml(c.eticheta)}${c.unitate ? `<small>(${escapeHtml(c.unitate)})</small>` : ""}</th>`).join("")}
              ${m.permiteStergere ? "<th>Acțiuni</th>" : ""}
            </tr></thead><tbody data-measurement-body>
              ${this.state.measurements.map((row, index) => this.renderRow(row, index)).join("")}
            </tbody></table>
          </div>
          <p data-measurement-message role="status"></p>
        </section>`;
    }

    renderRow(row, index) {
      const m = this.data.masuratori;
      return `<tr data-row-id="${escapeHtml(row.id)}"><th>${index + 1}</th>
        ${m.coloane.map(c => c.doarCitire
          ? `<td><output data-output="${escapeHtml(c.cheie)}">${escapeHtml(row[c.cheie] ?? "")}</output></td>`
          : `<td><input type="${c.tip === "text" ? "text" : "number"}" ${c.tip === "text" ? "" : 'inputmode="decimal"'}
              value="${escapeHtml(row[c.cheie] ?? "")}" data-measurement-key="${escapeHtml(c.cheie)}"
              placeholder="${escapeHtml(c.placeholder)}" step="${escapeHtml(c.pas)}"
              ${c.min != null ? `min="${escapeHtml(c.min)}"` : ""} ${c.max != null ? `max="${escapeHtml(c.max)}"` : ""}
              ${c.obligatoriu ? "required" : ""}></td>`).join("")}
        ${m.permiteStergere ? `<td><button type="button" class="fg-lab__remove" data-action="remove-row" data-row-id="${escapeHtml(row.id)}" aria-label="Șterge măsurătoarea ${index + 1}">×</button></td>` : ""}
      </tr>`;
    }

    renderChecks() {
      if (!this.data.verificari.length) return "";
      return `<section class="fg-lab__checks"><p class="fg-lab__eyebrow">Verificare</p><h2>Verificare rapidă</h2>
        ${this.data.verificari.map((check, index) => this.renderCheck(check, index)).join("")}</section>`;
    }

    renderCheck(check, index) {
      let input;
      if (check.tip === "single-choice" || check.tip === "choice") {
        input = `<div class="fg-lab__options">${check.optiuni.map((option, optionIndex) => `
          <label><input type="radio" name="${escapeHtml(check.id)}" value="${optionIndex}" data-answer="${escapeHtml(check.id)}">
            <span><strong>${String.fromCharCode(65 + optionIndex)}.</strong> ${typeof option === "object" ? option.html || escapeHtml(option.text || option.label || "") : escapeHtml(option)}</span></label>`).join("")}</div>`;
      } else if (check.tip === "true-false") {
        input = `<div class="fg-lab__options">
          <label><input type="radio" name="${escapeHtml(check.id)}" value="true" data-answer="${escapeHtml(check.id)}"><span>Adevărat</span></label>
          <label><input type="radio" name="${escapeHtml(check.id)}" value="false" data-answer="${escapeHtml(check.id)}"><span>Fals</span></label></div>`;
      } else {
        input = `<div class="fg-lab__answer-row"><input type="text" ${check.tip === "numeric" ? 'inputmode="decimal"' : ""} data-answer="${escapeHtml(check.id)}">
          ${check.unitate ? `<strong>${escapeHtml(check.unitate)}</strong>` : ""}</div>`;
      }
      return `<article class="fg-lab__check" data-check-card="${escapeHtml(check.id)}">
        <span class="fg-lab__question-number">${index + 1}</span><div><h3>${escapeHtml(check.titlu)}</h3><p>${escapeHtml(check.intrebare)}</p>
        ${input}<button type="button" class="fg-lab__button" data-action="check-answer" data-check-id="${escapeHtml(check.id)}">Verifică răspunsul</button>
        <div data-feedback="${escapeHtml(check.id)}" role="status" aria-live="polite"></div></div></article>`;
    }

    renderConclusion() {
      const c = typeof this.data.concluzie === "string" ? { model: this.data.concluzie } : this.data.concluzie || {};
      return `<section class="fg-lab__conclusion">
        <p class="fg-lab__eyebrow">Interpretare</p><h2>Concluzia experimentului</h2>
        <p>${escapeHtml(c.cerinta || c.prompt || "Scrie ce ai observat și ce concluzie rezultă din măsurători.")}</p>
        <label class="fg-lab__field-label" for="${escapeHtml(this.data.id)}-conclusion">Concluzia ta</label>
        <textarea id="${escapeHtml(this.data.id)}-conclusion" data-field="conclusion" rows="6" placeholder="Din măsurători rezultă că..."></textarea>
        <p class="fg-lab__count" data-conclusion-count>0 caractere</p>
        <label class="fg-lab__field-label" for="${escapeHtml(this.data.id)}-notes">Observații suplimentare</label>
        <textarea id="${escapeHtml(this.data.id)}-notes" data-field="notes" rows="3"></textarea>
        ${c.model || c.exemplu ? `<details><summary>Vezi un model de concluzie</summary><p>${escapeHtml(c.model || c.exemplu)}</p></details>` : ""}
      </section>`;
    }

    renderFinal() {
      return `<section class="fg-lab__final">
        <div data-completion-message role="status" aria-live="polite"></div>
        <div class="fg-lab__final-buttons">
          <button type="button" class="fg-lab__button fg-lab__button--large" data-action="complete">Finalizează activitatea</button>
          <button type="button" class="fg-lab__button fg-lab__button--secondary" data-action="print">Tipărește rezultatele</button>
          <button type="button" class="fg-lab__button fg-lab__button--ghost" data-action="reset">Reia activitatea</button>
        </div>
        ${this.data.linkuri.inapoi ? `<a class="fg-lab__back" href="${escapeHtml(this.data.linkuri.inapoi)}">← Înapoi</a>` : ""}
      </section>`;
    }

    handleClick(event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "previous-step") this.previousStep();
      if (action === "next-step") this.nextStep();
      if (action === "go-step") this.goToStep(Number(button.dataset.step));
      if (action === "timer-start") this.startTimer();
      if (action === "timer-pause") this.pauseTimer();
      if (action === "timer-reset") this.resetTimer();
      if (action === "add-row") this.addRow();
      if (action === "remove-row") this.removeRow(button.dataset.rowId);
      if (action === "check-answer") this.checkAnswer(button.dataset.checkId);
      if (action === "complete") this.complete();
      if (action === "print") window.print();
      if (action === "reset") this.reset();
    }

    handleInput(event) {
      const field = event.target.dataset.field;
      if (field) {
        this.state[field] = event.target.value;
        if (field === "conclusion") this.updateConclusionCount();
        this.touchAndSave();
        return;
      }

      const key = event.target.dataset.measurementKey;
      if (!key) return;
      const rowId = event.target.closest("[data-row-id]")?.dataset.rowId;
      const row = this.state.measurements.find(item => item.id === rowId);
      if (!row) return;
      row[key] = event.target.value;
      this.calculateRow(row);
      this.updateCalculatedOutputs(row);
      this.touchAndSave();
      emit("fizica:lab-measurement-change", { labId: this.data.id, row: { ...row } }, this.container);
    }

    handleChange(event) {
      const key = event.target.dataset.check;
      if (!key) return;
      this.state.checklist[key] = event.target.checked;
      const parts = key.split(":");
      if (parts[0] === "step") this.updateStepCompletion(parts[1]);
      this.touchAndSave();
      this.updateProgress();
    }

    handleKeydown(event) {
      if (!event.altKey) return;
      if (event.key === "ArrowRight") { event.preventDefault(); this.nextStep(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); this.previousStep(); }
    }

    goToStep(index, announce = true) {
      if (!this.data.pasi.length) return false;
      const target = clamp(Number(index) || 0, 0, this.data.pasi.length - 1);
      if (target > this.state.currentStep && this.config.requireStepCompletion && !this.canLeaveStep()) {
        this.announce("Bifează toate cerințele pasului înainte de a continua.");
        this.container.querySelector(`[data-step-index="${this.state.currentStep}"] input[type="checkbox"]:not(:checked)`)?.focus();
        return false;
      }
      this.state.currentStep = target;
      if (this.config.updateHash) history.replaceState(null, "", `#pas-${target + 1}`);
      this.touchAndSave();
      this.updateView(announce);
      return true;
    }

    nextStep() {
      if (this.state.currentStep >= this.data.pasi.length - 1) {
        this.container.querySelector(".fg-lab__measurements,.fg-lab__checks,.fg-lab__conclusion")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return false;
      }
      return this.goToStep(this.state.currentStep + 1);
    }

    previousStep() {
      return this.state.currentStep > 0 ? this.goToStep(this.state.currentStep - 1) : false;
    }

    canLeaveStep() {
      const step = this.data.pasi[this.state.currentStep];
      return !step || !step.verificari.length || step.verificari.every((_, index) =>
        Boolean(this.state.checklist[`step:${step.id}:${index}`]));
    }

    updateStepCompletion(stepId) {
      const step = this.data.pasi.find(item => item.id === stepId);
      if (!step) return;
      this.state.completedSteps[stepId] = step.verificari.every((_, index) =>
        Boolean(this.state.checklist[`step:${step.id}:${index}`]));
    }

    updateView(announce = true) {
      this.container.querySelectorAll("[data-lab-step]").forEach((element, index) => {
        element.hidden = index !== this.state.currentStep;
      });
      this.container.querySelectorAll('[data-action="go-step"]').forEach((button, index) => {
        const step = this.data.pasi[index];
        button.classList.toggle("is-active", index === this.state.currentStep);
        button.classList.toggle("is-complete", Boolean(this.state.completedSteps[step?.id]));
        if (index === this.state.currentStep) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });

      const previous = this.container.querySelector('[data-action="previous-step"]');
      if (previous) previous.disabled = this.state.currentStep === 0;
      const indicator = this.container.querySelector("[data-step-indicator]");
      if (indicator) indicator.textContent = `Pasul ${this.state.currentStep + 1} din ${this.data.pasi.length}`;
      const next = this.container.querySelector('[data-action="next-step"]');
      if (next) next.textContent = this.state.currentStep === this.data.pasi.length - 1
        ? "Continuă la rezultate ↓" : "Mergi mai departe →";

      this.restoreFields();
      this.updateTimerDisplay();
      this.updateProgress();
      this.updateConclusionCount();
      this.typesetMath();

      if (announce) {
        const step = this.data.pasi[this.state.currentStep];
        this.announce(`Pasul ${this.state.currentStep + 1} din ${this.data.pasi.length}: ${step.titlu}`);
      }
      emit("fizica:lab-step-change", this.publicState(), this.container);
      emit("fizica:content-updated", { root: this.container, source: "lab-engine" }, this.container);
    }

    restoreFields() {
      ["hypothesis", "conclusion", "notes"].forEach(field => {
        const element = this.container.querySelector(`[data-field="${field}"]`);
        if (element) element.value = this.state[field] || "";
      });
      this.container.querySelectorAll("[data-check]").forEach(input => {
        input.checked = Boolean(this.state.checklist[input.dataset.check]);
      });
      Object.entries(this.state.quickChecks).forEach(([id, saved]) => {
        const check = this.data.verificari.find(item => item.id === id);
        const card = this.container.querySelector(`[data-check-card="${CSS.escape(id)}"]`);
        if (!check || !card) return;
        const inputs = card.querySelectorAll(`[data-answer="${CSS.escape(id)}"]`);
        if (check.tip === "single-choice" || check.tip === "choice" || check.tip === "true-false") {
          inputs.forEach(input => { input.checked = input.value === String(saved.answer); });
        } else if (inputs[0]) inputs[0].value = saved.answer ?? "";
        this.showFeedback(check, Boolean(saved.correct));
      });
    }

    calculateRow(row) {
      this.data.masuratori?.coloane.forEach(column => {
        if (!column.calcul) return;
        const result = calculateValue(row, column.calcul);
        row[column.cheie] = Number.isFinite(result) ? formatNumber(result, column.zecimale) : "";
      });
    }

    recalculate() {
      this.state.measurements.forEach(row => this.calculateRow(row));
      this.renderMeasurementBody();
    }

    updateCalculatedOutputs(row) {
      const element = this.container.querySelector(`[data-row-id="${CSS.escape(row.id)}"]`);
      if (!element) return;
      element.querySelectorAll("[data-output]").forEach(output => {
        output.textContent = row[output.dataset.output] ?? "";
      });
    }

    renderMeasurementBody() {
      const body = this.container.querySelector("[data-measurement-body]");
      if (body && this.data.masuratori) {
        body.innerHTML = this.state.measurements.map((row, index) => this.renderRow(row, index)).join("");
      }
    }

    addRow() {
      const m = this.data.masuratori;
      if (!m) return false;
      if (this.state.measurements.length >= m.randuriMaxime) {
        this.measurementMessage(`Poți introduce cel mult ${m.randuriMaxime} măsurători.`, "error");
        return false;
      }
      this.state.measurements.push(emptyRow(m));
      this.renderMeasurementBody();
      this.touchAndSave();
      this.measurementMessage("A fost adăugat un rând.", "success");
      return true;
    }

    removeRow(rowId) {
      const m = this.data.masuratori;
      if (!m || this.state.measurements.length <= m.randuriMinime) {
        this.measurementMessage(`Trebuie păstrate cel puțin ${m?.randuriMinime || 1} măsurători.`, "error");
        return false;
      }
      this.state.measurements = this.state.measurements.filter(row => row.id !== rowId);
      this.renderMeasurementBody();
      this.touchAndSave();
      this.measurementMessage("Măsurătoarea a fost ștearsă.", "success");
      return true;
    }

    measurementMessage(message, type) {
      const element = this.container.querySelector("[data-measurement-message]");
      if (element) { element.textContent = message; element.dataset.type = type; }
    }

    startTimer() {
      const step = this.data.pasi[this.state.currentStep];
      const seconds = Number(step?.cronometruSecunde);
      if (!step || !(seconds > 0)) return;

      if (this.state.timer.stepId !== step.id) {
        this.state.timer = { stepId: step.id, initialSeconds: seconds, remainingSeconds: seconds, running: false };
      }
      if (this.state.timer.remainingSeconds <= 0) this.state.timer.remainingSeconds = seconds;
      if (this.state.timer.running) return;

      this.state.timer.running = true;
      this.timerInterval = setInterval(() => {
        this.state.timer.remainingSeconds = Math.max(0, this.state.timer.remainingSeconds - 1);
        this.updateTimerDisplay();
        if (this.state.timer.remainingSeconds === 0) {
          this.stopTimer();
          this.announce("Timpul s-a încheiat.");
          emit("fizica:lab-timer-complete", { labId: this.data.id, stepId: step.id }, this.container);
        }
      }, 1000);
      this.updateTimerDisplay();
    }

    pauseTimer() {
      this.stopTimer();
      this.save();
    }

    stopTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.state.timer.running = false;
      this.updateTimerDisplay();
    }

    resetTimer() {
      const step = this.data.pasi[this.state.currentStep];
      const seconds = Number(step?.cronometruSecunde);
      if (!step || !(seconds > 0)) return;
      this.stopTimer();
      this.state.timer = { stepId: step.id, initialSeconds: seconds, remainingSeconds: seconds, running: false };
      this.updateTimerDisplay();
      this.save();
    }

    updateTimerDisplay() {
      const step = this.data.pasi[this.state.currentStep];
      if (!step) return;
      const timer = this.container.querySelector(`[data-timer-step="${CSS.escape(step.id)}"]`);
      if (!timer) return;
      const seconds = Number(timer.dataset.timerSeconds);
      if (this.state.timer.stepId !== step.id) {
        this.state.timer = { stepId: step.id, initialSeconds: seconds, remainingSeconds: seconds, running: false };
      }
      const output = timer.querySelector("[data-timer-display]");
      if (output) output.textContent = formatTime(this.state.timer.remainingSeconds);
      const start = timer.querySelector('[data-action="timer-start"]');
      const pause = timer.querySelector('[data-action="timer-pause"]');
      if (start) start.disabled = this.state.timer.running;
      if (pause) pause.disabled = !this.state.timer.running;
    }

    checkAnswer(id) {
      const check = this.data.verificari.find(item => item.id === id);
      const card = this.container.querySelector(`[data-check-card="${CSS.escape(id)}"]`);
      if (!check || !card) return false;
      const inputs = [...card.querySelectorAll(`[data-answer="${CSS.escape(id)}"]`)];
      const answer = check.tip === "single-choice" || check.tip === "choice" || check.tip === "true-false"
        ? inputs.find(input => input.checked)?.value ?? ""
        : inputs[0]?.value ?? "";

      if (answer === "") {
        this.showFeedback(check, false, "Selectează sau scrie un răspuns.");
        return false;
      }

      const correct = evaluate(check, answer);
      const previous = this.state.quickChecks[id];
      this.state.quickChecks[id] = {
        answer,
        correct,
        attempts: Number(previous?.attempts || 0) + 1,
        checkedAt: now()
      };
      this.touchAndSave();
      this.showFeedback(check, correct);
      this.updateProgress();
      emit("fizica:lab-answer-checked", { labId: this.data.id, checkId: id, answer, correct }, this.container);
      return correct;
    }

    showFeedback(check, correct, custom = "") {
      const feedback = this.container.querySelector(`[data-feedback="${CSS.escape(check.id)}"]`);
      if (!feedback) return;
      feedback.className = correct ? "fg-lab__feedback is-correct" : "fg-lab__feedback is-incorrect";
      feedback.innerHTML = `<strong>${escapeHtml(custom || (correct ? "✓ Corect." : "✗ Răspunsul nu este corect."))}</strong>
        ${check.explicatie ? `<p>${escapeHtml(check.explicatie)}</p>` : ""}`;
    }

    hasMeasurements() {
      const m = this.data.masuratori;
      if (!m) return true;
      const required = m.coloane.filter(column => column.obligatoriu && !column.doarCitire);
      const completeRows = this.state.measurements.filter(row =>
        required.every(column => String(row[column.cheie] ?? "").trim() !== ""));
      return completeRows.length >= m.randuriMinime;
    }

    validate() {
      const errors = [];
      if (this.config.requireStepCompletion) {
        this.data.pasi.forEach(step => {
          if (step.verificari.length && !this.state.completedSteps[step.id]) {
            errors.push(`Pasul „${step.titlu}” nu este confirmat complet.`);
          }
        });
      }
      if (this.config.requireMeasurements && !this.hasMeasurements()) {
        errors.push("Completează măsurătorile obligatorii.");
      }
      if (this.config.requireQuickChecks) {
        const incomplete = this.data.verificari.some(check =>
          check.obligatoriu && !this.state.quickChecks[check.id]?.correct);
        if (incomplete) errors.push("Rezolvă corect verificările rapide obligatorii.");
      }
      if (this.config.requireConclusion &&
          this.state.conclusion.trim().length < this.config.minimumConclusionLength) {
        errors.push(`Concluzia trebuie să aibă cel puțin ${this.config.minimumConclusionLength} caractere.`);
      }
      return { valid: !errors.length, errors };
    }

    complete() {
      const result = this.validate();
      const message = this.container.querySelector("[data-completion-message]");
      if (!result.valid) {
        if (message) {
          message.className = "fg-lab__completion-message is-error";
          message.innerHTML = `<strong>Activitatea nu poate fi finalizată încă.</strong><ul>${
            result.errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")
          }</ul>`;
        }
        this.announce(result.errors.join(" "));
        return false;
      }

      this.state.completed = true;
      this.state.completedAt = now();
      this.touchAndSave();
      if (message) {
        message.className = "fg-lab__completion-message is-success";
        message.innerHTML = "<strong>✓ Activitate finalizată.</strong><p>Progresul a fost salvat local.</p>";
      }
      this.updateProgress();
      emit("fizica:lab-complete", this.result(), this.container);
      return true;
    }

    result() {
      const correct = Object.values(this.state.quickChecks).filter(item => item.correct).length;
      return {
        labId: this.data.id,
        titlu: this.data.titlu,
        completed: this.state.completed,
        progress: this.progress(),
        startedAt: this.state.startedAt,
        completedAt: this.state.completedAt,
        hypothesis: this.state.hypothesis,
        measurements: this.state.measurements.map(row => ({ ...row })),
        quickChecks: { correct, total: this.data.verificari.length, answers: { ...this.state.quickChecks } },
        conclusion: this.state.conclusion,
        notes: this.state.notes
      };
    }

    reset(options = {}) {
      if (options.confirm !== false && !window.confirm("Sigur dorești să reiei activitatea? Progresul local va fi șters.")) return;
      this.stopTimer();
      localStorage.removeItem(this.storageKey);
      this.state = initialState(this.data);
      this.render();
      this.recalculate();
      this.updateView(false);
      this.announce("Activitatea a fost resetată.");
      emit("fizica:lab-reset", { labId: this.data.id }, this.container);
    }

    save() {
      if (!this.config.saveProgress) return false;
      try {
        this.state.updatedAt = now();
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        const status = this.container.querySelector("[data-save-status]");
        if (status) status.textContent = "Salvat local";
        emit("fizica:lab-progress-saved", this.publicState(), this.container);
        return true;
      } catch (error) {
        console.warn("[Fizica Galaction] Progresul nu a putut fi salvat.", error);
        return false;
      }
    }

    restore() {
      try {
        const saved = safeJson(localStorage.getItem(this.storageKey));
        if (saved?.labId === this.data.id) {
          this.state = {
            ...initialState(this.data),
            ...saved,
            completedSteps: { ...(saved.completedSteps || {}) },
            checklist: { ...(saved.checklist || {}) },
            quickChecks: { ...(saved.quickChecks || {}) },
            timer: { ...(saved.timer || {}), running: false }
          };
        }
        const match = location.hash.match(/^#pas-(\d+)$/);
        if (match && this.config.updateHash) {
          this.state.currentStep = clamp(Number(match[1]) - 1, 0, Math.max(this.data.pasi.length - 1, 0));
        }
      } catch (error) {
        console.warn("[Fizica Galaction] Progresul nu a putut fi citit.", error);
      }
    }

    touchAndSave() {
      this.state.updatedAt = now();
      this.save();
    }

    progress() {
      if (this.state.completed) return 100;
      let value = this.data.pasi.length
        ? (this.state.currentStep + 1) / this.data.pasi.length * 55
        : 0;
      if (this.data.masuratori && this.hasMeasurements()) value += 15;
      if (this.data.verificari.length) {
        const correct = Object.values(this.state.quickChecks).filter(item => item.correct).length;
        value += correct / this.data.verificari.length * 15;
      }
      if (this.state.conclusion.trim().length >= this.config.minimumConclusionLength) value += 15;
      return clamp(Math.round(value), 0, 99);
    }

    updateProgress() {
      const value = this.progress();
      const label = this.container.querySelector("[data-progress-value]");
      const bar = this.container.querySelector("[data-progress-bar]");
      const fill = this.container.querySelector("[data-progress-fill]");
      if (label) label.textContent = `${value}%`;
      if (bar) bar.setAttribute("aria-valuenow", String(value));
      if (fill) fill.style.width = `${value}%`;
    }

    updateConclusionCount() {
      const element = this.container.querySelector("[data-conclusion-count]");
      if (element) {
        const length = this.state.conclusion.length;
        element.textContent = `${length} ${length === 1 ? "caracter" : "caractere"}`;
      }
    }

    publicState() {
      return {
        labId: this.data.id,
        currentStep: this.state.currentStep,
        totalSteps: this.data.pasi.length,
        progress: this.progress(),
        completed: this.state.completed,
        updatedAt: this.state.updatedAt
      };
    }

    announce(message) {
      const live = this.container.querySelector(".fg-lab__live");
      if (!live) return;
      live.textContent = "";
      requestAnimationFrame(() => { live.textContent = message; });
    }

    async typesetMath() {
      if (!this.config.autoTypesetMath) return;
      try {
        if (typeof NS.app?.typesetMath === "function") {
          await NS.app.typesetMath(this.container);
        } else if (window.MathJax?.typesetPromise) {
          window.MathJax.typesetClear?.([this.container]);
          await window.MathJax.typesetPromise([this.container]);
        }
      } catch (error) {
        console.warn("[Fizica Galaction] MathJax nu a putut actualiza laboratorul.", error);
      }
    }
  }

  function injectStyles() {
    if (document.getElementById("fg-lab-engine-styles")) return;
    const style = document.createElement("style");
    style.id = "fg-lab-engine-styles";
    style.textContent = `
      .fg-lab{--bg:var(--surface,#fff);--soft:var(--surface-soft,#f1f5f9);--text:var(--text,#172033);
        --muted:var(--muted-text,#475569);--border:var(--border,#cbd5e1);--primary:var(--primary,#0369a1);
        color:var(--text);line-height:1.6}.fg-lab *{box-sizing:border-box}.fg-lab__shell{max-width:980px;margin:auto;padding:clamp(10px,3vw,28px)}
      .fg-lab__header,.fg-lab__card,.fg-lab__procedure,.fg-lab__measurements,.fg-lab__checks,.fg-lab__conclusion,.fg-lab__final{
        background:var(--bg);border:1px solid var(--border);border-radius:18px;margin:18px 0;padding:clamp(18px,4vw,30px);
        box-shadow:0 10px 26px rgba(15,23,42,.08)}.fg-lab__header{border-top:5px solid var(--primary)}
      .fg-lab__header h1{font-size:clamp(1.65rem,4vw,2.5rem);line-height:1.18;margin:.2rem 0}.fg-lab__subtitle,.fg-lab__count{color:var(--muted)}
      .fg-lab__eyebrow{color:var(--primary);font-size:.85rem;font-weight:800;letter-spacing:.08em;margin:0;text-transform:uppercase}
      .fg-lab__meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.fg-lab__meta span,.fg-lab__badge,[data-save-status]{
        background:var(--soft);border:1px solid var(--border);border-radius:999px;padding:5px 10px;font-size:.88rem;font-weight:700}
      .fg-lab__progress{margin-top:22px}.fg-lab__progress>div:first-child{display:flex;justify-content:space-between}
      .fg-lab__progress-track{background:var(--soft);border-radius:999px;height:12px;overflow:hidden}.fg-lab__progress-track span{display:block;background:var(--primary);height:100%;width:0}
      .fg-lab__overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.fg-lab__overview .fg-lab__card{margin:0}
      .fg-lab__safety{border-left:5px solid #eab308}.fg-lab__checklist,.fg-lab__step-checklist,.fg-lab__options{display:grid;gap:9px}
      .fg-lab__checklist label,.fg-lab__step-checklist label,.fg-lab__options label{display:flex;gap:11px;align-items:flex-start;background:var(--soft);
        border:1px solid var(--border);border-radius:12px;min-height:48px;padding:12px;cursor:pointer}
      .fg-lab input[type=checkbox],.fg-lab input[type=radio]{width:20px;height:20px;flex:none}.fg-lab__formula{text-align:center;background:var(--soft);border-radius:12px;padding:14px;overflow:auto}
      .fg-lab__section-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px;align-items:flex-start}.fg-lab__section-heading h2{margin-top:.2rem}
      .fg-lab__step-list{display:flex;gap:9px;list-style:none;overflow-x:auto;padding:4px 2px 12px}.fg-lab__step-list button{display:flex;align-items:center;gap:8px;
        min-height:48px;background:var(--soft);color:var(--text);border:2px solid transparent;border-radius:12px;padding:8px 11px;cursor:pointer}
      .fg-lab__step-list button>span{display:grid;place-items:center;background:var(--primary);color:#fff;border-radius:50%;width:30px;height:30px;font-weight:800}
      .fg-lab__step-list button.is-active{border-color:var(--primary)}.fg-lab__step-list button.is-complete>span{background:#166534}
      .fg-lab__step h3{font-size:clamp(1.3rem,3vw,1.75rem)}.fg-lab figure{text-align:center}.fg-lab img{max-width:100%;height:auto;border-radius:12px}
      .fg-lab__notice,.fg-lab__observation{border-left:5px solid var(--primary);background:var(--soft);border-radius:10px;margin:16px 0;padding:14px}
      .fg-lab__notice{border-color:#eab308}.fg-lab__timer{text-align:center;background:var(--soft);border:1px solid var(--border);border-radius:14px;padding:16px;margin:18px 0}
      .fg-lab__timer output{display:block;font-size:clamp(2.3rem,8vw,4.5rem);font-weight:900;font-variant-numeric:tabular-nums}
      .fg-lab__navigation{display:flex;align-items:center;justify-content:space-between;gap:10px;position:sticky;bottom:0;background:var(--bg);
        border-top:1px solid var(--border);padding:14px 0 4px;z-index:5}.fg-lab__button,.fg-lab__remove{min-height:48px;border-radius:12px;border:2px solid transparent;
        padding:10px 16px;font:inherit;font-weight:800;cursor:pointer;background:var(--primary);color:#fff}
      .fg-lab__button--secondary{background:var(--soft);border-color:var(--border);color:var(--text)}.fg-lab__button--ghost{background:transparent;border-color:var(--border);color:var(--text)}
      .fg-lab__button:disabled{opacity:.5;cursor:not-allowed}.fg-lab__button--large{min-height:54px;font-size:1.05rem}
      .fg-lab__table-wrap{overflow-x:auto}.fg-lab table{border-collapse:collapse;min-width:640px;width:100%}.fg-lab th,.fg-lab td{border:1px solid var(--border);padding:9px;text-align:center}
      .fg-lab th small{display:block;color:var(--muted)}.fg-lab input[type=text],.fg-lab input[type=number],.fg-lab textarea{width:100%;min-height:46px;border:2px solid var(--border);
        border-radius:10px;background:var(--bg);color:var(--text);font:inherit;padding:10px}.fg-lab__remove{background:#fee2e2;color:#991b1b;min-width:44px;padding:6px}
      .fg-lab__check{display:grid;grid-template-columns:auto 1fr;gap:14px;border-top:1px solid var(--border);padding:22px 0}.fg-lab__question-number{
        display:grid;place-items:center;background:var(--primary);color:#fff;border-radius:50%;width:38px;height:38px;font-weight:900}
      .fg-lab__answer-row{display:flex;align-items:center;gap:10px;margin:12px 0}.fg-lab__field-label{display:block;font-weight:800;margin:12px 0 6px}
      .fg-lab__feedback{border-radius:12px;margin-top:12px}.fg-lab__feedback.is-correct{background:#dcfce7;color:#166534;padding:14px}
      .fg-lab__feedback.is-incorrect,.fg-lab__completion-message.is-error{background:#fee2e2;color:#991b1b;padding:14px}
      .fg-lab__completion-message.is-success{background:#dcfce7;color:#166534;padding:14px;border-radius:12px}.fg-lab__final-buttons{display:flex;flex-wrap:wrap;gap:10px}
      .fg-lab__back{display:inline-block;margin-top:16px;color:var(--primary);font-weight:800}.fg-lab__live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
      .fg-lab button:focus-visible,.fg-lab input:focus-visible,.fg-lab textarea:focus-visible{outline:3px solid var(--primary);outline-offset:3px}
      @media(max-width:640px){.fg-lab__navigation{display:grid;grid-template-columns:1fr 1fr}.fg-lab__navigation span{grid-column:1/-1;grid-row:1;text-align:center}
        .fg-lab__navigation button,.fg-lab__final-buttons button{width:100%}.fg-lab__check{grid-template-columns:1fr}.fg-lab__final-buttons{display:grid}}
      @media(prefers-reduced-motion:reduce){.fg-lab *{scroll-behavior:auto!important;transition:none!important}}
      @media print{.fg-lab__navigation,.fg-lab__step-list,.fg-lab__timer button,.fg-lab__final-buttons,[data-action=add-row],.fg-lab__remove{display:none!important}
        .fg-lab__step[hidden]{display:block!important}.fg-lab__header,.fg-lab__card,.fg-lab__procedure,.fg-lab__measurements,.fg-lab__checks,.fg-lab__conclusion{box-shadow:none}}
    `;
    document.head.appendChild(style);
  }

  function enhanceExisting(container) {
    const steps = [...container.querySelectorAll("[data-lab-step]")];
    let current = 0;
    const show = index => {
      current = clamp(index, 0, Math.max(steps.length - 1, 0));
      steps.forEach((step, i) => { step.hidden = i !== current; });
      const indicator = container.querySelector("[data-step-indicator]");
      if (indicator) indicator.textContent = `Pasul ${current + 1} din ${steps.length}`;
    };
    const click = event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.dataset.action === "next-step") show(current + 1);
      if (button.dataset.action === "previous-step") show(current - 1);
      if (button.dataset.action === "go-step") show(Number(button.dataset.step));
    };
    container.addEventListener("click", click);
    show(0);
    return {
      nextStep: () => show(current + 1),
      previousStep: () => show(current - 1),
      goToStep: show,
      getState: () => ({ currentStep: current, totalSteps: steps.length }),
      destroy: () => container.removeEventListener("click", click)
    };
  }

  async function init(target = null, options = {}) {
    const container = target instanceof Element ? target :
      typeof target === "string" ? document.querySelector(target) : document.querySelector(SELECTOR);
    if (!container) return null;
    if (instances.has(container)) return instances.get(container);

    try {
      const raw = await loadData(container, options);
      const instance = raw ? new LabEngine(container, raw, options).init() : enhanceExisting(container);
      instances.set(container, instance);
      activeInstance = instance;
      return instance;
    } catch (error) {
      console.error("[Fizica Galaction] Eroare la inițializarea laboratorului.", error);
      container.innerHTML = `<section role="alert"><h2>Activitatea nu a putut fi încărcată</h2><p>${escapeHtml(error.message)}</p></section>`;
      emit("fizica:app-error", { modul: "lab-engine", eroare: error }, container);
      return null;
    }
  }

  async function initAll(options = {}) {
    const result = [];
    for (const container of document.querySelectorAll(SELECTOR)) {
      const instance = await init(container, options);
      if (instance) result.push(instance);
    }
    return result;
  }

  const api = {
    init,
    initAll,
    getActiveInstance: () => activeInstance,
    getInstance(target = null) {
      if (!target) return activeInstance;
      const container = target instanceof Element ? target : document.querySelector(target);
      return container ? instances.get(container) || null : null;
    },
    nextStep: () => activeInstance?.nextStep?.(),
    previousStep: () => activeInstance?.previousStep?.(),
    goToStep: index => activeInstance?.goToStep?.(index),
    addMeasurementRow: () => activeInstance?.addRow?.(),
    save: () => activeInstance?.save?.(),
    complete: () => activeInstance?.complete?.(),
    reset: options => activeInstance?.reset?.(options),
    getState: () => activeInstance?.publicState?.() || activeInstance?.getState?.() || null,
    getResult: () => activeInstance?.result?.() || null,
    destroy(target = null) {
      const instance = this.getInstance(target);
      instance?.destroy?.();
      if (instance === activeInstance) activeInstance = null;
    },
    helpers: { normalizeText, normalizeNumber, formatNumber, formatTime, calculateValue }
  };

  NS.labEngine = api;
  window.initLabEngine = () => api.initAll();
})();
