/**
 * lesson-viewer.js — Fizica Galaction
 *
 * Motor central pentru lecții organizate pe pagini.
 *
 * Folosește stilurile din:
 *   assets/css/lessons.css
 *
 * Încărcare recomandată:
 *
 * <body data-page-type="lesson">
 *   <main
 *     id="lessonApp"
 *     data-lesson-viewer
 *     data-lesson-id="clasa7-energia-cinetica">
 *   </main>
 *
 *   <script src="../../../assets/js/progress.js"></script>
 *   <script src="../../../assets/js/lesson-viewer.js"></script>
 *   <script src="../../../assets/data/lectii/energia-cinetica.js"></script>
 *   <script src="../../../assets/js/app.js"></script>
 * </body>
 *
 * Date minimale:
 *
 * window.LESSON_DATA = {
 *   id: "clasa7-energia-cinetica",
 *   titlu: "Energia cinetică",
 *   capitol: "Energia mecanică",
 *   pagini: [
 *     {
 *       titlu: "Definiție",
 *       paragrafe: [
 *         "Energia cinetică este energia unui corp aflat în mișcare."
 *       ],
 *       formula: String.raw`\[
 *         E_c=\frac{mv^2}{2}
 *       \]`
 *     }
 *   ]
 * };
 *
 * Modulul poate îmbunătăți și pagini HTML deja construite dacă acestea
 * conțin elemente [data-lesson-page] sau .lesson-page.
 *
 * API:
 *
 * FizicaGalaction.lessonViewer.init()
 * FizicaGalaction.lessonViewer.nextPage()
 * FizicaGalaction.lessonViewer.previousPage()
 * FizicaGalaction.lessonViewer.goToPage(index)
 * FizicaGalaction.lessonViewer.complete()
 * FizicaGalaction.lessonViewer.reset()
 * FizicaGalaction.lessonViewer.getState()
 *
 * Evenimente:
 *
 * fizica:lesson-ready
 * fizica:lesson-page-change
 * fizica:lesson-answer-checked
 * fizica:lesson-complete
 * fizica:lesson-reset
 */

