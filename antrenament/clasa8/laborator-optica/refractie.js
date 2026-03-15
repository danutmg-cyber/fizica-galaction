// =========================================================
// Elemente DOM
// =========================================================
const canvas = document.getElementById("labCanvas");
const ctx = canvas.getContext("2d");

const angleRange = document.getElementById("angleRange");
const angleLabel = document.getElementById("angleLabel");
const incidenceVal = document.getElementById("incidenceVal");
const refractionVal = document.getElementById("refractionVal");
const conclusionVal = document.getElementById("conclusionVal");

const mediumSelect = document.getElementById("mediumSelect");

const showNormal = document.getElementById("showNormal");
const showAngles = document.getElementById("showAngles");
const showLabels = document.getElementById("showLabels");

const randomBtn = document.getElementById("randomBtn");
const resetBtn = document.getElementById("resetBtn");

const addRowBtn = document.getElementById("addRowBtn");
const dataTableBody = document.getElementById("dataTableBody");

const pencilTop = document.getElementById("pencilTop");
const pencilBottom = document.getElementById("pencilBottom");
const pencilSlider = document.getElementById("pencilSlider");

const checkQuizBtn = document.getElementById("checkQuizBtn");
const quizResult = document.getElementById("quizResult");

// Dimensiuni logice pentru canvas
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 460;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// =========================================================
// Funcții utilitare
// =========================================================
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function normalizeAngle(angle) {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}

// Creează pattern discret pentru fundal
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

// Desenează o săgeată între două puncte
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

// Desenează un arc pentru unghi și eticheta lui
// anticlockwise = true => sens trigonometric
function drawArcLabel(
  cx,
  cy,
  radius,
  start,
  end,
  color,
  text,
  anticlockwise = false
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.arc(cx, cy, radius, start, end, anticlockwise);
  ctx.stroke();

  const twoPi = 2 * Math.PI;
  let startNorm = normalizeAngle(start);
  let endNorm = normalizeAngle(end);
  let mid;

  if (!anticlockwise) {
    if (endNorm < startNorm) {
      endNorm += twoPi;
    }
    mid = (startNorm + endNorm) / 2;
  } else {
    if (startNorm < endNorm) {
      startNorm += twoPi;
    }
    mid = (startNorm + endNorm) / 2;
  }

  const tx = cx + Math.cos(mid) * (radius + 18);
  const ty = cy + Math.sin(mid) * (radius + 18);

  ctx.fillStyle = color;
  ctx.font = "bold 18px Segoe UI";
  ctx.fillText(text, tx - 8, ty + 6);
}

function getMediumLabel() {
  const n2 = Number(mediumSelect.value);

  if (n2 === 1.33) return "apă";
  if (n2 === 1.5) return "sticlă";
  return "diamant";
}

