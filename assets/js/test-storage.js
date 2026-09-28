/**
 * Fizica Galaction - Test Storage
 * Modul comun pentru:
 * - profil persistent al elevului;
 * - sesiunea unui test neterminat;
 * - progres permanent pe niveluri;
 * - deblocare secvențială;
 * - recorduri și diplomă.
 *
 * API: window.FizicaGalaction.testStorage
 */
(function (window) {
  "use strict";

  const APP = (window.FizicaGalaction = window.FizicaGalaction || {});
  const VERSION = 2;
  const NS = "fizica-galaction";

  const KEYS = Object.freeze({
    studentProfile: `${NS}:student-profile`,
    sessionPrefix: `${NS}:test:`,
    progressPrefix: `${NS}:progress:`
  });

  function now() {
    return new Date().toISOString();
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function clone(value) {
    if (value === undefined) return undefined;

    try {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function clamp(value, min, max) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return min;
    }

    return Math.min(max, Math.max(min, n));
  }

  function cleanId(value, fallback = "default") {
    const id = String(value ?? "")
      .trim()
      .replace(/^:+|:+$/g, "");

    return id || fallback;
  }

  function randomId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function emit(name, detail) {
    try {
      document.dispatchEvent(
        new CustomEvent(name, {
          detail: clone(detail)
        })
      );
    } catch (_) {
      // Persistența trebuie să funcționeze și fără evenimente DOM.
    }
  }

  function isAvailable() {
    try {
      const key = `${NS}:storage-test`;

      localStorage.setItem(key, "1");
      localStorage.removeItem(key);

      return true;
    } catch (_) {
      return false;
    }
  }

  function read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);

      return raw === null
        ? clone(fallback)
        : JSON.parse(raw);
    } catch (error) {
      console.warn(
        `[Fizica Galaction] Nu s-a putut citi ${key}.`,
        error
      );

      return clone(fallback);
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        `[Fizica Galaction] Nu s-a putut salva ${key}.`,
        error
      );

      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);

      return true;
    } catch (error) {
      console.warn(
        `[Fizica Galaction] Nu s-a putut șterge ${key}.`,
        error
      );

      return false;
    }
  }

  function getSessionKey(testId) {
    return KEYS.sessionPrefix + cleanId(testId);
  }

  function getProgressKey(groupId) {
    return KEYS.progressPrefix + cleanId(groupId);
  }

  /* =========================================================
     PROFIL ELEV
  ========================================================= */

  function normalizeStudentProfile(profile) {
    const source = isObject(profile)
      ? profile
      : {};

    const out = {};

    Object.keys(source).forEach((key) => {
      if (
        [
          "version",
          "playerId",
          "createdAt",
          "updatedAt"
        ].includes(key)
      ) {
        return;
      }

      const value = source[key];

      if (
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        [
          "string",
          "number",
          "boolean"
        ].includes(typeof value)
      ) {
        const cleaned =
          String(value).trim();

        if (cleaned !== "") {
          out[key] = cleaned;
        }
      }
    });

    out.version = VERSION;

    out.playerId = String(
      source.playerId || randomId()
    );

    out.createdAt =
      source.createdAt || now();

    out.updatedAt =
      source.updatedAt ||
      out.createdAt;

    return out;
  }

  function getStudentProfile() {
    const saved = read(
      KEYS.studentProfile,
      null
    );

    return isObject(saved)
      ? normalizeStudentProfile(saved)
      : {};
  }

  function saveStudentProfile(
    profile,
    options = {}
  ) {
    const previous =
      getStudentProfile();

    const source =
      isObject(profile)
        ? profile
        : {};

    const replace =
      options.replace === true;

    const merged = replace
      ? source
      : {
          ...previous,
          ...source
        };

    const normalized =
      normalizeStudentProfile({
        ...merged,

        playerId:
          merged.playerId ||
          previous.playerId ||
          randomId(),

        createdAt:
          merged.createdAt ||
          previous.createdAt ||
          now(),

        updatedAt:
          now()
      });

    if (
      !write(
        KEYS.studentProfile,
        normalized
      )
    ) {
      return null;
    }

    emit(
      "fizica:student-profile-change",
      normalized
    );

    return clone(normalized);
  }

  function updateStudentProfile(fields) {
    return saveStudentProfile(
      fields,
      {
        replace: false
      }
    );
  }

  function clearStudentProfile() {
    const ok =
      remove(
        KEYS.studentProfile
      );

    if (ok) {
      emit(
        "fizica:student-profile-change",
        {}
      );
    }

    return ok;
  }

  /* =========================================================
     SESIUNE TEST ÎN CURS
  ========================================================= */

  function normalizeSession(
    testId,
    session
  ) {
    const source =
      isObject(session)
        ? session
        : {};

    return {
      ...clone(source),

      version: VERSION,

      testId:
        cleanId(testId),

      savedAt:
        source.savedAt ||
        now(),

      updatedAt:
        source.updatedAt ||
        now()
    };
  }

  function saveSession(
    testId,
    session
  ) {
    const id =
      cleanId(testId);

    const payload =
      normalizeSession(
        id,
        {
          ...(isObject(session)
            ? session
            : {}),

          savedAt: now(),
          updatedAt: now()
        }
      );

    const ok =
      write(
        getSessionKey(id),
        payload
      );

    if (ok) {
      emit(
        "fizica:test-session-save",
        {
          testId: id,
          session: payload
        }
      );
    }

    return ok;
  }

  function getSession(
    testId,
    options = {}
  ) {
    const id =
      cleanId(testId);

    const saved =
      read(
        getSessionKey(id),
        null
      );

    if (!isObject(saved)) {
      return null;
    }

    if (
      saved.testId &&
      cleanId(saved.testId) !== id
    ) {
      return null;
    }

    const maxAgeHours =
      Number(
        options.maxAgeHours
      );

    if (
      Number.isFinite(
        maxAgeHours
      ) &&
      maxAgeHours > 0
    ) {
      const stamp =
        Date.parse(
          saved.savedAt ||
          saved.updatedAt ||
          ""
        );

      const maxAgeMs =
        maxAgeHours *
        60 *
        60 *
        1000;

      if (
        Number.isFinite(stamp) &&
        Date.now() - stamp >
          maxAgeMs
      ) {
        clearSession(id);

        return null;
      }
    }

    return normalizeSession(
      id,
      saved
    );
  }

  function hasSession(
    testId,
    options = {}
  ) {
    return Boolean(
      getSession(
        testId,
        options
      )
    );
  }

  function clearSession(testId) {
    const id =
      cleanId(testId);

    const ok =
      remove(
        getSessionKey(id)
      );

    if (ok) {
      emit(
        "fizica:test-session-clear",
        {
          testId: id
        }
      );
    }

    return ok;
  }

  /* =========================================================
     CONFIGURAȚIE PROGRES
  ========================================================= */

  function normalizeProgression(
    config = {}
  ) {
    const source =
      isObject(config)
        ? config
        : {};

    const totalLevels =
      Math.max(
        1,
        Math.floor(
          Number(
            source.totalLevels
          ) || 1
        )
      );

    return {
      groupId:
        cleanId(
          source.groupId ||
          source.id
        ),

      level:
        clamp(
          Math.floor(
            Number(
              source.level
            ) || 1
          ),
          1,
          totalLevels
        ),

      totalLevels,

      diplomaRequiredLevel:
        clamp(
          Math.floor(
            Number(
              source.diplomaRequiredLevel
            ) ||
            totalLevels
          ),
          1,
          totalLevels
        ),

      autoAdvancePercent:
        clamp(
          Number(
            source.autoAdvancePercent
          ) || 100,
          0,
          100
        ),

      unlockNextOnComplete:
        source.unlockNextOnComplete !==
        false,

      autoAdvance:
        source.autoAdvance !== false
    };
  }

  function emptyLevelProgress() {
    return {
      completed: false,

      attempts: 0,

      bestPercent: 0,

      bestScore: 0,

      perfect: false,

      firstCompletedAt: null,

      lastCompletedAt: null
    };
  }

  function normalizeLevelProgress(
    value
  ) {
    const source =
      isObject(value)
        ? value
        : {};

    return {
      completed:
        Boolean(
          source.completed
        ),

      attempts:
        Math.max(
          0,
          Math.floor(
            Number(
              source.attempts
            ) || 0
          )
        ),

      bestPercent:
        clamp(
          Number(
            source.bestPercent
          ) || 0,
          0,
          100
        ),

      bestScore:
        Math.max(
          0,
          Number(
            source.bestScore
          ) || 0
        ),

      perfect:
        Boolean(
          source.perfect
        ),

      firstCompletedAt:
        source.firstCompletedAt ||
        null,

      lastCompletedAt:
        source.lastCompletedAt ||
        null
    };
  }

  function createProgress(
    config = {}
  ) {
    const p =
      normalizeProgression(
        config
      );

    const levels = {};

    for (
      let level = 1;
      level <= p.totalLevels;
      level += 1
    ) {
      levels[level] =
        emptyLevelProgress();
    }

    return {
      version: VERSION,

      groupId:
        p.groupId,

      totalLevels:
        p.totalLevels,

      unlockedLevel: 1,

      lastCompletedLevel: 0,

      lastPlayedLevel: null,

      totalCompletedAttempts: 0,

      levels,

      diplomaUnlocked: false,

      diplomaUnlockedAt: null,

      createdAt: now(),

      updatedAt: now()
    };
  }

  function normalizeProgress(
    saved,
    config = {}
  ) {
    const p =
      normalizeProgression(
        config
      );

    const base =
      createProgress(p);

    if (!isObject(saved)) {
      return base;
    }

    const out = {
      ...base,
      ...clone(saved),

      version: VERSION,

      groupId:
        p.groupId,

      totalLevels:
        p.totalLevels,

      levels: {}
    };

    for (
      let level = 1;
      level <= p.totalLevels;
      level += 1
    ) {
      out.levels[level] =
        normalizeLevelProgress(
          saved.levels?.[level] ||
          saved.levels?.[
            String(level)
          ] ||
          {}
        );
    }

    /*
     * Deblocarea este recalculată
     * secvențial.
     */
    let sequentialUnlocked = 1;

    for (
      let level = 1;
      level < p.totalLevels;
      level += 1
    ) {
      if (
        out.levels[level]
          .completed
      ) {
        sequentialUnlocked =
          level + 1;
      } else {
        break;
      }
    }

    out.unlockedLevel =
      clamp(
        Math.max(
          Number(
            out.unlockedLevel
          ) || 1,

          sequentialUnlocked
        ),
        1,
        p.totalLevels
      );

    out.lastCompletedLevel =
      clamp(
        Number(
          out.lastCompletedLevel
        ) || 0,
        0,
        p.totalLevels
      );

    if (
      out.lastPlayedLevel !== null
    ) {
      out.lastPlayedLevel =
        clamp(
          Number(
            out.lastPlayedLevel
          ) || 1,
          1,
          p.totalLevels
        );
    }

    out.totalCompletedAttempts =
      Math.max(
        0,
        Math.floor(
          Number(
            out.totalCompletedAttempts
          ) || 0
        )
      );

    const diplomaLevel =
      out.levels[
        p.diplomaRequiredLevel
      ];

    /*
     * Diploma rămâne permanent
     * deblocată după finalizarea
     * nivelului necesar.
     */
    if (
      out.diplomaUnlocked ||
      diplomaLevel?.completed
    ) {
      out.diplomaUnlocked =
        true;

      out.diplomaUnlockedAt =
        out.diplomaUnlockedAt ||
        diplomaLevel
          ?.firstCompletedAt ||
        diplomaLevel
          ?.lastCompletedAt ||
        now();
    } else {
      out.diplomaUnlocked =
        false;

      out.diplomaUnlockedAt =
        null;
    }

    out.createdAt =
      saved.createdAt ||
      base.createdAt;

    out.updatedAt =
      saved.updatedAt ||
      base.updatedAt;

    return out;
  }

  /* =========================================================
     PROGRES - CITIRE / SCRIERE
  ========================================================= */

  function getProgress(
    groupId,
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    return normalizeProgress(
      read(
        getProgressKey(
          p.groupId
        ),
        null
      ),
      p
    );
  }

  function saveProgress(
    groupId,
    progress,
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    const normalized =
      normalizeProgress(
        {
          ...(isObject(progress)
            ? progress
            : {}),

          updatedAt: now()
        },
        p
      );

    normalized.updatedAt =
      now();

    if (
      !write(
        getProgressKey(
          p.groupId
        ),
        normalized
      )
    ) {
      return null;
    }

    emit(
      "fizica:test-progress",
      normalized
    );

    return clone(
      normalized
    );
  }

  function clearProgress(
    groupId
  ) {
    const id =
      cleanId(groupId);

    const ok =
      remove(
        getProgressKey(id)
      );

    if (ok) {
      emit(
        "fizica:test-progress-reset",
        {
          groupId: id
        }
      );
    }

    return ok;
  }

  /* =========================================================
     NIVELURI
  ========================================================= */

  function canStartLevel(
    groupId,
    level,
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    const requested =
      clamp(
        Math.floor(
          Number(level) || 1
        ),
        1,
        p.totalLevels
      );

    if (requested === 1) {
      return true;
    }

    const progress =
      getProgress(
        p.groupId,
        p
      );

    /*
     * Toate nivelurile precedente
     * trebuie terminate.
     */
    for (
      let previous = 1;
      previous < requested;
      previous += 1
    ) {
      if (
        !progress
          .levels[previous]
          ?.completed
      ) {
        return false;
      }
    }

    return (
      requested <=
      progress.unlockedLevel
    );
  }

  function getLevelProgress(
    groupId,
    level,
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    const requested =
      clamp(
        Math.floor(
          Number(level) || 1
        ),
        1,
        p.totalLevels
      );

    return clone(
      getProgress(
        p.groupId,
        p
      ).levels[requested]
    );
  }

  function markLevelStarted(
    groupId,
    level,
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    const requested =
      clamp(
        Math.floor(
          Number(level) || 1
        ),
        1,
        p.totalLevels
      );

    if (
      !canStartLevel(
        p.groupId,
        requested,
        p
      )
    ) {
      return null;
    }

    const progress =
      getProgress(
        p.groupId,
        p
      );

    progress.lastPlayedLevel =
      requested;

    progress.updatedAt =
      now();

    return saveProgress(
      p.groupId,
      progress,
      p
    );
  }

  function completeLevel(
    groupId,
    level,
    result = {},
    config = {}
  ) {
    const p =
      normalizeProgression({
        ...config,
        groupId
      });

    const currentLevel =
      clamp(
        Math.floor(
          Number(level) || 1
        ),
        1,
        p.totalLevels
      );

    /*
     * Nu permitem finalizarea artificială
     * a unui nivel blocat.
     */
    if (
      !canStartLevel(
        p.groupId,
        currentLevel,
        p
      )
    ) {
      return {
        ok: false,

        reason:
          "level-locked",

        groupId:
          p.groupId,

        level:
          currentLevel,

        progress:
          getProgress(
            p.groupId,
            p
          )
      };
    }

    const progress =
      getProgress(
        p.groupId,
        p
      );

    const previous =
      normalizeLevelProgress(
        progress
          .levels[
            currentLevel
          ]
      );

    const completedAt =
      now();

    const percent =
      clamp(
        Number(
          result.percent
        ) || 0,
        0,
        100
      );

    const score =
      Math.max(
        0,
        Number(
          result.score
        ) || 0
      );

    progress.levels[
      currentLevel
    ] = {
      ...previous,

      completed: true,

      attempts:
        previous.attempts + 1,

      bestPercent:
        Math.max(
          previous.bestPercent,
          percent
        ),

      bestScore:
        Math.max(
          previous.bestScore,
          score
        ),

      perfect:
        previous.perfect ||
        percent >= 100,

      firstCompletedAt:
        previous.firstCompletedAt ||
        completedAt,

      lastCompletedAt:
        completedAt
    };

    progress.lastPlayedLevel =
      currentLevel;

    progress.lastCompletedLevel =
      Math.max(
        progress
          .lastCompletedLevel ||
          0,

        currentLevel
      );

    progress.totalCompletedAttempts =
      (
        progress
          .totalCompletedAttempts ||
        0
      ) + 1;

    let nextLevelUnlocked =
      false;

    /*
     * Nivelul următor se deblochează
     * numai după finalizarea nivelului
     * curent.
     */
    if (
      p.unlockNextOnComplete &&
      currentLevel <
        p.totalLevels
    ) {
      const before =
        progress.unlockedLevel;

      progress.unlockedLevel =
        Math.max(
          progress
            .unlockedLevel ||
          1,

          currentLevel + 1
        );

      nextLevelUnlocked =
        progress.unlockedLevel >
        before;
    }

    let diplomaJustUnlocked =
      false;

    /*
     * Diploma devine disponibilă
     * numai după parcurgerea
     * nivelului configurat.
     */
    if (
      currentLevel >=
      p.diplomaRequiredLevel
    ) {
      if (
        !progress
          .diplomaUnlocked
      ) {
        diplomaJustUnlocked =
          true;

        progress.diplomaUnlockedAt =
          completedAt;
      }

      progress.diplomaUnlocked =
        true;
    }

    const saved =
      saveProgress(
        p.groupId,
        progress,
        p
      );

    if (!saved) {
      return {
        ok: false,

        reason:
          "storage-error",

        groupId:
          p.groupId,

        level:
          currentLevel
      };
    }

    /*
     * Trecerea automată este
     * separată de deblocare.
     *
     * Exemplu:
     * - 75% → nivelul următor se deblochează;
     * - 100% → nivelul următor se deblochează
     *          și poate porni automat.
     */
    const perfectForAdvance =
      percent >=
      p.autoAdvancePercent;

    const hasNextLevel =
      currentLevel <
      p.totalLevels;

    const response = {
      ok: true,

      groupId:
        p.groupId,

      level:
        currentLevel,

      percent,

      score,

      perfect:
        percent >= 100,

      nextLevel:
        hasNextLevel
          ? currentLevel + 1
          : null,

      nextLevelUnlocked,

      shouldAutoAdvance:
        Boolean(
          p.autoAdvance &&
          perfectForAdvance &&
          hasNextLevel
        ),

      diplomaUnlocked:
        Boolean(
          saved.diplomaUnlocked
        ),

      diplomaJustUnlocked,

      progress:
        saved
    };

    emit(
      "fizica:test-level-complete",
      response
    );

    if (
      nextLevelUnlocked
    ) {
      emit(
        "fizica:test-level-unlocked",
        {
          groupId:
            p.groupId,

          level:
            currentLevel + 1,

          progress:
            saved
        }
      );
    }

    if (
      diplomaJustUnlocked
    ) {
      emit(
        "fizica:test-diploma-unlocked",
        {
          groupId:
            p.groupId,

          requiredLevel:
            p.diplomaRequiredLevel,

          progress:
            saved
        }
      );
    }

    return response;
  }

  function getUnlockedLevel(
    groupId,
    config = {}
  ) {
    return getProgress(
      groupId,
      config
    ).unlockedLevel;
  }

  function isDiplomaUnlocked(
    groupId,
    config = {}
  ) {
    return Boolean(
      getProgress(
        groupId,
        config
      ).diplomaUnlocked
    );
  }

  function getBestResult(
    groupId,
    level,
    config = {}
  ) {
    const data =
      getLevelProgress(
        groupId,
        level,
        config
      );

    return {
      percent:
        data.bestPercent,

      score:
        data.bestScore,

      attempts:
        data.attempts,

      perfect:
        data.perfect,

      completed:
        data.completed
    };
  }

  /* =========================================================
     RESET GENERAL
  ========================================================= */

  function clearAllTestData(
    options = {}
  ) {
    const keepStudentProfile =
      options.keepStudentProfile !==
      false;

    try {
      const keys = [];

      for (
        let i = 0;
        i < localStorage.length;
        i += 1
      ) {
        const key =
          localStorage.key(i);

        if (!key) {
          continue;
        }

        if (
          key.startsWith(
            KEYS.sessionPrefix
          ) ||
          key.startsWith(
            KEYS.progressPrefix
          )
        ) {
          keys.push(key);
        }
      }

      keys.forEach(
        (key) =>
          localStorage.removeItem(
            key
          )
      );

      if (
        !keepStudentProfile
      ) {
        localStorage.removeItem(
          KEYS.studentProfile
        );
      }

      emit(
        "fizica:test-storage-reset",
        {
          keepStudentProfile,
          removedKeys:
            keys.length
        }
      );

      return true;
    } catch (error) {
      console.warn(
        "[Fizica Galaction] Resetarea datelor a eșuat.",
        error
      );

      return false;
    }
  }

  /* =========================================================
     API PUBLIC
  ========================================================= */

  const api =
    Object.freeze({
      version: VERSION,

      keys: KEYS,

      isAvailable,

      read,
      write,
      remove,

      /*
       * Profil elev
       */
      getStudentProfile,
      saveStudentProfile,
      updateStudentProfile,
      clearStudentProfile,

      /*
       * Sesiune
       */
      getSessionKey,
      saveSession,
      getSession,
      hasSession,
      clearSession,

      /*
       * Progres
       */
      getProgressKey,
      normalizeProgression,
      createProgress,
      normalizeProgress,
      getProgress,
      saveProgress,
      clearProgress,

      /*
       * Niveluri
       */
      canStartLevel,
      getLevelProgress,
      markLevelStarted,
      completeLevel,
      getUnlockedLevel,
      getBestResult,
      isDiplomaUnlocked,

      /*
       * Administrare
       */
      clearAllTestData
    });

  APP.testStorage = api;

  /*
   * Alias pentru compatibilitate.
   *
   * Varianta recomandată:
   * FizicaGalaction.testStorage
   */
  window.TestStorage = api;

})(window);
