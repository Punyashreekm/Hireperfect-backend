// Calculate cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

// Find most similar chunks using cosine similarity
const findSimilarChunks = (queryEmbedding, chunks, topK = 2) => {
  const similarities = chunks.map((chunk, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    chunk,
  }));

  // Sort by similarity (descending) and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map((item) => item.chunk);
};

module.exports = {
  cosineSimilarity,
  findSimilarChunks,
};
