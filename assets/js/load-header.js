/**
 * load-header.js — Fizica Galaction
 *
 * Încarcă assets/components/header.html și:
 * - rezolvă rutele prin config.js;
 * - marchează pagina curentă;
 * - activează meniul mobil;
 * - reconectează butonul de temă;
 * - emite evenimentul „headerLoaded”.
 *
 * Container acceptat:
 *
 * <div id="header-container"></div>
 *
 * sau:
 *
 * <div data-site-header></div>
 */

(function () {
  "use strict";

  const APP_NAME = "Fizica Galaction";
  const COMPONENT_PATH =
    "assets/components/header.html";
  const CONTAINER_SELECTOR =
    "[data-site-header], #header-container";

  const scriptElement =
    document.currentScript;

  const scriptUrl =
    scriptElement?.src || "";

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  const fallbackRoutes = Object.freeze({
    home: "index.html",
    grade6: "clasa6/index.html",
    grade7: "clasa7/index.html",
    grade8: "clasa8/index.html",
    laboratory:
      "laborator-fizica/index.html",
    login: "login/index.html"
  });

  let loadPromise = null;

  /**
   * Returnează configurația centrală, dacă este disponibilă.
   *
   * @returns {object}
   */
  function getConfig() {
    return (
      app.config?.data ||
      window.FizicaGalactionConfig ||
      {}
    );
  }

  /**
   * Determină rădăcina site-ului din config.js sau din URL-ul
   * scriptului load-header.js.
   *
   * @returns {string}
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
   * Rezolvă o cale raportată la rădăcina site-ului.
   *
   * @param {string} path
   * @returns {string}
   */
  function resolveSiteUrl(path) {
    if (
      typeof app.config?.resolve ===
      "function"
    ) {
      return app.config.resolve(path);
    }

    return new URL(
      String(path || "").replace(
        /^\/+/,
        ""
      ),
      getSiteRoot()
    ).href;
  }

  /**
   * URL-ul componentei.
   *
   * @returns {string}
   */
  function getComponentUrl() {
    const configured =
      getConfig().routes?.header;

    return resolveSiteUrl(
      configured || COMPONENT_PATH
    );
  }
/**
 * Încarcă o singură dată stilurile structurale necesare
 * headerului și footerului.
 */
function ensureLayoutStyles() {
  const stylesheetId =
    "fizica-galaction-layout-css";

  if (
    document.getElementById(
      stylesheetId
    )
  ) {
    return;
  }

  const link =
    document.createElement("link");

  link.id = stylesheetId;
  link.rel = "stylesheet";

  link.href =
    typeof app.config?.resolve ===
      "function"
      ? app.config.resolve(
          "assets/css/layout.css"
        )
      : new URL(
          "../css/layout.css",
          scriptUrl ||
            document.baseURI
        ).href;

  document.head.appendChild(link);
}
  /**
   * Normalizează o cale pentru compararea rutelor.
   *
   * @param {string} value
   * @returns {string}
   */
  function normalizePath(value) {
    try {
      const url = new URL(
        value,
        document.baseURI
      );

      let path = decodeURIComponent(
        url.pathname
      )
        .replace(/\/index\.html$/i, "/")
        .replace(/\/+/g, "/");

      if (
        path.length > 1 &&
        !path.endsWith("/")
      ) {
        path += "/";
      }

      return path;
    } catch (_) {
      return "";
    }
  }

  /**
   * Înlocuiește rutele simbolice din componentă.
   *
   * @param {Element} container
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

  /**
   * Marchează legătura activă.
   *
   * @param {Element} container
   */
  function markCurrentPage(container) {
    const current =
      normalizePath(
        window.location.href
      );

    container
      .querySelectorAll(
        "a[data-site-route]"
      )
      .forEach((link) => {
        const target =
          normalizePath(link.href);

        const isHome =
          link.dataset.siteRoute ===
          "home";

        const active = isHome
          ? current === target
          : (
              current === target ||
              (
                target !== "/" &&
                current.startsWith(
                  target
                )
              )
            );

        link.classList.toggle(
          "is-active",
          active
        );

        if (active) {
          link.setAttribute(
            "aria-current",
            "page"
          );
        } else {
          link.removeAttribute(
            "aria-current"
          );
        }
      });
  }

  /**
   * Asigură ținta pentru skip-link.
   */
  function ensureMainTarget() {
    const main =
      document.querySelector("main");

    if (main && !main.id) {
      main.id = "main-content";
    }
  }

  /**
   * Activează meniul mobil.
   *
   * @param {Element} container
   */
  function connectMobileMenu(container) {
    const button =
      container.querySelector(
        "[data-menu-toggle]"
      );

    const navigation =
      container.querySelector(
        "[data-site-navigation]"
      );

    if (
      !button ||
      !navigation ||
      button.dataset.connected ===
        "true"
    ) {
      return;
    }

    function setOpen(open) {
      navigation.classList.toggle(
        "is-open",
        open
      );

      button.setAttribute(
        "aria-expanded",
        String(open)
      );

      button.setAttribute(
        "aria-label",
        open
          ? "Închide meniul de navigare"
          : "Deschide meniul de navigare"
      );

      const icon =
        button.querySelector(
          "[aria-hidden='true']"
        );

      if (icon) {
        icon.textContent =
          open ? "✕" : "☰";
      }
    }

    button.addEventListener(
      "click",
      () => {
        setOpen(
          button.getAttribute(
            "aria-expanded"
          ) !== "true"
        );
      }
    );

    navigation.addEventListener(
      "click",
      (event) => {
        if (
          event.target.closest("a")
        ) {
          setOpen(false);
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          button.getAttribute(
            "aria-expanded"
          ) === "true"
        ) {
          setOpen(false);
          button.focus();
        }
      }
    );

    window
      .matchMedia(
        "(min-width: 721px)"
      )
      .addEventListener(
        "change",
        (event) => {
          if (event.matches) {
            setOpen(false);
          }
        }
      );

    button.dataset.connected =
      "true";
  }

  /**
   * Reconectează butonul de temă după încărcarea dinamică.
   *
   * Este compatibil atât cu viitorul API central, cât și cu
   * ThemeManager-ul existent.
   *
   * @param {Element} container
   */
  function reconnectTheme(container) {
    const button =
      container.querySelector(
        ".theme-toggle"
      );

    if (!button) {
      return;
    }

    if (
      typeof app.theme
        ?.reconnectButton ===
      "function"
    ) {
      app.theme.reconnectButton(
        button
      );
      return;
    }

    if (
      typeof window.themeManager
        ?.reconnectButton ===
      "function"
    ) {
      window.themeManager
        .reconnectButton(button);
      return;
    }

    const manager =
      window.themeManager;

    if (
      manager &&
      typeof manager.toggleTheme ===
        "function" &&
      button.dataset
        .themeConnected !== "true"
    ) {
      manager.THEME_BUTTON =
        button;

      button.addEventListener(
        "click",
        () => manager.toggleTheme()
      );

      manager
        .createThemeToggleButton?.();

      button.dataset
        .themeConnected = "true";
    }
  }

  /**
   * Pregătește componenta după injectare.
   *
   * @param {Element} container
   * @param {boolean} fallback
   */
  function prepareComponent(
    container,
    fallback = false
  ) {
    ensureMainTarget();
    resolveRoutes(container);
    markCurrentPage(container);
    connectMobileMenu(container);
    reconnectTheme(container);

    container.dataset
      .headerLoaded = "true";

    const header =
      container.querySelector(
        "[data-site-header-component], .site-header"
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
              getComponentUrl()
          }
        }
      )
    );

    emitContentUpdated(
      container
    );
  }

  /**
   * Anunță aplicația că DOM-ul a fost actualizat.
   *
   * @param {Element} container
   */
  function emitContentUpdated(
    container
  ) {
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

  /**
   * Fallback minimal când fetch nu este disponibil.
   *
   * Nu reproduce întregul meniu, pentru ca header.html să rămână
   * singura sursă a navigării principale.
   *
   * @param {Element} container
   */
  function createFallback(container) {
    container.innerHTML = `
      <header
        class="site-header"
        data-site-header-component>
        <div class="container header-inner">
          <a
            class="site-logo"
            data-site-route="home"
            href="${resolveSiteUrl(
              fallbackRoutes.home
            )}">
            <span aria-hidden="true">
              ⚛️
            </span>
            <span class="site-brand">
              Fizica Galaction
            </span>
          </a>

          <button
            type="button"
            class="theme-toggle"
            aria-label="Schimbă tema"
            title="Schimbă tema">
            <span aria-hidden="true">
              ◐
            </span>
          </button>
        </div>
      </header>
    `;

    prepareComponent(
      container,
      true
    );
  }

  /**
   * Încarcă headerul.
   *
   * @param {{force?: boolean}} options
   * @returns {Promise<Element | null>}
   */
  async function loadHeader(
    options = {}
  ) {
    const container =
      document.querySelector(
        CONTAINER_SELECTOR
      );

    if (!container) {
      return null;
    }

    if (
      container.dataset
        .headerLoaded === "true" &&
      !options.force
    ) {
      return container;
    }

    if (
      loadPromise &&
      !options.force
    ) {
      return loadPromise;
    }

    loadPromise = (async () => {
      container.setAttribute(
        "aria-busy",
        "true"
      );

      try {
        const response = await fetch(
          getComponentUrl(),
          {
            cache: "no-cache",
            credentials:
              "same-origin"
          }
        );

        if (!response.ok) {
          throw new Error(
            `Headerul nu a putut fi încărcat (${response.status}).`
          );
        }

        container.innerHTML =
          await response.text();

        prepareComponent(
          container,
          false
        );
      } catch (error) {
        console.warn(
          `[${APP_NAME}]`,
          error
        );

        createFallback(
          container
        );
      } finally {
        container.removeAttribute(
          "aria-busy"
        );
        loadPromise = null;
      }

      return container;
    })();

    return loadPromise;
  }

  /**
   * Reaplică rutele și stările după o schimbare de pagină.
   *
   * @returns {Element | null}
   */
  function refresh() {
    const container =
      document.querySelector(
        CONTAINER_SELECTOR
      );

    if (!container) {
      return null;
    }

    resolveRoutes(container);
    markCurrentPage(container);
    reconnectTheme(container);

    return container;
  }

  const api = {
    load: loadHeader,
    init: loadHeader,
    refresh,
    getComponentUrl
  };

  app.headerLoader = api;
  window.loadHeader = loadHeader;

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => loadHeader(),
      { once: true }
    );
  } else {
    loadHeader();
  }
})();
