const Exam = require("../models/Exam");

const mcq = (prompt, options, correctOptionId) => ({
  prompt,
  questionType: "mcq",
  options,
  correctOptionId,
});

const scenario = (prompt) => ({
  prompt,
  questionType: "scenario",
  options: [],
});

const coding = (prompt, language, starterCode) => ({
  prompt,
  questionType: "coding",
  options: [],
  codingMeta: {
    language,
    starterCode,
    expectedApproach: "Use a clean and optimized approach with proper edge-case handling.",
  },
});

const defaultExams = [
  {
    title: "Aptitude Fundamentals",
    category: "Soft Skills",
    subCategory: "Aptitude",
    description: "Numerical and logical aptitude assessment.",
    durationMinutes: 30,
    supportsCoding: false,
    questions: [
      mcq("If 15% of x is 45, what is x?", [{ id: "a", text: "300" }, { id: "b", text: "150" }, { id: "c", text: "45" }, { id: "d", text: "225" }], "a"),
      mcq("Find the next number: 2, 6, 12, 20, ?", [{ id: "a", text: "28" }, { id: "b", text: "30" }, { id: "c", text: "36" }, { id: "d", text: "40" }], "b"),
      scenario("You have three urgent tasks due at the same time. Explain your prioritization approach."),
    ],
  },
  {
    title: "Verbal Reasoning Essentials",
    category: "Soft Skills",
    subCategory: "Verbal Reasoning",
    description: "Tests language clarity and reasoning.",
    durationMinutes: 30,
    supportsCoding: false,
    questions: [
      mcq("Choose the antonym of 'concise'.", [{ id: "a", text: "brief" }, { id: "b", text: "verbose" }, { id: "c", text: "clear" }, { id: "d", text: "exact" }], "b"),
      scenario("A client misunderstood your email. Draft a concise corrective response."),
      mcq("Pick the best sentence: ", [{ id: "a", text: "Each of the players have arrived." }, { id: "b", text: "Each of the players has arrived." }, { id: "c", text: "Each of the player has arrived." }, { id: "d", text: "Each players has arrived." }], "b"),
    ],
  },
  {
    title: "Java Developer Assessment",
    category: "IT",
    subCategory: "Java",
    description: "Core Java + problem solving.",
    durationMinutes: 30,
    supportsCoding: true,
    questions: [
      mcq("Which collection does not allow duplicates?", [{ id: "a", text: "List" }, { id: "b", text: "Set" }, { id: "c", text: "Queue" }, { id: "d", text: "ArrayList" }], "b"),
      coding("Write a Java method to reverse a string without using built-in reverse.", "java", "public String reverse(String s) {\n  // TODO\n}"),
      scenario("How would you improve performance in a Java service with high GC pauses?"),
    ],
  },
  {
    title: "Python Developer Assessment",
    category: "IT",
    subCategory: "Python",
    description: "Python fundamentals + coding.",
    durationMinutes: 30,
    supportsCoding: true,
    questions: [
      mcq("What is the output type of `{'a': 1}.keys()` in Python 3?", [{ id: "a", text: "list" }, { id: "b", text: "tuple" }, { id: "c", text: "dict_keys" }, { id: "d", text: "set" }], "c"),
      coding("Write a Python function to return the first non-repeating character.", "python", "def first_non_repeating(s: str):\n    # TODO\n    pass"),
      scenario("Explain how you would structure exception handling in a REST API."),
    ],
  },
  {
    title: "JavaScript Developer Assessment",
    category: "IT",
    subCategory: "JavaScript",
    description: "JavaScript knowledge + coding.",
    durationMinutes: 30,
    supportsCoding: true,
    questions: [
      mcq("Which method creates a new array with all elements passing a test?", [{ id: "a", text: "map" }, { id: "b", text: "filter" }, { id: "c", text: "reduce" }, { id: "d", text: "forEach" }], "b"),
      coding("Implement debounce(fn, wait) in JavaScript.", "javascript", "function debounce(fn, wait) {\n  // TODO\n}"),
      scenario("A page is slow due to heavy re-renders. How do you diagnose and fix it?"),
    ],
  },
  {
    title: "MBA Finance Assessment",
    category: "MBA",
    subCategory: "Finance",
    description: "Financial analysis fundamentals.",
    durationMinutes: 30,
    supportsCoding: false,
    questions: [
      mcq("NPV stands for:", [{ id: "a", text: "Net Present Value" }, { id: "b", text: "New Profit Value" }, { id: "c", text: "Net Profit Variable" }, { id: "d", text: "None" }], "a"),
      scenario("A project has high ROI but high volatility. Explain your recommendation."),
      mcq("Which ratio measures short-term liquidity?", [{ id: "a", text: "Current ratio" }, { id: "b", text: "Debt-to-equity" }, { id: "c", text: "ROE" }, { id: "d", text: "P/E" }], "a"),
    ],
  },
  {
    title: "MBA Analytics Assessment",
    category: "MBA",
    subCategory: "Analytics",
    description: "Business analytics reasoning.",
    durationMinutes: 30,
    supportsCoding: false,
    questions: [
      mcq("Which chart is best for trend over time?", [{ id: "a", text: "Pie chart" }, { id: "b", text: "Line chart" }, { id: "c", text: "Scatter plot" }, { id: "d", text: "Histogram" }], "b"),
      scenario("Sales dropped 15% quarter-over-quarter. How do you investigate root causes?"),
      mcq("A/B testing primarily helps in:", [{ id: "a", text: "Causal inference" }, { id: "b", text: "Data cleaning" }, { id: "c", text: "ETL" }, { id: "d", text: "None" }], "a"),
    ],
  },
];

const seedDefaultExams = async () => {
  const existing = await Exam.countDocuments();
  if (existing > 0) return;
  await Exam.insertMany(defaultExams);
};

module.exports = { seedDefaultExams };
