/**
 * load-header.js — Fizica Galaction
 *
 * Încarcă antetul comun din:
 * assets/components/header.html
 *
 * Funcții:
 * - determină automat rădăcina proiectului;
 * - funcționează din orice subdirector;
 * - încarcă automat layout.css;
 * - evită încărcarea dublă;
 * - reconectează butonul zi/noapte;
 * - rezolvă rutele data-site-route;
 * - emite evenimentul headerLoaded;
 * - oferă un antet minimal dacă fetch() eșuează.
 */

(function () {
  "use strict";

  const APP_NAME =
    "Fizica Galaction";

  const COMPONENT_PATH =
    "assets/components/header.html";

  const LAYOUT_PATH =
    "assets/css/layout.css";

  const CONTAINER_SELECTOR =
    "#header-container, [data-site-header]";

  /*
   * document.currentScript trebuie citit în momentul
   * executării fișierului.
   */
  const scriptUrl =
    document.currentScript?.src || "";

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  let loadingPromise = null;

  /* =======================================================
     CONFIGURAȚIE ȘI RUTE
     ======================================================= */

  function getConfig() {
    return (
      app.config?.data ||
      window.FizicaGalactionConfig ||
      {}
    );
  }

  /**
   * Determină rădăcina proiectului.
   *
   * Pentru:
   * /fizica-galaction/assets/js/load-header.js
   *
   * rezultatul este:
   * /fizica-galaction/
   */
  function getSiteRoot() {
    const configuredRoot =
      getConfig().environment?.siteRoot;

    if (configuredRoot) {
      return configuredRoot;
    }

    if (scriptUrl) {
      return new URL(
        "../../",
        scriptUrl
      ).href;
    }

    return new URL(
      "./",
      document.baseURI
    ).href;
  }

  /**
   * Creează o adresă absolută raportată la rădăcina
   * proiectului.
   */
  function resolveSiteUrl(path = "") {
    if (
      typeof app.config?.resolve ===
      "function"
    ) {
      return app.config.resolve(path);
    }

    const normalizedPath =
      String(path)
        .trim()
        .replace(/^\/+/, "");

    return new URL(
      normalizedPath,
      getSiteRoot()
    ).href;
  }

  function getHeaderUrl() {
    const configuredPath =
      getConfig().routes?.header;

    return resolveSiteUrl(
      configuredPath ||
      COMPONENT_PATH
    );
  }

  /* =======================================================
     CSS
     ======================================================= */

  /**
   * Încarcă automat layout.css.
   *
   * Astfel, paginile care au uitat să includă acest CSS
   * nu mai afișează antetul în stilul implicit al browserului.
   */
  function ensureLayoutStyles() {
    const stylesheetUrl =
      resolveSiteUrl(LAYOUT_PATH);

    const existingLink =
      Array.from(
        document.querySelectorAll(
          'link[rel="stylesheet"]'
        )
      ).find((link) => {
        try {
          return (
            new URL(
              link.href,
              document.baseURI
            ).href === stylesheetUrl
          );
        } catch (_) {
          return false;
        }
      });

    if (existingLink) {
      return existingLink;
    }

    const link =
      document.createElement("link");

    link.id =
      "fizica-galaction-layout-css";

    link.rel = "stylesheet";
    link.href = stylesheetUrl;

    document.head.appendChild(link);

    return link;
  }

  /* =======================================================
     RUTE DIN HEADER
     ======================================================= */

  const fallbackRoutes =
    Object.freeze({
      home:
        "index.html",

      grade6:
        "clasa6/index.html",

      grade7:
        "clasa7/index.html",

      grade8:
        "clasa8/index.html",

      laboratory:
        "laborator-fizica/index.html",

      login:
        "login/index.html"
    });

  /**
   * Pentru elemente precum:
   *
   * <a data-site-route="home">
   *
   * completează automat href-ul corect.
   */
  function resolveRoutes(container) {
    const routes = {
      ...fallbackRoutes,
      ...(getConfig().routes || {})
    };

    container
      .querySelectorAll(
        "[data-site-route]"
      )
      .forEach((link) => {
        const routeName =
          link.dataset.siteRoute;

        const route =
          routes[routeName];

        if (route) {
          link.href =
            resolveSiteUrl(route);
        }
      });
  }

  /* =======================================================
     MAIN ȘI ACCESIBILITATE
     ======================================================= */

  function ensureMainContentId() {
    const main =
      document.querySelector("main");

    if (main && !main.id) {
      main.id = "main-content";
    }
  }

  /* =======================================================
     SISTEMUL ZI / NOAPTE
     ======================================================= */

  function getThemeStorageKey() {
    return (
      getConfig().theme
        ?.storageKey ||
      getConfig().storage
        ?.theme ||
      "fizica-galaction-theme"
    );
  }

  function getCurrentTheme() {
    if (
      document.body.classList
        .contains("dark")
    ) {
      return "dark";
    }

    if (
      document.body.classList
        .contains("light")
    ) {
      return "light";
    }

    const dataTheme =
      document.body.dataset.theme;

    if (
      dataTheme === "dark" ||
      dataTheme === "light"
    ) {
      return dataTheme;
    }

    try {
      const savedTheme =
        localStorage.getItem(
          getThemeStorageKey()
        );

      if (
        savedTheme === "dark" ||
        savedTheme === "light"
      ) {
        return savedTheme;
      }
    } catch (_) {
      /*
       * localStorage poate fi indisponibil
       * în anumite moduri private.
       */
    }

    return window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  }

  /**
   * Actualizează aspectul și descrierea butonului.
   *
   * Pe tema luminoasă afișează luna:
   * utilizatorul poate trece la tema întunecată.
   *
   * Pe tema întunecată afișează soarele:
   * utilizatorul poate trece la tema luminoasă.
   */
  function updateThemeButton(
    button,
    theme = getCurrentTheme()
  ) {
    if (!button) {
      return;
    }

    const dark =
      theme === "dark";

    const icon =
      dark ? "☀️" : "🌙";

    const label =
      dark
        ? "Activează tema luminoasă"
        : "Activează tema întunecată";

    button.textContent = icon;
    button.title = label;

    button.setAttribute(
      "aria-label",
      label
    );

    button.setAttribute(
      "aria-pressed",
      String(dark)
    );
  }

  /**
   * Comutare de rezervă.
   *
   * Este folosită numai când theme-toggle.js nu este încă
   * disponibil.
   */
  function fallbackToggleTheme(
    button
  ) {
    const current =
      getCurrentTheme();

    const next =
      current === "dark"
        ? "light"
        : "dark";

    document.body.classList.remove(
      "light",
      "dark",
      "light-mode"
    );

    document.body.classList.add(
      next
    );

    document.body.dataset.theme =
      next;

    try {
      localStorage.setItem(
        getThemeStorageKey(),
        next
      );
    } catch (_) {
      /*
       * Tema rămâne activă chiar dacă preferința
       * nu poate fi salvată.
       */
    }

    updateThemeButton(
      button,
      next
    );

    document.dispatchEvent(
      new CustomEvent(
        "themeChanged",
        {
          detail: {
            theme: next
          }
        }
      )
    );

    document.dispatchEvent(
      new CustomEvent(
        "fizica:theme-change",
        {
          detail: {
            theme: next
          }
        }
      )
    );
  }

  /**
   * Reconectează butonul după ce header.html a fost
   * introdus în DOM.
   */
  function connectThemeButton(
    container = document
  ) {
    const button =
      container.querySelector(
        ".theme-toggle"
      );

    if (!button) {
      return false;
    }

    button.type = "button";

    /*
     * ThemeManager a fost creat înainte ca antetul
     * dinamic să existe. Îi transmitem noul buton.
     */
    if (window.themeManager) {
      window.themeManager
        .THEME_BUTTON = button;
    }

    /*
     * Ascultătorul este adăugat o singură dată.
     */
    if (
      button.dataset
        .themeConnected !== "true"
    ) {
      button.addEventListener(
        "click",
        () => {
          const manager =
            window.themeManager;

          if (
            manager &&
            typeof manager
              .toggleTheme ===
              "function"
          ) {
            manager.THEME_BUTTON =
              button;

            manager.toggleTheme();

            updateThemeButton(
              button,
              manager.getCurrentTheme?.() ||
                getCurrentTheme()
            );

            return;
          }

          fallbackToggleTheme(
            button
          );
        }
      );

      button.dataset
        .themeConnected = "true";
    }

    updateThemeButton(
      button
    );

    return true;
  }

  /**
   * Dacă ThemeManager se inițializează imediat după antet,
   * reconectarea este repetată fără a dubla evenimentul click.
   */
  function scheduleThemeReconnect(
    container
  ) {
    connectThemeButton(
      container
    );

    window.setTimeout(
      () => {
        connectThemeButton(
          container
        );
      },
      0
    );

    window.setTimeout(
      () => {
        connectThemeButton(
          container
        );
      },
      250
    );
  }

  /*
   * ThemeManager emite acest eveniment după schimbarea temei.
   * Actualizăm din nou pictograma și eticheta accesibilă.
   */
  document.addEventListener(
    "themeChanged",
    (event) => {
      const button =
        document.querySelector(
          ".theme-toggle"
        );

      updateThemeButton(
        button,
        event.detail?.theme ||
          getCurrentTheme()
      );
    }
  );

  document.addEventListener(
    "fizica:theme-change",
    (event) => {
      const button =
        document.querySelector(
          ".theme-toggle"
        );

      updateThemeButton(
        button,
        event.detail?.theme ||
          getCurrentTheme()
      );
    }
  );

  /* =======================================================
     PREGĂTIREA COMPONENTEI
     ======================================================= */

  function prepareHeader(
    container,
    fallback = false
  ) {
    ensureMainContentId();
    resolveRoutes(container);
    scheduleThemeReconnect(
      container
    );

    container.dataset
      .headerLoaded = "true";

    const header =
      container.querySelector(
        ".site-header"
      );

    document.dispatchEvent(
      new CustomEvent(
        "headerLoaded",
        {
          detail: {
            container,
            header,
            fallback,
            source:
              getHeaderUrl()
          }
        }
      )
    );

    document.dispatchEvent(
      new CustomEvent(
        "fizica:content-updated",
        {
          detail: {
            root: container,
            container,
            source:
              "load-header"
          }
        }
      )
    );
  }

  /* =======================================================
     HEADER DE REZERVĂ
     ======================================================= */

  function createFallbackHeader(
    container
  ) {
    container.innerHTML = `
      <header
        class="site-header site-header--identity"
        data-site-header-component>

        <div
          class="container site-header__identity">

          <div class="site-header__text">
            <p class="site-title">
              Fizica Galaction
            </p>

            <p class="site-teacher">
              Prof. Dănuț Andronie
            </p>

            <p class="site-motto">
              „Fizica nu este dominată de formule,
              ci de logică.”
            </p>
          </div>

          <button
            type="button"
            class="theme-toggle"
            aria-label="Activează tema întunecată"
            title="Activează tema întunecată">
            🌙
          </button>
        </div>
      </header>
    `;

    prepareHeader(
      container,
      true
    );
  }

  /* =======================================================
     ÎNCĂRCAREA HEADERULUI
     ======================================================= */

  async function loadHeader(
    options = {}
  ) {
    ensureLayoutStyles();

    const container =
      document.querySelector(
        CONTAINER_SELECTOR
      );

    if (!container) {
      console.warn(
        `[${APP_NAME}] Nu există #header-container în pagină.`
      );

      return null;
    }

    /*
     * Nu încărca din nou componenta dacă este deja prezentă.
     */
    if (
      container.dataset
        .headerLoaded === "true" &&
      !options.force
    ) {
      scheduleThemeReconnect(
        container
      );

      return container;
    }

    /*
     * Evită două cereri fetch simultane.
     */
    if (
      loadingPromise &&
      !options.force
    ) {
      return loadingPromise;
    }

    loadingPromise =
      (async () => {
        container.setAttribute(
          "aria-busy",
          "true"
        );

        try {
          const response =
            await fetch(
              getHeaderUrl(),
              {
                cache: "no-cache",
                credentials:
                  "same-origin"
              }
            );

          if (!response.ok) {
            throw new Error(
              `Headerul nu a putut fi încărcat. Cod HTTP: ${response.status}.`
            );
          }

          const html =
            await response.text();

          container.innerHTML =
            html;

          prepareHeader(
            container,
            false
          );

          console.info(
            `[${APP_NAME}] Header încărcat.`
          );
        } catch (error) {
          console.error(
            `[${APP_NAME}] Eroare la încărcarea headerului:`,
            error
          );

          createFallbackHeader(
            container
          );
        } finally {
          container.removeAttribute(
            "aria-busy"
          );

          loadingPromise = null;
        }

        return container;
      })();

    return loadingPromise;
  }

  /**
   * Reaplică legăturile și butonul temei fără să
   * descarce din nou componenta.
   */
  function refreshHeader() {
    const container =
      document.querySelector(
        CONTAINER_SELECTOR
      );

    if (!container) {
      return null;
    }

    resolveRoutes(container);
    scheduleThemeReconnect(
      container
    );

    return container;
  }

  /* =======================================================
     API PUBLIC
     ======================================================= */

  const api = {
    init: loadHeader,
    load: loadHeader,
    refresh: refreshHeader,
    reconnectThemeButton:
      connectThemeButton,
    getComponentUrl:
      getHeaderUrl,
    getSiteRoot
  };

  app.headerLoader = api;

  window.loadHeader =
    loadHeader;

  window.refreshHeader =
    refreshHeader;

  /* =======================================================
     PORNIRE AUTOMATĂ
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        loadHeader();
      },
      {
        once: true
      }
    );
  } else {
    loadHeader();
  }
})();
