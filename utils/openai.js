const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embeddings for text
const generateEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
};

// Generate initial interview questions from job description
const generateInitialQuestions = async (jobDescription) => {
  try {
    const prompt = `Based on this job description, generate 3 relevant interview questions that would help assess a candidate's fit for this role. Make them specific and practical.

Job Description:
${jobDescription}

Return only the 3 questions, one per line, without numbering or additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
};

// Evaluate user response using RAG
const evaluateResponse = async (
  question,
  userResponse,
  resumeChunks,
  jobDescriptionChunks
) => {
  try {
    const context = `
Resume Information:
${resumeChunks
  .map((chunk, index) => `Chunk ${index + 1}: ${chunk.text}`)
  .join("\n\n")}

Job Description Information:
${jobDescriptionChunks
  .map((chunk, index) => `Chunk ${index + 1}: ${chunk.text}`)
  .join("\n\n")}

Question: ${question}
User Response: ${userResponse}

Please evaluate the user's response based on the resume and job description context. Provide:
1. A score from 1-10 (where 10 is excellent)
2. Specific feedback (max 100 words)
3. Mention relevant resume sections that support or contradict the response

Format your response as:
Score: [1-10]
Feedback: [your feedback here]
Relevant sections: [mention specific resume chunks that are relevant]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: context }],
      max_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error evaluating response:", error);
    throw error;
  }
};

module.exports = {
  generateEmbedding,
  generateInitialQuestions,
  evaluateResponse,
};
