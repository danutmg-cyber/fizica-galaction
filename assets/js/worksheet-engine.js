// worksheet-engine.js — Fizica Galaction
//
// Motor generic pentru fișele de lucru: primește un obiect de date (JSON) și
// generează automat paginile, întrebările, verificarea și scorul — fără să
// mai fie nevoie să rescriem HTML/CSS/JS de fiecare dată.
//
// FOLOSIRE (într-un fișier de fișă, foarte scurt):
//
//   <div id="worksheetApp"></div>
//   <nav id="worksheetNav"></nav>
//
//   <script src="../../../assets/js/utils.js"></script>
//   <script src="../../../assets/js/worksheet-engine.js"></script>
//   <script src="../../../assets/data/fise/clasa6-2-fisa-1.js"></script>
//   <script>
//     initWorksheet({
//       data: FISA_DATA,              // obiectul definit în fișierul de date
//       containerId: "worksheetApp",
//       navId: "worksheetNav"
//     });
//   </script>
//
// Fișierul de date (ex: assets/data/fise/clasa6-2-fisa-1.js) definește doar
// conținutul, ca variabilă globală FISA_DATA — vezi schema descrisă mai jos.
// Nu conține nimic despre afișare, paginare sau stilizare.
//
// ===========================================================================
// SCHEMA DATELOR (obiectul FISA_DATA)
// ===========================================================================
// {
//   titlu: "Fișa 1 – Măsurarea directă a lungimii",
//   capitol: "Unități de măsură",
//   motto: "„Fizica nu este o materie dominată de formule, ci de logică”", // opțional
//   profesor: "Prof. Dănuț Andronie",   // opțional, altfel valoarea implicită
//   email: "danutmg@gmail.com",         // opțional, altfel valoarea implicită
//   linkuri: {
//     inapoiLaLectii: "../lectii/index.html",
//     vezicaLectie: "../lectii/lectia-1.html",
//     toateFisele: "./index.html"
//   },
//   pagini: [
//     {
//       tip: "info",
//       chip: "Pagina 1",
//       titlu: "Fișa 1 – Măsurarea directă a lungimii",
//       paragrafe: ["Text introductiv...", "Alt paragraf..."]
//     },
//     {
//       tip: "intrebari",
//       chip: "Pagina 2",
//       titlu: "I.1 Completează",
//       intrebari: [ /* vezi tipurile de mai jos */ ]
//     }
//     // ultima pagină de verificare se adaugă AUTOMAT de motor — nu o scrii
//   ]
// }
//
// TIPURI DE ÎNTREBĂRI ACCEPTATE (câmpul "tip" al fiecărei întrebări):
//
//  completare — text liber, scurt, verificat exact (după normalizare)
//    { id, tip: "completare", sablon: "a) {input} este mărimea fizică...",
//      raspunsuriAcceptate: ["lungimea"], punctaj: 1 }
//
//  numeric — răspuns numeric, verificat cu toleranță (folosește utils.js)
//    { id, tip: "numeric", sablon: "a) 250 cm = {input} m",
//      raspunsCorect: 2.5, toleranta: 0.15, punctaj: 1 }
//
//  alegere — variante radio, o singură corectă
//    { id, tip: "alegere", intrebare: "Pentru un obiect mic folosim:",
//      optiuni: ["ruleta", "rigla", "micrometrul"], corect: 1, punctaj: 1 }
//    (corect = indexul din "optiuni", începând de la 0)
//
//  adevarat-fals — select cu Adevărat/Fals
//    { id, tip: "adevarat-fals", intrebare: "1 km = 1000 m.",
//      corect: "A", punctaj: 1 }
//
//  selectie — select generic, cu opțiuni text (ex: alegerea unui instrument)
//    { id, tip: "selectie", intrebare: "Lungimea unui creion:",
//      optiuni: ["rigla", "ruleta", "micrometrul"], corect: "rigla", punctaj: 1 }
//
//  text-liber — răspuns liber (input sau textarea), verificat prin cuvinte-cheie
//    { id, tip: "text-liber", intrebare: "De ce...?", multilinie: true,
//      cuvinteCheie: ["paralaxa", "perpendicular"],
//      mesajCorect: "Corect. ...", mesajPartial: "Orientativ: ...",
//      mesajGresit: "Scrie un răspuns.", acceptaOriceRaspuns: false, punctaj: 1 }
//    (acceptaOriceRaspuns: true = orice text nevid primește punctajul, cu
//     mesajCorect ca feedback — util pentru „dă un exemplu")
//
// ===========================================================================

