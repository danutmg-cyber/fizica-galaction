/**
 * test-engine.js — Fizica Galaction
 *
 * Motor comun pentru testele interactive.
 *
 * Responsabilități:
 * - citește window.TEST_DATA / window.TEST_CONFIG;
 * - construiește interfața testului;
 * - validează și evaluează răspunsurile;
 * - folosește FizicaGalaction.testStorage pentru profil, sesiune și progres;
 * - blochează nivelurile nepermise;
 * - deblochează nivelul următor după finalizare;
 * - trece automat la nivelul următor la procentul configurat;
 * - permite diploma numai după nivelul configurat;
 * - emite evenimente pentru integrare cu alte module.
 *
 * Dependențe recomandate în HTML:
 *
 * <link rel="stylesheet" href="../../assets/css/test-style.css">
 *
 * <script src="../../assets/js/test-storage.js"></script>
 * <script src="../../assets/js/unitati-de-masura.js"></script>
 * <script src="../../assets/js/test-engine.js"></script>
 *
 * <div id="testApp" data-test-engine></div>
 *
 * <script>
 *   initTestEngine();
 * </script>
 */

(function (window, document) {
    "use strict";

    const APP =
        (window.FizicaGalaction =
            window.FizicaGalaction || {});

    const VERSION = 3;


    /* =========================================================
       CONFIGURAȚIE IMPLICITĂ
    ========================================================= */

    const DEFAULT_CONFIG = Object.freeze({

        mountSelector:
            "#testApp, [data-test-engine]",

        questionsPerPage: 1,

        shuffleQuestions: false,
        shuffleOptions: false,

        requireAllAnswers: true,

        allowBack: true,

        immediateFeedback: true,

        lockAfterCheck: true,

        showCorrectAnswers: true,
        showExplanations: true,
        showQuestionPoints: true,

        persistStudentProfile: true,

        saveProgress: true,
        restoreProgress: true,

        maxSavedAgeHours: 168,

        keyboard: true,
        updateHash: true,

        showTimer: false,
        autoSubmitOnTimeout: false,

        confirmBeforeSubmit: true,

        allowRestart: true,
        allowPrint: true,

        startImmediately: false,

        passingGrade: 5,
        minimumGrade: 1,
        maximumGrade: 10,

        autoAdvanceDelayMs: 1800
    });


    /* =========================================================
       STAREA INTERNĂ
    ========================================================= */

    const state = {

        initialized: false,

        started: false,
        submitted: false,

        mount: null,

        data: null,
        config: null,

        storage: null,

        questions: [],

        answers: {},
        checked: {},

        currentIndex: 0,

        student: {},

        startedAt: null,
        submittedAt: null,

        timerId: null,
        remainingSeconds: null,

        result: null,

        progressionResult: null,

        autoAdvanceTimer: null,

        keyHandlerInstalled: false
    };


    /* =========================================================
       FUNCȚII UTILE
    ========================================================= */

    function clone(value) {

        if (value === undefined) {
            return undefined;
        }

        try {

            if (
                typeof structuredClone ===
                "function"
            ) {
                return structuredClone(value);
            }

            return JSON.parse(
                JSON.stringify(value)
            );

        } catch (_) {

            return value;
        }
    }


    function isObject(value) {

        return Boolean(
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    function arrayify(value) {

        if (Array.isArray(value)) {
            return value;
        }

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return [];
        }

        return [value];
    }


    function numberOr(
        value,
        fallback = 0
    ) {

        const n =
            Number(value);

        return Number.isFinite(n)
            ? n
            : fallback;
    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                numberOr(
                    value,
                    min
                )
            )
        );
    }


    function round(
        value,
        decimals = 6
    ) {

        const factor =
            10 ** decimals;

        return (
            Math.round(
                (
                    Number(value) +
                    Number.EPSILON
                ) *
                factor
            ) /
            factor
        );
    }


    function escapeHtml(value) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function emit(
        name,
        detail
    ) {

        try {

            document.dispatchEvent(
                new CustomEvent(
                    name,
                    {
                        detail:
                            clone(detail)
                    }
                )
            );

        } catch (_) {

            /*
             * Integrarea prin evenimente
             * este opțională.
             */
        }
    }


    function formatNumber(value) {

        const n =
            Number(value);

        if (
            !Number.isFinite(n)
        ) {
            return String(
                value ?? ""
            );
        }

        return new Intl
            .NumberFormat(
                "ro-RO",
                {
                    maximumFractionDigits: 8
                }
            )
            .format(n);
    }


    function normalizeNumericInput(
        value
    ) {

        const text =
            String(
                value ?? ""
            )
                .trim()
                .replace(
                    /\s+/g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

        if (text === "") {
            return NaN;
        }

        const n =
            Number(text);

        return Number.isFinite(n)
            ? n
            : NaN;
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
                    Math.random() *
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


    function getStorage() {

        return (
            APP.testStorage ||
            window.TestStorage ||
            null
        );
    }


    function resolveMount(
        selector
    ) {

        if (
            selector instanceof
            Element
        ) {
            return selector;
        }

        const selectors =
            String(
                selector ||
                DEFAULT_CONFIG
                    .mountSelector
            )
                .split(",")
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

        for (
            const item
            of selectors
        ) {

            const node =
                document.querySelector(
                    item
                );

            if (node) {
                return node;
            }
        }

        return null;
    }


    function scrollTop() {

        try {

            state.mount
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        } catch (_) {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    }


    /* =========================================================
       NORMALIZAREA DATELOR
    ========================================================= */

    function normalizeField(
        field,
        index
    ) {

        const source =
            isObject(field)
                ? field
                : {};

        return {

            id:
                String(
                    source.id ||
                    source.name ||
                    `field-${index + 1}`
                ),

            label:
                String(
                    source.label ||
                    source.eticheta ||
                    `Câmp ${index + 1}`
                ),

            type:
                String(
                    source.type ||
                    source.tip ||
                    "text"
                ),

            required:
                source.required !== false &&
                source.obligatoriu !== false,

            placeholder:
                String(
                    source.placeholder ||
                    ""
                ),

            options:
                arrayify(
                    source.options ||
                    source.optiuni
                )
        };
    }


    function normalizeOption(
        option,
        index
    ) {

        if (
            isObject(option)
        ) {

            return {

                value:
                    String(
                        option.value ??
                        option.id ??
                        option.text ??
                        index
                    ),

                label:
                    String(
                        option.label ??
                        option.text ??
                        option.value ??
                        index
                    ),

                raw:
                    clone(option)
            };
        }

        return {

            value:
                String(option),

            label:
                String(option),

            raw:
                option
        };
    }


    function normalizeQuestion(
        question,
        index
    ) {

        const source =
            isObject(question)
                ? question
                : {};

        const type =
            String(
                source.type ||
                source.tip ||
                "single"
            )
                .toLowerCase();

        const options =
            arrayify(
                source.options ||
                source.optiuni
            )
                .map(
                    normalizeOption
                );

        const correct =

            source.correctAnswer ??

            source.raspunsCorect ??

            source.answer ??

            source.correct ??

            null;


        return {

            id:
                String(
                    source.id ||
                    `q-${index + 1}`
                ),

            type,

            prompt:
                String(
                    source.prompt ||
                    source.intrebare ||
                    source.question ||
                    ""
                ),

            instruction:
                String(
                    source.instruction ||
                    source.instructiune ||
                    ""
                ),

            image:
                source.image ||
                source.imagine ||
                "",

            unit:
                String(
                    source.unit ||
                    source.unitate ||
                    ""
                ),

            options,

            correctAnswer:
                clone(correct),

            tolerance:
                Math.abs(
                    numberOr(
                        source.tolerance ??
                        source.toleranta,
                        0
                    )
                ),

            relativeTolerance:
                Math.abs(
                    numberOr(
                        source.relativeTolerance ??
                        source.tolerantaRelativa,
                        0
                    )
                ),

            caseSensitive:
                source.caseSensitive ===
                true,

            trimAnswer:
                source.trimAnswer !==
                false,

            points:
                Math.max(
                    0,
                    numberOr(
                        source.points ??
                        source.punctaj,
                        1
                    )
                ),

            explanation:
                String(
                    source.explanation ||
                    source.explicatie ||
                    ""
                ),

            correctMessage:
                String(
                    source.correctMessage ||
                    source.mesajCorect ||
                    "Corect!"
                ),

            incorrectMessage:
                String(
                    source.incorrectMessage ||
                    source.mesajGresit ||
                    "Răspunsul nu este corect."
                ),

            placeholder:
                String(
                    source.placeholder ||
                    ""
                ),

            pairs:
                arrayify(
                    source.pairs ||
                    source.perechi
                ),

            raw:
                clone(source)
        };
    }


    function normalizeProgression(
        data
    ) {

        const source =
            isObject(
                data.progression
            )
                ? data.progression
                : {};

        const totalLevels =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        source.totalLevels,
                        1
                    )
                )
            );

        return {

            groupId:
                String(
                    source.groupId ||
                    data.groupId ||
                    data.id ||
                    "default"
                ),

            level:
                clamp(
                    Math.floor(
                        numberOr(
                            source.level,
                            1
                        )
                    ),
                    1,
                    totalLevels
                ),

            totalLevels,

            diplomaRequiredLevel:
                clamp(
                    Math.floor(
                        numberOr(
                            source.diplomaRequiredLevel,
                            totalLevels
                        )
                    ),
                    1,
                    totalLevels
                ),

            unlockNextOnComplete:
                source
                    .unlockNextOnComplete !==
                false,

            autoAdvance:
                source.autoAdvance !==
                false,

            autoAdvancePercent:
                clamp(
                    source.autoAdvancePercent ??
                    100,
                    0,
                    100
                ),

            autoAdvanceDelayMs:
                Math.max(
                    0,
                    numberOr(
                        source.autoAdvanceDelayMs,
                        DEFAULT_CONFIG
                            .autoAdvanceDelayMs
                    )
                ),

            nextUrl:
                String(
                    source.nextUrl ||
                    ""
                ),

            levelUrls:
                isObject(
                    source.levelUrls
                )
                    ? clone(
                        source.levelUrls
                    )
                    : {},

            levelNames:
                isObject(
                    source.levelNames
                )
                    ? clone(
                        source.levelNames
                    )
                    : {},

            showProgressionStatus:
                source
                    .showProgressionStatus !==
                false
        };
    }


    function normalizeData() {

        const source =
            isObject(
                window.TEST_DATA
            )
                ? window.TEST_DATA
                : {};

        const externalConfig =
            isObject(
                window.TEST_CONFIG
            )
                ? window.TEST_CONFIG
                : {};

        const localConfig =
            isObject(
                source.config
            )
                ? source.config
                : {};


        const normalized = {

            id:
                String(
                    source.id ||
                    "test-fizica"
                ),

            title:
                String(
                    source.title ||
                    source.titlu ||
                    "Test de fizică"
                ),

            subtitle:
                String(
                    source.subtitle ||
                    source.subtitlu ||
                    ""
                ),

            description:
                String(
                    source.description ||
                    source.descriere ||
                    ""
                ),

            subject:
                String(
                    source.subject ||
                    source.disciplina ||
                    "Fizică"
                ),

            className:
                String(
                    source.className ||
                    source.clasa ||
                    ""
                ),

            chapter:
                String(
                    source.chapter ||
                    source.capitol ||
                    ""
                ),

            durationMinutes:
                Math.max(
                    0,
                    numberOr(
                        source.durationMinutes ??
                        source.durataMinute,
                        0
                    )
                ),

            instructions:
                arrayify(
                    source.instructions ||
                    source.instructiuni
                )
                    .map(String),

            studentFields:
                arrayify(
                    source.studentFields ||
                    source.campuriElev
                )
                    .map(
                        normalizeField
                    ),

            questions:
                arrayify(
                    source.questions ||
                    source.intrebari
                )
                    .map(
                        normalizeQuestion
                    ),

            progression: null,

            links:
                isObject(
                    source.links ||
                    source.linkuri
                )
                    ? clone(
                        source.links ||
                        source.linkuri
                    )
                    : {},

            config: {
                ...DEFAULT_CONFIG,
                ...externalConfig,
                ...localConfig
            }
        };


        normalized.progression =
            normalizeProgression({
                ...source,
                id:
                    normalized.id
            });


        if (
            normalized.config
                .shuffleQuestions
        ) {

            normalized.questions =
                shuffle(
                    normalized.questions
                );
        }


        if (
            normalized.config
                .shuffleOptions
        ) {

            normalized.questions =
                normalized.questions
                    .map(
                        question => ({
                            ...question,

                            options:
                                question
                                    .options
                                    .length
                                    ? shuffle(
                                        question.options
                                    )
                                    : []
                        })
                    );
        }


        return normalized;
    }


    /* =========================================================
       PROFILUL ELEVULUI
    ========================================================= */

    function getStudentProfile() {

        if (
            !state.config
                .persistStudentProfile ||
            !state.storage
        ) {
            return {};
        }

        try {

            return (
                state.storage
                    .getStudentProfile() ||
                {}
            );

        } catch (_) {

            return {};
        }
    }


    function readStudentForm() {

        const profile = {};

        state.data
            .studentFields
            .forEach(
                field => {

                    const node =
                        state.mount
                            .querySelector(
                                `[data-student-field="${CSS.escape(field.id)}"]`
                            );

                    if (!node) {
                        return;
                    }

                    profile[field.id] =
                        String(
                            node.value ??
                            ""
                        )
                            .trim();
                }
            );

        return profile;
    }


    function validateStudent(
        profile
    ) {

        const missing = [];

        state.data
            .studentFields
            .forEach(
                field => {

                    if (
                        !field.required
                    ) {
                        return;
                    }

                    if (
                        !String(
                            profile[
                                field.id
                            ] ??
                            ""
                        )
                            .trim()
                    ) {

                        missing.push(
                            field.label
                        );
                    }
                }
            );

        return {

            ok:
                missing.length ===
                0,

            missing
        };
    }


    function persistStudent(
        profile
    ) {

        state.student =
            clone(profile);


        if (
            !state.config
                .persistStudentProfile ||
            !state.storage
        ) {
            return;
        }

        try {

            state.storage
                .saveStudentProfile(
                    profile
                );

        } catch (error) {

            console.warn(
                "[Fizica Galaction] Profilul elevului nu a putut fi salvat.",
                error
            );
        }
    }


    /* =========================================================
       PROGRES / NIVELURI
    ========================================================= */

    function canStartCurrentLevel() {

        const p =
            state.data
                .progression;


        if (
            !state.storage ||
            typeof state.storage
                .canStartLevel !==
                "function"
        ) {

            return (
                p.level ===
                1
            );
        }


        try {

            return (
                state.storage
                    .canStartLevel(
                        p.groupId,
                        p.level,
                        p
                    )
            );

        } catch (error) {

            console.warn(
                "[Fizica Galaction] Nu s-a putut verifica nivelul.",
                error
            );

            return (
                p.level ===
                1
            );
        }
    }


    function getProgress() {

        if (
            !state.storage ||
            typeof state.storage
                .getProgress !==
                "function"
        ) {

            return null;
        }

        try {

            const p =
                state.data
                    .progression;

            return (
                state.storage
                    .getProgress(
                        p.groupId,
                        p
                    )
            );

        } catch (_) {

            return null;
        }
    }


    function getPreviousLevelUrl() {

        const p =
            state.data
                .progression;

        const previous =
            p.level - 1;


        if (
            previous < 1
        ) {

            return (
                state.data
                    .links
                    .inapoi ||

                state.data
                    .links
                    .back ||

                ""
            );
        }


        return String(
            p.levelUrls?.[
                previous
            ] ||
            ""
        );
    }


    function getNextLevelUrl() {

        const p =
            state.data
                .progression;

        const next =
            p.level + 1;


        if (
            p.nextUrl
        ) {

            return p.nextUrl;
        }


        if (
            next <=
            p.totalLevels &&
            p.levelUrls?.[next]
        ) {

            return String(
                p.levelUrls[next]
            );
        }


        return "";
    }


    function levelName(
        level
    ) {

        return (

            state.data
                .progression
                .levelNames?.[
                    level
                ] ||

            `Nivelul ${level}`
        );
    }


    /* =========================================================
       SESIUNEA TESTULUI
    ========================================================= */

    function buildSession() {

        return {

            status:
                state.submitted
                    ? "submitted"
                    : state.started
                        ? "running"
                        : "intro",

            student:
                clone(
                    state.student
                ),

            answers:
                clone(
                    state.answers
                ),

            checked:
                clone(
                    state.checked
                ),

            currentIndex:
                state.currentIndex,

            startedAt:
                state.startedAt,

            remainingSeconds:
                state.remainingSeconds,

            updatedAt:
                new Date()
                    .toISOString()
        };
    }


    function saveSession() {

        if (
            !state.config
                .saveProgress ||
            !state.storage ||
            !state.started ||
            state.submitted
        ) {

            return false;
        }


        try {

            return (
                state.storage
                    .saveSession(
                        state.data.id,
                        buildSession()
                    )
            );

        } catch (error) {

            console.warn(
                "[Fizica Galaction] Sesiunea nu a putut fi salvată.",
                error
            );

            return false;
        }
    }


    function clearSession() {

        if (
            !state.storage
        ) {

            return false;
        }

        try {

            return (
                state.storage
                    .clearSession(
                        state.data.id
                    )
            );

        } catch (_) {

            return false;
        }
    }


    function restoreSession() {

        if (
            !state.config
                .restoreProgress ||
            !state.storage
        ) {

            return false;
        }


        let saved = null;


        try {

            saved =
                state.storage
                    .getSession(
                        state.data.id,
                        {
                            maxAgeHours:
                                state.config
                                    .maxSavedAgeHours
                        }
                    );

        } catch (_) {

            return false;
        }


        if (
            !saved ||
            saved.status !==
            "running"
        ) {

            return false;
        }


        state.started =
            true;

        state.submitted =
            false;


        state.student =
            isObject(
                saved.student
            )
                ? clone(
                    saved.student
                )
                : getStudentProfile();


        state.answers =
            isObject(
                saved.answers
            )
                ? clone(
                    saved.answers
                )
                : {};


        state.checked =
            isObject(
                saved.checked
            )
                ? clone(
                    saved.checked
                )
                : {};


        state.currentIndex =
            clamp(
                Math.floor(
                    numberOr(
                        saved.currentIndex,
                        0
                    )
                ),

                0,

                Math.max(
                    0,
                    state.questions
                        .length - 1
                )
            );


        state.startedAt =
            saved.startedAt ||
            new Date()
                .toISOString();


        state.remainingSeconds =
            Number.isFinite(
                Number(
                    saved.remainingSeconds
                )
            )
                ? Number(
                    saved.remainingSeconds
                )
                : getInitialDurationSeconds();


        renderQuestions();

        startTimer();

        updateHash();


        emit(
            "fizica:test-resume",
            {
                testId:
                    state.data.id,

                level:
                    state.data
                        .progression
                        .level
            }
        );


        return true;
    }


    /* =========================================================
       CRONOMETRU
    ========================================================= */

    function getInitialDurationSeconds() {

        if (
            !state.data
                .durationMinutes
        ) {

            return null;
        }

        return Math.max(
            0,

            Math.round(
                state.data
                    .durationMinutes *
                60
            )
        );
    }


    function stopTimer() {

        if (
            state.timerId
        ) {

            clearInterval(
                state.timerId
            );

            state.timerId =
                null;
        }
    }


    function startTimer() {

        stopTimer();


        if (
            !state.config
                .showTimer ||

            !state.data
                .durationMinutes ||

            state.submitted
        ) {

            return;
        }


        if (
            !Number.isFinite(
                Number(
                    state.remainingSeconds
                )
            )
        ) {

            state.remainingSeconds =
                getInitialDurationSeconds();
        }


        updateTimerDisplay();


        state.timerId =
            window.setInterval(
                () => {

                    if (
                        !state.started ||
                        state.submitted
                    ) {

                        stopTimer();

                        return;
                    }


                    state.remainingSeconds =
                        Math.max(
                            0,
                            state.remainingSeconds -
                            1
                        );


                    updateTimerDisplay();


                    if (
                        state.remainingSeconds %
                        5 ===
                        0
                    ) {

                        saveSession();
                    }


                    if (
                        state.remainingSeconds <=
                        0
                    ) {

                        stopTimer();


                        if (
                            state.config
                                .autoSubmitOnTimeout
                        ) {

                            submit({
                                skipConfirm:
                                    true,

                                reason:
                                    "timeout"
                            });
                        }
                    }

                },
                1000
            );
    }


    function updateTimerDisplay() {

        const node =
            state.mount
                ?.querySelector(
                    "[data-test-timer]"
                );


        if (
            !node ||
            !Number.isFinite(
                Number(
                    state.remainingSeconds
                )
            )
        ) {

            return;
        }


        const total =
            Math.max(
                0,
                Math.floor(
                    state.remainingSeconds
                )
            );


        const minutes =
            Math.floor(
                total /
                60
            );


        const seconds =
            total %
            60;


        node.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


        node.classList
            .toggle(
                "is-warning",

                total > 0 &&
                total <= 300
            );


        node.classList
            .toggle(
                "is-danger",

                total > 0 &&
                total <= 60
            );
    }


    /* =========================================================
       EVALUAREA RĂSPUNSURILOR
    ========================================================= */

    function normalizeText(
        value,
        caseSensitive
    ) {

        let text =
            String(
                value ?? ""
            )
                .trim()
                .replace(
                    /\s+/g,
                    " "
                );


        if (
            !caseSensitive
        ) {

            text =
                text.toLocaleLowerCase(
                    "ro-RO"
                );
        }


        return text;
    }


    function sameSet(
        a,
        b
    ) {

        const aa =
            arrayify(a)
                .map(String)
                .sort();


        const bb =
            arrayify(b)
                .map(String)
                .sort();


        return (
            aa.length ===
            bb.length &&

            aa.every(
                (
                    value,
                    index
                ) =>
                    value ===
                    bb[index]
            )
        );
    }


    function evaluateNumeric(
        question,
        answer
    ) {

        const actual =
            normalizeNumericInput(
                answer
            );


        const expected =
            Number(
                question.correctAnswer
            );


        if (
            !Number.isFinite(
                actual
            ) ||
            !Number.isFinite(
                expected
            )
        ) {

            return false;
        }


        const absoluteDifference =
            Math.abs(
                actual -
                expected
            );


        const absoluteTolerance =
            question.tolerance;


        const relativeTolerance =

            question
                .relativeTolerance *

            Math.max(
                1,
                Math.abs(
                    expected
                )
            );


        const allowed =
            Math.max(
                absoluteTolerance,
                relativeTolerance
            );


        if (
            allowed ===
            0
        ) {

            return (
                actual ===
                expected
            );
        }


        return (
            absoluteDifference <=
            allowed
        );
    }


    function evaluateMatching(
        question,
        answer
    ) {

        if (
            !isObject(answer)
        ) {

            return false;
        }


        const expectedPairs =

            question.pairs.length

                ? question.pairs

                : isObject(
                    question.correctAnswer
                )

                    ? Object.entries(
                        question.correctAnswer
                    )
                        .map(
                            (
                                [
                                    left,
                                    right
                                ]
                            ) => ({
                                left,
                                right
                            })
                        )

                    : [];


        if (
            !expectedPairs.length
        ) {

            return false;
        }


        return expectedPairs
            .every(
                (
                    pair,
                    index
                ) => {

                    const left =
                        String(
                            pair.left ??
                            pair.stanga ??
                            pair[0] ??
                            index
                        );


                    const right =
                        String(
                            pair.right ??
                            pair.dreapta ??
                            pair[1] ??
                            ""
                        );


                    return (
                        String(
                            answer[left] ??
                            ""
                        ) ===
                        right
                    );
                }
            );
    }


    function evaluateQuestion(
        question,
        answer
    ) {

        const type =
            question.type;


        if (
            [
                "numeric",
                "number",
                "numar",
                "numerică",
                "numerica"
            ]
                .includes(type)
        ) {

            return (
                evaluateNumeric(
                    question,
                    answer
                )
            );
        }


        if (
            [
                "multiple",
                "checkbox",
                "multi",
                "multiplu"
            ]
                .includes(type)
        ) {

            return (
                sameSet(
                    answer,
                    question.correctAnswer
                )
            );
        }


        if (
            [
                "matching",
                "match",
                "asociere"
            ]
                .includes(type)
        ) {

            return (
                evaluateMatching(
                    question,
                    answer
                )
            );
        }


        if (
            [
                "text",
                "short",
                "textarea",
                "open",
                "deschis"
            ]
                .includes(type)
        ) {

            const actual =
                normalizeText(
                    answer,
                    question.caseSensitive
                );


            const expected =
                arrayify(
                    question.correctAnswer
                )
                    .map(
                        item =>
                            normalizeText(
                                item,
                                question.caseSensitive
                            )
                    );


            return expected
                .includes(
                    actual
                );
        }


        /*
         * single / radio /
         * select / adevărat-fals
         */

        return (
            String(
                answer ??
                ""
            ) ===
            String(
                question.correctAnswer ??
                ""
            )
        );
    }


    function isAnswered(
        question,
        answer
    ) {

        if (
            [
                "multiple",
                "checkbox",
                "multi",
                "multiplu"
            ]
                .includes(
                    question.type
                )
        ) {

            return (
                Array.isArray(
                    answer
                ) &&
                answer.length >
                0
            );
        }


        if (
            [
                "matching",
                "match",
                "asociere"
            ]
                .includes(
                    question.type
                )
        ) {

            return (
                isObject(
                    answer
                ) &&

                Object.values(
                    answer
                )
                    .every(
                        value =>
                            String(
                                value
                            )
                                .trim() !==
                            ""
                    )
            );
        }


        return (
            answer !==
            undefined &&

            answer !==
            null &&

            String(
                answer
            )
                .trim() !==
            ""
        );
    }


    function getAnswer(
        questionId
    ) {

        return clone(
            state.answers[
                questionId
            ]
        );
    }


    function setAnswer(
        questionId,
        value
    ) {

        state.answers[
            questionId
        ] =
            clone(value);


        saveSession();
    }


    function getQuestionById(
        id
    ) {

        return (
            state.questions
                .find(
                    question =>
                        question.id ===
                        id
                ) ||
            null
        );
    }


    /* =========================================================
       INTRO - HEADER
    ========================================================= */

    function renderHeader() {

        const meta = [

            state.data.subject,

            state.data.className,

            state.data.chapter

        ]
            .filter(Boolean);


        return `
            <header class="fg-test__header">

                <p class="fg-test__eyebrow">
                    ${escapeHtml(
                        state.data.subject ||
                        "Fizică"
                    )}
                </p>

                <h1 class="fg-test__title">
                    ${escapeHtml(
                        state.data.title
                    )}
                </h1>

                ${
                    state.data.subtitle

                        ? `
                            <p class="fg-test__subtitle">
                                ${escapeHtml(
                                    state.data.subtitle
                                )}
                            </p>
                        `

                        : ""
                }

                ${
                    state.data.description

                        ? `
                            <p class="fg-test__description">
                                ${escapeHtml(
                                    state.data.description
                                )}
                            </p>
                        `

                        : ""
                }

                <div class="fg-test__meta">

                    ${
                        meta
                            .map(
                                item =>
                                    `<span>${escapeHtml(item)}</span>`
                            )
                            .join("")
                    }

                    <span>
                        ${state.questions.length}
                        exerciții
                    </span>

                    ${
                        state.data.durationMinutes

                            ? `
                                <span>
                                    ${escapeHtml(
                                        state.data.durationMinutes
                                    )}
                                    minute
                                </span>
                            `

                            : ""
                    }

                </div>

            </header>
        `;
    }


    function renderInstructions() {

        if (
            !state.data
                .instructions
                .length
        ) {

            return "";
        }


        return `
            <section class="fg-test__instructions">

                <h2>
                    Instrucțiuni
                </h2>

                <ul>

                    ${
                        state.data
                            .instructions
                            .map(
                                item =>
                                    `<li>${escapeHtml(item)}</li>`
                            )
                            .join("")
                    }

                </ul>

            </section>
        `;
    }


    function renderStudentFields(
        profile
    ) {

        if (
            !state.data
                .studentFields
                .length
        ) {

            return "";
        }


        return `
            <section class="fg-test__student">

                <h2>
                    Datele elevului
                </h2>

                <div class="fg-test__field-grid">

                    ${
                        state.data
                            .studentFields
                            .map(
                                field => {

                                    const value =
                                        profile[
                                            field.id
                                        ] ??
                                        "";


                                    if (
                                        field.type ===
                                        "select" &&
                                        field.options
                                            .length
                                    ) {

                                        return `
                                            <label class="fg-test__field">

                                                <span>
                                                    ${escapeHtml(field.label)}
                                                    ${field.required ? "*" : ""}
                                                </span>

                                                <select
                                                    data-student-field="${escapeHtml(field.id)}"
                                                    ${field.required ? "required" : ""}
                                                >

                                                    <option value="">
                                                        Alege...
                                                    </option>

                                                    ${
                                                        field.options
                                                            .map(
                                                                (
                                                                    option,
                                                                    index
                                                                ) => {

                                                                    const normalized =
                                                                        normalizeOption(
                                                                            option,
                                                                            index
                                                                        );

                                                                    const selected =
                                                                        String(value) ===
                                                                        normalized.value
                                                                            ? "selected"
                                                                            : "";

                                                                    return `
                                                                        <option
                                                                            value="${escapeHtml(normalized.value)}"
                                                                            ${selected}
                                                                        >
                                                                            ${escapeHtml(normalized.label)}
                                                                        </option>
                                                                    `;
                                                                }
                                                            )
                                                            .join("")
                                                    }

                                                </select>

                                            </label>
                                        `;
                                    }


                                    return `
                                        <label class="fg-test__field">

                                            <span>
                                                ${escapeHtml(field.label)}
                                                ${field.required ? "*" : ""}
                                            </span>

                                            <input
                                                type="${escapeHtml(field.type)}"
                                                data-student-field="${escapeHtml(field.id)}"
                                                value="${escapeHtml(value)}"
                                                placeholder="${escapeHtml(field.placeholder)}"
                                                ${field.required ? "required" : ""}
                                            >

                                        </label>
                                    `;
                                }
                            )
                            .join("")
                    }

                </div>

            </section>
        `;
    }


    /* =========================================================
       AFIȘAREA PROGRESULUI PE NIVELURI
    ========================================================= */

    function renderProgressionOverview() {

        const p =
            state.data
                .progression;


        if (
            !p.showProgressionStatus ||
            p.totalLevels <=
            1
        ) {

            return "";
        }


        const progress =
            getProgress();


        return `
            <div class="fg-test__levels">

                ${
                    Array.from(
                        {
                            length:
                                p.totalLevels
                        },

                        (
                            _,
                            index
                        ) =>
                            index + 1
                    )
                        .map(
                            level => {

                                const levelProgress =
                                    progress
                                        ?.levels
                                        ?.[level];


                                const complete =
                                    Boolean(
                                        levelProgress
                                            ?.completed
                                    );


                                const unlocked =

                                    level === 1 ||

                                    (
                                        progress

                                            ? level <=
                                              progress
                                                  .unlockedLevel

                                            : level ===
                                              1
                                    );


                                return `
                                    <div
                                        class="
                                            fg-test__level
                                            ${complete ? "is-complete" : ""}
                                        "
                                    >

                                        <strong>
                                            ${escapeHtml(levelName(level))}
                                        </strong>

                                        <span>

                                            ${
                                                complete

                                                    ? `
                                                        Finalizat • record
                                                        ${formatNumber(levelProgress.bestPercent)}%
                                                    `

                                                    : unlocked

                                                        ? "Disponibil"

                                                        : "Blocat"
                                            }

                                        </span>

                                    </div>
                                `;
                            }
                        )
                        .join("")
                }

            </div>
        `;
    }


    /* =========================================================
       ECRAN INTRO
    ========================================================= */

    function renderIntro() {

        const profile = {

            ...getStudentProfile(),

            ...state.student
        };


        state.mount.innerHTML = `

            <div class="fg-test">

                <div class="fg-test__shell">

                    ${renderHeader()}

                    <section
                        class="fg-test__screen"
                        data-screen="intro"
                    >

                        ${renderProgressionOverview()}

                        ${renderInstructions()}

                        ${renderStudentFields(profile)}

                        <div
                            class="fg-test__message"
                            data-intro-message
                            aria-live="polite"
                        ></div>

                        <div class="fg-test__buttons">

                            <button
                                class="
                                    fg-test__button
                                    fg-test__button--primary
                                    fg-test__button--large
                                "
                                type="button"
                                data-action="start"
                            >
                                Începe testul
                            </button>

                            ${
                                state.data
                                    .links
                                    .inapoi ||

                                state.data
                                    .links
                                    .back

                                    ? `
                                        <a
                                            class="
                                                fg-test__button
                                                fg-test__button--secondary
                                            "
                                            href="${escapeHtml(
                                                state.data.links.inapoi ||
                                                state.data.links.back
                                            )}"
                                        >
                                            Înapoi
                                        </a>
                                    `

                                    : ""
                            }

                        </div>

                    </section>

                    <div
                        class="fg-test__live"
                        aria-live="polite"
                        data-live
                    ></div>

                </div>

            </div>
        `;


        state.mount
            .querySelector(
                '[data-action="start"]'
            )
            ?.addEventListener(
                "click",
                () => start()
            );
    }


    /* =========================================================
       NIVEL BLOCAT
    ========================================================= */

    function renderLocked() {

        const p =
            state.data
                .progression;


        const previousUrl =
            getPreviousLevelUrl();


        state.mount.innerHTML = `

            <div class="fg-test">

                <div class="fg-test__shell">

                    ${renderHeader()}

                    <section class="fg-test__screen">

                        <div class="fg-test__missing">

                            <h2>
                                🔒 Nivel blocat
                            </h2>

                            <p>
                                ${escapeHtml(levelName(p.level))}
                                poate fi parcurs numai după
                                finalizarea
                                ${escapeHtml(
                                    levelName(
                                        Math.max(
                                            1,
                                            p.level - 1
                                        )
                                    )
                                )}.
                            </p>

                        </div>

                        <div class="fg-test__buttons">

                            ${
                                previousUrl

                                    ? `
                                        <a
                                            class="
                                                fg-test__button
                                                fg-test__button--primary
                                            "
                                            href="${escapeHtml(previousUrl)}"
                                        >
                                            Mergi la nivelul precedent
                                        </a>
                                    `

                                    : ""
                            }

                            ${
                                state.data
                                    .links
                                    .inapoi ||

                                state.data
                                    .links
                                    .back

                                    ? `
                                        <a
                                            class="
                                                fg-test__button
                                                fg-test__button--secondary
                                            "
                                            href="${escapeHtml(
                                                state.data.links.inapoi ||
                                                state.data.links.back
                                            )}"
                                        >
                                            Înapoi la jocuri
                                        </a>
                                    `

                                    : ""
                            }

                        </div>

                    </section>

                </div>

            </div>
        `;
    }


    /* =========================================================
       RĂSPUNSURI - CONTROL UI
    ========================================================= */

    function renderAnswerControl(
        question
    ) {

        const answer =
            getAnswer(
                question.id
            );


        const locked =

            state.config
                .lockAfterCheck &&

            Boolean(
                state.checked[
                    question.id
                ]
            );


        const disabled =
            locked
                ? "disabled"
                : "";


        /*
         * Numeric
         */
        if (
            [
                "numeric",
                "number",
                "numar",
                "numerică",
                "numerica"
            ]
                .includes(
                    question.type
                )
        ) {

            return `
                <div class="fg-test__answer-row">

                    <input
                        type="text"
                        inputmode="decimal"
                        autocomplete="off"
                        data-answer-text="${escapeHtml(question.id)}"
                        value="${escapeHtml(answer ?? "")}"
                        placeholder="${escapeHtml(question.placeholder)}"
                        ${disabled}
                    >

                    ${
                        question.unit

                            ? `
                                <span class="fg-test__unit">
                                    ${escapeHtml(question.unit)}
                                </span>
                            `

                            : ""
                    }

                </div>
            `;
        }


        /*
         * Text scurt
         */
        if (
            [
                "text",
                "short",
                "open",
                "deschis"
            ]
                .includes(
                    question.type
                )
        ) {

            return `
                <input
                    type="text"
                    autocomplete="off"
                    data-answer-text="${escapeHtml(question.id)}"
                    value="${escapeHtml(answer ?? "")}"
                    placeholder="${escapeHtml(question.placeholder)}"
                    ${disabled}
                >
            `;
        }


        /*
         * Text lung
         */
        if (
            question.type ===
            "textarea"
        ) {

            return `
                <textarea
                    data-answer-text="${escapeHtml(question.id)}"
                    rows="5"
                    ${disabled}
                >${escapeHtml(answer ?? "")}</textarea>
            `;
        }


        /*
         * Alegere multiplă
         */
        if (
            [
                "multiple",
                "checkbox",
                "multi",
                "multiplu"
            ]
                .includes(
                    question.type
                )
        ) {

            const selected =
                Array.isArray(
                    answer
                )
                    ? answer
                        .map(String)
                    : [];


            return `
                <fieldset class="fg-test__options">

                    ${
                        question.options
                            .map(
                                option => `
                                    <label class="fg-test__option">

                                        <input
                                            type="checkbox"
                                            name="answer-${escapeHtml(question.id)}"
                                            value="${escapeHtml(option.value)}"
                                            data-answer-multiple="${escapeHtml(question.id)}"
                                            ${selected.includes(option.value) ? "checked" : ""}
                                            ${disabled}
                                        >

                                        <span>
                                            ${escapeHtml(option.label)}
                                        </span>

                                    </label>
                                `
                            )
                            .join("")
                    }

                </fieldset>
            `;
        }


        /*
         * Asociere
         */
        if (
            [
                "matching",
                "match",
                "asociere"
            ]
                .includes(
                    question.type
                )
        ) {

            const pairs =

                question.pairs.length

                    ? question.pairs

                    : isObject(
                        question.correctAnswer
                    )

                        ? Object.entries(
                            question.correctAnswer
                        )
                            .map(
                                (
                                    [
                                        left,
                                        right
                                    ]
                                ) => ({
                                    left,
                                    right
                                })
                            )

                        : [];


            const rightOptions =
                shuffle(
                    pairs.map(
                        pair =>
                            String(
                                pair.right ??
                                pair.dreapta ??
                                pair[1] ??
                                ""
                            )
                    )
                );


            const current =
                isObject(answer)
                    ? answer
                    : {};


            return `
                <div class="fg-test__matching">

                    ${
                        pairs
                            .map(
                                (
                                    pair,
                                    index
                                ) => {

                                    const left =
                                        String(
                                            pair.left ??
                                            pair.stanga ??
                                            pair[0] ??
                                            index
                                        );


                                    return `
                                        <div class="fg-test__matching-row">

                                            <strong>
                                                ${escapeHtml(left)}
                                            </strong>

                                            <span aria-hidden="true">
                                                →
                                            </span>

                                            <select
                                                data-answer-match="${escapeHtml(question.id)}"
                                                data-match-left="${escapeHtml(left)}"
                                                ${disabled}
                                            >

                                                <option value="">
                                                    Alege...
                                                </option>

                                                ${
                                                    rightOptions
                                                        .map(
                                                            right => `
                                                                <option
                                                                    value="${escapeHtml(right)}"
                                                                    ${
                                                                        String(
                                                                            current[left] ??
                                                                            ""
                                                                        ) ===
                                                                        right

                                                                            ? "selected"

                                                                            : ""
                                                                    }
                                                                >
                                                                    ${escapeHtml(right)}
                                                                </option>
                                                            `
                                                        )
                                                        .join("")
                                                }

                                            </select>

                                        </div>
                                    `;
                                }
                            )
                            .join("")
                    }

                </div>
            `;
        }


        /*
         * Single / radio / adevărat-fals
         */

        const options =

            question.options.length

                ? question.options

                : (
                    question.type
                        .includes("true") ||

                    question.type
                        .includes("bool")
                )

                    ? [

                        normalizeOption(
                            {
                                value:
                                    "true",

                                label:
                                    "Adevărat"
                            },
                            0
                        ),

                        normalizeOption(
                            {
                                value:
                                    "false",

                                label:
                                    "Fals"
                            },
                            1
                        )

                    ]

                    : [];


        return `
            <fieldset class="fg-test__options">

                ${
                    options
                        .map(
                            option => `
                                <label class="fg-test__option">

                                    <input
                                        type="radio"
                                        name="answer-${escapeHtml(question.id)}"
                                        value="${escapeHtml(option.value)}"
                                        data-answer-single="${escapeHtml(question.id)}"
                                        ${
                                            String(
                                                answer ??
                                                ""
                                            ) ===
                                            option.value

                                                ? "checked"

                                                : ""
                                        }
                                        ${disabled}
                                    >

                                    <span>
                                        ${escapeHtml(option.label)}
                                    </span>

                                </label>
                            `
                        )
                        .join("")
                }

            </fieldset>
        `;
    }


    /* =========================================================
       FEEDBACK
    ========================================================= */

    function renderFeedback(
        question
    ) {

        if (
            !state.checked[
                question.id
            ]
        ) {

            return `
                <div
                    class="fg-test__feedback"
                    data-feedback
                ></div>
            `;
        }


        const answer =
            getAnswer(
                question.id
            );


        const correct =
            evaluateQuestion(
                question,
                answer
            );


        let extra = "";


        if (
            !correct &&
            state.config
                .showCorrectAnswers
        ) {

            const correctText =

                Array.isArray(
                    question.correctAnswer
                )

                    ? question
                        .correctAnswer
                        .join(", ")

                    : isObject(
                        question.correctAnswer
                    )

                        ? Object.entries(
                            question.correctAnswer
                        )
                            .map(
                                (
                                    [
                                        key,
                                        value
                                    ]
                                ) =>
                                    `${key} → ${value}`
                            )
                            .join("; ")

                        : String(
                            question.correctAnswer ??
                            ""
                        );


            extra += `
                <p>
                    <strong>
                        Răspuns corect:
                    </strong>

                    ${escapeHtml(correctText)}

                    ${
                        question.unit

                            ? ` ${escapeHtml(question.unit)}`

                            : ""
                    }
                </p>
            `;
        }


        if (
            state.config
                .showExplanations &&

            question.explanation
        ) {

            extra += `
                <p>
                    ${escapeHtml(question.explanation)}
                </p>
            `;
        }


        return `
            <div
                class="
                    fg-test__feedback
                    ${correct ? "is-correct" : "is-incorrect"}
                "
                data-feedback
            >

                <strong>
                    ${escapeHtml(
                        correct

                            ? question.correctMessage

                            : question.incorrectMessage
                    )}
                </strong>

                ${extra}

            </div>
        `;
    }


    /* =========================================================
       CARD ÎNTREBARE
    ========================================================= */

    function renderQuestionCard(
        question,
        index
    ) {

        return `
            <article
                class="fg-test__question"
                data-question-id="${escapeHtml(question.id)}"
            >

                <div class="fg-test__question-head">

                    <span class="fg-test__number">
                        ${index + 1}
                    </span>

                    ${
                        state.config
                            .showQuestionPoints

                            ? `
                                <span class="fg-test__pill">
                                    ${formatNumber(question.points)} p
                                </span>
                            `

                            : ""
                    }

                </div>

                <p class="fg-test__prompt">
                    ${escapeHtml(question.prompt)}
                </p>

                ${
                    question.instruction

                        ? `
                            <p class="fg-test__instruction">
                                ${escapeHtml(question.instruction)}
                            </p>
                        `

                        : ""
                }

                ${
                    question.image

                        ? `
                            <figure class="fg-test__figure">

                                <img
                                    src="${escapeHtml(question.image)}"
                                    alt=""
                                >

                            </figure>
                        `

                        : ""
                }

                ${renderAnswerControl(question)}

                ${
                    state.config
                        .immediateFeedback

                        ? `
                            <div class="fg-test__buttons">

                                <button
                                    class="
                                        fg-test__button
                                        fg-test__button--check
                                    "
                                    type="button"
                                    data-action="check"
                                    data-question="${escapeHtml(question.id)}"
                                    ${
                                        state.checked[
                                            question.id
                                        ]
                                            ? "disabled"
                                            : ""
                                    }
                                >
                                    Verifică răspunsul
                                </button>

                            </div>
                        `

                        : ""
                }

                ${renderFeedback(question)}

            </article>
        `;
    }


    function getPageBounds() {

        const perPage =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        state.config
                            .questionsPerPage,
                        1
                    )
                )
            );


        const pageStart =

            Math.floor(
                state.currentIndex /
                perPage
            ) *

            perPage;


        const pageEnd =
            Math.min(
                state.questions
                    .length,

                pageStart +
                perPage
            );


        return {

            perPage,

            pageStart,

            pageEnd
        };
    }


    /* =========================================================
       RANDAREA TESTULUI
    ========================================================= */

    function renderQuestions() {

        const {
            pageStart,
            pageEnd
        } =
            getPageBounds();


        const pageQuestions =
            state.questions
                .slice(
                    pageStart,
                    pageEnd
                );


        const answeredCount =
            state.questions
                .filter(
                    question =>
                        isAnswered(
                            question,
                            state.answers[
                                question.id
                            ]
                        )
                )
                .length;


        const progressPercent =

            state.questions.length

                ? (
                    answeredCount /
                    state.questions
                        .length
                ) *
                100

                : 0;


        state.mount.innerHTML = `

            <div class="fg-test">

                <div class="fg-test__shell">

                    ${renderHeader()}

                    <section
                        class="fg-test__screen"
                        data-screen="questions"
                    >

                        <div class="fg-test__toolbar">

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        levelName(
                                            state.data
                                                .progression
                                                .level
                                        )
                                    )}
                                </strong>

                                <div data-save-status></div>

                            </div>

                            ${
                                state.config
                                    .showTimer &&

                                state.data
                                    .durationMinutes

                                    ? `
                                        <div
                                            class="fg-test__timer"
                                            data-test-timer
                                        ></div>
                                    `

                                    : ""
                            }

                        </div>


                        <div class="fg-test__progress">

                            <div class="fg-test__progress-row">

                                <span>
                                    Progres
                                </span>

                                <strong>
                                    ${answeredCount}/${state.questions.length}
                                </strong>

                            </div>

                            <div class="fg-test__progress-track">

                                <span
                                    class="fg-test__progress-fill"
                                    style="
                                        width:
                                        ${clamp(progressPercent, 0, 100)}%
                                    "
                                ></span>

                            </div>

                        </div>


                        ${
                            pageQuestions
                                .map(
                                    (
                                        question,
                                        index
                                    ) =>
                                        renderQuestionCard(
                                            question,
                                            pageStart +
                                            index
                                        )
                                )
                                .join("")
                        }


                        <div
                            class="fg-test__message"
                            data-question-message
                            aria-live="polite"
                        ></div>


                        <nav
                            class="fg-test__nav"
                            aria-label="Navigare test"
                        >

                            <button
                                class="
                                    fg-test__button
                                    fg-test__button--secondary
                                "
                                type="button"
                                data-action="prev"
                                ${
                                    !state.config
                                        .allowBack ||

                                    pageStart ===
                                    0

                                        ? "disabled"

                                        : ""
                                }
                            >
                                ← Înapoi
                            </button>


                            <span class="fg-test__page-indicator">

                                Întrebarea
                                ${pageStart + 1}

                                ${
                                    pageEnd >
                                    pageStart + 1

                                        ? `–${pageEnd}`

                                        : ""
                                }

                                din
                                ${state.questions.length}

                            </span>


                            ${
                                pageEnd <
                                state.questions
                                    .length

                                    ? `
                                        <button
                                            class="
                                                fg-test__button
                                                fg-test__button--primary
                                            "
                                            type="button"
                                            data-action="next"
                                        >
                                            Următoarea →
                                        </button>
                                    `

                                    : `
                                        <button
                                            class="
                                                fg-test__button
                                                fg-test__button--primary
                                            "
                                            type="button"
                                            data-action="submit"
                                        >
                                            Finalizează testul
                                        </button>
                                    `
                            }

                        </nav>

                    </section>


                    <div
                        class="fg-test__live"
                        aria-live="polite"
                        data-live
                    ></div>

                </div>

            </div>
        `;


        bindQuestionEvents();

        updateTimerDisplay();

        updateHash();

        scrollTop();
    }


    /* =========================================================
       EVENIMENTE INPUT
    ========================================================= */

    function bindQuestionEvents() {

        state.mount
            .querySelectorAll(
                "[data-answer-text]"
            )
            .forEach(
                node => {

                    const id =
                        node.getAttribute(
                            "data-answer-text"
                        );


                    node.addEventListener(
                        "input",
                        () =>
                            setAnswer(
                                id,
                                node.value
                            )
                    );
                }
            );


        state.mount
            .querySelectorAll(
                "[data-answer-single]"
            )
            .forEach(
                node => {

                    const id =
                        node.getAttribute(
                            "data-answer-single"
                        );


                    node.addEventListener(
                        "change",
                        () => {

                            if (
                                node.checked
                            ) {

                                setAnswer(
                                    id,
                                    node.value
                                );
                            }
                        }
                    );
                }
            );


        state.mount
            .querySelectorAll(
                "[data-answer-multiple]"
            )
            .forEach(
                node => {

                    const id =
                        node.getAttribute(
                            "data-answer-multiple"
                        );


                    node.addEventListener(
                        "change",
                        () => {

                            const selected =

                                Array.from(
                                    state.mount
                                        .querySelectorAll(
                                            `[data-answer-multiple="${CSS.escape(id)}"]:checked`
                                        )
                                )
                                    .map(
                                        item =>
                                            item.value
                                    );


                            setAnswer(
                                id,
                                selected
                            );
                        }
                    );
                }
            );


        state.mount
            .querySelectorAll(
                "[data-answer-match]"
            )
            .forEach(
                node => {

                    const id =
                        node.getAttribute(
                            "data-answer-match"
                        );


                    const left =
                        node.getAttribute(
                            "data-match-left"
                        );


                    node.addEventListener(
                        "change",
                        () => {

                            const current =

                                isObject(
                                    state.answers[id]
                                )

                                    ? {
                                        ...state.answers[id]
                                    }

                                    : {};


                            current[left] =
                                node.value;


                            setAnswer(
                                id,
                                current
                            );
                        }
                    );
                }
            );


        state.mount
            .querySelectorAll(
                '[data-action="check"]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            checkQuestion(
                                button.getAttribute(
                                    "data-question"
                                )
                            )
                    );
                }
            );


        state.mount
            .querySelector(
                '[data-action="prev"]'
            )
            ?.addEventListener(
                "click",
                () =>
                    previousPage()
            );


        state.mount
            .querySelector(
                '[data-action="next"]'
            )
            ?.addEventListener(
                "click",
                () =>
                    nextPage()
            );


        state.mount
            .querySelector(
                '[data-action="submit"]'
            )
            ?.addEventListener(
                "click",
                () =>
                    submit()
            );
    }


    /* =========================================================
       MESAJE
    ========================================================= */

    function setMessage(
        selector,
        message,
        type = "error"
    ) {

        const node =
            state.mount
                .querySelector(
                    selector
                );


        if (!node) {
            return;
        }


        node.textContent =
            message ||
            "";


        node.className =
            "fg-test__message";


        if (message) {

            node.classList
                .add(
                    `is-${type}`
                );
        }
    }


    function announce(
        message
    ) {

        const live =
            state.mount
                ?.querySelector(
                    "[data-live]"
                );


        if (live) {

            live.textContent =
                message;
        }
    }


    function currentPageQuestions() {

        const {
            pageStart,
            pageEnd
        } =
            getPageBounds();


        return state.questions
            .slice(
                pageStart,
                pageEnd
            );
    }


    function pageReadyToLeave() {

        if (
            !state.config
                .requireAllAnswers
        ) {

            return true;
        }


        for (
            const question
            of currentPageQuestions()
        ) {

            const answer =
                getAnswer(
                    question.id
                );


            if (
                !isAnswered(
                    question,
                    answer
                )
            ) {

                setMessage(
                    "[data-question-message]",
                    "Răspunde la întrebarea curentă înainte de a continua."
                );

                return false;
            }


            if (
                state.config
                    .immediateFeedback &&

                !state.checked[
                    question.id
                ]
            ) {

                setMessage(
                    "[data-question-message]",
                    "Verifică răspunsul înainte de a continua."
                );

                return false;
            }
        }


        return true;
    }


    /* =========================================================
       VERIFICAREA UNEI ÎNTREBĂRI
    ========================================================= */

    function checkQuestion(
        questionId
    ) {

        const question =
            getQuestionById(
                questionId
            );


        if (!question) {
            return false;
        }


        const answer =
            getAnswer(
                question.id
            );


        if (
            !isAnswered(
                question,
                answer
            )
        ) {

            setMessage(
                "[data-question-message]",
                "Completează răspunsul înainte de verificare."
            );

            return false;
        }


        state.checked[
            question.id
        ] =
            true;


        saveSession();

        renderQuestions();


        const correct =
            evaluateQuestion(
                question,
                answer
            );


        announce(
            correct

                ? "Răspuns corect."

                : "Răspuns incorect."
        );


        emit(
            "fizica:test-answer-check",
            {

                testId:
                    state.data.id,

                questionId:
                    question.id,

                correct,

                answer:
                    clone(answer)
            }
        );


        return correct;
    }


    /* =========================================================
       NAVIGARE
    ========================================================= */

    function previousPage() {

        if (
            !state.config
                .allowBack
        ) {

            return;
        }


        const perPage =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        state.config
                            .questionsPerPage,
                        1
                    )
                )
            );


        state.currentIndex =
            Math.max(
                0,

                state.currentIndex -
                perPage
            );


        saveSession();

        renderQuestions();
    }


    function nextPage() {

        if (
            !pageReadyToLeave()
        ) {

            return;
        }


        const perPage =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        state.config
                            .questionsPerPage,
                        1
                    )
                )
            );


        state.currentIndex =
            Math.min(
                state.questions
                    .length - 1,

                state.currentIndex +
                perPage
            );


        saveSession();

        renderQuestions();
    }


    /* =========================================================
       START TEST
    ========================================================= */

    function start(
        options = {}
    ) {

        if (
            !state.initialized
        ) {

            init();
        }


        if (
            state.started &&
            !state.submitted
        ) {

            return true;
        }


        if (
            !canStartCurrentLevel()
        ) {

            renderLocked();

            return false;
        }


        let profile =
            options.student ||
            null;


        if (!profile) {

            profile =
                readStudentForm();
        }


        const validation =
            validateStudent(
                profile
            );


        if (
            !validation.ok
        ) {

            setMessage(
                "[data-intro-message]",

                `Completează câmpurile obligatorii: ${validation.missing.join(", ")}.`
            );

            return false;
        }


        persistStudent(
            profile
        );


        state.started =
            true;

        state.submitted =
            false;


        state.startedAt =
            new Date()
                .toISOString();


        state.submittedAt =
            null;


        state.currentIndex =
            0;


        state.answers =
            {};


        state.checked =
            {};


        state.result =
            null;


        state.progressionResult =
            null;


        state.remainingSeconds =
            getInitialDurationSeconds();


        try {

            state.storage
                ?.markLevelStarted?.(

                    state.data
                        .progression
                        .groupId,

                    state.data
                        .progression
                        .level,

                    state.data
                        .progression
                );

        } catch (_) {

            /*
             * Nu blocăm testul dacă
             * salvarea progresului
             * eșuează.
             */
        }


        saveSession();

        renderQuestions();

        startTimer();


        emit(
            "fizica:test-start",
            {

                testId:
                    state.data.id,

                student:
                    clone(
                        state.student
                    ),

                level:
                    state.data
                        .progression
                        .level
            }
        );


        return true;
    }


    /* =========================================================
       CALCULAREA REZULTATULUI
    ========================================================= */

    function calculateResult() {

        let score = 0;

        let maxScore = 0;

        let correctCount = 0;

        let answeredCount = 0;


        const review =
            state.questions
                .map(
                    question => {

                        const answer =
                            getAnswer(
                                question.id
                            );


                        const answered =
                            isAnswered(
                                question,
                                answer
                            );


                        const correct =

                            answered &&

                            evaluateQuestion(
                                question,
                                answer
                            );


                        maxScore +=
                            question.points;


                        if (
                            answered
                        ) {

                            answeredCount +=
                                1;
                        }


                        if (
                            correct
                        ) {

                            correctCount +=
                                1;

                            score +=
                                question.points;
                        }


                        return {

                            id:
                                question.id,

                            prompt:
                                question.prompt,

                            answer:
                                clone(
                                    answer
                                ),

                            correctAnswer:
                                clone(
                                    question.correctAnswer
                                ),

                            correct,

                            answered,

                            points:
                                correct

                                    ? question.points

                                    : 0,

                            maxPoints:
                                question.points,

                            explanation:
                                question.explanation,

                            unit:
                                question.unit
                        };
                    }
                );


        const percent =

            maxScore > 0

                ? round(
                    (
                        score /
                        maxScore
                    ) *
                    100,

                    2
                )

                : 0;


        const grade =
            clamp(

                state.config
                    .minimumGrade +

                (
                    percent /
                    100
                ) *

                (
                    state.config
                        .maximumGrade -

                    state.config
                        .minimumGrade
                ),

                state.config
                    .minimumGrade,

                state.config
                    .maximumGrade
            );


        return {

            testId:
                state.data.id,

            groupId:
                state.data
                    .progression
                    .groupId,

            level:
                state.data
                    .progression
                    .level,

            student:
                clone(
                    state.student
                ),

            score:
                round(
                    score,
                    2
                ),

            maxScore:
                round(
                    maxScore,
                    2
                ),

            percent,

            grade:
                round(
                    grade,
                    2
                ),

            passed:
                grade >=
                state.config
                    .passingGrade,

            correctCount,

            answeredCount,

            totalQuestions:
                state.questions
                    .length,

            startedAt:
                state.startedAt,

            submittedAt:
                new Date()
                    .toISOString(),

            review
        };
    }


    /* =========================================================
       FINALIZAREA NIVELULUI
    ========================================================= */

    function completeProgression(
        result
    ) {

        if (
            !state.storage ||
            typeof state.storage
                .completeLevel !==
                "function"
        ) {

            return null;
        }


        try {

            return (
                state.storage
                    .completeLevel(

                        state.data
                            .progression
                            .groupId,

                        state.data
                            .progression
                            .level,

                        {
                            percent:
                                result.percent,

                            score:
                                result.score
                        },

                        state.data
                            .progression
                    )
            );

        } catch (error) {

            console.warn(
                "[Fizica Galaction] Progresul nivelului nu a putut fi salvat.",
                error
            );

            return null;
        }
    }


    /* =========================================================
       REZULTATUL PROGRESIEI
    ========================================================= */

    function renderProgressionResult() {

        const p =
            state.data
                .progression;


        const pr =
            state.progressionResult;


        if (
            !pr ||
            p.totalLevels <=
            1
        ) {

            return "";
        }


        /*
         * Diploma
         */
        if (
            pr.diplomaJustUnlocked ||
            pr.diplomaUnlocked
        ) {

            return `
                <section
                    class="
                        fg-test__progression-result
                        is-success
                    "
                >

                    <h2>
                        🎓 Diploma este disponibilă
                    </h2>

                    <p>
                        Ai parcurs
                        ${escapeHtml(
                            levelName(
                                p.diplomaRequiredLevel
                            )
                        )}.
                        Poți afișa sau tipări diploma.
                    </p>

                    ${
                        state.config
                            .allowPrint

                            ? `
                                <button
                                    class="
                                        fg-test__button
                                        fg-test__button--primary
                                    "
                                    type="button"
                                    data-action="print"
                                >
                                    Tipărește / salvează diploma
                                </button>
                            `

                            : ""
                    }

                </section>
            `;
        }


        /*
         * Nivel următor
         */
        if (
            pr.nextLevel
        ) {

            const nextUrl =
                getNextLevelUrl();


            const automaticText =

                pr.shouldAutoAdvance

                    ? `
                        <p>
                            Ai obținut
                            ${formatNumber(state.result.percent)}%.
                            Trecerea la nivelul următor
                            se va face automat.
                        </p>
                    `

                    : `
                        <p>
                            ${escapeHtml(
                                levelName(
                                    pr.nextLevel
                                )
                            )}
                            a fost deblocat.
                        </p>
                    `;


            return `
                <section
                    class="
                        fg-test__progression-result
                        is-success
                    "
                >

                    <h2>
                        ✅ Nivel finalizat
                    </h2>

                    ${automaticText}

                    ${
                        nextUrl

                            ? `
                                <a
                                    class="
                                        fg-test__button
                                        fg-test__button--primary
                                    "
                                    href="${escapeHtml(nextUrl)}"
                                >
                                    Continuă cu
                                    ${escapeHtml(
                                        levelName(
                                            pr.nextLevel
                                        )
                                    )}
                                </a>
                            `

                            : ""
                    }

                </section>
            `;
        }


        return "";
    }


    /* =========================================================
       RECAPITULAREA RĂSPUNSURILOR
    ========================================================= */

    function renderReview() {

        if (
            !state.result
        ) {

            return "";
        }


        return `
            <section class="fg-test__review">

                <h2>
                    Recapitularea răspunsurilor
                </h2>

                ${
                    state.result
                        .review
                        .map(
                            (
                                item,
                                index
                            ) => {

                                const userAnswer =

                                    Array.isArray(
                                        item.answer
                                    )

                                        ? item.answer
                                            .join(", ")

                                        : isObject(
                                            item.answer
                                        )

                                            ? Object.entries(
                                                item.answer
                                            )
                                                .map(
                                                    (
                                                        [
                                                            a,
                                                            b
                                                        ]
                                                    ) =>
                                                        `${a} → ${b}`
                                                )
                                                .join("; ")

                                            : item.answer ??
                                              "—";


                                const correctAnswer =

                                    Array.isArray(
                                        item.correctAnswer
                                    )

                                        ? item.correctAnswer
                                            .join(", ")

                                        : isObject(
                                            item.correctAnswer
                                        )

                                            ? Object.entries(
                                                item.correctAnswer
                                            )
                                                .map(
                                                    (
                                                        [
                                                            a,
                                                            b
                                                        ]
                                                    ) =>
                                                        `${a} → ${b}`
                                                )
                                                .join("; ")

                                            : item.correctAnswer ??
                                              "—";


                                return `
                                    <article
                                        class="
                                            fg-test__review-item
                                            ${
                                                item.correct

                                                    ? "is-correct"

                                                    : item.answered

                                                        ? "is-incorrect"

                                                        : "is-neutral"
                                            }
                                        "
                                    >

                                        <strong>
                                            ${index + 1}.
                                            ${escapeHtml(item.prompt)}
                                        </strong>

                                        <p>
                                            Răspunsul tău:
                                            ${escapeHtml(userAnswer)}

                                            ${
                                                item.unit

                                                    ? ` ${escapeHtml(item.unit)}`

                                                    : ""
                                            }
                                        </p>

                                        ${
                                            !item.correct &&
                                            state.config
                                                .showCorrectAnswers

                                                ? `
                                                    <p>
                                                        Răspuns corect:
                                                        ${escapeHtml(correctAnswer)}

                                                        ${
                                                            item.unit

                                                                ? ` ${escapeHtml(item.unit)}`

                                                                : ""
                                                        }
                                                    </p>
                                                `

                                                : ""
                                        }

                                        ${
                                            state.config
                                                .showExplanations &&

                                            item.explanation

                                                ? `
                                                    <p>
                                                        ${escapeHtml(item.explanation)}
                                                    </p>
                                                `

                                                : ""
                                        }

                                    </article>
                                `;
                            }
                        )
                        .join("")
                }

            </section>
        `;
    }


    /* =========================================================
       ECRAN REZULTAT
    ========================================================= */

    function renderResult() {

        const result =
            state.result;


        state.mount.innerHTML = `

            <div class="fg-test">

                <div class="fg-test__shell">

                    ${renderHeader()}


                    <section
                        class="fg-test__screen"
                        data-screen="result"
                    >

                        <section class="fg-test__result-summary">

                            <p class="fg-test__eyebrow">
                                Rezultat final
                            </p>

                            <div class="fg-test__grade">
                                ${formatNumber(result.percent)}%
                            </div>

                            <p class="fg-test__grade-label">
                                Nota orientativă:
                                ${formatNumber(result.grade)}
                            </p>


                            <div class="fg-test__result-grid">

                                <div>
                                    <strong>
                                        ${formatNumber(result.score)}
                                    </strong>
                                    <span>
                                        Puncte
                                    </span>
                                </div>


                                <div>
                                    <strong>
                                        ${formatNumber(result.maxScore)}
                                    </strong>
                                    <span>
                                        Punctaj maxim
                                    </span>
                                </div>


                                <div>
                                    <strong>
                                        ${result.correctCount}/${result.totalQuestions}
                                    </strong>
                                    <span>
                                        Răspunsuri corecte
                                    </span>
                                </div>


                                <div>
                                    <strong>
                                        ${formatNumber(result.percent)}%
                                    </strong>
                                    <span>
                                        Procent
                                    </span>
                                </div>

                            </div>

                        </section>


                        ${renderProgressionResult()}


                        <div class="fg-test__buttons">

                            ${
                                state.config
                                    .allowRestart

                                    ? `
                                        <button
                                            class="
                                                fg-test__button
                                                fg-test__button--secondary
                                            "
                                            type="button"
                                            data-action="restart"
                                        >
                                            Reia acest nivel
                                        </button>
                                    `

                                    : ""
                            }


                            ${
                                state.config
                                    .allowPrint

                                    ? `
                                        <button
                                            class="
                                                fg-test__button
                                                fg-test__button--ghost
                                            "
                                            type="button"
                                            data-action="print"
                                        >
                                            Tipărește rezultatul
                                        </button>
                                    `

                                    : ""
                            }


                            ${
                                state.data
                                    .links
                                    .inapoi ||

                                state.data
                                    .links
                                    .back

                                    ? `
                                        <a
                                            class="
                                                fg-test__button
                                                fg-test__button--secondary
                                            "
                                            href="${escapeHtml(
                                                state.data.links.inapoi ||
                                                state.data.links.back
                                            )}"
                                        >
                                            Înapoi la jocuri
                                        </a>
                                    `

                                    : ""
                            }

                        </div>

                    </section>


                    ${renderReview()}


                    <div
                        class="fg-test__live"
                        aria-live="polite"
                        data-live
                    ></div>

                </div>

            </div>
        `;


        state.mount
            .querySelectorAll(
                '[data-action="restart"]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            reset({
                                keepStudent:
                                    true,

                                start:
                                    true
                            })
                    );
                }
            );


        state.mount
            .querySelectorAll(
                '[data-action="print"]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            window.print()
                    );
                }
            );


        scheduleAutoAdvance();

        updateHash();

        scrollTop();
    }


    /* =========================================================
       TRECERE AUTOMATĂ LA NIVELUL URMĂTOR
    ========================================================= */

    function scheduleAutoAdvance() {

        if (
            state.autoAdvanceTimer
        ) {

            clearTimeout(
                state.autoAdvanceTimer
            );

            state.autoAdvanceTimer =
                null;
        }


        const pr =
            state.progressionResult;


        if (
            !pr?.shouldAutoAdvance
        ) {

            return;
        }


        const url =
            getNextLevelUrl();


        if (!url) {
            return;
        }


        const delay =
            Math.max(
                0,

                numberOr(
                    state.data
                        .progression
                        .autoAdvanceDelayMs,

                    state.config
                        .autoAdvanceDelayMs
                )
            );


        state.autoAdvanceTimer =
            window.setTimeout(
                () => {

                    window.location.href =
                        url;

                },
                delay
            );
    }


    /* =========================================================
       FINALIZAREA TESTULUI
    ========================================================= */

    function submit(
        options = {}
    ) {

        if (
            !state.started ||
            state.submitted
        ) {

            return state.result;
        }


        /*
         * Verificăm răspunsurile lipsă.
         */
        if (
            state.config
                .requireAllAnswers
        ) {

            const missing =
                state.questions
                    .filter(
                        question =>
                            !isAnswered(
                                question,
                                state.answers[
                                    question.id
                                ]
                            )
                    );


            if (
                missing.length
            ) {

                setMessage(
                    "[data-question-message]",

                    `Mai ai ${missing.length} răspuns${missing.length === 1 ? "" : "uri"} de completat.`
                );

                return null;
            }
        }


        /*
         * Dacă avem feedback imediat,
         * toate răspunsurile trebuie
         * verificate.
         */
        if (
            state.config
                .immediateFeedback &&

            state.config
                .requireAllAnswers
        ) {

            const unchecked =
                state.questions
                    .filter(
                        question =>
                            !state.checked[
                                question.id
                            ]
                    );


            if (
                unchecked.length
            ) {

                setMessage(
                    "[data-question-message]",

                    `Mai ai ${unchecked.length} răspuns${unchecked.length === 1 ? "" : "uri"} de verificat.`
                );

                return null;
            }
        }


        /*
         * Confirmare.
         */
        if (
            state.config
                .confirmBeforeSubmit &&

            !options.skipConfirm &&

            !window.confirm(
                "Finalizezi testul? După trimitere vei vedea rezultatul."
            )
        ) {

            return null;
        }


        stopTimer();


        state.result =
            calculateResult();


        state.submitted =
            true;


        state.submittedAt =
            state.result
                .submittedAt;


        /*
         * Aici se salvează progresul
         * permanent al nivelului.
         */
        state.progressionResult =
            completeProgression(
                state.result
            );


        /*
         * Sesiunea temporară nu mai
         * este necesară.
         */
        clearSession();


        renderResult();


        const detail = {

            ...clone(
                state.result
            ),

            progression:
                clone(
                    state.progressionResult
                ),

            reason:
                options.reason ||
                "manual"
        };


        emit(
            "fizica:test-complete",
            detail
        );


        return clone(
            state.result
        );
    }


    /* =========================================================
       RESET / RELUARE
    ========================================================= */

    function reset(
        options = {}
    ) {

        stopTimer();


        if (
            state.autoAdvanceTimer
        ) {

            clearTimeout(
                state.autoAdvanceTimer
            );

            state.autoAdvanceTimer =
                null;
        }


        clearSession();


        const keepStudent =
            options.keepStudent !==
            false;


        const previousStudent =

            keepStudent

                ? clone(
                    state.student
                )

                : {};


        state.started =
            false;


        state.submitted =
            false;


        state.answers =
            {};


        state.checked =
            {};


        state.currentIndex =
            0;


        state.student =
            previousStudent;


        state.startedAt =
            null;


        state.submittedAt =
            null;


        state.remainingSeconds =
            null;


        state.result =
            null;


        state.progressionResult =
            null;


        renderIntro();


        emit(
            "fizica:test-reset",
            {

                testId:
                    state.data.id,

                keepStudent
            }
        );


        if (
            options.start ===
            true
        ) {

            start({
                student:
                    previousStudent
            });
        }
    }


    /* =========================================================
       HASH
    ========================================================= */

    function updateHash() {

        if (
            !state.config
                .updateHash
        ) {

            return;
        }


        try {

            if (
                state.submitted
            ) {

                history.replaceState(
                    null,
                    "",
                    "#rezultat"
                );

            } else if (
                state.started
            ) {

                history.replaceState(
                    null,
                    "",
                    `#intrebarea-${state.currentIndex + 1}`
                );
            }

        } catch (_) {

            /*
             * History API este opțional.
             */
        }
    }


    /* =========================================================
       TASTATURĂ
    ========================================================= */

    function installKeyboard() {

        if (
            !state.config
                .keyboard ||

            state.keyHandlerInstalled
        ) {

            return;
        }


        document.addEventListener(
            "keydown",
            event => {

                if (
                    !state.started ||
                    state.submitted
                ) {

                    return;
                }


                const target =
                    event.target;


                if (
                    target &&

                    [
                        "INPUT",
                        "TEXTAREA",
                        "SELECT"
                    ]
                        .includes(
                            target.tagName
                        )
                ) {

                    return;
                }


                if (
                    event.key ===
                    "ArrowLeft" &&

                    state.config
                        .allowBack
                ) {

                    event.preventDefault();

                    previousPage();
                }


                if (
                    event.key ===
                    "ArrowRight"
                ) {

                    event.preventDefault();


                    const {
                        pageEnd
                    } =
                        getPageBounds();


                    if (
                        pageEnd <
                        state.questions
                            .length
                    ) {

                        nextPage();
                    }
                }
            }
        );


        state.keyHandlerInstalled =
            true;
    }


    /* =========================================================
       INITIALIZARE
    ========================================================= */

    function init(
        options = {}
    ) {

        if (
            state.initialized &&
            !options.force
        ) {

            return api;
        }


        state.data =
            normalizeData();


        state.config =
            state.data.config;


        state.storage =
            getStorage();


        state.questions =
            clone(
                state.data.questions
            );


        state.mount =
            resolveMount(
                options.mount ||
                state.config
                    .mountSelector
            );


        if (
            !state.mount
        ) {

            throw new Error(
                "Fizica Galaction test-engine: nu a fost găsit containerul #testApp / [data-test-engine]."
            );
        }


        /*
         * Fără întrebări.
         */
        if (
            !state.questions
                .length
        ) {

            state.mount.innerHTML = `

                <div class="fg-test">

                    <div class="fg-test__shell">

                        <section class="fg-test__missing">

                            <h2>
                                Test indisponibil
                            </h2>

                            <p>
                                Nu au fost definite
                                întrebări în
                                window.TEST_DATA.
                            </p>

                        </section>

                    </div>

                </div>
            `;


            state.initialized =
                true;


            return api;
        }


        /*
         * Restaurăm profilul elevului.
         */
        state.student =
            getStudentProfile();


        state.initialized =
            true;


        installKeyboard();


        /*
         * Verificăm nivelul.
         */
        if (
            !canStartCurrentLevel()
        ) {

            renderLocked();


            emit(
                "fizica:test-level-locked",
                {

                    testId:
                        state.data.id,

                    groupId:
                        state.data
                            .progression
                            .groupId,

                    level:
                        state.data
                            .progression
                            .level
                }
            );


            return api;
        }


        /*
         * Încercăm restaurarea
         * testului neterminat.
         */
        if (
            !restoreSession()
        ) {

            renderIntro();


            if (
                state.config
                    .startImmediately &&

                !state.data
                    .studentFields
                    .length
            ) {

                start({
                    student:
                        state.student
                });
            }
        }


        emit(
            "fizica:test-init",
            {

                testId:
                    state.data.id,

                groupId:
                    state.data
                        .progression
                        .groupId,

                level:
                    state.data
                        .progression
                        .level,

                version:
                    VERSION
            }
        );


        return api;
    }


    /* =========================================================
       API - GET STATE
    ========================================================= */

    function getState() {

        return clone({

            initialized:
                state.initialized,

            started:
                state.started,

            submitted:
                state.submitted,

            currentIndex:
                state.currentIndex,

            student:
                state.student,

            answers:
                state.answers,

            checked:
                state.checked,

            startedAt:
                state.startedAt,

            submittedAt:
                state.submittedAt,

            remainingSeconds:
                state.remainingSeconds,

            progression:
                state.data
                    ?.progression ||
                null
        });
    }


    function getResult() {

        return clone(
            state.result
        );
    }


    function getData() {

        return clone(
            state.data
        );
    }


    function getCurrentQuestion() {

        return clone(
            state.questions[
                state.currentIndex
            ] ||
            null
        );
    }


    function goToQuestion(
        index
    ) {

        if (
            !state.started ||
            state.submitted
        ) {

            return false;
        }


        const target =
            clamp(
                Math.floor(
                    numberOr(
                        index,
                        0
                    )
                ),

                0,

                Math.max(
                    0,
                    state.questions
                        .length - 1
                )
            );


        state.currentIndex =
            target;


        saveSession();

        renderQuestions();


        return true;
    }


    /* =========================================================
       API PUBLIC
    ========================================================= */

    const api =
        Object.freeze({

            version:
                VERSION,

            init,

            start,

            submit,

            reset,

            save:
                saveSession,

            checkQuestion,

            next:
                nextPage,

            previous:
                previousPage,

            goToQuestion,

            getState,

            getResult,

            getData,

            getCurrentQuestion,

            getProgress,

            canStartLevel(
                level
            ) {

                if (
                    !state.data
                ) {

                    return false;
                }


                const p =
                    state.data
                        .progression;


                return (

                    state.storage
                        ?.canStartLevel?.(
                            p.groupId,
                            level,
                            p
                        ) ??

                    level ===
                    1
                );
            },


            getStudentProfile,


            saveStudentProfile(
                profile
            ) {

                if (
                    !state.storage
                ) {

                    return null;
                }


                const saved =
                    state.storage
                        .saveStudentProfile(
                            profile
                        );


                if (
                    saved
                ) {

                    state.student =
                        clone(saved);
                }


                return saved;
            },


            clearSession,


            isDiplomaUnlocked() {

                if (
                    !state.storage ||
                    !state.data
                ) {

                    return false;
                }


                const p =
                    state.data
                        .progression;


                return Boolean(

                    state.storage
                        .isDiplomaUnlocked?.(
                            p.groupId,
                            p
                        )
                );
            }
        });


    /* =========================================================
       EXPORT
    ========================================================= */

    APP.testEngine =
        api;


    window.TestEngine =
        api;


    window.initTestEngine =
        init;


    /* =========================================================
       AUTO-INIT OPȚIONAL
    ========================================================= */

    function autoInit() {

        const node =
            document.querySelector(
                "[data-test-engine][data-auto-init]"
            );


        if (!node) {
            return;
        }


        try {

            init({
                mount:
                    node
            });

        } catch (error) {

            console.error(
                error
            );
        }
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            autoInit,
            {
                once: true
            }
        );

    } else {

        autoInit();
    }

})(
    window,
    document
);