// =========================================================
// Simulator principal – refracția luminii
// =========================================================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  const iDeg = Number(angleRange.value);
  const iRad = degToRad(iDeg);

  // Indicii de refracție
  const n1 = 1.0; // aer
  const n2 = Number(mediumSelect.value);

  // Legea refracției: n1 * sin(i) = n2 * sin(r)
  let sinR = (n1 / n2) * Math.sin(iRad);
  sinR = Math.max(-1, Math.min(1, sinR));

  const rRad = Math.asin(sinR);
  const rDeg = radToDeg(rRad);

  // Actualizare valori afișate
  angleLabel.textContent = iDeg + "°";
  incidenceVal.textContent = iDeg + "°";
  refractionVal.textContent = rDeg.toFixed(1) + "°";
  conclusionVal.textContent = rDeg < iDeg ? "spre normală" : "departe de normală";

  // Grid de fundal
  if (gridPattern) {
    ctx.save();
    ctx.fillStyle = gridPattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Medii: sus = aer, jos = mediul 2
  ctx.fillStyle = "rgba(125, 211, 252, 0.04)";
  ctx.fillRect(0, 0, w, cy);

  ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
  ctx.fillRect(0, cy, w, h - cy);

  // Suprafața de separare
  ctx.beginPath();
  ctx.moveTo(40, cy);
  ctx.lineTo(w - 40, cy);
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Normala
  if (showNormal.checked) {
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(cx, 40);
    ctx.lineTo(cx, h - 40);
    ctx.strokeStyle = "rgba(148,163,184,.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    if (showLabels.checked) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 17px Segoe UI";
      ctx.fillText("normală", cx + 12, 58);
    }
  }

  // Punctul de incidență
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const lenIncident = 190;
  const lenRefracted = 190;

  // Raza incidentă: din stânga sus spre punct
  const incStartX = cx - Math.sin(iRad) * lenIncident;
  const incStartY = cy - Math.cos(iRad) * lenIncident;

  // Raza refractată: în jos-dreapta
  const refrEndX = cx + Math.sin(rRad) * lenRefracted;
  const refrEndY = cy + Math.cos(rRad) * lenRefracted;

  drawArrow(incStartX, incStartY, cx, cy, "#38bdf8", "raza incidentă");
  drawArrow(cx, cy, refrEndX, refrEndY, "#f59e0b", "raza refractată");

  if (showAngles.checked) {
    // Unghiul de incidență
    drawArcLabel(
      cx,
      cy,
      48,
      -Math.PI / 2 - iRad,
      -Math.PI / 2,
      "#38bdf8",
      "i"
    );

    // Unghiul de refracție:
    // pornim de la normala de jos și mergem în sens trigonometric
    // spre raza refractată
    drawArcLabel(
      cx,
      cy,
      64,
      Math.PI / 2,
      Math.PI / 2 - rRad,
      "#f59e0b",
      "r",
      true
    );
  }

  if (showLabels.checked) {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 18px Segoe UI";
    ctx.fillText("aer", 60, 40);
    ctx.fillText(getMediumLabel(), 60, h - 26);

    // Mutat mai la stânga
    ctx.fillText("suprafață de separare", cx - 180, cy - 12);

    ctx.fillText("P", cx + 10, cy - 10);
  }
}

// =========================================================
// Iluzia creionului în apă
// =========================================================
function updatePencil() {
  const shift = Number(pencilSlider.value);
  const refractionOffset = 4;

  pencilTop.style.transform = `translateX(calc(-50% + ${shift}px)) rotate(23deg)`;
  pencilBottom.style.transform = `translateX(calc(-50% + ${shift + refractionOffset}px)) rotate(21deg)`;
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
      "<strong>Bravo!</strong> Ai obținut 3/3. Ai înțeles foarte bine refracția luminii.";
  } else if (score === 2) {
    quizResult.innerHTML =
      "<strong>Foarte bine!</strong> Ai obținut 2/3. Mai recitește puțin și ești gata.";
  } else if (score === 1) {
    quizResult.innerHTML =
      "<strong>Ai obținut 1/3.</strong> Reia ideea cu apropierea de normală și încearcă din nou.";
  } else {
    quizResult.innerHTML =
      "<strong>Ai obținut 0/3.</strong> Nicio problemă. Refracția pare complicată doar la început.";
  }
}

// =========================================================
// Evenimente
// =========================================================
angleRange.addEventListener("input", draw);
mediumSelect.addEventListener("change", draw);

showNormal.addEventListener("change", draw);
showAngles.addEventListener("change", draw);
showLabels.addEventListener("change", draw);

randomBtn.addEventListener("click", () => {
  angleRange.value = Math.floor(Math.random() * 75) + 5;
  draw();
});

resetBtn.addEventListener("click", () => {
  angleRange.value = 40;
  mediumSelect.value = "1.33";
  showNormal.checked = true;
  showAngles.checked = true;
  showLabels.checked = true;
  draw();
});

pencilSlider.addEventListener("input", updatePencil);
addRowBtn.addEventListener("click", addTableRow);
checkQuizBtn.addEventListener("click", checkQuiz);

window.addEventListener("resize", draw);
window.addEventListener("orientationchange", () => setTimeout(draw, 200));

// =========================================================
// Inițializare
// =========================================================
updatePencil();
draw();