const WORKSHEET_CONFIG_IMPLICIT = {
  profesor: "Prof. Dănuț Andronie",
  email: "danutmg@gmail.com",
  motto: "„Fizica nu este o materie dominată de formule, ci de logică”"
};

function initWorksheet(optiuni) {
  const data = optiuni.data;
  const container = document.getElementById(optiuni.containerId);
  const navContainer = document.getElementById(optiuni.navId);

  if (!data || !container || !navContainer) {
    console.error("initWorksheet: lipsesc data, containerId sau navId.");
    return;
  }

  const profesor = data.profesor || WORKSHEET_CONFIG_IMPLICIT.profesor;
  const email = data.email || WORKSHEET_CONFIG_IMPLICIT.email;
  const motto = data.motto || WORKSHEET_CONFIG_IMPLICIT.motto;
  const linkuri = data.linkuri || {};

  // Pagina de verificare finală se adaugă automat — nu trebuie scrisă în date.
  const paginiDeContinut = data.pagini || [];
  const toatePaginile = paginiDeContinut.concat([{ tip: "verificare" }]);

  let indexCurent = 0;
  const raspunsuriCorecte = { obtinut: 0, total: 0 };

  container.innerHTML = toatePaginile
    .map((pagina, i) => construiestePagina(pagina, i, data))
    .join("");

  navContainer.innerHTML = `
    <button class="nav-button secondary" type="button" id="ws-prev">Înapoi</button>
    <div class="progress-pill" aria-live="polite">
      <span id="ws-current">1</span>/<span id="ws-total">${toatePaginile.length}</span>
    </div>
    <button class="nav-button primary" type="button" id="ws-next">Mergi mai departe</button>
  `;

  const paginiEl = Array.from(container.querySelectorAll(".lesson-page"));
  const prevBtn = document.getElementById("ws-prev");
  const nextBtn = document.getElementById("ws-next");
  const currentEl = document.getElementById("ws-current");

  function afiseazaPagina(index) {
    indexCurent = Math.max(0, Math.min(index, paginiEl.length - 1));
    paginiEl.forEach((p, i) => p.classList.toggle("active", i === indexCurent));
    currentEl.textContent = String(indexCurent + 1);
    prevBtn.disabled = indexCurent === 0;

    if (indexCurent === paginiEl.length - 1) {
      nextBtn.style.visibility = "hidden";
      nextBtn.setAttribute("aria-hidden", "true");
    } else {
      nextBtn.style.visibility = "visible";
      nextBtn.removeAttribute("aria-hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  prevBtn.addEventListener("click", () => afiseazaPagina(indexCurent - 1));
  nextBtn.addEventListener("click", () => afiseazaPagina(indexCurent + 1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") afiseazaPagina(indexCurent - 1);
    if (e.key === "ArrowRight") afiseazaPagina(indexCurent + 1);
  });

  const verificaBtn = container.querySelector("#ws-verifica");
  const reseteazaBtn = container.querySelector("#ws-reseteaza");
  if (verificaBtn) verificaBtn.addEventListener("click", () => verificaTot(paginiDeContinut));
  if (reseteazaBtn) reseteazaBtn.addEventListener("click", resetTot);

  afiseazaPagina(0);

  // ---- construire HTML per tip de pagină ----

  function construiestePagina(pagina, index, dataFisa) {
    if (pagina.tip === "info") {
      return paginaInfo(pagina, index, dataFisa);
    }
    if (pagina.tip === "verificare") {
      return paginaVerificare();
    }
    return paginaIntrebari(pagina, index);
  }

  function paginaInfo(pagina, index, dataFisa) {
    const esteInceput = index === 0;
    const banner = esteInceput
      ? `<div class="first-banner" role="banner">
           <div class="platform-title">Fizica Galaction</div>
           <p class="quote">${escapeHtml(motto)}</p>
         </div>`
      : "";
    const paragrafe = (pagina.paragrafe || [])
      .map((p) => `<p>${p}</p>`)
      .join("");

    return `
      <section class="lesson-page" data-page="${index + 1}">
        ${banner}
        <article class="lesson-card">
          <span class="page-chip">${pagina.chip || "Pagina " + (index + 1)}</span>
          <h1>${pagina.titlu || dataFisa.titlu || ""}</h1>
          ${paragrafe}
        </article>
      </section>`;
  }

  function paginaIntrebari(pagina, index) {
    const intrebariHtml = (pagina.intrebari || [])
      .map((intrebare) => construiesteIntrebare(intrebare))
      .join("");

    return `
      <section class="lesson-page" data-page="${index + 1}">
        <article class="lesson-card">
          <span class="page-chip">${pagina.chip || "Pagina " + (index + 1)}</span>
          <h2>${pagina.titlu || ""}</h2>
          ${intrebariHtml}
        </article>
      </section>`;
  }

  function paginaVerificare() {
    const linkInapoi = linkuri.inapoiLaLectii
      ? `<a href="${linkuri.inapoiLaLectii}">Înapoi la lecții</a>`
      : "";
    const linkLectie = linkuri.vezicaLectie
      ? `<a href="${linkuri.vezicaLectie}">Vezi lecția</a>`
      : "";
    const linkFise = linkuri.toateFisele
      ? `<a href="${linkuri.toateFisele}">Toate fișele capitolului</a>`
      : "";

    return `
      <section class="lesson-page" data-page="verificare">
        <article class="lesson-card">
          <h2>Verificare finală</h2>
          <p class="hint">Apasă butonul de mai jos ca să vezi câte răspunsuri sunt corecte, din toate paginile.</p>
          <button class="check-button" type="button" id="ws-verifica">Verifică fișa</button>
          <button class="reset-button" type="button" id="ws-reseteaza">Resetează fișa</button>
          <div id="ws-scor" class="score-box"></div>
          <p class="hint" id="ws-mesaj-final" style="margin-top:10px;"></p>
          <div id="ws-greseli"></div>
        </article>

        <article class="final-banner" role="contentinfo">
          <p class="name">${escapeHtml(profesor)}</p>
          <p>E-mail: <a href="mailto:${email}">${email}</a></p>
          <p class="hint">Pentru observații, propuneri și sugestii privind platforma educațională.</p>
        </article>

        <section class="actions" aria-label="Linkuri utile">
          ${linkInapoi}
          ${linkLectie}
          ${linkFise}
        </section>
      </section>`;
  }

  function construiesteIntrebare(intrebare) {
    switch (intrebare.tip) {
      case "completare":
        return campSablon(intrebare, "text");
      case "numeric":
        return campSablon(intrebare, "text");
      case "alegere":
        return campAlegere(intrebare);
      case "adevarat-fals":
        return campAdevaratFals(intrebare);
      case "selectie":
        return campSelectie(intrebare);
      case "text-liber":
        return campTextLiber(intrebare);
      default:
        console.warn("Tip de întrebare necunoscut:", intrebare.tip);
        return "";
    }
  }

  function campSablon(intrebare, tipInput) {
    const inputHtml = `<input id="${intrebare.id}" class="inline-input" type="${tipInput}" placeholder="Scrie răspunsul aici">`;
    const continut = (intrebare.sablon || "{input}").replace("{input}", inputHtml);
    return `
      <div class="question-block">
        <p>${continut}</p>
        <div id="fb-${intrebare.id}" class="feedback"></div>
      </div>`;
  }

  function campAlegere(intrebare) {
    const optiuni = (intrebare.optiuni || [])
      .map(
        (text, i) => `<label><input type="radio" name="${intrebare.id}" value="${i}"> ${text}</label>`
      )
      .join("");
    return `
      <div class="question-block">
        <p><strong>${intrebare.intrebare || ""}</strong></p>
        ${optiuni}
        <div id="fb-${intrebare.id}" class="feedback"></div>
      </div>`;
  }

  function campAdevaratFals(intrebare) {
    return `
      <div class="question-block">
        <p>${intrebare.intrebare || ""}
          <select id="${intrebare.id}" class="inline-input">
            <option value="">Alege...</option>
            <option value="A">Adevărat</option>
            <option value="F">Fals</option>
          </select>
        </p>
        <div id="fb-${intrebare.id}" class="feedback"></div>
      </div>`;
  }

  function campSelectie(intrebare) {
    const optiuni = (intrebare.optiuni || [])
      .map((text) => `<option value="${text}">${text}</option>`)
      .join("");
    return `
      <div class="question-block">
        <p>${intrebare.intrebare || ""}
          <select id="${intrebare.id}" class="inline-input">
            <option value="">Alege...</option>
            ${optiuni}
          </select>
        </p>
        <div id="fb-${intrebare.id}" class="feedback"></div>
      </div>`;
  }

  function campTextLiber(intrebare) {
    const camp = intrebare.multilinie
      ? `<textarea id="${intrebare.id}" placeholder="Scrie răspunsul aici"></textarea>`
      : `<input id="${intrebare.id}" type="text" placeholder="Scrie răspunsul aici">`;
    return `
      <div class="question-block">
        <p><strong>${intrebare.intrebare || ""}</strong></p>
        ${camp}
        <div id="fb-${intrebare.id}" class="feedback"></div>
      </div>`;
  }

  // ---- verificare + scor ----

  function normalizeazaText(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setFeedback(id, tip, mesaj) {
    const el = document.getElementById("fb-" + id);
    if (!el) return;
    el.className = "feedback " + tip;
    el.textContent = mesaj;
  }

  // Textul afișat în recapitulare pentru o întrebare (fără marcajul {input}).
  function etichetaIntrebare(intrebare) {
    if (intrebare.intrebare) return intrebare.intrebare;
    if (intrebare.sablon) return intrebare.sablon.replace("{input}", "___");
    return intrebare.id;
  }

  // Răspunsul corect, ca text, afișat în recapitulare.
  function raspunsCorectText(intrebare) {
    if (intrebare.tip === "completare") return intrebare.raspunsuriAcceptate[0];
    if (intrebare.tip === "numeric") return String(intrebare.raspunsCorect);
    if (intrebare.tip === "alegere") return intrebare.optiuni[intrebare.corect];
    if (intrebare.tip === "adevarat-fals") return intrebare.corect === "A" ? "Adevărat" : "Fals";
    if (intrebare.tip === "selectie") return intrebare.corect;
    if (intrebare.tip === "text-liber") return (intrebare.cuvinteCheie || [])[0] || "";
    return "";
  }

  // Verifică o întrebare și întoarce { scor, punctaj } — scor poate fi
  // 0, parțial sau egal cu punctajul maxim al întrebării.
  function verificaIntrebare(intrebare) {
    const punctaj = typeof intrebare.punctaj === "number" ? intrebare.punctaj : 1;

    if (intrebare.tip === "completare") {
      const valoare = normalizeazaText(document.getElementById(intrebare.id).value);
      const acceptate = (intrebare.raspunsuriAcceptate || []).map(normalizeazaText);
      const corect = acceptate.includes(valoare);
      setFeedback(
        intrebare.id,
        corect ? "corect" : "gresit",
        corect ? "Corect." : "Răspuns corect: " + intrebare.raspunsuriAcceptate[0] + "."
      );
      return { scor: corect ? punctaj : 0, punctaj };
    }

    if (intrebare.tip === "numeric") {
      const valoareText = document.getElementById(intrebare.id).value;
      const toleranta = typeof intrebare.toleranta === "number" ? intrebare.toleranta : 0.15;
      const corect =
        typeof esteRaspunsNumericCorect === "function"
          ? esteRaspunsNumericCorect(valoareText, intrebare.raspunsCorect, toleranta)
          : Math.abs(Number(valoareText.replace(",", ".")) - intrebare.raspunsCorect) < toleranta;
      setFeedback(
        intrebare.id,
        corect ? "corect" : "gresit",
        corect ? "Corect." : "Răspuns corect: " + intrebare.raspunsCorect + "."
      );
      return { scor: corect ? punctaj : 0, punctaj };
    }

    if (intrebare.tip === "alegere") {
      const selectat = document.querySelector(`input[name="${intrebare.id}"]:checked`);
      if (!selectat) {
        setFeedback(intrebare.id, "gresit", "Alege o variantă.");
        return { scor: 0, punctaj };
      }
      const corect = Number(selectat.value) === intrebare.corect;
      setFeedback(
        intrebare.id,
        corect ? "corect" : "gresit",
        corect ? "Corect." : "Răspuns corect: " + intrebare.optiuni[intrebare.corect] + "."
      );
      return { scor: corect ? punctaj : 0, punctaj };
    }

    if (intrebare.tip === "adevarat-fals") {
      const valoare = document.getElementById(intrebare.id).value;
      if (!valoare) {
        setFeedback(intrebare.id, "gresit", "Alege o variantă.");
        return { scor: 0, punctaj };
      }
      const corect = valoare === intrebare.corect;
      setFeedback(
        intrebare.id,
        corect ? "corect" : "gresit",
        corect ? "Corect." : "Răspuns corect: " + (intrebare.corect === "A" ? "Adevărat." : "Fals.")
      );
      return { scor: corect ? punctaj : 0, punctaj };
    }

    if (intrebare.tip === "selectie") {
      const valoare = document.getElementById(intrebare.id).value;
      if (!valoare) {
        setFeedback(intrebare.id, "gresit", "Alege o variantă.");
        return { scor: 0, punctaj };
      }
      const corect = valoare === intrebare.corect;
      setFeedback(
        intrebare.id,
        corect ? "corect" : "gresit",
        corect ? "Corect." : "Răspuns corect: " + intrebare.corect + "."
      );
      return { scor: corect ? punctaj : 0, punctaj };
    }

    if (intrebare.tip === "text-liber") {
      const valoare = document.getElementById(intrebare.id).value;
      const areText = valoare.trim().length > 0;

      if (intrebare.acceptaOriceRaspuns) {
        if (!areText) {
          setFeedback(intrebare.id, "gresit", intrebare.mesajGresit || "Scrie un răspuns.");
          return { scor: 0, punctaj };
        }
        setFeedback(intrebare.id, "corect", intrebare.mesajCorect || "Corect.");
        return { scor: punctaj, punctaj };
      }

      const cuvinteCheie = intrebare.cuvinteCheie || [];
      const areCuvantCheie = cuvinteCheie.some((cuvant) =>
        normalizeazaText(valoare).includes(normalizeazaText(cuvant))
      );

      if (areCuvantCheie) {
        setFeedback(intrebare.id, "corect", intrebare.mesajCorect || "Corect.");
        return { scor: punctaj, punctaj };
      }
      if (areText) {
        setFeedback(intrebare.id, "partial", intrebare.mesajPartial || "Răspuns parțial corect.");
        return { scor: punctaj * 0.5, punctaj };
      }
      setFeedback(intrebare.id, "gresit", intrebare.mesajGresit || "Scrie un răspuns.");
      return { scor: 0, punctaj };
    }

    return { scor: 0, punctaj };
  }

  function verificaTot(paginiDeContinut) {
    let scor = 0;
    let total = 0;
    const greseli = [];

    paginiDeContinut.forEach((pagina) => {
      if (pagina.tip !== "intrebari") return;
      (pagina.intrebari || []).forEach((intrebare) => {
        const rezultat = verificaIntrebare(intrebare);
        total += rezultat.punctaj;
        scor += rezultat.scor;

        if (rezultat.scor < rezultat.punctaj) {
          greseli.push({
            eticheta: etichetaIntrebare(intrebare),
            corectAsteptat: raspunsCorectText(intrebare),
            partial: rezultat.scor > 0
          });
        }
      });
    });

    const procent = total > 0 ? (scor / total) * 100 : 0;
    const nota = total > 0 ? (scor / total) * 10 : 0;

    const scorEl = document.getElementById("ws-scor");
    if (scorEl) {
      scorEl.innerHTML = `Scor: ${scor.toFixed(1)} / ${total.toFixed(1)}<br>Procent: ${procent.toFixed(0)}%<br>Nota orientativă: ${nota.toFixed(2)}`;
    }

    let mesaj;
    if (nota < 5) {
      mesaj = "Mai revezi noțiunile din această fișă.";
    } else if (nota < 8) {
      mesaj = "Bine. Mai exersează puțin.";
    } else {
      mesaj = "Foarte bine! Ai înțeles noțiunile din această fișă.";
    }
    const mesajEl = document.getElementById("ws-mesaj-final");
    if (mesajEl) mesajEl.textContent = mesaj;

    afiseazaRecapitulare(greseli);
  }

  // Afișează, la final, o listă cu ce a greșit (sau parțial greșit) elevul,
  // împreună cu răspunsul corect așteptat — ca să știe exact ce să revadă.
  function afiseazaRecapitulare(greseli) {
    const recapEl = document.getElementById("ws-greseli");
    if (!recapEl) return;

    if (greseli.length === 0) {
      recapEl.innerHTML = `<div class="notice" style="margin-top:16px;">Toate răspunsurile au fost corecte. Felicitări!</div>`;
      return;
    }

    const itemi = greseli
      .map(
        (g) => `
        <li style="margin:10px 0;">
          <span style="opacity:.85;">${escapeHtml(g.eticheta)}</span><br>
          <strong style="color:${g.partial ? "#fbbf24" : "#fb7185"};">
            ${g.partial ? "Parțial corect" : "Greșit"} — răspunsul corect: ${escapeHtml(String(g.corectAsteptat))}
          </strong>
        </li>`
      )
      .join("");

    recapEl.innerHTML = `
      <div class="warning" style="margin-top:16px; text-align:left;">
        <strong>De revăzut (${greseli.length} ${greseli.length === 1 ? "întrebare" : "întrebări"}):</strong>
        <ul style="margin-top:10px; padding-left:1.1em;">${itemi}</ul>
      </div>`;
  }

  function resetTot() {
    container.querySelectorAll('input[type="text"], textarea').forEach((el) => (el.value = ""));
    container.querySelectorAll('input[type="radio"]').forEach((el) => (el.checked = false));
    container.querySelectorAll("select").forEach((el) => (el.value = ""));
    container.querySelectorAll(".feedback").forEach((el) => {
      el.textContent = "";
      el.className = "feedback";
    });
    const scorEl = document.getElementById("ws-scor");
    const mesajEl = document.getElementById("ws-mesaj-final");
    const recapEl = document.getElementById("ws-greseli");
    if (scorEl) scorEl.textContent = "";
    if (mesajEl) mesajEl.textContent = "";
    if (recapEl) recapEl.innerHTML = "";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
}
