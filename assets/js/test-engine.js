<script>
  window.TEST_CONFIG = {
    id: "energia-mecanica-test",

    questionCount: 3,

    shuffleQuestions: true,
    shuffleOptions: true,

    questions: [
      {
        id: "q1",
        type: "choice",
        prompt: "Care este formula energiei cinetice?",
        options: [
          {
            value: "a",
            label: String.raw`\(E_c = \frac{mv^2}{2}\)`
          },
          {
            value: "b",
            label: String.raw`\(E_p = mgh\)`
          },
          {
            value: "c",
            label: String.raw`\(L = F \cdot d\)`
          }
        ],
        correctAnswer: "a",
        topic: "Energia cinetică",
        explanation:
          "Energia cinetică depinde de masă și de pătratul vitezei.",
        formula: String.raw`
          \[
            E_c = \frac{mv^2}{2}
          \]
        `
      },

      {
        id: "q2",
        type: "boolean",
        prompt:
          "Energia potențială gravitațională depinde de înălțime.",
        correctAnswer: true,
        topic: "Energia potențială"
      },

      {
        id: "q3",
        type: "numeric",
        prompt: String.raw`
          Un corp are masa \(m = 2\,kg\) și viteza
          \(v = 4\,m/s\). Calculează energia cinetică.
        `,
        correctAnswer: 16,
        tolerance: 0.15,
        unit: "J",
        topic: "Energia cinetică",
        explanation:
          "Înlocuim masa și viteza în formula energiei cinetice.",
        formula: String.raw`
          \[
            E_c =
            \frac{2 \cdot 4^2}{2}
            = 16\,J
          \]
        `
      }
    ]
  };
</script>
