/**
 * test-engine.js — Fizica Galaction
 *
 * Motor generic pentru teste. Datele testului se păstrează separat în
 * window.TEST_DATA sau window.TEST_CONFIG.
 *
 * Tipuri: alegere, alegere-multipla, adevarat-fals, selectie,
 * completare, numeric, asociere și text-liber.
 */
(function () {
  "use strict";

  const APP = window.FizicaGalaction = window.FizicaGalaction || {};
  const ROOT_SELECTOR = [
    "[data-test-engine]", "[data-test-root]", "#testApp",
    "#test-app", "form[data-test]"
  ].join(",");
  const STORAGE_PREFIX = "fizica-galaction:test:";
  const instances = new WeakMap();
  let activeInstance = null;

  const DEFAULTS = Object.freeze({
    questionsPerPage: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    requireAllAnswers: true,
    allowBack: true,
    immediateFeedback: false,
    lockAfterCheck: false,
    showCorrectAnswers: true,
    showExplanations: true,
    showQuestionPoints: true,
    saveProgress: true,
    restoreProgress: true,
    injectStyles: true,
    updateHash: true,
    keyboard: true,
    showTimer: true,
    autoSubmitOnTimeout: true,
    confirmBeforeSubmit: true,
    allowRestart: true,
    allowPrint: true,
    startImmediately: false,
    pointsByOffice: 0,
    minimumGrade: 1,
    maximumGrade: 10,
    passingGrade: 5,
    warningSeconds: 300,
    dangerSeconds: 60,
    maxSavedAgeHours: 168
  });

  const TYPE_MAP = Object.freeze({
    "alegere": "single",
    "alegere-simpla": "single",
    "single-choice": "single",
    "choice": "single",
    "radio": "single",
    "alegere-multipla": "multiple",
    "multiple-choice": "multiple",
    "checkbox": "multiple",
    "adevarat-fals": "boolean",
    "adevărat-fals": "boolean",
    "true-false": "boolean",
    "boolean": "boolean",
    "selectie": "select",
    "selecție": "select",
    "select": "select",
    "completare": "text",
    "text": "text",
    "numeric": "numeric",
    "number": "numeric",
    "asociere": "matching",
    "matching": "matching",
    "text-liber": "open",
    "open": "open",
    "textarea": "open"
  });

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    try {
      return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

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
    const text = String(value ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    return text ? Number(text) : Number.NaN;
  }

  function slug(value, fallback = "item") {
    return normalizeText(value)
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function array(value) {
    if (Array.isArray(value)) return value;
    return value === null || value === undefined ? [] : [value];
  }

  function parseJson(raw, fallback = null) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function cssEscape(value) {
    return window.CSS?.escape
      ? window.CSS.escape(String(value))
      : String(value).replace(/["\\]/g, "\\$&");
  }

  function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function round(value, decimals = 2) {
    const factor = 10 ** clamp(Number(decimals) || 0, 0, 10);
    return Math.round(value * factor) / factor;
  }

  function emit(name, detail, root) {
    const event = new CustomEvent(name, { detail: clone(detail), bubbles: true });
    (root || document).dispatchEvent(event);
  }

  function resolveRoot(target) {
    if (target instanceof Element) return target;
    if (typeof target === "string" && target.trim()) {
      return document.querySelector(target);
    }
    return document.querySelector(ROOT_SELECTOR);
  }

  async function loadData(root, options = {}) {
    if (options.data && typeof options.data === "object") return options.data;
    if (window.TEST_DATA && typeof window.TEST_DATA === "object") return window.TEST_DATA;
    if (window.TEST_CONFIG && typeof window.TEST_CONFIG === "object") return window.TEST_CONFIG;

    const inline = parseJson(root.dataset.testData);
    if (inline) return inline;

    const source = options.source || root.dataset.testSource || root.dataset.source;
    if (!source) return null;

    const response = await fetch(source, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Datele testului nu au putut fi încărcate (${response.status}).`);
    }
    return response.json();
  }

  function normalizeType(value) {
    const key = normalizeText(value || "text").replace(/\s+/g, "-");
    return TYPE_MAP[key] || "text";
  }

  function normalizeOption(raw, index) {
    if (typeof raw === "string" || typeof raw === "number") {
      return {
        id: `opt-${index + 1}`,
        value: String(index),
        text: String(raw),
        html: "",
        originalIndex: index
      };
    }
    const source = raw || {};
    return {
      id: slug(source.id || `opt-${index + 1}`),
      value: String(source.value ?? source.valoare ?? index),
      text: source.text ?? source.label ?? source.eticheta ?? "",
      html: source.html || "",
      originalIndex: index
    };
  }

  function normalizePair(raw, index) {
    const source = Array.isArray(raw)
      ? { left: raw[0], right: raw[1] }
      : (raw || {});
    return {
      id: slug(source.id || `pair-${index + 1}`),
      left: source.left ?? source.stanga ?? source.termen ?? "",
      right: source.right ?? source.dreapta ?? source.corespondent ?? "",
      value: String(
        source.value ?? source.rightValue ??
        source.right ?? source.dreapta ?? index
      )
    };
  }

  function normalizeQuestion(raw, index, config) {
    const source = raw || {};
    const type = normalizeType(source.tip || source.type);
    let options = array(source.optiuni || source.options).map(normalizeOption);
    if (config.shuffleOptions && ["single", "multiple", "select"].includes(type)) {
      options = shuffle(options);
    }

    let correct = source.corect ?? source.correct ??
      source.raspunsCorect ?? source.answer ?? null;

    if (type === "single" && typeof correct === "number") {
      correct = options.find(item => item.originalIndex === correct)?.value ?? String(correct);
    }

    if (type === "multiple") {
      correct = array(correct).map(value => {
        if (typeof value === "number") {
          return options.find(item => item.originalIndex === value)?.value ?? String(value);
        }
        return String(value);
      });
    }

    if (type === "boolean") {
      correct = ["a", "adevarat", "true", "1", "da"].includes(normalizeText(correct))
        ? "true" : "false";
    }

    const hasAutoCriteria = source.acceptaOriceRaspuns || source.acceptAny ||
      source.cuvinteCheie || source.keywords ||
      source.raspunsuriAcceptate || source.acceptedAnswers ||
      correct !== null;

    const defaultPoints = type === "open" && !hasAutoCriteria ? 0 : 1;

    return {
      id: slug(source.id || `q${index + 1}`),
      number: index + 1,
      type,
      prompt: source.intrebare ?? source.question ?? source.prompt ?? "",
      promptHtml: source.intrebareHtml || source.questionHtml || source.promptHtml || "",
      instruction: source.instructiune || source.instruction || "",
      options,
      pairs: array(source.perechi || source.pairs).map(normalizePair),
      correct,
      accepted: array(source.raspunsuriAcceptate || source.acceptedAnswers),
      keywords: array(source.cuvinteCheie || source.keywords),
      minimumKeywords: source.numarMinimCuvinteCheie ?? source.minimumKeywords ?? null,
      acceptAny: source.acceptaOriceRaspuns ?? source.acceptAny ?? false,
      tolerance: Number(source.toleranta ?? source.tolerance ?? 0.01) || 0.01,
      relativeTolerance: Number(
        source.tolerantaRelativa ?? source.relativeTolerance ?? 0
      ) || 0,
      unit: source.unitate || source.unit || "",
      points: Math.max(0, Number(source.punctaj ?? source.points ?? defaultPoints) || 0),
      explanation: source.explicatie || source.explanation || "",
      correctMessage: source.mesajCorect || source.correctMessage || "",
      incorrectMessage: source.mesajGresit || source.incorrectMessage || "",
      placeholder: source.placeholder || "",
      multiline: source.multilinie ?? source.multiline ?? type === "open",
      minimumLength: Math.max(0, Number(
        source.lungimeMinima ?? source.minimumLength ?? 1
      ) || 0),
      required: source.obligatoriu ?? source.required ?? true,
      image: source.imagine || source.image || "",
      imageAlt: source.imagineAlt || source.imageAlt ||
        `Imagine pentru întrebarea ${index + 1}`
    };
  }

  function normalizeStudentField(raw, index) {
    const source = typeof raw === "string" ? { id: raw, label: raw } : (raw || {});
    return {
      id: slug(source.id || source.name || `field-${index + 1}`),
      label: source.label || source.eticheta || source.id || `Câmp ${index + 1}`,
      type: source.type || source.tip || "text",
      required: source.required ?? source.obligatoriu ?? true,
      placeholder: source.placeholder || "",
      options: array(source.options || source.optiuni)
    };
  }

  function normalizeData(raw, root, options = {}) {
    const config = {
      ...DEFAULTS,
      ...(raw.config || {}),
      ...(options.config || {})
    };
    config.questionsPerPage = Math.max(1, Number(config.questionsPerPage) || 1);

    let questions = array(raw.intrebari || raw.questions || raw.itemi)
      .map((item, index) => normalizeQuestion(item, index, config));

    if (config.shuffleQuestions) questions = shuffle(questions);
    questions = questions.map((item, index) => ({ ...item, number: index + 1 }));

    return {
      id: String(raw.id || root.dataset.testId ||
        slug(raw.titlu || raw.title || document.title, "test")),
      title: raw.titlu || raw.title || "Test de evaluare",
      subtitle: raw.subtitlu || raw.subtitle || "",
      description: raw.descriere || raw.description || "",
      subject: raw.disciplina || raw.subject || "Fizică",
      className: raw.clasa || raw.className || "",
      chapter: raw.capitol || raw.chapter || "",
      durationMinutes: Math.max(0, Number(
        raw.durataMinute ?? raw.durationMinutes ?? 0
      ) || 0),
      instructions: array(raw.instructiuni || raw.instructions),
      studentFields: array(
        raw.campuriElev || raw.studentFields || raw.identificare
      ).map(normalizeStudentField),
      questions,
      links: raw.linkuri || raw.links || {},
      config
    };
  }

  function pagesOf(questions, size) {
    const pages = [];
    for (let i = 0; i < questions.length; i += size) {
      pages.push(questions.slice(i, i + size));
    }
    return pages;
  }

  function initialState(data) {
    return {
      version: 1,
      testId: data.id,
      status: "intro",
      currentPage: 0,
      student: {},
      answers: {},
      checked: {},
      startedAt: null,
      updatedAt: now(),
      submittedAt: null,
      timeRemaining: data.durationMinutes
        ? Math.round(data.durationMinutes * 60)
        : null,
      result: null
    };
  }

  function isAnswered(question, answer) {
    if (answer === null || answer === undefined) return false;
    if (question.type === "multiple") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (question.type === "matching") {
      return answer && typeof answer === "object" &&
        question.pairs.every(pair => String(answer[pair.id] ?? "").trim());
    }
    return String(answer).trim().length > 0;
  }

  function sameSet(left, right) {
    const a = new Set(array(left).map(String));
    const b = new Set(array(right).map(String));
    return a.size === b.size && [...a].every(value => b.has(value));
  }

  function evaluate(question, answer) {
    const answered = isAnswered(question, answer);
    const base = {
      answered,
      correct: false,
      earned: 0,
      maximum: question.points,
      autoGraded: true
    };
    if (!answered) return base;

    if (["single", "select"].includes(question.type)) {
      const correct = String(answer) === String(question.correct);
      return { ...base, correct, earned: correct ? question.points : 0 };
    }

    if (question.type === "multiple") {
      const correct = sameSet(answer, question.correct);
      return { ...base, correct, earned: correct ? question.points : 0 };
    }

    if (question.type === "boolean") {
      const value = ["a", "adevarat", "true", "1", "da"]
        .includes(normalizeText(answer)) ? "true" : "false";
      const correct = value === question.correct;
      return { ...base, correct, earned: correct ? question.points : 0 };
    }

    if (question.type === "numeric") {
      const value = normalizeNumber(answer);
      const expected = normalizeNumber(question.correct);
      if (!Number.isFinite(value) || !Number.isFinite(expected)) return base;
      const allowed = Math.max(
        question.tolerance,
        Math.abs(expected) * question.relativeTolerance
      );
      const correct = Math.abs(value - expected) <= allowed;
      return { ...base, correct, earned: correct ? question.points : 0 };
    }

    if (question.type === "matching") {
      if (!question.pairs.length) return base;
      const correctPairs = question.pairs.filter(
        pair => String(answer[pair.id] ?? "") === pair.value
      ).length;
      const ratio = correctPairs / question.pairs.length;
      return {
        ...base,
        correct: correctPairs === question.pairs.length,
        earned: round(question.points * ratio, 2),
        details: { correctPairs, totalPairs: question.pairs.length }
      };
    }

    const text = String(answer).trim();
    if (text.length < question.minimumLength) return base;
    if (question.acceptAny) {
      return { ...base, correct: true, earned: question.points };
    }

    const accepted = question.accepted.length
      ? question.accepted
      : (question.correct !== null ? [question.correct] : []);

    if (accepted.length) {
      const normalized = normalizeText(text);
      const correct = accepted.some(value => normalizeText(value) === normalized);
      return { ...base, correct, earned: correct ? question.points : 0 };
    }

    if (question.keywords.length) {
      const normalized = normalizeText(text);
      const matched = question.keywords.filter(
        word => normalized.includes(normalizeText(word))
      ).length;
      const required = question.minimumKeywords ?? question.keywords.length;
      const ratio = Math.min(1, matched / Math.max(required, 1));
      return {
        ...base,
        correct: matched >= required,
        earned: round(question.points * ratio, 2)
      };
    }

    return { ...base, autoGraded: false };
  }

  function calculateResult(data, state) {
    const evaluations = data.questions.map(question => ({
      questionId: question.id,
      ...evaluate(question, state.answers[question.id])
    }));
    const questionScore = evaluations.reduce((sum, item) => sum + item.earned, 0);
    const questionTotal = evaluations.reduce((sum, item) => sum + item.maximum, 0);
    const office = Math.max(0, Number(data.config.pointsByOffice) || 0);
    const score = questionScore + office;
    const total = questionTotal + office;
    const percent = total ? clamp(score / total * 100, 0, 100) : 0;
    const grade = Number(data.config.minimumGrade) +
      (Number(data.config.maximumGrade) - Number(data.config.minimumGrade)) *
      percent / 100;

    return {
      testId: data.id,
      title: data.title,
      score: round(score, 2),
      total: round(total, 2),
      percent: round(percent, 2),
      grade: round(grade, 2),
      passingGrade: Number(data.config.passingGrade),
      passed: grade >= Number(data.config.passingGrade),
      correctCount: evaluations.filter(item => item.correct).length,
      answeredCount: evaluations.filter(item => item.answered).length,
      totalQuestions: data.questions.length,
      manualReviewCount: evaluations.filter(item => !item.autoGraded).length,
      evaluations
    };
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:` +
      String(Math.floor(safe % 60)).padStart(2, "0");
  }

  class TestEngine {
    constructor(root, rawData, options = {}) {
      this.root = root;
      this.data = normalizeData(rawData, root, options);
      this.config = this.data.config;
      this.pages = pagesOf(this.data.questions, this.config.questionsPerPage);
      this.storageKey = STORAGE_PREFIX + this.data.id;
      this.state = initialState(this.data);
      this.savedAvailable = false;
      this.timerId = null;
      this.saveId = null;
      this.boundClick = this.onClick.bind(this);
      this.boundInput = this.onInput.bind(this);
      this.boundChange = this.onChange.bind(this);
      this.boundKeydown = this.onKeydown.bind(this);
      this.boundUnload = this.onUnload.bind(this);
    }

    init() {
      if (!this.data.questions.length) {
        throw new Error("Testul nu conține întrebări.");
      }

      this.root.classList.add("fg-test");
      this.root.dataset.testInitialized = "true";
      this.root.dataset.testId = this.data.id;

      if (this.config.injectStyles) injectStyles();
      if (this.config.restoreProgress) this.restore();

      this.render();
      this.bind();
      this.restoreValues();
      this.update({ announce: false, save: false });

      if (this.config.startImmediately && this.state.status === "intro") {
        this.start({ skipValidation: true });
      }

      emit("fizica:test-ready", this.publicState(), this.root);
      return this;
    }

    bind() {
      this.root.addEventListener("click", this.boundClick);
      this.root.addEventListener("input", this.boundInput);
      this.root.addEventListener("change", this.boundChange);
      if (this.config.keyboard) {
        document.addEventListener("keydown", this.boundKeydown);
      }
      window.addEventListener("beforeunload", this.boundUnload);
    }

    destroy() {
      this.stopTimer();
      this.root.removeEventListener("click", this.boundClick);
      this.root.removeEventListener("input", this.boundInput);
      this.root.removeEventListener("change", this.boundChange);
      document.removeEventListener("keydown", this.boundKeydown);
      window.removeEventListener("beforeunload", this.boundUnload);
      if (this.saveId) clearTimeout(this.saveId);
      instances.delete(this.root);
    }

    render() {
      this.root.innerHTML = `
        <div class="fg-test__shell">
          ${this.headerHtml()}
          <div class="fg-test__live" role="status" aria-live="polite"></div>
          ${this.introHtml()}
          ${this.questionsHtml()}
          <section class="fg-test__screen" data-screen="result" hidden>
            <div data-result></div>
          </section>
        </div>`;
    }

    headerHtml() {
      const meta = [
        this.data.className,
        this.data.chapter,
        `${this.data.questions.length} itemi`,
        this.data.durationMinutes ? `⏱ ${this.data.durationMinutes} min` : ""
      ].filter(Boolean);

      return `
        <header class="fg-test__header">
          <p class="fg-test__eyebrow">${escapeHtml(this.data.subject)} · Evaluare</p>
          <h1 class="fg-test__title">${escapeHtml(this.data.title)}</h1>
          ${this.data.subtitle
            ? `<p class="fg-test__subtitle">${escapeHtml(this.data.subtitle)}</p>`
            : ""}
          <div class="fg-test__meta">
            ${meta.map(item => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="fg-test__progress">
            <div class="fg-test__progress-row">
              <span>Progres</span>
              <strong data-progress-value>0%</strong>
            </div>
            <div class="fg-test__progress-track" role="progressbar"
                 aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                 data-progress-bar>
              <span class="fg-test__progress-fill" data-progress-fill></span>
            </div>
          </div>
        </header>`;
    }

    introHtml() {
      return `
        <section class="fg-test__screen" data-screen="intro">
          ${this.data.description
            ? `<p class="fg-test__description">${escapeHtml(this.data.description)}</p>`
            : ""}
          ${this.data.instructions.length
            ? `<section class="fg-test__instructions">
                 <h2>Instrucțiuni</h2>
                 <ul>${this.data.instructions
                   .map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
               </section>`
            : ""}
          ${this.data.studentFields.length
            ? `<form class="fg-test__student" novalidate>
                 <h2>Datele elevului</h2>
                 <div class="fg-test__field-grid">
                   ${this.data.studentFields.map(field => this.studentFieldHtml(field)).join("")}
                 </div>
               </form>`
            : ""}
          <div class="fg-test__message" data-intro-message role="alert"></div>
          <div class="fg-test__buttons">
            <button class="fg-test__button fg-test__button--primary fg-test__button--large"
                    type="button" data-action="start">Începe testul</button>
            ${this.savedAvailable
              ? `<button class="fg-test__button fg-test__button--secondary"
                         type="button" data-action="resume">Continuă testul salvat</button>
                 <button class="fg-test__button fg-test__button--ghost"
                         type="button" data-action="discard">Șterge progresul salvat</button>`
              : ""}
          </div>
        </section>`;
    }

    studentFieldHtml(field) {
      if (field.type === "select") {
        return `
          <label class="fg-test__field">
            <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
            <select data-student-field="${escapeHtml(field.id)}"
                    ${field.required ? "required" : ""}>
              <option value="">Alege...</option>
              ${field.options.map(option => {
                const value = typeof option === "object"
                  ? option.value ?? option.valoare ?? option.label ?? option.text
                  : option;
                const label = typeof option === "object"
                  ? option.label ?? option.text ?? option.value
                  : option;
                return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
              }).join("")}
            </select>
          </label>`;
      }

      return `
        <label class="fg-test__field">
          <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
          <input type="${escapeHtml(field.type)}"
                 placeholder="${escapeHtml(field.placeholder)}"
                 data-student-field="${escapeHtml(field.id)}"
                 ${field.required ? "required" : ""}>
        </label>`;
    }

    questionsHtml() {
      return `
        <section class="fg-test__screen" data-screen="questions" hidden>
          <div class="fg-test__toolbar">
            <span class="fg-test__pill" data-answered>
              0/${this.data.questions.length} răspunsuri
            </span>
            ${this.config.showTimer && this.data.durationMinutes
              ? `<div class="fg-test__timer" data-timer>
                   <span aria-hidden="true">⏱</span>
                   <output data-time>${formatTime(this.state.timeRemaining)}</output>
                 </div>`
              : ""}
            <span class="fg-test__pill" data-save-status>Progres local</span>
          </div>

          <div class="fg-test__pages">
            ${this.pages.map((page, index) => this.pageHtml(page, index)).join("")}
          </div>

          <nav class="fg-test__nav" aria-label="Navigarea testului">
            <button class="fg-test__button fg-test__button--secondary"
                    type="button" data-action="previous">← Înapoi</button>
            <span class="fg-test__page-indicator" data-page-indicator>
              Pagina 1 din ${this.pages.length}
            </span>
            <button class="fg-test__button fg-test__button--primary"
                    type="button" data-action="next">Mergi mai departe →</button>
          </nav>
        </section>`;
    }

    pageHtml(page, index) {
      return `
        <section class="fg-test__page" data-page="${index}"
                 ${index ? "hidden" : ""}>
          ${page.map(question => this.questionHtml(question)).join("")}
          ${this.config.immediateFeedback
            ? `<button class="fg-test__button fg-test__button--check"
                       type="button" data-action="check-page"
                       data-page-index="${index}">Verifică pagina</button>`
            : ""}
        </section>`;
    }

    questionHtml(question) {
      return `
        <article class="fg-test__question"
                 data-question="${escapeHtml(question.id)}">
          <div class="fg-test__question-head">
            <span class="fg-test__number">${question.number}</span>
            ${this.config.showQuestionPoints
              ? `<span class="fg-test__pill">${question.points}
                   ${question.points === 1 ? "punct" : "puncte"}</span>`
              : ""}
          </div>
          <div class="fg-test__question-body">
            ${question.promptHtml
              ? `<div class="fg-test__prompt">${question.promptHtml}</div>`
              : `<p class="fg-test__prompt">${escapeHtml(question.prompt)}</p>`}
            ${question.instruction
              ? `<p class="fg-test__instruction">${escapeHtml(question.instruction)}</p>`
              : ""}
            ${question.image
              ? `<figure class="fg-test__figure">
                   <img src="${escapeHtml(question.image)}"
                        alt="${escapeHtml(question.imageAlt)}" loading="lazy">
                 </figure>`
              : ""}
            ${this.inputHtml(question)}
            <div class="fg-test__feedback"
                 data-feedback="${escapeHtml(question.id)}"
                 role="status" aria-live="polite"></div>
          </div>
        </article>`;
    }

    inputHtml(question) {
      const name = `${this.data.id}-${question.id}`;

      if (question.type === "single") {
        return `<fieldset class="fg-test__options">
          <legend class="fg-test__sr-only">${escapeHtml(question.prompt)}</legend>
          ${question.options.map((option, index) => `
            <label class="fg-test__option">
              <input type="radio" name="${escapeHtml(name)}"
                     value="${escapeHtml(option.value)}"
                     data-answer="${escapeHtml(question.id)}">
              <span><strong>${String.fromCharCode(65 + index)}.</strong>
                ${option.html || escapeHtml(option.text)}</span>
            </label>`).join("")}
        </fieldset>`;
      }

      if (question.type === "multiple") {
        return `<fieldset class="fg-test__options">
          <legend class="fg-test__sr-only">${escapeHtml(question.prompt)}</legend>
          ${question.options.map((option, index) => `
            <label class="fg-test__option">
              <input type="checkbox" value="${escapeHtml(option.value)}"
                     data-answer="${escapeHtml(question.id)}">
              <span><strong>${String.fromCharCode(65 + index)}.</strong>
                ${option.html || escapeHtml(option.text)}</span>
            </label>`).join("")}
        </fieldset>`;
      }

      if (question.type === "boolean") {
        return `<fieldset class="fg-test__options fg-test__options--two">
          <legend class="fg-test__sr-only">${escapeHtml(question.prompt)}</legend>
          <label class="fg-test__option">
            <input type="radio" name="${escapeHtml(name)}" value="true"
                   data-answer="${escapeHtml(question.id)}">
            <span>Adevărat</span>
          </label>
          <label class="fg-test__option">
            <input type="radio" name="${escapeHtml(name)}" value="false"
                   data-answer="${escapeHtml(question.id)}">
            <span>Fals</span>
          </label>
        </fieldset>`;
      }

      if (question.type === "select") {
        return `<label class="fg-test__field">
          <span class="fg-test__sr-only">Răspuns</span>
          <select data-answer="${escapeHtml(question.id)}">
            <option value="">Alege varianta...</option>
            ${question.options.map(option =>
              `<option value="${escapeHtml(option.value)}">${escapeHtml(option.text)}</option>`
            ).join("")}
          </select>
        </label>`;
      }

      if (question.type === "matching") {
        const right = shuffle(question.pairs.map(pair => ({
          value: pair.value,
          label: pair.right
        })));
        return `<div class="fg-test__matching">
          ${question.pairs.map(pair => `
            <div class="fg-test__matching-row">
              <span>${escapeHtml(pair.left)}</span>
              <span aria-hidden="true">↔</span>
              <label>
                <span class="fg-test__sr-only">Asociere pentru ${escapeHtml(pair.left)}</span>
                <select data-answer="${escapeHtml(question.id)}"
                        data-pair="${escapeHtml(pair.id)}">
                  <option value="">Alege...</option>
                  ${right.map(option =>
                    `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
                  ).join("")}
                </select>
              </label>
            </div>`).join("")}
        </div>`;
      }

      if (question.multiline || question.type === "open") {
        return `<label class="fg-test__field">
          <span class="fg-test__sr-only">Răspuns</span>
          <textarea rows="5" placeholder="${escapeHtml(question.placeholder)}"
                    data-answer="${escapeHtml(question.id)}"></textarea>
        </label>`;
      }

      return `<label class="fg-test__field">
        <span class="fg-test__sr-only">Răspuns</span>
        <div class="fg-test__answer-row">
          <input type="text" ${question.type === "numeric" ? 'inputmode="decimal"' : ""}
                 placeholder="${escapeHtml(question.placeholder)}"
                 data-answer="${escapeHtml(question.id)}">
          ${question.unit ? `<span class="fg-test__unit">${escapeHtml(question.unit)}</span>` : ""}
        </div>
      </label>`;
    }

    onClick(event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      if (action === "start") this.start();
      else if (action === "resume") this.resume();
      else if (action === "discard") this.discardSaved();
      else if (action === "previous") this.previousPage();
      else if (action === "next") this.nextPage();
      else if (action === "submit") this.submit();
      else if (action === "check-page") {
        this.checkPage(Number(button.dataset.pageIndex));
      } else if (action === "restart") this.reset();
      else if (action === "print") window.print();
      else if (action === "go-question") this.goToQuestion(button.dataset.questionId);
    }

    onInput(event) {
      const studentId = event.target.dataset.studentField;
      if (studentId) {
        this.state.student[studentId] = event.target.value;
        this.touch();
        return;
      }

      const id = event.target.dataset.answer;
      if (!id) return;
      const question = this.question(id);
      if (!question || ["single", "multiple", "boolean", "select", "matching"].includes(question.type)) {
        return;
      }
      this.setAnswer(question, event.target.value);
    }

    onChange(event) {
      const studentId = event.target.dataset.studentField;
      if (studentId) {
        this.state.student[studentId] = event.target.value;
        this.touch();
        return;
      }

      const id = event.target.dataset.answer;
      if (!id) return;
      const question = this.question(id);
      if (!question) return;

      if (question.type === "multiple") {
        const values = [...this.root.querySelectorAll(
          `[data-answer="${cssEscape(id)}"]:checked`
        )].map(input => input.value);
        this.setAnswer(question, values);
        return;
      }

      if (question.type === "matching") {
        const value = {};
        this.root.querySelectorAll(
          `[data-answer="${cssEscape(id)}"][data-pair]`
        ).forEach(select => {
          value[select.dataset.pair] = select.value;
        });
        this.setAnswer(question, value);
        return;
      }

      this.setAnswer(question, event.target.value);
    }

    onKeydown(event) {
      if (this.state.status !== "running" || !event.altKey) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        this.nextPage();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.previousPage();
      }
    }

    onUnload() {
      if (this.state.status === "running") this.save({ silent: true });
    }

    question(id) {
      return this.data.questions.find(item => item.id === id) || null;
    }

    setAnswer(question, answer) {
      if (this.config.lockAfterCheck && this.state.checked[question.id]) return;
      this.state.answers[question.id] = clone(answer);
      this.touch();
      this.saveDebounced();
      this.updateAnswered();
      this.updateProgress();
      emit("fizica:test-answer-change", {
        testId: this.data.id,
        questionId: question.id,
        answered: isAnswered(question, answer),
        answeredCount: this.answeredCount(),
        totalQuestions: this.data.questions.length
      }, this.root);
    }

    captureStudent() {
      this.root.querySelectorAll("[data-student-field]").forEach(field => {
        this.state.student[field.dataset.studentField] = field.value;
      });
    }

    validateStudent() {
      const errors = [];
      this.data.studentFields.forEach(field => {
        const value = String(this.state.student[field.id] ?? "").trim();
        if (field.required && !value) {
          errors.push(`Completează câmpul „${field.label}”.`);
        }
      });
      return errors;
    }

    start(options = {}) {
      this.captureStudent();
      const errors = options.skipValidation ? [] : this.validateStudent();

      if (errors.length) {
        const message = this.root.querySelector("[data-intro-message]");
        message.className = "fg-test__message is-error";
        message.innerHTML = `<strong>Completează datele necesare.</strong>
          <ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
        this.root.querySelector("[data-student-field]:invalid")?.focus();
        return false;
      }

      this.state.status = "running";
      this.state.startedAt ||= now();
      this.state.submittedAt = null;
      this.state.result = null;
      this.showScreen("questions");
      this.update({ announce: true, save: true });
      this.startTimer();

      emit("fizica:test-start", {
        testId: this.data.id,
        title: this.data.title,
        student: clone(this.state.student),
        startedAt: this.state.startedAt,
        totalQuestions: this.data.questions.length
      }, this.root);
      return true;
    }

    resume() {
      if (!this.savedAvailable) return false;
      this.state.status = "running";
      this.showScreen("questions");
      this.restoreValues();
      this.update({ announce: true, save: false });
      this.startTimer();
      emit("fizica:test-start", {
        testId: this.data.id,
        resumed: true,
        startedAt: this.state.startedAt
      }, this.root);
      return true;
    }

    goToPage(index, options = {}) {
      if (this.state.status !== "running") return false;
      const target = clamp(Number(index) || 0, 0, this.pages.length - 1);
      if (target < this.state.currentPage && !this.config.allowBack) return false;

      if (target > this.state.currentPage && this.config.immediateFeedback) {
        const checked = this.checkPage(this.state.currentPage, { scroll: false });
        if (this.config.requireAllAnswers && !checked.allAnswered) {
          this.announce("Răspunde la toate întrebările paginii înainte de a continua.");
          this.focusFirstUnanswered(this.state.currentPage);
          return false;
        }
      }

      this.state.currentPage = target;
      this.touch();

      if (this.config.updateHash) {
        history.replaceState(null, "", `#pagina-${target + 1}`);
      }

      this.update({
        announce: options.announce !== false,
        save: options.save !== false
      });
      return true;
    }

    nextPage() {
      if (this.state.currentPage >= this.pages.length - 1) {
        return this.submit();
      }
      return this.goToPage(this.state.currentPage + 1);
    }

    previousPage() {
      if (this.state.currentPage <= 0 || !this.config.allowBack) return false;
      return this.goToPage(this.state.currentPage - 1);
    }

    goToQuestion(id) {
      const index = this.data.questions.findIndex(item => item.id === id);
      if (index < 0) return;
      this.goToPage(Math.floor(index / this.config.questionsPerPage));
      requestAnimationFrame(() => {
        this.root.querySelector(`[data-question="${cssEscape(id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    checkPage(index, options = {}) {
      const page = this.pages[index] || [];
      const evaluations = page.map(question => {
        const result = evaluate(question, this.state.answers[question.id]);
        this.state.checked[question.id] = true;
        this.showFeedback(question, result);
        if (this.config.lockAfterCheck) this.lock(question.id);
        return { question, ...result };
      });

      this.touch();
      this.save();

      const allAnswered = evaluations.every(
        item => item.answered || !item.question.required
      );

      if (options.scroll !== false) {
        const first = evaluations.find(item => !item.correct);
        if (first) {
          this.root.querySelector(`[data-question="${cssEscape(first.question.id)}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      return { allAnswered, evaluations };
    }

    showFeedback(question, result) {
      const feedback = this.root.querySelector(
        `[data-feedback="${cssEscape(question.id)}"]`
      );
      if (!feedback) return;

      if (!result.answered) {
        feedback.className = "fg-test__feedback is-warning";
        feedback.textContent = "Completează un răspuns.";
        return;
      }

      if (!result.autoGraded) {
        feedback.className = "fg-test__feedback is-neutral";
        feedback.innerHTML = `<strong>Răspuns înregistrat.</strong>
          <p>Acest item necesită verificarea profesorului.</p>`;
        return;
      }

      feedback.className = `fg-test__feedback ${
        result.correct ? "is-correct" : "is-incorrect"
      }`;

      const heading = result.correct
        ? (question.correctMessage || "✓ Corect.")
        : (question.incorrectMessage || "✗ Răspuns incorect.");

      feedback.innerHTML = `<strong>${escapeHtml(heading)}</strong>
        ${this.config.showExplanations && question.explanation
          ? `<p>${escapeHtml(question.explanation)}</p>`
          : ""}`;
    }

    lock(id) {
      this.root.querySelectorAll(`[data-answer="${cssEscape(id)}"]`)
        .forEach(control => { control.disabled = true; });
    }

    unanswered() {
      return this.data.questions.filter(question =>
        question.required && !isAnswered(question, this.state.answers[question.id])
      );
    }

    submit(options = {}) {
      if (this.state.status !== "running") return false;

      const missing = this.unanswered();
      if (this.config.requireAllAnswers && missing.length && !options.timeout) {
        this.showMissing(missing);
        this.goToQuestion(missing[0].id);
        return false;
      }

      if (
        this.config.confirmBeforeSubmit &&
        !options.skipConfirm &&
        !options.timeout &&
        !window.confirm(
          "Sigur dorești să finalizezi testul? Răspunsurile nu vor mai putea fi modificate."
        )
      ) {
        return false;
      }

      this.stopTimer();
      const result = calculateResult(this.data, this.state);
      this.state.status = "submitted";
      this.state.submittedAt = now();
      this.state.result = result;
      this.touch();
      this.clearSaved();
      this.showScreen("result");
      this.renderResult(result);
      this.updateProgress();
      this.typesetMath();

      emit("fizica:test-complete", {
        testId: this.data.id,
        id: this.data.id,
        title: this.data.title,
        score: result.score,
        total: result.total,
        percent: result.percent,
        grade: result.grade,
        passed: result.passed,
        correctCount: result.correctCount,
        answeredCount: result.answeredCount,
        totalQuestions: result.totalQuestions,
        manualReviewCount: result.manualReviewCount,
        student: clone(this.state.student),
        startedAt: this.state.startedAt,
        completedAt: this.state.submittedAt,
        timeout: Boolean(options.timeout),
        route: window.location.pathname,
        result: this.getResult({ includeEvaluations: true })
      }, this.root);

      this.announce(`Test finalizat. Nota este ${result.grade}.`);
      return true;
    }

    showMissing(missing) {
      const page = this.root.querySelector(
        `[data-page="${this.state.currentPage}"]`
      );
      if (!page) return;

      let box = page.querySelector("[data-missing]");
      if (!box) {
        box = document.createElement("div");
        box.dataset.missing = "true";
        box.className = "fg-test__missing";
        page.appendChild(box);
      }

      box.innerHTML = `<strong>Testul nu este complet.</strong>
        <p>Lipsesc ${missing.length} răspunsuri.</p>
        <div class="fg-test__missing-links">
          ${missing.map(question => `
            <button type="button" class="fg-test__missing-button"
                    data-action="go-question"
                    data-question-id="${escapeHtml(question.id)}">
              Itemul ${question.number}
            </button>`).join("")}
        </div>`;
    }

    renderResult(result) {
      const target = this.root.querySelector("[data-result]");
      if (!target) return;

      const review = this.data.questions.map(question => {
        const item = result.evaluations.find(
          evaluation => evaluation.questionId === question.id
        );
        const stateClass = !item.autoGraded
          ? "is-neutral"
          : (item.correct ? "is-correct" : "is-incorrect");

        return `<article class="fg-test__review-item ${stateClass}">
          <h3>Itemul ${question.number}</h3>
          <div>${question.promptHtml || escapeHtml(question.prompt)}</div>
          <p><strong>Punctaj:</strong> ${item.earned}/${item.maximum}</p>
          ${question.explanation && this.config.showExplanations
            ? `<p><strong>Explicație:</strong> ${escapeHtml(question.explanation)}</p>`
            : ""}
        </article>`;
      }).join("");

      target.innerHTML = `
        <section class="fg-test__result-summary">
          <p class="fg-test__eyebrow">Rezultat final</p>
          <div class="fg-test__grade">${escapeHtml(result.grade)}</div>
          <p class="fg-test__grade-label">Nota obținută</p>

          <div class="fg-test__result-grid">
            <div><strong>${result.score}/${result.total}</strong><span>Punctaj</span></div>
            <div><strong>${result.percent}%</strong><span>Procent</span></div>
            <div><strong>${result.correctCount}/${result.totalQuestions}</strong>
                 <span>Itemi corecți</span></div>
            <div><strong>${result.passed ? "Promovat" : "Mai exersează"}</strong>
                 <span>Prag: ${result.passingGrade}</span></div>
          </div>

          ${result.manualReviewCount
            ? `<div class="fg-test__notice">
                 ${result.manualReviewCount} itemi necesită verificarea profesorului.
                 Nota automată poate fi ajustată.
               </div>`
            : ""}
        </section>

        ${this.config.showCorrectAnswers
          ? `<section class="fg-test__review">
               <h2>Revizuirea răspunsurilor</h2>
               ${review}
             </section>`
          : ""}

        <div class="fg-test__buttons">
          ${this.config.allowRestart
            ? `<button class="fg-test__button fg-test__button--primary"
                       type="button" data-action="restart">Reia testul</button>`
            : ""}
          ${this.config.allowPrint
            ? `<button class="fg-test__button fg-test__button--secondary"
                       type="button" data-action="print">Tipărește rezultatul</button>`
            : ""}
          ${this.data.links.inapoi || this.data.links.back
            ? `<a class="fg-test__button fg-test__button--ghost"
                  href="${escapeHtml(this.data.links.inapoi || this.data.links.back)}">
                 Înapoi
               </a>`
            : ""}
        </div>`;
    }

    reset(options = {}) {
      if (
        options.confirm !== false &&
        this.state.status === "running" &&
        !window.confirm("Sigur dorești să reiei testul? Răspunsurile vor fi șterse.")
      ) {
        return false;
      }

      this.stopTimer();
      this.clearSaved();
      this.state = initialState(this.data);
      this.savedAvailable = false;
      this.render();
      this.update({ announce: false, save: false });

      if (this.config.startImmediately) {
        this.start({ skipValidation: true });
      }

      emit("fizica:test-reset", { testId: this.data.id }, this.root);
      return true;
    }

    discardSaved() {
      this.clearSaved();
      this.state = initialState(this.data);
      this.savedAvailable = false;
      this.render();
      this.update({ announce: false, save: false });
      this.announce("Progresul salvat a fost șters.");
    }

    showScreen(name) {
      this.root.querySelectorAll("[data-screen]").forEach(screen => {
        screen.hidden = screen.dataset.screen !== name;
      });
    }

    update(options = {}) {
      const announce = options.announce !== false;
      const shouldSave = options.save !== false;

      if (this.state.status === "intro") this.showScreen("intro");
      else if (this.state.status === "running") this.showScreen("questions");
      else this.showScreen("result");

      this.root.querySelectorAll("[data-page]").forEach(page => {
        const active = Number(page.dataset.page) === this.state.currentPage;
        page.hidden = !active;
        page.setAttribute("aria-hidden", String(!active));
      });

      const previous = this.root.querySelector('[data-action="previous"]');
      if (previous) {
        previous.disabled = this.state.currentPage === 0 || !this.config.allowBack;
      }

      const next = this.root.querySelector(
        '[data-action="next"], [data-action="submit"]'
      );
      if (next) {
        const last = this.state.currentPage === this.pages.length - 1;
        next.dataset.action = last ? "submit" : "next";
        next.innerHTML = last ? "Finalizează testul ✓" : "Mergi mai departe →";
      }

      const indicator = this.root.querySelector("[data-page-indicator]");
      if (indicator) {
        indicator.textContent =
          `Pagina ${this.state.currentPage + 1} din ${this.pages.length}`;
      }

      this.restoreValues();
      this.updateAnswered();
      this.updateProgress();
      this.updateTimer();

      if (shouldSave && this.state.status === "running") this.save();
      if (announce && this.state.status === "running") {
        this.announce(`Pagina ${this.state.currentPage + 1} din ${this.pages.length}.`);
      }

      this.typesetMath();
      emit("fizica:test-page-change", this.publicState(), this.root);
      emit("fizica:content-updated", { root: this.root, source: "test-engine" });
    }

    restoreValues() {
      this.root.querySelectorAll("[data-student-field]").forEach(field => {
        const value = this.state.student[field.dataset.studentField];
        if (value !== undefined) field.value = value;
      });

      this.data.questions.forEach(question => {
        const answer = this.state.answers[question.id];
        if (answer === undefined || answer === null) return;

        const controls = this.root.querySelectorAll(
          `[data-answer="${cssEscape(question.id)}"]`
        );

        if (question.type === "multiple") {
          controls.forEach(control => {
            control.checked = array(answer).map(String).includes(control.value);
          });
        } else if (["single", "boolean"].includes(question.type)) {
          controls.forEach(control => {
            control.checked = control.value === String(answer);
          });
        } else if (question.type === "matching") {
          controls.forEach(control => {
            control.value = answer[control.dataset.pair] ?? "";
          });
        } else if (controls[0]) {
          controls[0].value = String(answer);
        }

        if (this.config.immediateFeedback && this.state.checked[question.id]) {
          this.showFeedback(question, evaluate(question, answer));
          if (this.config.lockAfterCheck) this.lock(question.id);
        }
      });
    }

    answeredCount() {
      return this.data.questions.filter(question =>
        isAnswered(question, this.state.answers[question.id])
      ).length;
    }

    updateAnswered() {
      const target = this.root.querySelector("[data-answered]");
      if (target) {
        target.textContent =
          `${this.answeredCount()}/${this.data.questions.length} răspunsuri`;
      }
    }

    updateProgress() {
      const progress = this.state.status === "submitted"
        ? 100
        : (this.data.questions.length
          ? this.answeredCount() / this.data.questions.length * 100
          : 0);

      const value = this.root.querySelector("[data-progress-value]");
      const bar = this.root.querySelector("[data-progress-bar]");
      const fill = this.root.querySelector("[data-progress-fill]");

      if (value) value.textContent = `${Math.round(progress)}%`;
      if (bar) bar.setAttribute("aria-valuenow", String(Math.round(progress)));
      if (fill) fill.style.width = `${progress}%`;
    }

    startTimer() {
      if (!this.data.durationMinutes || this.timerId) return;
      this.timerId = setInterval(() => {
        this.state.timeRemaining = Math.max(0, this.state.timeRemaining - 1);
        this.updateTimer();

        if (this.state.timeRemaining % 15 === 0) this.save({ silent: true });

        if ([this.config.warningSeconds, this.config.dangerSeconds]
          .includes(this.state.timeRemaining)) {
          emit("fizica:test-time-warning", {
            testId: this.data.id,
            seconds: this.state.timeRemaining,
            level: this.state.timeRemaining <= this.config.dangerSeconds
              ? "danger" : "warning"
          }, this.root);
        }

        if (this.state.timeRemaining <= 0) {
          this.stopTimer();
          this.announce("Timpul s-a încheiat.");
          if (this.config.autoSubmitOnTimeout) {
            this.submit({ timeout: true, skipConfirm: true });
          }
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    updateTimer() {
      const timer = this.root.querySelector("[data-timer]");
      const output = this.root.querySelector("[data-time]");
      if (!timer || !output) return;

      output.textContent = formatTime(this.state.timeRemaining);
      timer.classList.toggle(
        "is-warning",
        this.state.timeRemaining > this.config.dangerSeconds &&
        this.state.timeRemaining <= this.config.warningSeconds
      );
      timer.classList.toggle(
        "is-danger",
        this.state.timeRemaining <= this.config.dangerSeconds
      );
    }

    focusFirstUnanswered(pageIndex) {
      const question = (this.pages[pageIndex] || []).find(item =>
        item.required && !isAnswered(item, this.state.answers[item.id])
      );
      if (question) {
        this.root.querySelector(`[data-answer="${cssEscape(question.id)}"]`)?.focus();
      }
    }

    touch() {
      this.state.updatedAt = now();
    }

    saveDebounced() {
      if (!this.config.saveProgress) return;
      clearTimeout(this.saveId);
      this.saveId = setTimeout(() => this.save(), 180);
    }

    save(options = {}) {
      if (!this.config.saveProgress || this.state.status !== "running") return false;
      try {
        this.touch();
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        if (!options.silent) this.saveStatus("Salvat local", "success");
        return true;
      } catch (error) {
        console.warn("[Fizica Galaction] Progresul testului nu a putut fi salvat.", error);
        if (!options.silent) this.saveStatus("Salvarea nu este disponibilă", "error");
        return false;
      }
    }

    restore() {
      try {
        const saved = parseJson(localStorage.getItem(this.storageKey));
        if (!saved || saved.testId !== this.data.id || saved.status === "submitted") {
          return false;
        }

        const age = Date.now() - Date.parse(saved.updatedAt || "");
        if (!Number.isFinite(age) ||
            age > this.config.maxSavedAgeHours * 3600000) {
          return false;
        }

        this.state = {
          ...initialState(this.data),
          ...saved,
          student: { ...(saved.student || {}) },
          answers: { ...(saved.answers || {}) },
          checked: { ...(saved.checked || {}) },
          currentPage: clamp(Number(saved.currentPage) || 0, 0, this.pages.length - 1)
        };
        this.savedAvailable = true;

        const match = location.hash.match(/^#pagina-(\d+)$/);
        if (this.config.updateHash && match) {
          this.state.currentPage = clamp(Number(match[1]) - 1, 0, this.pages.length - 1);
        }
        return true;
      } catch (_) {
        return false;
      }
    }

    clearSaved() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch (_) {
        // Finalizarea testului nu este blocată.
      }
      this.savedAvailable = false;
    }

    saveStatus(message, type) {
      const target = this.root.querySelector("[data-save-status]");
      if (!target) return;
      target.textContent = message;
      target.dataset.type = type;
      clearTimeout(this.statusId);
      this.statusId = setTimeout(() => {
        target.textContent = "Progres local";
        target.removeAttribute("data-type");
      }, 1600);
    }

    announce(message) {
      const live = this.root.querySelector(".fg-test__live");
      if (!live) return;
      live.textContent = "";
      requestAnimationFrame(() => { live.textContent = message; });
    }

    async typesetMath() {
      try {
        if (typeof APP.app?.typesetMath === "function") {
          await APP.app.typesetMath(this.root);
        } else if (typeof APP.utils?.afiseazaMathJax === "function") {
          await APP.utils.afiseazaMathJax(this.root);
        } else if (window.MathJax?.typesetPromise) {
          window.MathJax.typesetClear?.([this.root]);
          await window.MathJax.typesetPromise([this.root]);
        }
      } catch (error) {
        console.warn("[Fizica Galaction] MathJax nu a putut actualiza testul.", error);
      }
    }

    publicState() {
      return {
        testId: this.data.id,
        id: this.data.id,
        title: this.data.title,
        status: this.state.status,
        currentPage: this.state.currentPage,
        page: this.state.currentPage,
        totalPages: this.pages.length,
        answeredCount: this.answeredCount(),
        totalQuestions: this.data.questions.length,
        progress: this.data.questions.length
          ? round(this.answeredCount() / this.data.questions.length * 100, 2)
          : 0,
        timeRemaining: this.state.timeRemaining,
        completed: this.state.status === "submitted",
        updatedAt: this.state.updatedAt
      };
    }

    getResult(options = {}) {
      if (!this.state.result) return null;
      const result = {
        ...clone(this.state.result),
        student: clone(this.state.student),
        startedAt: this.state.startedAt,
        submittedAt: this.state.submittedAt,
        answers: clone(this.state.answers)
      };
      if (!options.includeEvaluations) delete result.evaluations;
      return result;
    }
  }

  function injectStyles() {
    if (document.getElementById("fg-test-engine-styles")) return;

    const style = document.createElement("style");
    style.id = "fg-test-engine-styles";
    style.textContent = `
      .fg-test {
        --t-surface: var(--surface, #ffffff);
        --t-soft: var(--surface-soft, #f1f5f9);
        --t-text: var(--text, #172033);
        --t-muted: var(--muted-text, #475569);
        --t-border: var(--border, #cbd5e1);
        --t-primary: var(--primary, #0369a1);
        --t-primary-text: #ffffff;
        --t-success: #166534;
        --t-success-bg: #dcfce7;
        --t-danger: #991b1b;
        --t-danger-bg: #fee2e2;
        --t-warning: #854d0e;
        --t-warning-bg: #fef9c3;
        color: var(--t-text);
        font: inherit;
        line-height: 1.6;
      }

      body.dark .fg-test,
      [data-theme="dark"] .fg-test {
        --t-surface: #1e293b;
        --t-soft: #0f172a;
        --t-text: #f8fafc;
        --t-muted: #cbd5e1;
        --t-border: #475569;
        --t-primary: #38bdf8;
        --t-primary-text: #082f49;
        --t-success: #bbf7d0;
        --t-success-bg: #14532d;
        --t-danger: #fecaca;
        --t-danger-bg: #7f1d1d;
        --t-warning: #fef08a;
        --t-warning-bg: #713f12;
      }

      .fg-test *,
      .fg-test *::before,
      .fg-test *::after {
        box-sizing: border-box;
      }

      .fg-test__shell {
        margin-inline: auto;
        max-width: 900px;
        padding: clamp(12px, 3vw, 28px);
      }

      .fg-test__header,
      .fg-test__screen,
      .fg-test__question,
      .fg-test__result-summary,
      .fg-test__review {
        background: var(--t-surface);
        border: 1px solid var(--t-border);
        border-radius: 18px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      }

      .fg-test__header,
      .fg-test__screen {
        margin-block: 18px;
        padding: clamp(18px, 4vw, 32px);
      }

      .fg-test__header {
        border-top: 5px solid var(--t-primary);
      }

      .fg-test__eyebrow {
        color: var(--t-primary);
        font-size: .86rem;
        font-weight: 800;
        letter-spacing: .08em;
        margin: 0 0 5px;
        text-transform: uppercase;
      }

      .fg-test__title {
        font-size: clamp(1.65rem, 4vw, 2.6rem);
        line-height: 1.18;
        margin: 0;
      }

      .fg-test__subtitle,
      .fg-test__description {
        color: var(--t-muted);
        font-size: 1.04rem;
      }

      .fg-test__meta,
      .fg-test__toolbar,
      .fg-test__buttons,
      .fg-test__missing-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .fg-test__meta {
        margin-top: 18px;
      }

      .fg-test__meta span,
      .fg-test__pill {
        background: var(--t-soft);
        border: 1px solid var(--t-border);
        border-radius: 999px;
        color: var(--t-muted);
        font-size: .88rem;
        font-weight: 750;
        padding: 6px 11px;
      }

      .fg-test__progress {
        margin-top: 22px;
      }

      .fg-test__progress-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 7px;
      }

      .fg-test__progress-track {
        background: var(--t-soft);
        border-radius: 999px;
        height: 12px;
        overflow: hidden;
      }

      .fg-test__progress-fill {
        background: var(--t-primary);
        display: block;
        height: 100%;
        transition: width 180ms ease;
        width: 0;
      }

      .fg-test__instructions {
        background: var(--t-soft);
        border-radius: 14px;
        margin-block: 18px;
        padding: 16px 18px;
      }

      .fg-test__field-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .fg-test__field {
        display: grid;
        font-weight: 750;
        gap: 7px;
      }

      .fg-test input[type="text"],
      .fg-test input[type="email"],
      .fg-test input[type="number"],
      .fg-test select,
      .fg-test textarea {
        background: var(--t-surface);
        border: 2px solid var(--t-border);
        border-radius: 11px;
        color: var(--t-text);
        font: inherit;
        min-height: 48px;
        padding: 10px 12px;
        width: 100%;
      }

      .fg-test textarea {
        line-height: 1.55;
        resize: vertical;
      }

      .fg-test__button,
      .fg-test__missing-button {
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

      .fg-test__button--primary,
      .fg-test__button--check {
        background: var(--t-primary);
        color: var(--t-primary-text);
      }

      .fg-test__button--secondary {
        background: var(--t-soft);
        border-color: var(--t-border);
        color: var(--t-text);
      }

      .fg-test__button--ghost {
        background: transparent;
        border-color: var(--t-border);
        color: var(--t-text);
      }

      .fg-test__button--large {
        font-size: 1.07rem;
        min-height: 54px;
      }

      .fg-test__button:disabled {
        cursor: not-allowed;
        opacity: .5;
      }

      .fg-test__button:focus-visible,
      .fg-test__missing-button:focus-visible,
      .fg-test input:focus-visible,
      .fg-test select:focus-visible,
      .fg-test textarea:focus-visible {
        outline: 3px solid var(--t-primary);
        outline-offset: 3px;
      }

      .fg-test__message.is-error,
      .fg-test__missing {
        background: var(--t-danger-bg);
        border-radius: 12px;
        color: var(--t-danger);
        margin-block: 16px;
        padding: 14px 16px;
      }

      .fg-test__toolbar {
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
      }

      .fg-test__timer {
        align-items: center;
        background: var(--t-soft);
        border: 2px solid var(--t-border);
        border-radius: 999px;
        display: inline-flex;
        font-size: 1.05rem;
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        gap: 7px;
        padding: 6px 12px;
      }

      .fg-test__timer.is-warning {
        background: var(--t-warning-bg);
        color: var(--t-warning);
      }

      .fg-test__timer.is-danger {
        background: var(--t-danger-bg);
        color: var(--t-danger);
      }

      .fg-test__question {
        margin-block: 16px;
        padding: clamp(16px, 4vw, 28px);
      }

      .fg-test__question-head {
        align-items: center;
        display: flex;
        justify-content: space-between;
        margin-bottom: 14px;
      }

      .fg-test__number {
        background: var(--t-primary);
        border-radius: 50%;
        color: var(--t-primary-text);
        display: grid;
        font-weight: 900;
        height: 42px;
        place-items: center;
        width: 42px;
      }

      .fg-test__prompt {
        font-size: clamp(1.05rem, 2.5vw, 1.2rem);
        font-weight: 750;
        margin-top: 0;
      }

      .fg-test__instruction {
        color: var(--t-muted);
        font-size: .94rem;
      }

      .fg-test__figure {
        margin: 18px auto;
        text-align: center;
      }

      .fg-test__figure img {
        border-radius: 12px;
        height: auto;
        max-width: 100%;
      }

      .fg-test__options {
        border: 0;
        display: grid;
        gap: 10px;
        margin: 15px 0;
        padding: 0;
      }

      .fg-test__options--two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .fg-test__option {
        align-items: flex-start;
        background: var(--t-soft);
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        gap: 12px;
        min-height: 50px;
        padding: 12px 14px;
      }

      .fg-test__option:hover,
      .fg-test__option:has(input:checked) {
        border-color: var(--t-primary);
      }

      .fg-test__option input {
        flex: 0 0 auto;
        height: 20px;
        margin-top: 2px;
        width: 20px;
      }

      .fg-test__answer-row {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .fg-test__unit {
        font-weight: 900;
      }

      .fg-test__matching {
        display: grid;
        gap: 11px;
      }

      .fg-test__matching-row {
        align-items: center;
        background: var(--t-soft);
        border-radius: 12px;
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(120px, 1fr) auto minmax(160px, 1fr);
        padding: 12px;
      }

      .fg-test__feedback {
        border-radius: 12px;
        margin-top: 13px;
      }

      .fg-test__feedback.is-correct,
      .fg-test__feedback.is-incorrect,
      .fg-test__feedback.is-warning,
      .fg-test__feedback.is-neutral {
        padding: 13px 15px;
      }

      .fg-test__feedback.is-correct {
        background: var(--t-success-bg);
        color: var(--t-success);
      }

      .fg-test__feedback.is-incorrect {
        background: var(--t-danger-bg);
        color: var(--t-danger);
      }

      .fg-test__feedback.is-warning {
        background: var(--t-warning-bg);
        color: var(--t-warning);
      }

      .fg-test__feedback.is-neutral {
        background: var(--t-soft);
        color: var(--t-muted);
      }

      .fg-test__nav {
        align-items: center;
        background: var(--t-surface);
        border-top: 1px solid var(--t-border);
        bottom: 0;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin: 24px -8px -12px;
        padding: 14px 8px 8px;
        position: sticky;
        z-index: 10;
      }

      .fg-test__page-indicator {
        color: var(--t-muted);
        font-weight: 800;
        text-align: center;
      }

      .fg-test__missing-button {
        background: var(--t-surface);
        border-color: currentColor;
        color: var(--t-danger);
        min-height: 42px;
        padding: 7px 11px;
      }

      .fg-test__result-summary,
      .fg-test__review {
        margin-block: 18px;
        padding: clamp(18px, 4vw, 30px);
      }

      .fg-test__result-summary {
        text-align: center;
      }

      .fg-test__grade {
        color: var(--t-primary);
        font-size: clamp(4rem, 15vw, 7rem);
        font-weight: 950;
        line-height: 1;
      }

      .fg-test__grade-label {
        color: var(--t-muted);
        font-weight: 750;
      }

      .fg-test__result-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        margin-top: 24px;
      }

      .fg-test__result-grid > div {
        background: var(--t-soft);
        border-radius: 12px;
        display: grid;
        gap: 4px;
        padding: 14px;
      }

      .fg-test__result-grid strong {
        font-size: 1.25rem;
      }

      .fg-test__result-grid span {
        color: var(--t-muted);
        font-size: .9rem;
      }

      .fg-test__notice {
        background: var(--t-warning-bg);
        border-radius: 12px;
        color: var(--t-warning);
        margin-top: 18px;
        padding: 14px;
      }

      .fg-test__review-item {
        border-left: 5px solid var(--t-border);
        border-radius: 10px;
        margin-block: 13px;
        padding: 13px 16px;
      }

      .fg-test__review-item.is-correct {
        background: var(--t-success-bg);
        border-color: var(--t-success);
      }

      .fg-test__review-item.is-incorrect {
        background: var(--t-danger-bg);
        border-color: var(--t-danger);
      }

      .fg-test__review-item.is-neutral {
        background: var(--t-soft);
      }

      [data-save-status][data-type="success"] {
        color: var(--t-success);
      }

      [data-save-status][data-type="error"] {
        color: var(--t-danger);
      }

      .fg-test__live,
      .fg-test__sr-only {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      @media (max-width: 640px) {
        .fg-test__shell {
          padding: 10px;
        }

        .fg-test__header,
        .fg-test__screen,
        .fg-test__question,
        .fg-test__result-summary,
        .fg-test__review {
          border-radius: 14px;
          padding: 18px;
        }

        .fg-test__options--two {
          grid-template-columns: 1fr;
        }

        .fg-test__matching-row {
          grid-template-columns: 1fr;
        }

        .fg-test__matching-row > span[aria-hidden="true"] {
          display: none;
        }

        .fg-test__nav {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .fg-test__page-indicator {
          grid-column: 1 / -1;
          grid-row: 1;
        }

        .fg-test__nav .fg-test__button,
        .fg-test__buttons .fg-test__button {
          width: 100%;
        }

        .fg-test__buttons {
          display: grid;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .fg-test *,
        .fg-test *::before,
        .fg-test *::after {
          scroll-behavior: auto !important;
          transition-duration: .01ms !important;
        }
      }

      @media print {
        .fg-test__header,
        [data-screen="intro"],
        [data-screen="questions"],
        .fg-test__buttons {
          display: none !important;
        }

        [data-screen="result"] {
          display: block !important;
        }

        .fg-test__result-summary,
        .fg-test__review {
          box-shadow: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function init(target = null, options = {}) {
    const root = resolveRoot(target);
    if (!root) return null;

    if (instances.has(root)) {
      activeInstance = instances.get(root);
      return activeInstance;
    }

    try {
      const rawData = await loadData(root, options);
      if (!rawData) {
        throw new Error(
          "Nu există date pentru test. Definește window.TEST_DATA sau data-test-source."
        );
      }

      const engine = new TestEngine(root, rawData, options);
      instances.set(root, engine);
      activeInstance = engine;
      return engine.init();
    } catch (error) {
      console.error("[Fizica Galaction] Testul nu a putut fi inițializat.", error);
      injectStyles();
      root.classList.add("fg-test");
      root.innerHTML = `
        <section class="fg-test__screen" role="alert">
          <h2>Testul nu a putut fi încărcat</h2>
          <p>${escapeHtml(error?.message || "A apărut o eroare necunoscută.")}</p>
        </section>`;
      emit("fizica:app-error", {
        modul: "test-engine",
        eroare: { message: error?.message || String(error) }
      }, root);
      return null;
    }
  }

  async function initAll(options = {}) {
    const roots = [...document.querySelectorAll(ROOT_SELECTOR)];
    const result = [];
    for (const root of roots) {
      const instance = await init(root, options);
      if (instance) result.push(instance);
    }
    return result;
  }

  const api = {
    init,
    initAll,

    getActiveInstance() {
      return activeInstance;
    },

    getInstance(target = null) {
      const root = resolveRoot(target);
      return root ? instances.get(root) || null : activeInstance;
    },

    start(options) {
      return activeInstance?.start?.(options);
    },

    nextPage() {
      return activeInstance?.nextPage?.();
    },

    previousPage() {
      return activeInstance?.previousPage?.();
    },

    goToPage(index, options) {
      return activeInstance?.goToPage?.(index, options);
    },

    checkPage(index, options) {
      return activeInstance?.checkPage?.(index, options);
    },

    submit(options) {
      return activeInstance?.submit?.(options);
    },

    reset(options) {
      return activeInstance?.reset?.(options);
    },

    save(options) {
      return activeInstance?.save?.(options);
    },

    getState() {
      return activeInstance?.publicState?.() || null;
    },

    getResult(options) {
      return activeInstance?.getResult?.(options) || null;
    },

    destroy(target = null) {
      const instance = this.getInstance(target);
      instance?.destroy?.();
      if (instance === activeInstance) activeInstance = null;
    },

    helpers: {
      normalizeText,
      normalizeNumber,
      normalizeType,
      evaluate,
      calculateResult,
      formatTime
    }
  };

  APP.testEngine = api;

  window.initTestEngine = function (options = {}) {
    return api.initAll(options);
  };
})();
