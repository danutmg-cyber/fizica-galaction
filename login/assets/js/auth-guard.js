// auth-guard.js — Fizica Galaction
// Protejează o pagină: cere autentificare și, opțional, un rol minim.
//
// Folosire — adaugă pe orice pagină ce trebuie protejată, DUPĂ auth.js:
//
//   <script src="../assets/js/auth-guard.js" data-rol-necesar="profesor"></script>
//
// data-rol-necesar poate lipsi (înseamnă: orice utilizator autentificat, indiferent de rol)
// sau poate fi "elev", "profesor" ori "admin". Ierarhia: admin > profesor > elev,
// deci un admin poate accesa și pagini marcate "profesor" sau "elev".
//
// Pagina e ascunsă (visibility: hidden) până se confirmă accesul, ca să nu
// se vadă o secundă conținutul înainte de eventualul redirect.

(function () {
  const scriptTag = document.currentScript;
  const rolNecesar = scriptTag ? scriptTag.dataset.rolNecesar : null;
  const paginaLogin = scriptTag && scriptTag.dataset.paginaLogin
    ? scriptTag.dataset.paginaLogin
    : "/login/index.html";

  document.documentElement.style.visibility = "hidden";

  function permite() {
    document.documentElement.style.visibility = "visible";
  }

  function respinge(motiv) {
    console.warn("Acces respins:", motiv);
    window.location.href = paginaLogin;
  }

  onSchimbareAutentificare((info) => {
    if (!info) {
      respinge("neautentificat");
      return;
    }

    if (!rolNecesar) {
      permite();
      return;
    }

    const ierarhie = { elev: 1, profesor: 2, admin: 3 };
    const nivelUtilizator = ierarhie[info.rol] || 0;
    const nivelNecesar = ierarhie[rolNecesar] || 0;

    if (nivelUtilizator < nivelNecesar) {
      alert("Nu ai drepturile necesare pentru a accesa această pagină.");
      window.location.href = "/index.html";
      return;
    }

    permite();
  });
})();
