// =========================================================
// Elemente DOM
// =========================================================
const canvas = document.getElementById("labCanvas");
const ctx = canvas.getContext("2d");

const angleRange = document.getElementById("angleRange");
const angleLabel = document.getElementById("angleLabel");
const incidenceVal = document.getElementById("incidenceVal");
const reflectionVal = document.getElementById("reflectionVal");

const showNormal = document.getElementById("showNormal");
const showAngles = document.getElementById("showAngles");
const showLabels = document.getElementById("showLabels");

const randomBtn = document.getElementById("randomBtn");
const resetBtn = document.getElementById("resetBtn");

const addRowBtn = document.getElementById("addRowBtn");
const dataTableBody = document.getElementById("dataTableBody");

const objectPoint = document.getElementById("objectPoint");
const imagePoint = document.getElementById("imagePoint");
const objectSlider = document.getElementById("objectSlider");

const checkQuizBtn = document.getElementById("checkQuizBtn");
const quizResult = document.getElementById("quizResult");

// Dimensiune logică a canvasului.
// CSS îl face responsive vizual, dar coordonatele rămân stabile.
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 460;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// =========================================================
// Funcții utilitare
// =========================================================

// Transformă gradele în radiani.
function degToRad(deg) {
  return deg * Math.PI / 180;
}

// Creează un pattern discret pentru gridul de fundal.
function createGridPattern() {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = 40;
  patternCanvas.height = 40;

  const pctx = patternCanvas.getContext("2d");
  pctx.strokeStyle = "rgba(148,163,184,0.08)";
  pctx.lineWidth = 1;

  pctx.beginPath();
  pctx.moveTo(39.5, 0);
  pctx.lineTo(39.5, 40);
  pctx.moveTo(0, 39.5);
  pctx.lineTo(40, 39.5);
  pctx.stroke();

  return ctx.createPattern(patternCanvas, "repeat");
}

const gridPattern = createGridPattern();

// Desenează arcul pentru unghiuri.
function drawArcLabel(cx, cy, radius, start, end, color, text) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.arc(cx, cy, radius, start, end, false);
  ctx.stroke();

  const mid = (start + end) / 2;
  const tx = cx + Math.cos(mid) * (radius + 18);
  const ty = cy + Math.sin(mid) * (radius + 18);

  ctx.fillStyle = color;
  ctx.font = "bold 18px Segoe UI";
  ctx.fillText(text, tx - 8, ty + 6);
}

// Desenează o săgeată între două puncte.
function drawArrow(x1, y1, x2, y2, color, label) {
  const head = 14;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(angle - Math.PI / 7),
    y2 - head * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 7),
    y2 - head * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  if (showLabels.checked && label) {
    ctx.fillStyle = color;
    ctx.font = "bold 18px Segoe UI";
    ctx.fillText(label, (x1 + x2) / 2 + 8, (y1 + y2) / 2 - 8);
  }
}

