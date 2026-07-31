/**
 * load-footer.js — Fizica Galaction
 *
 * Încarcă assets/components/footer.html și:
 * - rezolvă rutele prin config.js;
 * - actualizează anul;
 * - emite evenimentul „footerLoaded”.
 *
 * Container acceptat:
 *
 * <div id="footer-container"></div>
 *
 * sau:
 *
 * <div data-site-footer></div>
 */

(function () {
  "use strict";

  const APP_NAME = "Fizica Galaction";
  const COMPONENT_PATH =
    "assets/components/footer.html";
  const CONTAINER_SELECTOR =
    "[data-site-footer], #footer-container";

  const scriptElement =
    document.currentScript;

  const scriptUrl =
    scriptElement?.src || "";

  const app =
    (window.FizicaGalaction =
      window.FizicaGalaction || {});

  const fallbackRoutes = Object.freeze({
    home: "index.html",
    laboratory:
      "laborator-fizica/index.html"
  });

  let loadPromise = null;

  function getConfig() {
    return (
      app.config?.data ||
      window.FizicaGalactionConfig ||
      {}
    );
  }

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

  function getComponentUrl() {
    const configured =
      getConfig().routes?.footer;

    return resolveSiteUrl(
      configured || COMPONENT_PATH
    );
  }

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
        const route =
          routes[
            link.dataset.siteRoute
          ];

        if (route) {
          link.href =
            resolveSiteUrl(route);
        }
      });
  }

  function updateYear(container) {
    const year =
      new Date().getFullYear();

    container
      .querySelectorAll(
        "[data-current-year]"
      )
      .forEach((element) => {
        element.textContent =
          String(year);
      });
  }

  function prepareComponent(
    container,
    fallback = false
  ) {
    resolveRoutes(container);
    updateYear(container);

    container.dataset
      .footerLoaded = "true";

    const footer =
      container.querySelector(
        "[data-site-footer-component], .site-footer"
      );

    document.dispatchEvent(
      new CustomEvent(
        "footerLoaded",
        {
          detail: {
            container,
            footer,
            fallback,
            source:
              getComponentUrl()
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
              "load-footer"
          }
        }
      )
    );
  }

  /**
   * Fallback minimal. Footerul complet rămâne definit numai
   * în assets/components/footer.html.
   *
   * @param {Element} container
   */
  function createFallback(container) {
    container.innerHTML = `
      <footer
        class="site-footer"
        data-site-footer-component>
        <div class="container footer-inner">
          <p>
            ©
            <span data-current-year></span>
            Fizica Galaction ·
            Prof. Dănuț Andronie
          </p>

          <a
            href="mailto:danutmg@gmail.com">
            Contact
          </a>
        </div>
      </footer>
    `;

    prepareComponent(
      container,
      true
    );
  }

  /**
   * @param {{force?: boolean}} options
   * @returns {Promise<Element | null>}
   */
  async function loadFooter(
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
        .footerLoaded === "true" &&
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
            `Footerul nu a putut fi încărcat (${response.status}).`
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

  function refresh() {
    const container =
      document.querySelector(
        CONTAINER_SELECTOR
      );

    if (!container) {
      return null;
    }

    resolveRoutes(container);
    updateYear(container);

    return container;
  }

  const api = {
    load: loadFooter,
    init: loadFooter,
    refresh,
    getComponentUrl
  };

  app.footerLoader = api;
  window.loadFooter = loadFooter;

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => loadFooter(),
      { once: true }
    );
  } else {
    loadFooter();
  }
})();
