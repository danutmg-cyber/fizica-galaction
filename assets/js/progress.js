/**
 * progress.js — Fizica Galaction
 *
 * Modul central pentru salvarea progresului elevului.
 *
 * Funcționalități:
 * - salvează progresul în localStorage;
 * - folosește memorie temporară dacă localStorage nu este disponibil;
 * - separă progresul pe utilizator;
 * - gestionează lecții, fișe, teste și activități de laborator;
 * - păstrează ultima pagină, scorul curent și cel mai bun scor;
 * - marchează resursele finalizate;
 * - calculează statistici și rezumate;
 * - ascultă evenimentele emise de celelalte motoare;
 * - sincronizează modificările între filele browserului;
 * - permite conectarea unui adaptor Firebase sau a altui serviciu;
 * - permite exportul și importul progresului.
 *
 * API public:
 *
 * window.FizicaGalaction.progress.init(options)
 * window.FizicaGalaction.progress.get(type, id)
 * window.FizicaGalaction.progress.save(type, id, data)
 * window.FizicaGalaction.progress.patch(type, id, data)
 * window.FizicaGalaction.progress.remove(type, id)
 * window.FizicaGalaction.progress.markCompleted(type, id, data)
 * window.FizicaGalaction.progress.recordScore(type, id, score, total)
 * window.FizicaGalaction.progress.list(filters)
 * window.FizicaGalaction.progress.getSummary()
 * window.FizicaGalaction.progress.exportData()
 * window.FizicaGalaction.progress.importData(data)
 * window.FizicaGalaction.progress.setRemoteAdapter(adapter)
 *
 * Evenimente ascultate automat:
 *
 * fizica:lesson-page-change
 * fizica:lesson-complete
 * fizica:worksheet-complete
 * fizica:test-complete
 * fizica:lab-step-change
 * fizica:lab-progress-saved
 * fizica:lab-complete
 *
 * Evenimente emise:
 *
 * fizica:progress-ready
 * fizica:progress-saved
 * fizica:progress-removed
 * fizica:progress-completed
 * fizica:progress-imported
 * fizica:progress-cleared
 * fizica:progress-sync-start
 * fizica:progress-sync-complete
 * fizica:progress-sync-error
 * fizica:progress-external-change
 */

