// Încarcă footerul comun din assets/components/footer.html
(function () {
  "use strict";

  function getFooterUrl() {
    const scripts = Array.from(document.getElementsByTagName("script"));
    const currentScript =
      document.currentScript ||
      scripts.find((script) => (script.getAttribute("src") || "").includes("load-footer.js"));

    if (currentScript) {
      const src = currentScript.getAttribute("src") || "";
      return src.replace(/assets\/js\/load-footer\.js(\?.*)?$/, "assets/components/footer.html");
    }

    return "assets/components/footer.html";
  }

  async function loadFooter() {
    const container = document.getElementById("footer-container");
    if (!container) return;

    try {
      const response = await fetch(getFooterUrl(), { cache: "no-cache" });
      if (!response.ok) throw new Error("Footerul nu a putut fi încărcat.");
      container.innerHTML = await response.text();
    } catch (error) {
      container.innerHTML = `
        <footer class="site-footer">
          <div class="wrapper">
            <p>© 2026 • Prof. Dănuț Andronie</p>
            <p>
              E-mail:
              <a href="mailto:danutmg@gmail.com">danutmg@gmail.com</a>
              pentru sugestii și observații
            </p>
          </div>
        </footer>
      `;
      console.warn(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFooter);
  } else {
    loadFooter();
  }
})();