// =========================================================
// Desenul principal
// =========================================================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;
  const bx = w / 2;
  const by = h / 2;
  const mirrorX = bx;

  const angleDeg = Number(angleRange.value);
  const angle = degToRad(angleDeg);

  // Actualizare afișaj valori
  angleLabel.textContent = angleDeg + "°";
  incidenceVal.textContent = angleDeg + "°";
  reflectionVal.textContent = angleDeg + "°";

  // Grid de fundal
  if (gridPattern) {
    ctx.save();
    ctx.fillStyle = gridPattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Oglinda plană
  ctx.beginPath();
  ctx.moveTo(mirrorX, 40);
  ctx.lineTo(mirrorX, h - 40);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Efect vizual de margine
  ctx.beginPath();
  ctx.moveTo(mirrorX + 6, 40);
  ctx.lineTo(mirrorX + 6, h - 40);
  ctx.strokeStyle = "rgba(56,189,248,.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Normala
  if (showNormal.checked) {
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(80, by);
    ctx.lineTo(w - 80, by);
    ctx.strokeStyle = "rgba(148,163,184,.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    if (showLabels.checked) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 17px Segoe UI";
      ctx.fillText("normală", w - 150, by - 10);
    }
  }

  // Punctul de incidență
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // În desen, normala este orizontală, iar unghiul este măsurat față de normală
  const len = 230;

  const incStartX = bx - Math.cos(angle) * len;
  const incStartY = by - Math.sin(angle) * len;

  const refEndX = bx - Math.cos(angle) * len;
  const refEndY = by + Math.sin(angle) * len;

  drawArrow(incStartX, incStartY, bx, by, "#38bdf8", "raza incidentă");
  drawArrow(bx, by, refEndX, refEndY, "#f59e0b", "raza reflectată");

  if (showAngles.checked) {
    drawArcLabel(bx, by, 48, Math.PI, Math.PI + angle, "#38bdf8", "i");
    drawArcLabel(bx, by, 64, Math.PI - angle, Math.PI, "#f59e0b", "r");
  }

  if (showLabels.checked) {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 18px Segoe UI";
    ctx.fillText("oglindă plană", bx - 48, 28);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("P", bx + 10, by - 10);
  }
}

// =========================================================
// Imaginea în oglindă plană
// =========================================================
function updateMirror() {
  const objPercent = Number(objectSlider.value);
  const imgPercent = 100 - objPercent;

  objectPoint.style.left = objPercent + "%";
  imagePoint.style.left = imgPercent + "%";
}

// =========================================================
// Tabel observații
// =========================================================
function addTableRow() {
  const rowCount = dataTableBody.querySelectorAll("tr").length + 1;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td contenteditable="true"></td>
    <td contenteditable="true"></td>
    <td contenteditable="true"></td>
  `;

  dataTableBody.appendChild(tr);
}

// =========================================================
// Quiz
// =========================================================
function checkQuiz() {
  const answers = [
    document.querySelector('input[name="q1"]:checked'),
    document.querySelector('input[name="q2"]:checked'),
    document.querySelector('input[name="q3"]:checked')
  ];

  let score = 0;

  answers.forEach((answer) => {
    if (answer && answer.value === "corect") {
      score++;
    }
  });

  quizResult.style.display = "block";

  if (score === 3) {
    quizResult.innerHTML =
      "<strong>Bravo!</strong> Ai obținut 3/3. Se vede că lumina nu te-a prins pe nepregătite.";
  } else if (score === 2) {
    quizResult.innerHTML =
      "<strong>Foarte bine!</strong> Ai obținut 2/3. Mai verifică puțin teoria și ești gata.";
  } else if (score === 1) {
    quizResult.innerHTML =
      "<strong>Ai obținut 1/3.</strong> Recitește legile reflexiei și încearcă din nou.";
  } else {
    quizResult.innerHTML =
      "<strong>Ai obținut 0/3.</strong> Nicio problemă: în laborator greșelile sunt pași spre învățare.";
  }
}

// =========================================================
// Evenimente
// =========================================================
angleRange.addEventListener("input", draw);
showNormal.addEventListener("change", draw);
showAngles.addEventListener("change", draw);
showLabels.addEventListener("change", draw);

randomBtn.addEventListener("click", () => {
  angleRange.value = Math.floor(Math.random() * 81);
  draw();
});

resetBtn.addEventListener("click", () => {
  angleRange.value = 30;
  showNormal.checked = true;
  showAngles.checked = true;
  showLabels.checked = true;
  draw();
});

addRowBtn.addEventListener("click", addTableRow);
objectSlider.addEventListener("input", updateMirror);
checkQuizBtn.addEventListener("click", checkQuiz);

window.addEventListener("resize", draw);
window.addEventListener("orientationchange", () => setTimeout(draw, 200));

// =========================================================
// Inițializare
// =========================================================
updateMirror();
draw();