(function () {
  "use strict";

  const APP_NAME = "Fizica Galaction";
  const MODULE_NAME = "progress";
  const STORAGE_VERSION = 1;

  const ROOT_PREFIX = "fizica-galaction";
  const INDEX_KEY = `${ROOT_PREFIX}:progress:index`;
  const SETTINGS_KEY = `${ROOT_PREFIX}:progress:settings`;
  const GUEST_ID_KEY = `${ROOT_PREFIX}:guest-id`;
  const ENTRY_PREFIX = `${ROOT_PREFIX}:progress:entry`;

  const VALID_TYPES = new Set([
    "lesson",
    "worksheet",
    "test",
    "lab",
    "experiment",
    "simulation",
    "game",
    "chapter",
    "page"
  ]);

  const DEFAULT_CONFIG = Object.freeze({
    autoListen: true,
    syncAcrossTabs: true,
    saveDebounceMs: 180,
    remoteSyncDebounceMs: 700,
    useRemoteSync: false,
    restoreRemoteOnInit: false,
    preferRemoteOnConflict: false,
    maxEntries: 1500,
    userId: null,
    anonymousUserPrefix: "guest",
    emitEvents: true,
    debug: false
  });

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  const memoryStorage = new Map();

  let activeStore = null;
  let remoteAdapter = null;
  let localStorageAvailable = null;

  /**
   * Scrie mesaje numai în modul debug.
   *
   * @param {...unknown} args
   */
  function debug(...args) {
    if (activeStore?.config?.debug) {
      console.debug(
        `[${APP_NAME}:${MODULE_NAME}]`,
        ...args
      );
    }
  }

  /**
   * Data curentă în format ISO.
   *
   * @returns {string}
   */
  function nowIso() {
    return new Date().toISOString();
  }

  /**
   * Creează o clonă pentru valori serializabile.
   *
   * @template T
   * @param {T} value
   * @returns {T}
   */
  function clone(value) {
    if (
      typeof structuredClone === "function"
    ) {
      try {
        return structuredClone(value);
      } catch (_) {
        // Continuă cu varianta JSON.
      }
    }

    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch (_) {
      return value;
    }
  }

  /**
   * Citește JSON în siguranță.
   *
   * @param {string | null} raw
   * @param {unknown} fallback
   * @returns {unknown}
   */
  function safeJsonParse(
    raw,
    fallback = null
  ) {
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        `[${APP_NAME}] Nu s-au putut interpreta datele progresului.`,
        error
      );
      return fallback;
    }
  }

  /**
   * Normalizează un text pentru identificatori.
   *
   * @param {unknown} value
   * @param {string} fallback
   * @returns {string}
   */
  function normalizeId(
    value,
    fallback = "resource"
  ) {
    const normalized = String(
      value ?? ""
    )
      .trim()
      .toLocaleLowerCase("ro-RO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalized || fallback;
  }

  /**
   * Normalizează tipul resursei.
   *
   * @param {unknown} value
   * @returns {string}
   */
  function normalizeType(value) {
    const type = normalizeId(
      value,
      "page"
    );

    return VALID_TYPES.has(type)
      ? type
      : "page";
  }

  /**
   * Limitează un număr.
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
   * Transformă o valoare în număr finit.
   *
   * @param {unknown} value
   * @param {number | null} fallback
   * @returns {number | null}
   */
  function finiteNumber(
    value,
    fallback = null
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    const number =
      typeof value === "number"
        ? value
        : Number(
            String(value)
              .trim()
              .replace(",", ".")
          );

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  /**
   * Emite un eveniment pe document.
   *
   * @param {string} name
   * @param {object} detail
   */
  function emit(name, detail = {}) {
    if (
      activeStore &&
      !activeStore.config.emitEvents
    ) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent(name, {
        detail: clone(detail)
      })
    );
  }

  /**
   * Verifică dacă localStorage poate fi utilizat.
   *
   * @returns {boolean}
   */
  function canUseLocalStorage() {
    if (localStorageAvailable !== null) {
      return localStorageAvailable;
    }

    try {
      const testKey =
        `${ROOT_PREFIX}:storage-test`;

      window.localStorage.setItem(
        testKey,
        "1"
      );
      window.localStorage.removeItem(
        testKey
      );

      localStorageAvailable = true;
    } catch (_) {
      localStorageAvailable = false;
    }

    return localStorageAvailable;
  }

  /**
   * Adaptor intern de stocare.
   */
  const storage = {
    /**
     * @param {string} key
     * @returns {string | null}
     */
    getItem(key) {
      if (canUseLocalStorage()) {
        return window.localStorage.getItem(
          key
        );
      }

      return memoryStorage.has(key)
        ? memoryStorage.get(key)
        : null;
    },

    /**
     * @param {string} key
     * @param {string} value
     */
    setItem(key, value) {
      if (canUseLocalStorage()) {
        window.localStorage.setItem(
          key,
          value
        );
        return;
      }

      memoryStorage.set(key, value);
    },

    /**
     * @param {string} key
     */
    removeItem(key) {
      if (canUseLocalStorage()) {
        window.localStorage.removeItem(
          key
        );
        return;
      }

      memoryStorage.delete(key);
    }
  };

  /**
   * Creează un identificator anonim stabil.
   *
   * @param {string} prefix
   * @returns {string}
   */
  function getOrCreateGuestId(
    prefix = "guest"
  ) {
    const existing =
      storage.getItem(GUEST_ID_KEY);

    if (existing) {
      return existing;
    }

    const random =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 12)}`;

    const id =
      `${normalizeId(prefix, "guest")}-${random}`;

    storage.setItem(
      GUEST_ID_KEY,
      id
    );

    return id;
  }

  /**
   * Încearcă să determine utilizatorul autentificat.
   *
   * @returns {string | null}
   */
  function detectAuthenticatedUserId() {
    const bodyUserId =
      document.body?.dataset?.userId;

    if (bodyUserId) {
      return String(bodyUserId);
    }

    const candidates = [
      app.auth?.currentUser?.uid,
      app.firebase?.auth?.currentUser?.uid,
      window.firebase?.auth?.()
        ?.currentUser?.uid
    ];

    return (
      candidates.find(Boolean) || null
    );
  }

  /**
   * Unește obiecte simple fără a păstra valori undefined.
   *
   * @param {object} base
   * @param {object} update
   * @returns {object}
   */
  function mergeDefined(base, update) {
    const result = {
      ...(base || {})
    };

    for (
      const [key, value]
      of Object.entries(update || {})
    ) {
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Normalizează un scor.
   *
   * @param {unknown} score
   * @param {unknown} total
   * @returns {{
   *   score: number | null,
   *   total: number | null,
   *   percent: number | null
   * }}
   */
  function normalizeScore(
    score,
    total
  ) {
    const numericScore =
      finiteNumber(score);
    const numericTotal =
      finiteNumber(total);

    let percent = null;

    if (
      numericScore !== null &&
      numericTotal !== null &&
      numericTotal > 0
    ) {
      percent = clamp(
        (numericScore / numericTotal) *
          100,
        0,
        100
      );
    } else if (
      numericScore !== null &&
      numericScore >= 0 &&
      numericScore <= 100 &&
      numericTotal === null
    ) {
      percent = numericScore;
    }

    return {
      score: numericScore,
      total: numericTotal,
      percent:
        percent === null
          ? null
          : Math.round(
              percent * 100
            ) / 100
    };
  }

  /**
   * Normalizează o înregistrare.
   *
   * @param {string} type
   * @param {string} id
   * @param {object} data
   * @param {object | null} previous
   * @param {string} userId
   * @returns {object}
   */
  function normalizeEntry(
    type,
    id,
    data,
    previous,
    userId
  ) {
    const normalizedType =
      normalizeType(type);
    const normalizedId =
      normalizeId(id);

    const current = previous || {};
    const incoming = data || {};

    const page =
      finiteNumber(
        incoming.currentPage ??
        incoming.lastPage ??
        incoming.page
      );

    const totalPages =
      finiteNumber(
        incoming.totalPages
      );

    let progress =
      finiteNumber(
        incoming.progress ??
        incoming.percent
      );

    if (
      progress === null &&
      page !== null &&
      totalPages !== null &&
      totalPages > 0
    ) {
      progress =
        ((page + 1) / totalPages) *
        100;
    }

    const incomingScore =
      normalizeScore(
        incoming.score ??
        incoming.points ??
        incoming.puncte ??
        incoming.correct,
        incoming.total ??
        incoming.maxScore ??
        incoming.puncteTotale
      );

    const currentBest =
      finiteNumber(
        current.bestPercent
      );

    const nextBest =
      incomingScore.percent === null
        ? currentBest
        : currentBest === null
          ? incomingScore.percent
          : Math.max(
              currentBest,
              incomingScore.percent
            );

    const completed =
      Boolean(
        incoming.completed ??
        current.completed ??
        false
      );

    const now = nowIso();

    const entry = mergeDefined(
      {
        version: STORAGE_VERSION,
        type: normalizedType,
        id: normalizedId,
        userId,
        title:
          current.title ||
          "",
        route:
          current.route ||
          "",
        chapterId:
          current.chapterId ||
          null,
        classId:
          current.classId ||
          null,
        currentPage:
          current.currentPage ??
          null,
        totalPages:
          current.totalPages ??
          null,
        progress:
          current.progress ?? 0,
        score:
          current.score ??
          null,
        total:
          current.total ??
          null,
        percent:
          current.percent ??
          null,
        bestScore:
          current.bestScore ??
          null,
        bestTotal:
          current.bestTotal ??
          null,
        bestPercent:
          current.bestPercent ??
          null,
        attempts:
          current.attempts ?? 0,
        completed:
          current.completed ?? false,
        completedAt:
          current.completedAt ??
          null,
        startedAt:
          current.startedAt ||
          now,
        updatedAt: now,
        metadata:
          current.metadata || {}
      },
      incoming
    );

    entry.version = STORAGE_VERSION;
    entry.type = normalizedType;
    entry.id = normalizedId;
    entry.userId = userId;
    entry.updatedAt = now;

    if (page !== null) {
      entry.currentPage = Math.max(
        0,
        Math.trunc(page)
      );
    }

    if (totalPages !== null) {
      entry.totalPages = Math.max(
        0,
        Math.trunc(totalPages)
      );
    }

    if (progress !== null) {
      entry.progress = clamp(
        Math.round(progress * 100) /
          100,
        0,
        100
      );
    }

    if (incomingScore.score !== null) {
      entry.score =
        incomingScore.score;
      entry.total =
        incomingScore.total;
      entry.percent =
        incomingScore.percent;

      const shouldReplaceBest =
        currentBest === null ||
        (
          incomingScore.percent !== null &&
          incomingScore.percent >=
            currentBest
        );

      if (shouldReplaceBest) {
        entry.bestScore =
          incomingScore.score;
        entry.bestTotal =
          incomingScore.total;
        entry.bestPercent =
          incomingScore.percent;
      }

      entry.attempts =
        finiteNumber(
          incoming.attempts
        ) ??
        (
          incoming.incrementAttempt ===
          false
            ? current.attempts || 0
            : (current.attempts || 0) + 1
        );
    }

    if (nextBest !== null) {
      entry.bestPercent = nextBest;
    }

    if (completed) {
      entry.completed = true;
      entry.progress = 100;
      entry.completedAt =
        incoming.completedAt ||
        current.completedAt ||
        now;
    }

    entry.metadata = mergeDefined(
      current.metadata || {},
      incoming.metadata || {}
    );

    delete entry.incrementAttempt;

    return entry;
  }

  /**
   * Returnează timestampul unei înregistrări.
   *
   * @param {object | null} entry
   * @returns {number}
   */
  function entryTimestamp(entry) {
    const value =
      entry?.updatedAt ||
      entry?.completedAt ||
      entry?.startedAt;

    const timestamp =
      Date.parse(value || "");

    return Number.isFinite(timestamp)
      ? timestamp
      : 0;
  }

  /**
   * Alege versiunea mai nouă.
   *
   * @param {object | null} localEntry
   * @param {object | null} remoteEntry
   * @param {boolean} preferRemote
   * @returns {object | null}
   */
  function resolveConflict(
    localEntry,
    remoteEntry,
    preferRemote
  ) {
    if (!localEntry) {
      return remoteEntry;
    }

    if (!remoteEntry) {
      return localEntry;
    }

    const localTime =
      entryTimestamp(localEntry);
    const remoteTime =
      entryTimestamp(remoteEntry);

    if (remoteTime > localTime) {
      return remoteEntry;
    }

    if (localTime > remoteTime) {
      return localEntry;
    }

    return preferRemote
      ? remoteEntry
      : localEntry;
  }

  /**
   * Store-ul principal.
   */
  class ProgressStore {
    /**
     * @param {object} options
     */
    constructor(options = {}) {
      this.config = {
        ...DEFAULT_CONFIG,
        ...(options || {})
      };

      this.userId =
        normalizeId(
          this.config.userId ||
          detectAuthenticatedUserId() ||
          getOrCreateGuestId(
            this.config
              .anonymousUserPrefix
          ),
          "guest"
        );

      this.index = this.readIndex();
      this.pendingRemoteSync =
        new Map();
      this.saveTimers = new Map();
      this.remoteTimers = new Map();
      this.destroyed = false;

      this.bound = {
        storage:
          this.handleStorage.bind(this),
        lessonPage:
          this.handleLessonPage.bind(this),
        lessonComplete:
          this.handleLessonComplete.bind(this),
        worksheetComplete:
          this.handleWorksheetComplete.bind(this),
        testComplete:
          this.handleTestComplete.bind(this),
        labStep:
          this.handleLabStep.bind(this),
        labSaved:
          this.handleLabSaved.bind(this),
        labComplete:
          this.handleLabComplete.bind(this)
      };
    }

    /**
     * Inițializează ascultătorii.
     *
     * @returns {ProgressStore}
     */
    init() {
      if (this.destroyed) {
        return this;
      }

      if (this.config.autoListen) {
        this.bindEvents();
      }

      if (
        this.config.syncAcrossTabs &&
        canUseLocalStorage()
      ) {
        window.addEventListener(
          "storage",
          this.bound.storage
        );
      }

      if (
        this.config.useRemoteSync &&
        this.config.restoreRemoteOnInit
      ) {
        this.pullRemote().catch(() => {
          // Eroarea este emisă separat.
        });
      }

      emit(
        "fizica:progress-ready",
        {
          userId: this.userId,
          storage:
            canUseLocalStorage()
              ? "localStorage"
              : "memory",
          entries: this.index.length
        }
      );

      return this;
    }

    /**
     * Ascultă evenimentele motoarelor.
     */
    bindEvents() {
      document.addEventListener(
        "fizica:lesson-page-change",
        this.bound.lessonPage
      );
      document.addEventListener(
        "fizica:lesson-complete",
        this.bound.lessonComplete
      );
      document.addEventListener(
        "fizica:worksheet-complete",
        this.bound.worksheetComplete
      );
      document.addEventListener(
        "fizica:test-complete",
        this.bound.testComplete
      );
      document.addEventListener(
        "fizica:lab-step-change",
        this.bound.labStep
      );
      document.addEventListener(
        "fizica:lab-progress-saved",
        this.bound.labSaved
      );
      document.addEventListener(
        "fizica:lab-complete",
        this.bound.labComplete
      );
    }

    /**
     * Elimină ascultătorii.
     */
    destroy() {
      if (this.destroyed) {
        return;
      }

      document.removeEventListener(
        "fizica:lesson-page-change",
        this.bound.lessonPage
      );
      document.removeEventListener(
        "fizica:lesson-complete",
        this.bound.lessonComplete
      );
      document.removeEventListener(
        "fizica:worksheet-complete",
        this.bound.worksheetComplete
      );
      document.removeEventListener(
        "fizica:test-complete",
        this.bound.testComplete
      );
      document.removeEventListener(
        "fizica:lab-step-change",
        this.bound.labStep
      );
      document.removeEventListener(
        "fizica:lab-progress-saved",
        this.bound.labSaved
      );
      document.removeEventListener(
        "fizica:lab-complete",
        this.bound.labComplete
      );
      window.removeEventListener(
        "storage",
        this.bound.storage
      );

      for (
        const timer
        of this.saveTimers.values()
      ) {
        window.clearTimeout(timer);
      }

      for (
        const timer
        of this.remoteTimers.values()
      ) {
        window.clearTimeout(timer);
      }

      this.saveTimers.clear();
      this.remoteTimers.clear();
      this.destroyed = true;
    }

    /**
     * Cheia unei înregistrări.
     *
     * @param {string} type
     * @param {string} id
     * @returns {string}
     */
    entryKey(type, id) {
      return [
        ENTRY_PREFIX,
        this.userId,
        normalizeType(type),
        normalizeId(id)
      ].join(":");
    }

    /**
     * Identificatorul intern din index.
     *
     * @param {string} type
     * @param {string} id
     * @returns {string}
     */
    indexId(type, id) {
      return [
        this.userId,
        normalizeType(type),
        normalizeId(id)
      ].join(":");
    }

    /**
     * Citește indexul.
     *
     * @returns {string[]}
     */
    readIndex() {
      const value =
        safeJsonParse(
          storage.getItem(INDEX_KEY),
          []
        );

      return Array.isArray(value)
        ? Array.from(
            new Set(
              value.filter(
                (item) =>
                  typeof item === "string"
              )
            )
          )
        : [];
    }

    /**
     * Salvează indexul.
     */
    writeIndex() {
      storage.setItem(
        INDEX_KEY,
        JSON.stringify(this.index)
      );
    }

    /**
     * Adaugă o intrare în index.
     *
     * @param {string} type
     * @param {string} id
     */
    addToIndex(type, id) {
      const indexId =
        this.indexId(type, id);

      if (!this.index.includes(indexId)) {
        this.index.push(indexId);

        if (
          this.index.length >
          this.config.maxEntries
        ) {
          this.pruneIndex();
        }

        this.writeIndex();
      }
    }

    /**
     * Șterge din index.
     *
     * @param {string} type
     * @param {string} id
     */
    removeFromIndex(type, id) {
      const indexId =
        this.indexId(type, id);

      this.index =
        this.index.filter(
          (item) => item !== indexId
        );

      this.writeIndex();
    }

    /**
     * Elimină intrările vechi dacă limita este depășită.
     */
    pruneIndex() {
      const entries = this.list({
        userId: this.userId
      }).sort(
        (a, b) =>
          entryTimestamp(b) -
          entryTimestamp(a)
      );

      const keep = entries.slice(
        0,
        this.config.maxEntries
      );

      const keepIds = new Set(
        keep.map((entry) =>
          this.indexId(
            entry.type,
            entry.id
          )
        )
      );

      for (const indexId of this.index) {
        if (
          indexId.startsWith(
            `${this.userId}:`
          ) &&
          !keepIds.has(indexId)
        ) {
          const parts =
            indexId.split(":");
          const type = parts[1];
          const id = parts
            .slice(2)
            .join(":");

          storage.removeItem(
            this.entryKey(type, id)
          );
        }
      }

      this.index =
        this.index.filter(
          (item) =>
            !item.startsWith(
              `${this.userId}:`
            ) ||
            keepIds.has(item)
        );

      this.writeIndex();
    }

    /**
     * Citește o înregistrare.
     *
     * @param {string} type
     * @param {string} id
     * @returns {object | null}
     */
    get(type, id) {
      const raw =
        storage.getItem(
          this.entryKey(type, id)
        );

      const entry =
        safeJsonParse(raw);

      if (
        !entry ||
        typeof entry !== "object"
      ) {
        return null;
      }

      return clone(entry);
    }

    /**
     * Salvează imediat.
     *
     * @param {string} type
     * @param {string} id
     * @param {object} data
     * @param {object} options
     * @returns {object}
     */
    save(
      type,
      id,
      data = {},
      options = {}
    ) {
      const normalizedType =
        normalizeType(type);
      const normalizedId =
        normalizeId(id);
      const previous =
        this.get(
          normalizedType,
          normalizedId
        );

      const entry =
        normalizeEntry(
          normalizedType,
          normalizedId,
          data,
          previous,
          this.userId
        );

      storage.setItem(
        this.entryKey(
          normalizedType,
          normalizedId
        ),
        JSON.stringify(entry)
      );

      this.addToIndex(
        normalizedType,
        normalizedId
      );

      debug(
        "Progres salvat",
        entry
      );

      if (!options.silent) {
        emit(
          "fizica:progress-saved",
          {
            entry
          }
        );
      }

      if (
        this.config.useRemoteSync &&
        options.remote !== false
      ) {
        this.queueRemoteSave(entry);
      }

      return clone(entry);
    }

    /**
     * Salvează cu întârziere pentru evenimente frecvente.
     *
     * @param {string} type
     * @param {string} id
     * @param {object} data
     * @param {object} options
     */
    saveDebounced(
      type,
      id,
      data = {},
      options = {}
    ) {
      const key =
        this.entryKey(type, id);

      const previousTimer =
        this.saveTimers.get(key);

      if (previousTimer) {
        window.clearTimeout(
          previousTimer
        );
      }

      const timer =
        window.setTimeout(() => {
          this.saveTimers.delete(key);
          this.save(
            type,
            id,
            data,
            options
          );
        }, this.config.saveDebounceMs);

      this.saveTimers.set(
        key,
        timer
      );
    }

    /**
     * Actualizează o înregistrare.
     *
     * @param {string} type
     * @param {string} id
     * @param {object} data
     * @param {object} options
     * @returns {object}
     */
    patch(
      type,
      id,
      data = {},
      options = {}
    ) {
      return this.save(
        type,
        id,
        data,
        options
      );
    }

    /**
     * Marchează resursa finalizată.
     *
     * @param {string} type
     * @param {string} id
     * @param {object} data
     * @returns {object}
     */
    markCompleted(
      type,
      id,
      data = {}
    ) {
      const entry = this.save(
        type,
        id,
        {
          ...data,
          completed: true,
          progress: 100,
          completedAt:
            data.completedAt ||
            nowIso()
        }
      );

      emit(
        "fizica:progress-completed",
        {
          entry
        }
      );

      return entry;
    }

    /**
     * Înregistrează un scor.
     *
     * @param {string} type
     * @param {string} id
     * @param {number} score
     * @param {number | null} total
     * @param {object} data
     * @returns {object}
     */
    recordScore(
      type,
      id,
      score,
      total = null,
      data = {}
    ) {
      return this.save(
        type,
        id,
        {
          ...data,
          score,
          total,
          incrementAttempt:
            data.incrementAttempt !==
            false
        }
      );
    }

    /**
     * Salvează pagina curentă a unei lecții.
     *
     * @param {string} id
     * @param {number} currentPage
     * @param {number} totalPages
     * @param {object} data
     * @returns {object}
     */
    setLastPage(
      id,
      currentPage,
      totalPages,
      data = {}
    ) {
      return this.save(
        "lesson",
        id,
        {
          ...data,
          currentPage,
          totalPages,
          progress:
            totalPages > 0
              ? ((currentPage + 1) /
                  totalPages) *
                100
              : 0
        }
      );
    }

    /**
     * Șterge o înregistrare.
     *
     * @param {string} type
     * @param {string} id
     * @param {object} options
     * @returns {boolean}
     */
    remove(
      type,
      id,
      options = {}
    ) {
      const existing =
        this.get(type, id);

      if (!existing) {
        return false;
      }

      storage.removeItem(
        this.entryKey(type, id)
      );
      this.removeFromIndex(type, id);

      if (!options.silent) {
        emit(
          "fizica:progress-removed",
          {
            type: normalizeType(type),
            id: normalizeId(id),
            userId: this.userId
          }
        );
      }

      if (
        this.config.useRemoteSync &&
        options.remote !== false
      ) {
        this.queueRemoteRemove(
          existing
        );
      }

      return true;
    }

    /**
     * Listează progresul.
     *
     * @param {{
     *   type?: string,
     *   completed?: boolean,
     *   classId?: string,
     *   chapterId?: string,
     *   userId?: string
     * }} filters
     * @returns {object[]}
     */
    list(filters = {}) {
      const requestedUser =
        normalizeId(
          filters.userId ||
          this.userId,
          this.userId
        );

      const entries = [];

      for (const indexId of this.index) {
        const parts =
          indexId.split(":");

        if (parts.length < 3) {
          continue;
        }

        const userId = parts[0];
        const type = parts[1];
        const id = parts
          .slice(2)
          .join(":");

        if (userId !== requestedUser) {
          continue;
        }

        const entry = this.get(
          type,
          id
        );

        if (!entry) {
          continue;
        }

        if (
          filters.type &&
          entry.type !==
            normalizeType(filters.type)
        ) {
          continue;
        }

        if (
          typeof filters.completed ===
            "boolean" &&
          Boolean(entry.completed) !==
            filters.completed
        ) {
          continue;
        }

        if (
          filters.classId &&
          entry.classId !==
            filters.classId
        ) {
          continue;
        }

        if (
          filters.chapterId &&
          entry.chapterId !==
            filters.chapterId
        ) {
          continue;
        }

        entries.push(entry);
      }

      return entries.sort(
        (a, b) =>
          entryTimestamp(b) -
          entryTimestamp(a)
      );
    }

    /**
     * Progresul pentru un tip.
     *
     * @param {string} type
     * @returns {object[]}
     */
    getByType(type) {
      return this.list({
        type
      });
    }

    /**
     * Rezumat statistic.
     *
     * @param {object} filters
     * @returns {object}
     */
    getSummary(filters = {}) {
      const entries =
        this.list(filters);

      const byType = {};
      let completed = 0;
      let progressSum = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      for (const entry of entries) {
        if (!byType[entry.type]) {
          byType[entry.type] = {
            total: 0,
            completed: 0,
            averageProgress: 0,
            _progressSum: 0
          };
        }

        const bucket =
          byType[entry.type];

        bucket.total += 1;
        bucket._progressSum +=
          finiteNumber(
            entry.progress,
            0
          ) || 0;

        if (entry.completed) {
          bucket.completed += 1;
          completed += 1;
        }

        const progress =
          finiteNumber(
            entry.progress,
            0
          ) || 0;

        progressSum += progress;

        const bestPercent =
          finiteNumber(
            entry.bestPercent
          );

        if (bestPercent !== null) {
          scoreSum += bestPercent;
          scoreCount += 1;
        }
      }

      for (
        const bucket
        of Object.values(byType)
      ) {
        bucket.averageProgress =
          bucket.total
            ? Math.round(
                (bucket._progressSum /
                  bucket.total) *
                  100
              ) / 100
            : 0;

        delete bucket._progressSum;
      }

      return {
        userId: this.userId,
        totalEntries: entries.length,
        completedEntries: completed,
        completionPercent:
          entries.length
            ? Math.round(
                (completed /
                  entries.length) *
                  10000
              ) / 100
            : 0,
        averageProgress:
          entries.length
            ? Math.round(
                (progressSum /
                  entries.length) *
                  100
              ) / 100
            : 0,
        averageBestScore:
          scoreCount
            ? Math.round(
                (scoreSum /
                  scoreCount) *
                  100
              ) / 100
            : null,
        byType,
        lastActivity:
          entries[0] || null
      };
    }

    /**
     * Șterge progresul utilizatorului.
     *
     * @param {object} filters
     * @returns {number}
     */
    clear(filters = {}) {
      const entries =
        this.list(filters);

      let removed = 0;

      for (const entry of entries) {
        if (
          this.remove(
            entry.type,
            entry.id,
            {
              silent: true
            }
          )
        ) {
          removed += 1;
        }
      }

      emit(
        "fizica:progress-cleared",
        {
          userId: this.userId,
          removed
        }
      );

      return removed;
    }

    /**
     * Exportă datele utilizatorului.
     *
     * @returns {object}
     */
    exportData() {
      return {
        schema:
          "fizica-galaction-progress",
        version: STORAGE_VERSION,
        exportedAt: nowIso(),
        userId: this.userId,
        entries: this.list(),
        summary: this.getSummary()
      };
    }

    /**
     * Importă progres.
     *
     * @param {object | string} input
     * @param {{
     *   overwrite?: boolean,
     *   remote?: boolean
     * }} options
     * @returns {{
     *   imported: number,
     *   skipped: number,
     *   errors: number
     * }}
     */
    importData(
      input,
      options = {}
    ) {
      const data =
        typeof input === "string"
          ? safeJsonParse(input)
          : input;

      const result = {
        imported: 0,
        skipped: 0,
        errors: 0
      };

      if (
        !data ||
        !Array.isArray(data.entries)
      ) {
        result.errors += 1;
        return result;
      }

      for (const candidate of data.entries) {
        try {
          if (
            !candidate?.type ||
            !candidate?.id
          ) {
            result.skipped += 1;
            continue;
          }

          const current = this.get(
            candidate.type,
            candidate.id
          );

          const selected =
            options.overwrite
              ? candidate
              : resolveConflict(
                  current,
                  candidate,
                  this.config
                    .preferRemoteOnConflict
                );

          if (
            current &&
            selected === current
          ) {
            result.skipped += 1;
            continue;
          }

          this.save(
            candidate.type,
            candidate.id,
            selected,
            {
              silent: true,
              remote:
                options.remote === true
            }
          );

          result.imported += 1;
        } catch (_) {
          result.errors += 1;
        }
      }

      emit(
        "fizica:progress-imported",
        {
          ...result,
          userId: this.userId
        }
      );

      return result;
    }

    /**
     * Schimbă utilizatorul activ.
     *
     * @param {string | null} userId
     * @returns {string}
     */
    setUser(userId) {
      this.userId =
        normalizeId(
          userId ||
          getOrCreateGuestId(
            this.config
              .anonymousUserPrefix
          ),
          "guest"
        );

      emit(
        "fizica:progress-user-change",
        {
          userId: this.userId
        }
      );

      return this.userId;
    }

    /**
     * Sincronizează toate datele cu adaptorul remote.
     *
     * @returns {Promise<object>}
     */
    async syncAll() {
      if (!remoteAdapter) {
        throw new Error(
          "Nu este configurat niciun adaptor pentru sincronizare."
        );
      }

      emit(
        "fizica:progress-sync-start",
        {
          userId: this.userId
        }
      );

      try {
        const localEntries =
          this.list();

        let remoteEntries = [];

        if (
          typeof remoteAdapter.list ===
          "function"
        ) {
          remoteEntries =
            await remoteAdapter.list(
              this.userId
            );

          if (
            !Array.isArray(remoteEntries)
          ) {
            remoteEntries = [];
          }
        }

        const remoteMap = new Map(
          remoteEntries.map((entry) => [
            `${normalizeType(
              entry.type
            )}:${normalizeId(entry.id)}`,
            entry
          ])
        );

        let uploaded = 0;
        let downloaded = 0;

        for (
          const localEntry
          of localEntries
        ) {
          const key =
            `${localEntry.type}:${localEntry.id}`;
          const remoteEntry =
            remoteMap.get(key);

          const selected =
            resolveConflict(
              localEntry,
              remoteEntry,
              this.config
                .preferRemoteOnConflict
            );

          if (selected === remoteEntry) {
            this.save(
              remoteEntry.type,
              remoteEntry.id,
              remoteEntry,
              {
                silent: true,
                remote: false
              }
            );
            downloaded += 1;
          } else if (
            typeof remoteAdapter.save ===
            "function"
          ) {
            await remoteAdapter.save(
              this.userId,
              localEntry
            );
            uploaded += 1;
          }

          remoteMap.delete(key);
        }

        for (
          const remoteEntry
          of remoteMap.values()
        ) {
          this.save(
            remoteEntry.type,
            remoteEntry.id,
            remoteEntry,
            {
              silent: true,
              remote: false
            }
          );
          downloaded += 1;
        }

        const result = {
          userId: this.userId,
          uploaded,
          downloaded,
          total: this.list().length
        };

        emit(
          "fizica:progress-sync-complete",
          result
        );

        return result;
      } catch (error) {
        emit(
          "fizica:progress-sync-error",
          {
            userId: this.userId,
            message:
              error?.message ||
              String(error)
          }
        );

        throw error;
      }
    }

    /**
     * Citește datele remote și le importă.
     *
     * @returns {Promise<object>}
     */
    async pullRemote() {
      if (
        !remoteAdapter ||
        typeof remoteAdapter.list !==
          "function"
      ) {
        return {
          imported: 0,
          skipped: 0,
          errors: 0
        };
      }

      const entries =
        await remoteAdapter.list(
          this.userId
        );

      return this.importData(
        {
          entries:
            Array.isArray(entries)
              ? entries
              : []
        },
        {
          overwrite: false,
          remote: false
        }
      );
    }

    /**
     * Pune o salvare în coada remote.
     *
     * @param {object} entry
     */
    queueRemoteSave(entry) {
      if (
        !remoteAdapter ||
        typeof remoteAdapter.save !==
          "function"
      ) {
        return;
      }

      const key =
        `${entry.type}:${entry.id}`;

      const oldTimer =
        this.remoteTimers.get(key);

      if (oldTimer) {
        window.clearTimeout(oldTimer);
      }

      const timer =
        window.setTimeout(async () => {
          this.remoteTimers.delete(key);

          try {
            await remoteAdapter.save(
              this.userId,
              clone(entry)
            );

            emit(
              "fizica:progress-sync-complete",
              {
                userId: this.userId,
                action: "save",
                entry
              }
            );
          } catch (error) {
            emit(
              "fizica:progress-sync-error",
              {
                userId: this.userId,
                action: "save",
                entry,
                message:
                  error?.message ||
                  String(error)
              }
            );
          }
        }, this.config.remoteSyncDebounceMs);

      this.remoteTimers.set(
        key,
        timer
      );
    }

    /**
     * Pune o ștergere în coada remote.
     *
     * @param {object} entry
     */
    queueRemoteRemove(entry) {
      if (
        !remoteAdapter ||
        typeof remoteAdapter.remove !==
          "function"
      ) {
        return;
      }

      Promise.resolve(
        remoteAdapter.remove(
          this.userId,
          entry.type,
          entry.id
        )
      ).catch((error) => {
        emit(
          "fizica:progress-sync-error",
          {
            userId: this.userId,
            action: "remove",
            entry,
            message:
              error?.message ||
              String(error)
          }
        );
      });
    }

    /**
     * Modificare venită din altă filă.
     *
     * @param {StorageEvent} event
     */
    handleStorage(event) {
      if (
        !event.key ||
        !event.key.startsWith(
          ENTRY_PREFIX
        )
      ) {
        if (event.key === INDEX_KEY) {
          this.index = this.readIndex();
        }
        return;
      }

      this.index = this.readIndex();

      emit(
        "fizica:progress-external-change",
        {
          key: event.key,
          oldValue:
            safeJsonParse(
              event.oldValue
            ),
          newValue:
            safeJsonParse(
              event.newValue
            )
        }
      );
    }

    /**
     * Eveniment: schimbarea paginii unei lecții.
     *
     * @param {CustomEvent} event
     */
    handleLessonPage(event) {
      const detail =
        event.detail || {};

      const id =
        detail.lessonId ||
        detail.id;

      if (!id) {
        return;
      }

      const currentPage =
        finiteNumber(
          detail.currentPage ??
          detail.page,
          0
        ) || 0;

      const totalPages =
        finiteNumber(
          detail.totalPages,
          0
        ) || 0;

      this.saveDebounced(
        "lesson",
        id,
        {
          title:
            detail.title ||
            detail.titlu,
          route:
            detail.route ||
            window.location.pathname,
          currentPage,
          totalPages,
          progress:
            detail.progress,
          completed:
            detail.completed,
          chapterId:
            detail.chapterId,
          classId:
            detail.classId,
          metadata:
            {
              sourceEvent:
                "fizica:lesson-page-change"
            }
        },
        {
          silent: true
        }
      );
    }

    /**
     * Eveniment: lecție finalizată.
     *
     * @param {CustomEvent} event
     */
    handleLessonComplete(event) {
      const detail =
        event.detail || {};
      const id =
        detail.lessonId ||
        detail.id;

      if (!id) {
        return;
      }

      this.markCompleted(
        "lesson",
        id,
        {
          ...detail,
          route:
            detail.route ||
            window.location.pathname
        }
      );
    }

    /**
     * Eveniment: fișă finalizată.
     *
     * @param {CustomEvent} event
     */
    handleWorksheetComplete(event) {
      const detail =
        event.detail || {};
      const id =
        detail.worksheetId ||
        detail.id;

      if (!id) {
        return;
      }

      this.markCompleted(
        "worksheet",
        id,
        {
          ...detail,
          score:
            detail.score ??
            detail.points,
          total:
            detail.total ??
            detail.maxScore,
          route:
            detail.route ||
            window.location.pathname,
          incrementAttempt: true
        }
      );
    }

    /**
     * Eveniment: test finalizat.
     *
     * @param {CustomEvent} event
     */
    handleTestComplete(event) {
      const detail =
        event.detail || {};
      const id =
        detail.testId ||
        detail.id;

      if (!id) {
        return;
      }

      this.markCompleted(
        "test",
        id,
        {
          ...detail,
          score:
            detail.score ??
            detail.points,
          total:
            detail.total ??
            detail.maxScore,
          grade:
            detail.grade ??
            detail.nota,
          route:
            detail.route ||
            window.location.pathname,
          incrementAttempt: true
        }
      );
    }

    /**
     * Eveniment: schimbarea pasului de laborator.
     *
     * @param {CustomEvent} event
     */
    handleLabStep(event) {
      const detail =
        event.detail || {};
      const id =
        detail.labId ||
        detail.id;

      if (!id) {
        return;
      }

      const currentStep =
        finiteNumber(
          detail.currentStep,
          0
        ) || 0;

      const totalSteps =
        finiteNumber(
          detail.totalSteps,
          0
        ) || 0;

      this.saveDebounced(
        "lab",
        id,
        {
          title:
            detail.title ||
            detail.titlu,
          route:
            detail.route ||
            window.location.pathname,
          currentPage: currentStep,
          totalPages: totalSteps,
          progress:
            detail.progress ??
            (
              totalSteps > 0
                ? ((currentStep + 1) /
                    totalSteps) *
                  100
                : 0
            ),
          completed:
            detail.completed,
          metadata: {
            sourceEvent:
              "fizica:lab-step-change"
          }
        },
        {
          silent: true
        }
      );
    }

    /**
     * Eveniment: motorul laboratorului și-a salvat starea.
     *
     * @param {CustomEvent} event
     */
    handleLabSaved(event) {
      const detail =
        event.detail || {};
      const id =
        detail.labId ||
        detail.id;

      if (!id) {
        return;
      }

      this.saveDebounced(
        "lab",
        id,
        {
          ...detail,
          route:
            detail.route ||
            window.location.pathname
        },
        {
          silent: true
        }
      );
    }

    /**
     * Eveniment: laborator finalizat.
     *
     * @param {CustomEvent} event
     */
    handleLabComplete(event) {
      const detail =
        event.detail || {};
      const id =
        detail.labId ||
        detail.id;

      if (!id) {
        return;
      }

      this.markCompleted(
        "lab",
        id,
        {
          ...detail,
          score:
            detail.quickChecks?.correct ??
            detail.score,
          total:
            detail.quickChecks?.total ??
            detail.total,
          route:
            detail.route ||
            window.location.pathname,
          incrementAttempt: true,
          metadata: {
            hypothesis:
              detail.hypothesis,
            measurements:
              detail.measurements,
            conclusion:
              detail.conclusion,
            notes:
              detail.notes
          }
        }
      );
    }
  }

  /**
   * Setează adaptorul remote.
   *
   * Adaptorul poate implementa:
   *
   * {
   *   async list(userId) {},
   *   async save(userId, entry) {},
   *   async remove(userId, type, id) {}
   * }
   *
   * @param {object | null} adapter
   * @returns {object | null}
   */
  function setRemoteAdapter(adapter) {
    if (adapter === null) {
      remoteAdapter = null;
      return null;
    }

    if (
      typeof adapter !== "object"
    ) {
      throw new TypeError(
        "Adaptorul remote trebuie să fie un obiect."
      );
    }

    remoteAdapter = adapter;
    return remoteAdapter;
  }

  /**
   * Inițializează store-ul.
   *
   * @param {object} options
   * @returns {ProgressStore}
   */
  function init(options = {}) {
    if (activeStore) {
      if (
        options.userId &&
        normalizeId(options.userId) !==
          activeStore.userId
      ) {
        activeStore.setUser(
          options.userId
        );
      }

      return activeStore;
    }

    activeStore =
      new ProgressStore(options);

    return activeStore.init();
  }

  /**
   * Returnează store-ul activ.
   *
   * @returns {ProgressStore}
   */
  function getStore() {
    return (
      activeStore ||
      init()
    );
  }

  /**
   * API public.
   */
  const api = {
    init,

    getStore,

    get(type, id) {
      return getStore().get(type, id);
    },

    save(type, id, data, options) {
      return getStore().save(
        type,
        id,
        data,
        options
      );
    },

    patch(type, id, data, options) {
      return getStore().patch(
        type,
        id,
        data,
        options
      );
    },

    saveDebounced(
      type,
      id,
      data,
      options
    ) {
      return getStore().saveDebounced(
        type,
        id,
        data,
        options
      );
    },

    setLastPage(
      id,
      currentPage,
      totalPages,
      data
    ) {
      return getStore().setLastPage(
        id,
        currentPage,
        totalPages,
        data
      );
    },

    markCompleted(type, id, data) {
      return getStore()
        .markCompleted(
          type,
          id,
          data
        );
    },

    recordScore(
      type,
      id,
      score,
      total,
      data
    ) {
      return getStore().recordScore(
        type,
        id,
        score,
        total,
        data
      );
    },

    remove(type, id, options) {
      return getStore().remove(
        type,
        id,
        options
      );
    },

    clear(filters) {
      return getStore().clear(filters);
    },

    list(filters) {
      return getStore().list(filters);
    },

    getByType(type) {
      return getStore().getByType(type);
    },

    getSummary(filters) {
      return getStore().getSummary(
        filters
      );
    },

    exportData() {
      return getStore().exportData();
    },

    importData(data, options) {
      return getStore().importData(
        data,
        options
      );
    },

    setUser(userId) {
      return getStore().setUser(userId);
    },

    getUserId() {
      return getStore().userId;
    },

    setRemoteAdapter,

    syncAll() {
      return getStore().syncAll();
    },

    pullRemote() {
      return getStore().pullRemote();
    },

    destroy() {
      if (activeStore) {
        activeStore.destroy();
        activeStore = null;
      }
    },

    helpers: {
      normalizeId,
      normalizeType,
      normalizeScore,
      resolveConflict,
      canUseLocalStorage
    }
  };

  app.progress = api;

  /*
   * Funcție globală de compatibilitate cu app.js.
   */
  window.initProgress = function (
    options = {}
  ) {
    return api.init(options);
  };
})();
