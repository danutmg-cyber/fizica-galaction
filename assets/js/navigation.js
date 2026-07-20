/**
 * navigation.js — Fizica Galaction
 *
 * Gestionează navigarea comună a platformei:
 * - marchează pagina activă în meniuri;
 * - configurează butoanele „Înapoi” și „Mergi mai departe”;
 * - configurează întoarcerea la capitol sau pagina principală;
 * - gestionează elementele cu data-nav-url;
 * - determină rădăcina proiectului;
 * - funcționează și cu header încărcat dinamic;
 * - evită navigarea către adrese nesigure.
 *
 * Fișierul nu pornește automat. Este inițializat de app.js.
 */

(function () {
  "use strict";

  const aplicatie =
    window.FizicaGalaction =
    window.FizicaGalaction || {};

  const stare = {
    initializat: false,
    configuratieLectie: {},
    radacinaSite: null
  };

  const SELECTORI = Object.freeze({
    linkuriNavigare: [
      "nav a[href]",
      "[data-navigation] a[href]",
      "[data-nav-link][href]"
    ].join(","),

    anterior: [
      "[data-nav-prev]",
      "[data-nav-previous]",
      "[data-lesson-prev]"
    ].join(","),

    urmator: [
      "[data-nav-next]",
      "[data-lesson-next]"
    ].join(","),

    capitol: [
      "[data-nav-index]",
      "[data-nav-chapter]",
      "[data-lesson-index]"
    ].join(","),

    acasa: [
      "[data-nav-home]"
    ].join(",")
  });

  const ETICHETE_IMPLICITE = Object.freeze({
    anterior: "← Înapoi",
    urmator: "Mergi mai departe →",
    capitol: "Înapoi la capitol",
    acasa: "Pagina principală"
  });

  /**
   * Transformă o valoare într-un șir curățat.
   *
   * @param {unknown} valoare
   * @returns {string}
   */
  function curataText(valoare) {
    return String(valoare ?? "").trim();
  }

  /**
   * Adaugă slash la finalul unei căi de director.
   *
   * @param {string} cale
   * @returns {string}
   */
  function asiguraSlashFinal(cale) {
    return cale.endsWith("/") ? cale : `${cale}/`;
  }

  /**
   * Caută scriptul navigation.js sau app.js în pagină
   * pentru a determina automat rădăcina proiectului.
   *
   * @returns {HTMLScriptElement|null}
   */
  function gasesteScriptPlatforma() {
    const scripturi = Array.from(document.scripts);

    return (
      scripturi.find((script) =>
        /\/assets\/js\/navigation\.js(?:[?#]|$)/i.test(script.src)
      ) ||
      scripturi.find((script) =>
        /\/assets\/js\/app\.js(?:[?#]|$)/i.test(script.src)
      ) ||
      null
    );
  }

  /**
   * Determină adresa rădăcinii proiectului.
   *
   * Ordinea verificării:
   * 1. data-root de pe body;
   * 2. data-root de pe html;
   * 3. adresa scriptului navigation.js sau app.js;
   * 4. subdirectorul GitHub Pages;
   * 5. rădăcina domeniului.
   *
   * Exemplu recomandat:
   *
   * <body data-root="/fizica-galaction/">
   *
   * @returns {URL}
   */
  function obtineURLRadacinaSite() {
    if (stare.radacinaSite instanceof URL) {
      return stare.radacinaSite;
    }

    const radacinaExplicita =
      document.body?.dataset.root ||
      document.documentElement?.dataset.root;

    if (radacinaExplicita) {
      stare.radacinaSite = new URL(
        asiguraSlashFinal(radacinaExplicita),
        document.baseURI
      );

      return stare.radacinaSite;
    }

    const scriptPlatforma = gasesteScriptPlatforma();

    if (scriptPlatforma?.src) {
      const adresaScript = new URL(
        scriptPlatforma.src,
        document.baseURI
      );

      const caleRadacina = adresaScript.pathname.replace(
        /assets\/js\/(?:navigation|app)\.js$/i,
        ""
      );

      adresaScript.pathname = asiguraSlashFinal(caleRadacina);
      adresaScript.search = "";
      adresaScript.hash = "";

      stare.radacinaSite = adresaScript;
      return stare.radacinaSite;
    }

    /*
     * Detectare de rezervă pentru GitHub Pages:
     * utilizator.github.io/nume-proiect/
     */
    if (
      window.location.hostname
        .toLowerCase()
        .endsWith(".github.io")
    ) {
      const segmente = window.location.pathname
        .split("/")
        .filter(Boolean);

      const numeProiect = segmente[0] || "";

      stare.radacinaSite = new URL(
        numeProiect ? `/${numeProiect}/` : "/",
        window.location.origin
      );

      return stare.radacinaSite;
    }

    if (
      window.location.protocol === "http:" ||
      window.location.protocol === "https:"
    ) {
      stare.radacinaSite = new URL(
        "/",
        window.location.origin
      );

      return stare.radacinaSite;
    }

    /*
     * Rezervă pentru deschiderea locală cu file://.
     * Pentru proiecte deschise local este preferabil data-root.
     */
    stare.radacinaSite = new URL("./", document.baseURI);

    return stare.radacinaSite;
  }

  /**
   * Returnează rădăcina site-ului sub formă de text.
   *
   * @returns {string}
   */
  function obtineRadacinaSite() {
    return obtineURLRadacinaSite().href;
  }

  /**
   * Verifică dacă protocolul unei adrese este permis.
   *
   * @param {URL} url
   * @returns {boolean}
   */
  function esteProtocolPermis(url) {
    return ["http:", "https:", "file:"].includes(
      url.protocol
    );
  }

  /**
   * Construiește o adresă URL sigură.
   *
   * Forme acceptate:
   * - "lectia-2.html" — relativ la pagina curentă;
   * - "../index.html" — relativ la pagina curentă;
   * - "~/clasa7/index.html" — relativ la rădăcina proiectului;
   * - "/fizica-galaction/clasa7/index.html";
   * - adresă completă https://...
   *
   * @param {string} cale
   * @param {boolean} deLaRadacina
   * @returns {URL|null}
   */
  function construiesteURL(cale, deLaRadacina = false) {
    const valoare = curataText(cale);

    if (!valoare) {
      return null;
    }

    const valoareMica = valoare.toLowerCase();

    if (
      valoareMica.startsWith("javascript:") ||
      valoareMica.startsWith("data:") ||
      valoareMica.startsWith("vbscript:")
    ) {
      console.warn(
        "[Fizica Galaction] Adresă de navigare blocată:",
        valoare
      );

      return null;
    }

    try {
      let url;

      if (valoare.startsWith("~/")) {
        url = new URL(
          valoare.slice(2),
          obtineURLRadacinaSite()
        );
      } else if (deLaRadacina) {
        url = new URL(
          valoare.replace(/^\/+/, ""),
          obtineURLRadacinaSite()
        );
      } else {
        url = new URL(valoare, document.baseURI);
      }

      if (!esteProtocolPermis(url)) {
        console.warn(
          "[Fizica Galaction] Protocol nepermis:",
          url.protocol
        );

        return null;
      }

      return url;
    } catch (eroare) {
      console.error(
        "[Fizica Galaction] Adresă invalidă:",
        valoare,
        eroare
      );

      return null;
    }
  }

  /**
   * Rezolvă o cale și returnează adresa completă.
   *
   * @param {string} cale
   * @param {boolean} deLaRadacina
   * @returns {string|null}
   */
  function rezolvaURL(cale, deLaRadacina = false) {
    return construiesteURL(cale, deLaRadacina)?.href || null;
  }

  /**
   * Navighează către o adresă verificată.
   *
   * @param {string} cale
   * @param {{
   *   replace?: boolean,
   *   newTab?: boolean,
   *   deLaRadacina?: boolean
   * }} optiuni
   * @returns {boolean}
   */
  function navigheazaInSiguranta(cale, optiuni = {}) {
    const url = construiesteURL(
      cale,
      Boolean(optiuni.deLaRadacina)
    );

    if (!url) {
      return false;
    }

    if (optiuni.newTab) {
      const fereastra = window.open(
        url.href,
        "_blank",
        "noopener,noreferrer"
      );

      return Boolean(fereastra);
    }

    if (optiuni.replace) {
      window.location.replace(url.href);
    } else {
      window.location.assign(url.href);
    }

    return true;
  }

  /**
   * Normalizează o cale pentru compararea linkurilor.
   *
   * index.html și slash-ul final sunt tratate echivalent.
   *
   * @param {string} pathname
   * @returns {string}
   */
  function normalizeazaCale(pathname) {
    let cale = pathname
      .replace(/\/index\.html?$/i, "/")
      .replace(/\/+/g, "/");

    if (cale.length > 1) {
      cale = cale.replace(/\/$/, "");
    }

    try {
      return decodeURIComponent(cale);
    } catch {
      return cale;
    }
  }

  /**
   * Șterge marcajele active adăugate anterior de modul.
   */
  function stergeMarcajeActive() {
    document
      .querySelectorAll('[data-navigation-active="true"]')
      .forEach((element) => {
        element.classList.remove("is-active");
        element.removeAttribute("aria-current");
        element.removeAttribute(
          "data-navigation-active"
        );
      });
  }

  /**
   * Marchează linkurile care indică pagina curentă.
   *
   * Linkurile active primesc:
   * - clasa is-active;
   * - aria-current="page";
   * - data-navigation-active="true".
   */
  function marcheazaLinkActiv() {
    stergeMarcajeActive();

    const caleCurenta = normalizeazaCale(
      window.location.pathname
    );

    document
      .querySelectorAll(SELECTORI.linkuriNavigare)
      .forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) {
          return;
        }

        if (link.hasAttribute("data-nav-ignore-active")) {
          return;
        }

        const hrefInitial = curataText(
          link.getAttribute("href")
        );

        if (
          !hrefInitial ||
          hrefInitial === "#" ||
          hrefInitial.startsWith("#")
        ) {
          return;
        }

        let url;

        try {
          url = new URL(link.href, document.baseURI);
        } catch {
          return;
        }

        if (url.origin !== window.location.origin) {
          return;
        }

        const caleLink = normalizeazaCale(url.pathname);

        if (caleLink !== caleCurenta) {
          return;
        }

        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
        link.setAttribute(
          "data-navigation-active",
          "true"
        );
      });
  }

  /**
   * Citește configurația lecției din HTML.
   *
   * Configurația poate fi pusă pe body:
   *
   * <body
   *   data-prev-url="lectia-1.html"
   *   data-next-url="lectia-3.html"
   *   data-index-url="../index.html"
   *   data-home-url="~/index.html"
   * >
   *
   * Sau pe elementul:
   *
   * <nav data-lesson-navigation ...>
   *
   * @returns {Object}
   */
  function citesteConfiguratieLectie() {
    const sursa =
      document.querySelector(
        "[data-lesson-navigation]"
      ) ||
      document.body;

    if (!sursa) {
      return {};
    }

    const configuratie = {};

    const atribute = {
      prevUrl: "anterior",
      previousUrl: "anterior",
      nextUrl: "urmator",
      indexUrl: "capitol",
      chapterUrl: "capitol",
      homeUrl: "acasa"
    };

    Object.entries(atribute).forEach(
      ([numeDataset, proprietate]) => {
        const valoare = sursa.dataset[numeDataset];

        if (
          typeof valoare === "string" &&
          !(proprietate in configuratie)
        ) {
          configuratie[proprietate] = valoare;
        }
      }
    );

    return configuratie;
  }

  /**
   * Activează sau dezactivează un element de navigare.
   *
   * @param {HTMLElement} element
   * @param {string|null} cale
   * @param {string} etichetaImplicita
   */
  function configureazaElementNavigare(
    element,
    cale,
    etichetaImplicita
  ) {
    const destinatie = curataText(cale);
    const indisponibil =
      !destinatie || destinatie === "#";

    if (
      !curataText(element.textContent) &&
      etichetaImplicita
    ) {
      element.textContent = etichetaImplicita;
    }

    /*
     * Butonul rămâne în pagină chiar dacă nu există
     * o destinație. Devine doar dezactivat.
     */
    element.hidden = false;
    element.classList.toggle(
      "is-disabled",
      indisponibil
    );

    if (indisponibil) {
      element.setAttribute("aria-disabled", "true");

      if (element instanceof HTMLButtonElement) {
        element.disabled = true;
        delete element.dataset.navUrl;
      }

      if (element instanceof HTMLAnchorElement) {
        element.removeAttribute("href");

        if (
          !element.hasAttribute(
            "data-navigation-tabindex"
          )
        ) {
          const tabindexAnterior =
            element.getAttribute("tabindex") ?? "";

          element.setAttribute(
            "data-navigation-tabindex",
            tabindexAnterior
          );
        }

        element.setAttribute("tabindex", "-1");
      }

      return;
    }

    const url = construiesteURL(destinatie);

    if (!url) {
      configureazaElementNavigare(
        element,
        "",
        etichetaImplicita
      );

      return;
    }

    element.classList.remove("is-disabled");
    element.removeAttribute("aria-disabled");

    if (element instanceof HTMLButtonElement) {
      element.disabled = false;
      element.dataset.navUrl = url.href;
    }

    if (element instanceof HTMLAnchorElement) {
      element.href = url.href;

      if (
        element.hasAttribute(
          "data-navigation-tabindex"
        )
      ) {
        const tabindexAnterior = element.getAttribute(
          "data-navigation-tabindex"
        );

        element.removeAttribute(
          "data-navigation-tabindex"
        );

        if (tabindexAnterior) {
          element.setAttribute(
            "tabindex",
            tabindexAnterior
          );
        } else {
          element.removeAttribute("tabindex");
        }
      }
    }
  }

  /**
   * Configurează toate elementele care corespund
   * unui anumit selector.
   *
   * @param {string} selector
   * @param {string|null|undefined} cale
   * @param {string} eticheta
   */
  function configureazaGrup(
    selector,
    cale,
    eticheta
  ) {
    /*
     * undefined înseamnă că elementele existente
     * trebuie lăsate neschimbate.
     */
    if (typeof cale === "undefined") {
      return;
    }

    document
      .querySelectorAll(selector)
      .forEach((element) => {
        configureazaElementNavigare(
          element,
          cale,
          eticheta
        );
      });
  }

  /**
   * Aplică în pagină configurația de navigare a lecției.
   */
  function actualizeazaNavigareLectie() {
    const configuratieHTML =
      citesteConfiguratieLectie();

    const configuratie = {
      ...configuratieHTML,
      ...stare.configuratieLectie
    };

    configureazaGrup(
      SELECTORI.anterior,
      configuratie.anterior,
      ETICHETE_IMPLICITE.anterior
    );

    configureazaGrup(
      SELECTORI.urmator,
      configuratie.urmator,
      ETICHETE_IMPLICITE.urmator
    );

    configureazaGrup(
      SELECTORI.capitol,
      configuratie.capitol,
      ETICHETE_IMPLICITE.capitol
    );

    configureazaGrup(
      SELECTORI.acasa,
      configuratie.acasa,
      ETICHETE_IMPLICITE.acasa
    );
  }

  /**
   * Setează programatic navigarea unei lecții.
   *
   * Exemplu:
   *
   * seteazaNavigareLectie({
   *   anterior: "lectia-1.html",
   *   urmator: "lectia-3.html",
   *   capitol: "../index.html",
   *   acasa: "~/index.html"
   * });
   *
   * @param {{
   *   anterior?: string,
   *   urmator?: string,
   *   capitol?: string,
   *   acasa?: string
   * }} configuratie
   */
  function seteazaNavigareLectie(configuratie = {}) {
    stare.configuratieLectie = {
      ...stare.configuratieLectie,
      ...configuratie
    };

    actualizeazaNavigareLectie();
    marcheazaLinkActiv();
  }

  /**
   * Derulează lin la începutul paginii.
   */
  function deruleazaSus() {
    if (typeof window.scrollSusLin === "function") {
      window.scrollSusLin();
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /**
   * Gestionarea centralizată a clickurilor de navigare.
   *
   * Sunt recunoscute:
   * - data-nav-url;
   * - data-nav-back;
   * - data-scroll-top;
   * - aria-disabled="true".
   *
   * @param {MouseEvent} eveniment
   */
  function gestioneazaClick(eveniment) {
    if (!(eveniment.target instanceof Element)) {
      return;
    }

    const elementDezactivat = eveniment.target.closest(
      '[aria-disabled="true"], .is-disabled'
    );

    if (elementDezactivat) {
      eveniment.preventDefault();
      return;
    }

    const butonSus = eveniment.target.closest(
      "[data-scroll-top]"
    );

    if (butonSus) {
      eveniment.preventDefault();
      deruleazaSus();
      return;
    }

    const butonInapoi = eveniment.target.closest(
      "[data-nav-back]"
    );

    if (butonInapoi) {
      eveniment.preventDefault();

      const fallback =
        butonInapoi.dataset.fallbackUrl ||
        stare.configuratieLectie.capitol ||
        "~/index.html";

      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigheazaInSiguranta(fallback);
      }

      return;
    }

    const elementCuDestinatie =
      eveniment.target.closest("[data-nav-url]");

    if (!elementCuDestinatie) {
      return;
    }

    const destinatie =
      elementCuDestinatie.dataset.navUrl;

    if (!destinatie) {
      return;
    }

    eveniment.preventDefault();

    navigheazaInSiguranta(destinatie, {
      replace:
        elementCuDestinatie.dataset.navReplace ===
        "true",

      newTab:
        elementCuDestinatie.dataset.navNewTab ===
        "true",

      deLaRadacina:
        elementCuDestinatie.dataset.navRoot ===
        "true"
    });
  }

  /**
   * Actualizează navigarea după încărcarea unui header,
   * a unei lecții sau a altui conținut dinamic.
   */
  function refreshNavigation() {
    actualizeazaNavigareLectie();
    marcheazaLinkActiv();

    document.dispatchEvent(
      new CustomEvent("fizica:navigation-refreshed", {
        detail: {
          radacinaSite: obtineRadacinaSite()
        }
      })
    );
  }

  /**
   * Inițializează modulul o singură dată.
   */
  function initNavigation() {
    if (stare.initializat) {
      refreshNavigation();
      return;
    }

    stare.initializat = true;

    document.addEventListener(
      "click",
      gestioneazaClick
    );

    window.addEventListener(
      "popstate",
      marcheazaLinkActiv
    );

    window.addEventListener(
      "hashchange",
      marcheazaLinkActiv
    );

    refreshNavigation();

    document.dispatchEvent(
      new CustomEvent("fizica:navigation-ready", {
        detail: {
          radacinaSite: obtineRadacinaSite()
        }
      })
    );
  }

  /**
   * Elimină evenimentele modulului.
   * Util în special pentru testare.
   */
  function destroyNavigation() {
    if (!stare.initializat) {
      return;
    }

    document.removeEventListener(
      "click",
      gestioneazaClick
    );

    window.removeEventListener(
      "popstate",
      marcheazaLinkActiv
    );

    window.removeEventListener(
      "hashchange",
      marcheazaLinkActiv
    );

    stare.initializat = false;
  }

  /*
   * API disponibil pentru app.js și celelalte module.
   */
  aplicatie.navigation = {
    init: initNavigation,
    refresh: refreshNavigation,
    destroy: destroyNavigation,

    getRootUrl: obtineRadacinaSite,
    resolveUrl: rezolvaURL,
    navigate: navigheazaInSiguranta,

    setLessonNavigation: seteazaNavigareLectie,
    markActiveLinks: marcheazaLinkActiv
  };

  /*
   * Aliasuri globale pentru compatibilitate cu paginile
   * sau scripturile mai vechi.
   */
  window.initNavigation = initNavigation;
  window.refreshNavigation = refreshNavigation;
  window.actualizeazaNavigare =
    refreshNavigation;

  window.obtineRadacinaSite =
    obtineRadacinaSite;

  window.rezolvaURL = rezolvaURL;

  window.navigheazaInSiguranta =
    navigheazaInSiguranta;

  window.seteazaNavigareLectie =
    seteazaNavigareLectie;

  window.marcheazaLinkActiv =
    marcheazaLinkActiv;
})();