(function () {
  "use strict";

  const APP_NAME = "Fizica Galaction";
  const STORAGE_PREFIX = "fizica-galaction:lesson:";
  const ROOT_SELECTOR = [
    "[data-lesson-viewer]",
    "#lessonApp",
    "#lesson-app",
    ".lesson-container",
    ".mobile-lesson",
    ".paged-app"
  ].join(",");

  const PAGE_SELECTOR =
    "[data-lesson-page], .lesson-page";

  const DEFAULTS = Object.freeze({
    saveProgress: true,
    restoreProgress: true,
    updateHash: true,
    keyboard: true,
    requireQuickCheckBeforeNext: false,
    showProgress: true,
    showHeader: true,
    showControls: true,
    scrollToTop: true,
    autoTypesetMath: true,
    allowPrevious: true,
    finishLabel: "Finalizează lecția",
    nextLabel: "Mergi mai departe",
    previousLabel: "Înapoi"
  });

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  const instances = new WeakMap();
  let activeInstance = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {
        // Continuă cu JSON.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
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
    const text = String(value ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");

    return text ? Number(text) : Number.NaN;
  }

  function slugify(value, fallback = "element") {
    return normalizeText(value)
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    return value === undefined || value === null
      ? []
      : [value];
  }

  function safeJsonParse(raw, fallback = null) {
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(String(value));
    }

    return String(value).replace(/["\\]/g, "\\$&");
  }

  function emit(name, detail, root = null) {
    const event = new CustomEvent(name, {
      detail: clone(detail),
      bubbles: true
    });

    (root || document).dispatchEvent(event);
  }

  function resolveRoot(target) {
    if (target instanceof Element) {
      return target;
    }

    if (typeof target === "string" && target.trim()) {
      return document.querySelector(target);
    }

    return document.querySelector(ROOT_SELECTOR);
  }

  async function loadData(root, options = {}) {
    if (options.data && typeof options.data === "object") {
      return options.data;
    }

    if (
      window.LESSON_DATA &&
      typeof window.LESSON_DATA === "object"
    ) {
      return window.LESSON_DATA;
    }

    if (
      window.LECTIE_DATA &&
      typeof window.LECTIE_DATA === "object"
    ) {
      return window.LECTIE_DATA;
    }

    const inline = safeJsonParse(
      root.dataset.lessonData
    );

    if (inline) {
      return inline;
    }

    const source =
      options.source ||
      root.dataset.lessonSource ||
      root.dataset.source;

    if (!source) {
      return null;
    }

    const response = await fetch(source, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(
        `Datele lecției nu au putut fi încărcate (${response.status}).`
      );
    }

    return response.json();
  }

  function normalizeOption(raw, index) {
    if (
      typeof raw === "string" ||
      typeof raw === "number"
    ) {
      return {
        value: String(index),
        text: String(raw),
        html: "",
        originalIndex: index
      };
    }

    const source = raw || {};

    return {
      value: String(
        source.value ??
        source.valoare ??
        index
      ),
      text:
        source.text ??
        source.label ??
        source.eticheta ??
        "",
      html: source.html || "",
      originalIndex: index
    };
  }

  function normalizeCheck(raw, pageIndex) {
    if (!raw) {
      return null;
    }

    const source =
      typeof raw === "string"
        ? {
            intrebare: raw,
            tip: "text"
          }
        : raw;

    const options = toArray(
      source.optiuni ||
      source.options
    ).map(normalizeOption);

    let type = normalizeText(
      source.tip ||
      source.type ||
      (options.length
        ? "single-choice"
        : "text")
    ).replace(/\s+/g, "-");

    const aliases = {
      alegere: "single-choice",
      "alegere-simpla": "single-choice",
      radio: "single-choice",
      choice: "single-choice",
      "single-choice": "single-choice",
      "adevarat-fals": "true-false",
      "adevărat-fals": "true-false",
      boolean: "true-false",
      "true-false": "true-false",
      completare: "text",
      text: "text",
      numeric: "numeric",
      number: "numeric"
    };

    type = aliases[type] || "text";

    let correct =
      source.corect ??
      source.correct ??
      source.raspunsCorect ??
      source.answer ??
      null;

    if (
      type === "single-choice" &&
      typeof correct === "number"
    ) {
      correct =
        options.find(
          (option) =>
            option.originalIndex === correct
        )?.value ?? String(correct);
    }

    if (type === "true-false") {
      correct = [
        "a",
        "adevarat",
        "true",
        "1",
        "da"
      ].includes(normalizeText(correct))
        ? "true"
        : "false";
    }

    return {
      id: slugify(
        source.id ||
        `verificare-pagina-${pageIndex + 1}`,
        `verificare-pagina-${pageIndex + 1}`
      ),
      title:
        source.titlu ||
        source.title ||
        "Verificare rapidă",
      question:
        source.intrebare ||
        source.question ||
        source.prompt ||
        "",
      questionHtml:
        source.intrebareHtml ||
        source.questionHtml ||
        "",
      type,
      options,
      correct,
      acceptedAnswers: toArray(
        source.raspunsuriAcceptate ||
        source.acceptedAnswers
      ),
      tolerance:
        Number(
          source.toleranta ??
          source.tolerance ??
          0.01
        ) || 0.01,
      unit:
        source.unitate ||
        source.unit ||
        "",
      explanation:
        source.explicatie ||
        source.explanation ||
        "",
      required:
        source.obligatoriu ??
        source.required ??
        true
    };
  }

  function normalizePage(raw, index) {
    const source =
      typeof raw === "string"
        ? { continut: raw }
        : (raw || {});

    return {
      id: slugify(
        source.id ||
        `pagina-${index + 1}`,
        `pagina-${index + 1}`
      ),
      title:
        source.titlu ||
        source.title ||
        "",
      badge:
        source.eticheta ||
        source.badge ||
        "",
      type:
        source.tip ||
        source.type ||
        "continut",
      html:
        source.html ||
        source.continutHtml ||
        source.contentHtml ||
        "",
      text:
        source.continut ||
        source.content ||
        "",
      paragraphs: toArray(
        source.paragrafe ||
        source.paragraphs
      ),
      list: toArray(
        source.lista ||
        source.list
      ),
      orderedList: toArray(
        source.listaOrdonata ||
        source.orderedList
      ),
      formula:
        source.formula ||
        "",
      formulaTitle:
        source.titluFormula ||
        source.formulaTitle ||
        "",
      example:
        source.exemplu ||
        source.example ||
        "",
      note:
        source.observatie ||
        source.note ||
        "",
      warning:
        source.atentionare ||
        source.warning ||
        "",
      image:
        source.imagine ||
        source.image ||
        "",
      imageAlt:
        source.imagineAlt ||
        source.imageAlt ||
        source.titlu ||
        `Imagine pentru pagina ${index + 1}`,
      quickCheck: normalizeCheck(
        source.verificare ||
        source.verificareRapida ||
        source.quickCheck,
        index
      )
    };
  }

  function normalizeData(raw, root, options = {}) {
    const config = {
      ...DEFAULTS,
      ...(raw.config || {}),
      ...(options.config || {})
    };

    const id = String(
      raw.id ||
      root.dataset.lessonId ||
      slugify(
        raw.titlu ||
        raw.title ||
        document.title,
        "lectie"
      )
    );

    return {
      id,
      title:
        raw.titlu ||
        raw.title ||
        "Lecție de fizică",
      subtitle:
        raw.subtitlu ||
        raw.subtitle ||
        "",
      className:
        raw.clasa ||
        raw.className ||
        "",
      chapter:
        raw.capitol ||
        raw.chapter ||
        "",
      description:
        raw.descriere ||
        raw.description ||
        "",
      pages: toArray(
        raw.pagini ||
        raw.pages ||
        raw.secvente
      ).map(normalizePage),
      links:
        raw.linkuri ||
        raw.links ||
        {},
      config
    };
  }

  function initialState(data) {
    return {
      version: 1,
      lessonId: data.id,
      currentPage: 0,
      answers: {},
      checked: {},
      completed: false,
      startedAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null
    };
  }

  function evaluateCheck(check, answer) {
    if (
      answer === undefined ||
      answer === null ||
      String(answer).trim() === ""
    ) {
      return {
        answered: false,
        correct: false
      };
    }

    if (
      check.type === "single-choice"
    ) {
      return {
        answered: true,
        correct:
          String(answer) ===
          String(check.correct)
      };
    }

    if (check.type === "true-false") {
      const normalized = [
        "a",
        "adevarat",
        "true",
        "1",
        "da"
      ].includes(normalizeText(answer))
        ? "true"
        : "false";

      return {
        answered: true,
        correct:
          normalized === check.correct
      };
    }

    if (check.type === "numeric") {
      const value =
        normalizeNumber(answer);
      const expected =
        normalizeNumber(check.correct);

      return {
        answered:
          Number.isFinite(value),
        correct:
          Number.isFinite(value) &&
          Number.isFinite(expected) &&
          Math.abs(value - expected) <=
            check.tolerance
      };
    }

    const accepted =
      check.acceptedAnswers.length
        ? check.acceptedAnswers
        : [check.correct];

    const normalized =
      normalizeText(answer);

    return {
      answered: true,
      correct: accepted.some(
        (candidate) =>
          normalizeText(candidate) ===
          normalized
      )
    };
  }

  class LessonViewer {
    constructor(root, rawData, options = {}) {
      this.root = root;
      this.data = rawData
        ? normalizeData(
            rawData,
            root,
            options
          )
        : null;
      this.config =
        this.data?.config ||
        {
          ...DEFAULTS,
          ...(options.config || {})
        };
      this.storageKey =
        STORAGE_PREFIX +
        (
          this.data?.id ||
          root.dataset.lessonId ||
          slugify(document.title, "lectie")
        );
      this.state =
        this.data
          ? initialState(this.data)
          : null;
      this.pages = [];
      this.generated = Boolean(rawData);
      this.destroyed = false;

      this.boundClick =
        this.handleClick.bind(this);
      this.boundInput =
        this.handleInput.bind(this);
      this.boundChange =
        this.handleChange.bind(this);
      this.boundKeydown =
        this.handleKeydown.bind(this);
      this.boundUnload =
        this.handleUnload.bind(this);
    }

    init() {
      document.body.dataset.pageType =
        document.body.dataset.pageType ||
        "lesson";
      document.body.classList.add(
        "lesson-page"
      );

      this.root.dataset.lessonInitialized =
        "true";

      if (this.generated) {
        if (!this.data.pages.length) {
          throw new Error(
            "Lecția nu conține pagini."
          );
        }

        if (
          this.config.restoreProgress
        ) {
          this.restore();
        }

        this.renderGenerated();
      } else {
        this.prepareExistingMarkup();
      }

      this.bind();
      this.restoreAnswers();
      this.update({
        announce: false,
        save: false,
        scroll: false
      });

      emit(
        "fizica:lesson-ready",
        this.publicState(),
        this.root
      );

      return this;
    }

    renderGenerated() {
      this.root.classList.add(
        "lesson",
        "lesson-container"
      );
      this.root.dataset.lessonId =
        this.data.id;

      this.root.innerHTML = `
        ${
          this.config.showHeader
            ? this.headerHtml()
            : ""
        }

        <div
          class="lesson-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true">
        </div>

        <div class="lesson-pages">
          ${this.data.pages
            .map((page, index) =>
              this.pageHtml(page, index)
            )
            .join("")}
        </div>

        ${
          this.config.showProgress
            ? this.progressHtml()
            : ""
        }

        ${
          this.config.showControls
            ? this.controlsHtml()
            : ""
        }
      `;

      this.pages = Array.from(
        this.root.querySelectorAll(
          PAGE_SELECTOR
        )
      );
    }

    headerHtml() {
      const badges = [
        this.data.className,
        this.data.chapter
      ].filter(Boolean);

      return `
        <header class="lesson-header">
          ${
            badges.length
              ? `
                <div class="lesson-badges">
                  ${badges
                    .map(
                      (badge) => `
                        <span class="lesson-badge">
                          ${escapeHtml(badge)}
                        </span>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <h1>${escapeHtml(
            this.data.title
          )}</h1>

          ${
            this.data.subtitle
              ? `
                <p>
                  ${escapeHtml(
                    this.data.subtitle
                  )}
                </p>
              `
              : ""
          }

          ${
            this.data.description
              ? `
                <p>
                  ${escapeHtml(
                    this.data.description
                  )}
                </p>
              `
              : ""
          }
        </header>
      `;
    }

    pageHtml(page, index) {
      return `
        <section
          class="lesson-page"
          data-lesson-page
          data-page-index="${index}"
          data-page-id="${escapeHtml(
            page.id
          )}"
          ${
            index === 0
              ? ""
              : "hidden"
          }>
          <article class="lesson-card">
            ${
              page.badge
                ? `
                  <span class="page-chip">
                    ${escapeHtml(
                      page.badge
                    )}
                  </span>
                `
                : ""
            }

            ${
              page.title
                ? `
                  <h2>
                    ${escapeHtml(
                      page.title
                    )}
                  </h2>
                `
                : ""
            }

            ${this.pageContentHtml(page)}
          </article>
        </section>
      `;
    }

    pageContentHtml(page) {
      const parts = [];

      if (page.html) {
        parts.push(page.html);
      }

      if (page.text) {
        parts.push(
          `<p>${escapeHtml(
            page.text
          )}</p>`
        );
      }

      for (
        const paragraph
        of page.paragraphs
      ) {
        if (
          typeof paragraph === "object" &&
          paragraph.html
        ) {
          parts.push(
            `<p>${paragraph.html}</p>`
          );
        } else {
          parts.push(
            `<p>${escapeHtml(
              typeof paragraph === "object"
                ? paragraph.text ||
                  paragraph.continut ||
                  ""
                : paragraph
            )}</p>`
          );
        }
      }

      if (page.list.length) {
        parts.push(`
          <ul>
            ${page.list
              .map(
                (item) => `
                  <li>
                    ${escapeHtml(
                      typeof item === "object"
                        ? item.text ||
                          item.continut ||
                          ""
                        : item
                    )}
                  </li>
                `
              )
              .join("")}
          </ul>
        `);
      }

      if (page.orderedList.length) {
        parts.push(`
          <ol>
            ${page.orderedList
              .map(
                (item) => `
                  <li>
                    ${escapeHtml(
                      typeof item === "object"
                        ? item.text ||
                          item.continut ||
                          ""
                        : item
                    )}
                  </li>
                `
              )
              .join("")}
          </ol>
        `);
      }

      if (page.formula) {
        parts.push(`
          <section class="formula-box">
            ${
              page.formulaTitle
                ? `
                  <h3>
                    ${escapeHtml(
                      page.formulaTitle
                    )}
                  </h3>
                `
                : ""
            }
            <div class="math-box">
              ${page.formula}
            </div>
          </section>
        `);
      }

      if (page.example) {
        parts.push(`
          <div class="example">
            <strong>Exemplu:</strong>
            ${
              typeof page.example === "object"
                ? (
                    page.example.html ||
                    escapeHtml(
                      page.example.text ||
                      page.example.continut ||
                      ""
                    )
                  )
                : escapeHtml(
                    page.example
                  )
            }
          </div>
        `);
      }

      if (page.note) {
        parts.push(`
          <div class="notice">
            <strong>Observă:</strong>
            ${escapeHtml(page.note)}
          </div>
        `);
      }

      if (page.warning) {
        parts.push(`
          <div class="warning">
            <strong>Atenție:</strong>
            ${escapeHtml(page.warning)}
          </div>
        `);
      }

      if (page.image) {
        parts.push(`
          <figure class="lesson-figure">
            <img
              src="${escapeHtml(
                page.image
              )}"
              alt="${escapeHtml(
                page.imageAlt
              )}"
              loading="lazy">
          </figure>
        `);
      }

      if (page.quickCheck) {
        parts.push(
          this.quickCheckHtml(
            page.quickCheck
          )
        );
      }

      return parts.join("");
    }

    quickCheckHtml(check) {
      let input = "";

      if (
        check.type ===
        "single-choice"
      ) {
        input = `
          <fieldset
            class="answer-options"
            data-answer-options>
            <legend class="lesson-sr-only">
              ${escapeHtml(
                check.question
              )}
            </legend>

            ${check.options
              .map(
                (option, index) => `
                  <label
                    class="answer-option"
                    data-answer-option>
                    <input
                      type="radio"
                      name="${escapeHtml(
                        check.id
                      )}"
                      value="${escapeHtml(
                        option.value
                      )}"
                      data-quick-check-input="${escapeHtml(
                        check.id
                      )}">
                    <span>
                      <strong>
                        ${String.fromCharCode(
                          65 + index
                        )}.
                      </strong>
                      ${
                        option.html ||
                        escapeHtml(
                          option.text
                        )
                      }
                    </span>
                  </label>
                `
              )
              .join("")}
          </fieldset>
        `;
      } else if (
        check.type === "true-false"
      ) {
        input = `
          <div
            class="answer-options"
            data-answer-options>
            <label
              class="answer-option"
              data-answer-option>
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

            <label
              class="answer-option"
              data-answer-option>
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
          <div class="answer-row">
            <input
              type="text"
              ${
                check.type === "numeric"
                  ? 'inputmode="decimal"'
                  : ""
              }
              data-quick-check-input="${escapeHtml(
                check.id
              )}"
              aria-label="Răspuns">
            ${
              check.unit
                ? `
                  <span>
                    ${escapeHtml(
                      check.unit
                    )}
                  </span>
                `
                : ""
            }
          </div>
        `;
      }

      return `
        <section
          class="quick-check"
          data-quick-check="${escapeHtml(
            check.id
          )}">
          <h3>
            ${escapeHtml(check.title)}
          </h3>

          ${
            check.questionHtml
              ? `
                <div class="question-text">
                  ${check.questionHtml}
                </div>
              `
              : `
                <p class="question-text">
                  ${escapeHtml(
                    check.question
                  )}
                </p>
              `
          }

          ${input}

          <button
            type="button"
            class="check-button"
            data-check-answer="${escapeHtml(
              check.id
            )}">
            Verifică răspunsul
          </button>

          <div
            class="feedback boxed"
            data-check-feedback="${escapeHtml(
              check.id
            )}"
            role="status"
            aria-live="polite">
          </div>
        </section>
      `;
    }

    progressHtml() {
      return `
        <section
          class="lesson-progress"
          aria-label="Progresul lecției">
          <span data-lesson-counter>
            Pagina 1 din ${this.data.pages.length}
          </span>

          <progress
            data-lesson-progress
            max="${this.data.pages.length}"
            value="1">
          </progress>
        </section>
      `;
    }

    controlsHtml() {
      return `
        <nav
          class="lesson-controls"
          aria-label="Navigarea lecției">
          <button
            type="button"
            class="nav-button secondary"
            data-lesson-prev>
            ← ${escapeHtml(
              this.config.previousLabel
            )}
          </button>

          <button
            type="button"
            class="nav-button success"
            data-lesson-next>
            ${escapeHtml(
              this.config.nextLabel
            )} →
          </button>
        </nav>
      `;
    }

    prepareExistingMarkup() {
      this.pages = Array.from(
        this.root.querySelectorAll(
          PAGE_SELECTOR
        )
      );

      if (!this.pages.length) {
        throw new Error(
          "Nu au fost găsite pagini ale lecției."
        );
      }

      const lessonId =
        this.root.dataset.lessonId ||
        slugify(
          document.title,
          "lectie"
        );

      this.data = {
        id: lessonId,
        title:
          document.querySelector("h1")
            ?.textContent?.trim() ||
          document.title,
        className: "",
        chapter: "",
        pages: this.pages.map(
          (element, index) => ({
            id:
              element.dataset.pageId ||
              `pagina-${index + 1}`,
            title:
              element.querySelector(
                "h2, h3"
              )?.textContent?.trim() ||
              ""
          })
        ),
        links: {},
        config: this.config
      };

      this.storageKey =
        STORAGE_PREFIX + lessonId;
      this.state =
        initialState(this.data);

      if (
        this.config.restoreProgress
      ) {
        this.restore();
      }

      this.pages.forEach(
        (page, index) => {
          page.dataset.lessonPage = "";
          page.dataset.pageIndex =
            String(index);
        }
      );

      if (
        this.config.showProgress &&
        !this.root.querySelector(
          "[data-lesson-progress]"
        )
      ) {
        this.root.insertAdjacentHTML(
          "beforeend",
          this.progressHtml()
        );
      }

      if (
        this.config.showControls &&
        !this.root.querySelector(
          "[data-lesson-prev], [data-lesson-next]"
        )
      ) {
        this.root.insertAdjacentHTML(
          "beforeend",
          this.controlsHtml()
        );
      }

      if (
        !this.root.querySelector(
          ".lesson-live-region"
        )
      ) {
        this.root.insertAdjacentHTML(
          "afterbegin",
          `
            <div
              class="lesson-live-region"
              role="status"
              aria-live="polite"
              aria-atomic="true">
            </div>
          `
        );
      }
    }

    bind() {
      this.root.addEventListener(
        "click",
        this.boundClick
      );
      this.root.addEventListener(
        "input",
        this.boundInput
      );
      this.root.addEventListener(
        "change",
        this.boundChange
      );

      if (this.config.keyboard) {
        document.addEventListener(
          "keydown",
          this.boundKeydown
        );
      }

      window.addEventListener(
        "beforeunload",
        this.boundUnload
      );
    }

    destroy() {
      this.root.removeEventListener(
        "click",
        this.boundClick
      );
      this.root.removeEventListener(
        "input",
        this.boundInput
      );
      this.root.removeEventListener(
        "change",
        this.boundChange
      );
      document.removeEventListener(
        "keydown",
        this.boundKeydown
      );
      window.removeEventListener(
        "beforeunload",
        this.boundUnload
      );

      instances.delete(this.root);
      this.destroyed = true;
    }

    handleClick(event) {
      const previous =
        event.target.closest(
          "[data-lesson-prev], [data-nav-prev]"
        );

      if (previous) {
        this.previousPage();
        return;
      }

      const next =
        event.target.closest(
          "[data-lesson-next], [data-nav-next]"
        );

      if (next) {
        if (
          this.state.currentPage >=
          this.pages.length - 1
        ) {
          this.complete();
        } else {
          this.nextPage();
        }
        return;
      }

      const checkButton =
        event.target.closest(
          "[data-check-answer]"
        );

      if (checkButton) {
        this.checkAnswer(
          checkButton.dataset.checkAnswer
        );
      }
    }

    handleInput(event) {
      const checkId =
        event.target.dataset
          .quickCheckInput;

      if (!checkId) {
        return;
      }

      const check =
        this.findCheck(checkId);

      if (
        !check ||
        check.type ===
          "single-choice" ||
        check.type === "true-false"
      ) {
        return;
      }

      this.state.answers[checkId] =
        event.target.value;
      delete this.state.checked[checkId];
      this.clearFeedback(checkId);
      this.touch();
      this.save();
    }

    handleChange(event) {
      const checkId =
        event.target.dataset
          .quickCheckInput;

      if (!checkId) {
        return;
      }

      this.state.answers[checkId] =
        event.target.value;
      delete this.state.checked[checkId];
      this.clearFeedback(checkId);
      this.touch();
      this.save();
    }

    handleKeydown(event) {
      if (!event.altKey) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        if (
          this.state.currentPage <
          this.pages.length - 1
        ) {
          this.nextPage();
        }
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.previousPage();
      }
    }

    handleUnload() {
      this.save({
        silent: true
      });
    }

    findCheck(checkId) {
      return (
        this.data.pages
          .map((page) => page.quickCheck)
          .filter(Boolean)
          .find(
            (check) =>
              check.id === checkId
          ) || null
      );
    }

    currentCheck() {
      return (
        this.data.pages[
          this.state.currentPage
        ]?.quickCheck || null
      );
    }

    canContinue() {
      if (
        !this.config
          .requireQuickCheckBeforeNext
      ) {
        return true;
      }

      const check =
        this.currentCheck();

      if (!check || !check.required) {
        return true;
      }

      return Boolean(
        this.state.checked[
          check.id
        ]?.correct
      );
    }

    goToPage(index, options = {}) {
      const target = clamp(
        Number(index) || 0,
        0,
        this.pages.length - 1
      );

      if (
        target >
          this.state.currentPage &&
        !this.canContinue()
      ) {
        this.announce(
          "Rezolvă corect verificarea rapidă înainte de a continua."
        );

        const check =
          this.currentCheck();

        if (check) {
          this.root
            .querySelector(
              `[data-quick-check-input="${cssEscape(
                check.id
              )}"]`
            )
            ?.focus();
        }

        return false;
      }

      this.state.currentPage = target;
      this.touch();

      if (this.config.updateHash) {
        history.replaceState(
          null,
          "",
          `#pagina-${target + 1}`
        );
      }

      this.update({
        announce:
          options.announce !== false,
        save:
          options.save !== false,
        scroll:
          options.scroll !== false
      });

      return true;
    }

    nextPage() {
      if (
        this.state.currentPage >=
        this.pages.length - 1
      ) {
        return false;
      }

      return this.goToPage(
        this.state.currentPage + 1
      );
    }

    previousPage() {
      if (
        !this.config.allowPrevious ||
        this.state.currentPage <= 0
      ) {
        return false;
      }

      return this.goToPage(
        this.state.currentPage - 1
      );
    }

    checkAnswer(checkId) {
      const check =
        this.findCheck(checkId);

      if (!check) {
        return false;
      }

      let answer =
        this.state.answers[checkId];

      if (
        check.type ===
          "single-choice" ||
        check.type === "true-false"
      ) {
        answer =
          this.root.querySelector(
            `[data-quick-check-input="${cssEscape(
              checkId
            )}"]:checked`
          )?.value ?? "";
      } else {
        answer =
          this.root.querySelector(
            `[data-quick-check-input="${cssEscape(
              checkId
            )}"]`
          )?.value ?? "";
      }

      const result =
        evaluateCheck(check, answer);

      this.state.answers[checkId] =
        answer;
      this.state.checked[checkId] = {
        ...result,
        checkedAt: nowIso()
      };

      this.touch();
      this.showFeedback(
        check,
        result
      );
      this.save();

      emit(
        "fizica:lesson-answer-checked",
        {
          lessonId: this.data.id,
          checkId,
          answer,
          correct: result.correct
        },
        this.root
      );

      return result.correct;
    }

    showFeedback(check, result) {
      const feedback =
        this.root.querySelector(
          `[data-check-feedback="${cssEscape(
            check.id
          )}"]`
        );

      if (!feedback) {
        return;
      }

      feedback.className =
        "feedback boxed " +
        (
          result.correct
            ? "good corect"
            : "bad gresit"
        );

      if (!result.answered) {
        feedback.className =
          "feedback boxed bad gresit";
        feedback.innerHTML =
          "<strong>Completează un răspuns.</strong>";
        return;
      }

      feedback.innerHTML = `
        <strong>
          ${
            result.correct
              ? "✓ Corect."
              : "✗ Mai încearcă."
          }
        </strong>

        ${
          check.explanation
            ? `
              <p>
                ${escapeHtml(
                  check.explanation
                )}
              </p>
            `
            : ""
        }
      `;
    }

    clearFeedback(checkId) {
      const feedback =
        this.root.querySelector(
          `[data-check-feedback="${cssEscape(
            checkId
          )}"]`
        );

      if (!feedback) {
        return;
      }

      feedback.className =
        "feedback boxed";
      feedback.textContent = "";
    }

    restoreAnswers() {
      for (
        const [checkId, answer]
        of Object.entries(
          this.state.answers
        )
      ) {
        const check =
          this.findCheck(checkId);

        if (!check) {
          continue;
        }

        const controls =
          this.root.querySelectorAll(
            `[data-quick-check-input="${cssEscape(
              checkId
            )}"]`
          );

        if (
          check.type ===
            "single-choice" ||
          check.type === "true-false"
        ) {
          controls.forEach(
            (control) => {
              control.checked =
                control.value ===
                String(answer);
            }
          );
        } else if (controls[0]) {
          controls[0].value =
            String(answer ?? "");
        }

        const checked =
          this.state.checked[checkId];

        if (checked) {
          this.showFeedback(
            check,
            checked
          );
        }
      }
    }

    complete() {
      const currentCheck =
        this.currentCheck();

      if (
        this.config
          .requireQuickCheckBeforeNext &&
        currentCheck?.required &&
        !this.state.checked[
          currentCheck.id
        ]?.correct
      ) {
        this.announce(
          "Rezolvă corect verificarea rapidă înainte de finalizare."
        );
        return false;
      }

      this.state.completed = true;
      this.state.completedAt =
        this.state.completedAt ||
        nowIso();
      this.touch();
      this.save();

      const nextButton =
        this.root.querySelector(
          "[data-lesson-next], [data-nav-next]"
        );

      if (nextButton) {
        nextButton.textContent =
          "Lecție finalizată ✓";
        nextButton.disabled = true;
      }

      emit(
        "fizica:lesson-complete",
        {
          lessonId: this.data.id,
          id: this.data.id,
          title: this.data.title,
          currentPage:
            this.state.currentPage,
          totalPages:
            this.pages.length,
          progress: 100,
          completed: true,
          completedAt:
            this.state.completedAt,
          route:
            window.location.pathname
        },
        this.root
      );

      this.announce(
        "Lecția a fost finalizată."
      );

      const nextUrl =
        this.data.links
          .urmatoareaLectie ||
        this.data.links.next;

      if (nextUrl) {
        window.location.href =
          nextUrl;
      }

      return true;
    }

    reset(options = {}) {
      if (
        options.confirm !== false &&
        !window.confirm(
          "Sigur dorești să reiei lecția de la început?"
        )
      ) {
        return false;
      }

      this.clearSaved();
      this.state =
        initialState(this.data);

      this.root
        .querySelectorAll(
          "[data-quick-check-input]"
        )
        .forEach((input) => {
          if (
            input.type === "radio" ||
            input.type === "checkbox"
          ) {
            input.checked = false;
          } else {
            input.value = "";
          }
        });

      this.root
        .querySelectorAll(
          "[data-check-feedback]"
        )
        .forEach((feedback) => {
          feedback.className =
            "feedback boxed";
          feedback.textContent = "";
        });

      this.update({
        announce: false,
        save: true,
        scroll: true
      });

      emit(
        "fizica:lesson-reset",
        {
          lessonId: this.data.id
        },
        this.root
      );

      return true;
    }

    update(options = {}) {
      const announce =
        options.announce !== false;
      const shouldSave =
        options.save !== false;
      const shouldScroll =
        options.scroll !== false;

      this.pages.forEach(
        (page, index) => {
          const active =
            index ===
            this.state.currentPage;

          page.hidden = !active;
          page.classList.toggle(
            "active",
            active
          );
          page.setAttribute(
            "aria-hidden",
            String(!active)
          );
        }
      );

      const previous =
        this.root.querySelector(
          "[data-lesson-prev], [data-nav-prev]"
        );

      if (previous) {
        previous.disabled =
          !this.config.allowPrevious ||
          this.state.currentPage === 0;
      }

      const next =
        this.root.querySelector(
          "[data-lesson-next], [data-nav-next]"
        );

      if (next) {
        const last =
          this.state.currentPage ===
          this.pages.length - 1;

        next.disabled = false;
        next.textContent = last
          ? `${this.config.finishLabel} ✓`
          : `${this.config.nextLabel} →`;

        if (this.state.completed) {
          next.textContent =
            "Lecție finalizată ✓";
          next.disabled = true;
        }
      }

      const counter =
        this.root.querySelector(
          "[data-lesson-counter]"
        );

      if (counter) {
        counter.textContent =
          `Pagina ${
            this.state.currentPage + 1
          } din ${this.pages.length}`;
      }

      const progress =
        this.root.querySelector(
          "[data-lesson-progress]"
        );

      if (progress) {
        progress.max =
          this.pages.length;
        progress.value =
          this.state.currentPage + 1;
      }

      if (shouldSave) {
        this.save();
      }

      if (shouldScroll) {
        const activePage =
          this.pages[
            this.state.currentPage
          ];

        if (
          this.config.scrollToTop &&
          activePage
        ) {
          activePage.scrollIntoView({
            behavior:
              window.matchMedia(
                "(prefers-reduced-motion: reduce)"
              ).matches
                ? "auto"
                : "smooth",
            block: "start"
          });
        }
      }

      if (announce) {
        const title =
          this.data.pages[
            this.state.currentPage
          ]?.title;

        this.announce(
          `Pagina ${
            this.state.currentPage + 1
          } din ${this.pages.length}${
            title ? `: ${title}` : ""
          }.`
        );
      }

      this.typesetMath();

      emit(
        "fizica:lesson-page-change",
        this.publicState(),
        this.root
      );

      emit(
        "fizica:content-updated",
        {
          root: this.root,
          source: "lesson-viewer"
        }
      );
    }

    touch() {
      this.state.updatedAt =
        nowIso();
    }

    save(options = {}) {
      if (
        !this.config.saveProgress
      ) {
        return false;
      }

      try {
        this.touch();

        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.state)
        );

        return true;
      } catch (error) {
        if (!options.silent) {
          console.warn(
            `[${APP_NAME}] Progresul lecției nu a putut fi salvat.`,
            error
          );
        }

        return false;
      }
    }

    restore() {
      try {
        const saved =
          safeJsonParse(
            localStorage.getItem(
              this.storageKey
            )
          );

        if (
          saved &&
          saved.lessonId ===
            this.data.id
        ) {
          this.state = {
            ...initialState(this.data),
            ...saved,
            answers: {
              ...(saved.answers || {})
            },
            checked: {
              ...(saved.checked || {})
            },
            currentPage: clamp(
              Number(
                saved.currentPage
              ) || 0,
              0,
              Math.max(
                this.data.pages.length - 1,
                0
              )
            )
          };
        }

        const hash =
          window.location.hash.match(
            /^#pagina-(\d+)$/
          );

        if (
          this.config.updateHash &&
          hash
        ) {
          this.state.currentPage =
            clamp(
              Number(hash[1]) - 1,
              0,
              Math.max(
                this.data.pages.length - 1,
                0
              )
            );
        }

        return Boolean(saved);
      } catch (_) {
        return false;
      }
    }

    clearSaved() {
      try {
        localStorage.removeItem(
          this.storageKey
        );
      } catch (_) {
        // Nu bloca lecția.
      }
    }

    publicState() {
      const total =
        this.pages.length ||
        this.data.pages.length;
      const progress =
        this.state.completed
          ? 100
          : (
              total
                ? (
                    (
                      this.state
                        .currentPage +
                      1
                    ) /
                    total
                  ) *
                  100
                : 0
            );

      return {
        lessonId: this.data.id,
        id: this.data.id,
        title: this.data.title,
        currentPage:
          this.state.currentPage,
        page:
          this.state.currentPage,
        totalPages: total,
        progress:
          Math.round(
            progress * 100
          ) / 100,
        completed:
          this.state.completed,
        startedAt:
          this.state.startedAt,
        updatedAt:
          this.state.updatedAt,
        completedAt:
          this.state.completedAt,
        route:
          window.location.pathname
      };
    }

    announce(message) {
      const region =
        this.root.querySelector(
          ".lesson-live-region"
        );

      if (!region) {
        return;
      }

      region.textContent = "";

      requestAnimationFrame(() => {
        region.textContent =
          message;
      });
    }

    async typesetMath() {
      if (
        !this.config.autoTypesetMath
      ) {
        return;
      }

      try {
        if (
          typeof app.app
            ?.typesetMath ===
          "function"
        ) {
          await app.app.typesetMath(
            this.root
          );
          return;
        }

        if (
          typeof app.utils
            ?.afiseazaMathJax ===
          "function"
        ) {
          await app.utils
            .afiseazaMathJax(
              this.root
            );
          return;
        }

        if (
          window.MathJax
            ?.typesetPromise
        ) {
          window.MathJax
            .typesetClear?.([
              this.root
            ]);

          await window.MathJax
            .typesetPromise([
              this.root
            ]);
        }
      } catch (error) {
        console.warn(
          `[${APP_NAME}] MathJax nu a putut actualiza lecția.`,
          error
        );
      }
    }
  }

  async function init(
    target = null,
    options = {}
  ) {
    const root =
      resolveRoot(target);

    if (!root) {
      return null;
    }

    if (instances.has(root)) {
      activeInstance =
        instances.get(root);
      return activeInstance;
    }

    try {
      const rawData =
        await loadData(
          root,
          options
        );

      const engine =
        new LessonViewer(
          root,
          rawData,
          options
        );

      instances.set(
        root,
        engine
      );
      activeInstance = engine;

      return engine.init();
    } catch (error) {
      console.error(
        `[${APP_NAME}] Lecția nu a putut fi inițializată.`,
        error
      );

      root.innerHTML = `
        <section
          class="lesson-card"
          role="alert">
          <h2>
            Lecția nu a putut fi încărcată
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
          modul:
            "lesson-viewer",
          eroare: {
            message:
              error?.message ||
              String(error)
          }
        },
        root
      );

      return null;
    }
  }

  async function initAll(
    options = {}
  ) {
    const roots = Array.from(
      document.querySelectorAll(
        ROOT_SELECTOR
      )
    );

    const result = [];

    for (const root of roots) {
      const instance =
        await init(root, options);

      if (instance) {
        result.push(instance);
      }
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
      const root =
        resolveRoot(target);

      return root
        ? instances.get(root) ||
            null
        : activeInstance;
    },

    nextPage() {
      return activeInstance
        ?.nextPage?.();
    },

    previousPage() {
      return activeInstance
        ?.previousPage?.();
    },

    goToPage(index, options) {
      return activeInstance
        ?.goToPage?.(
          index,
          options
        );
    },

    checkAnswer(checkId) {
      return activeInstance
        ?.checkAnswer?.(checkId);
    },

    complete() {
      return activeInstance
        ?.complete?.();
    },

    reset(options) {
      return activeInstance
        ?.reset?.(options);
    },

    save(options) {
      return activeInstance
        ?.save?.(options);
    },

    getState() {
      return activeInstance
        ?.publicState?.() ||
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

    helpers: {
      normalizeText,
      normalizeNumber,
      evaluateCheck
    }
  };

  app.lessonViewer = api;

  window.initLessonViewer =
    function (options = {}) {
      return api.initAll(options);
    };
})();
