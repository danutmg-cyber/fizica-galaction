from pathlib import Path

content = r"""# Scripturile platformei Fizica Galaction

Acest director conține modulele JavaScript comune folosite de lecții, fișe de lucru, teste, laborator, navigare, progres și elementele generale ale platformei.

> Scopul principal este evitarea duplicării codului în paginile HTML și folosirea acelorași reguli de funcționare pe telefon, tabletă și calculator.

---

## Cuprins

- [Fișiere](#fișiere)
- [Ordinea recomandată de încărcare](#ordinea-recomandată-de-încărcare)
- [Inițializarea aplicației](#inițializarea-aplicației)
- [lesson-viewer.js](#lesson-viewerjs)
- [worksheet-engine.js](#worksheet-enginejs)
- [test-engine.js](#test-enginejs)
- [progress.js](#progressjs)
- [navigation.js](#navigationjs)
- [theme-toggle.js](#theme-togglejs)
- [Componente comune](#componente-comune)
- [Convenții JavaScript](#convenții-javascript)
- [Evenimente personalizate](#evenimente-personalizate)
- [Accesibilitate](#accesibilitate)
- [Depanare](#depanare)
- [Checklist pentru un script nou](#checklist-pentru-un-script-nou)

---

## Fișiere

| Fișier | Rol |
|---|---|
| `app.js` | Inițializează modulele platformei în funcție de tipul paginii |
| `lesson-viewer.js` | Afișează lecțiile pe pagini și gestionează navigarea |
| `worksheet-engine.js` | Generează și verifică fișe interactive |
| `test-engine.js` | Gestionează teste, itemi, scor și rezultat final |
| `progress.js` | Salvează și citește progresul elevului |
| `navigation.js` | Rezolvă rutele și navigarea între pagini |
| `theme-toggle.js` | Gestionează tema luminoasă și întunecată |
| `lab-engine.js` | Gestionează activități și simulări de laborator |
| `load-header.js` | Încarcă antetul comun |
| `load-footer.js` | Încarcă subsolul comun |
| `utils.js` | Funcții utilitare reutilizabile |
| `visitor-counter.js` | Gestionează contorul de vizitatori |
| `README.md` | Documentația acestui director |

---

## Ordinea recomandată de încărcare

Modulele trebuie încărcate înainte de `app.js`.

```html
<script src="../../../assets/js/navigation.js"></script>
<script src="../../../assets/js/theme-toggle.js"></script>
<script src="../../../assets/js/progress.js"></script>
<script src="../../../assets/js/lesson-viewer.js"></script>

<script src="../../../assets/data/lectii/lectia-curenta.js"></script>

<script src="../../../assets/js/app.js"></script>
