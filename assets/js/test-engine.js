from pathlib import Path

path = Path("/mnt/data/assets/js/test-engine.js")

chunk = r'''
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
'''

with path.open("a", encoding="utf-8") as f:
    f.write(chunk)

print(f"Partea 2 scrisă: {len(chunk.splitlines())} linii")
