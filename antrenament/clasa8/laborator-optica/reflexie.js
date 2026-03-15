// =========================================================
// Elemente DOM folosite în această versiune
// GeoGebra înlocuiește simulatorul canvas.
// JS rămâne pentru: creion, tabel, quiz.
// =========================================================
const addRowBtn = document.getElementById("addRowBtn");
const dataTableBody = document.getElementById("dataTableBody");

const pencilTop = document.getElementById("pencilTop");
const pencilBottom = document.getElementById("pencilBottom");
const pencilSlider = document.getElementById("pencilSlider");

const checkQuizBtn = document.getElementById("checkQuizBtn");
const quizResult = document.getElementById("quizResult");

// =========================================================
// Iluzia creionului în apă
// Efect discret, realist
// =========================================================
function updatePencil() {
  const shift = Number(pencilSlider.value);
  const refractionOffset = 4;

  pencilTop.style.transform = `translateX(calc(-50% + ${shift}px)) rotate(23deg)`;
  pencilBottom.style.transform = `translateX(calc(-50% + ${shift + refractionOffset}px)) rotate(21deg)`;
}

// =========================================================
// Tabel de observații
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
if (pencilSlider) {
  pencilSlider.addEventListener("input", updatePencil);
}

if (addRowBtn) {
  addRowBtn.addEventListener("click", addTableRow);
}

if (checkQuizBtn) {
  checkQuizBtn.addEventListener("click", checkQuiz);
}

// =========================================================
// Inițializare
// =========================================================
updatePencil();
