import type { QuizQuestion, QuizQuestionResult } from '@/types';

interface TextEvaluationResult {
  isCorrect: boolean;
  score: number;
  reason: string;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) => normalize(value).split(' ').filter(Boolean);

const jaccardSimilarity = (left: string[], right: string[]) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  if (union === 0) return 0;
  return intersection / union;
};

const includesAnyWholeTokenSequence = (answer: string, patterns: string[]) => {
  const normalizedAnswer = normalize(answer);
  return patterns.some((pattern) => {
    const normalizedPattern = normalize(pattern);
    if (!normalizedPattern) return false;
    return (` ${normalizedAnswer} `).includes(` ${normalizedPattern} `);
  });
};

const evaluateTextAnswer = (
  answer: string,
  modelAnswer: string,
  acceptedAnswers: string[],
  requiredKeywords: string[]
): TextEvaluationResult => {
  const normalizedAnswer = normalize(answer);
  if (!normalizedAnswer) {
    return { isCorrect: false, score: 0, reason: 'Answer is empty.' };
  }

  const allAccepted = [modelAnswer, ...acceptedAnswers].filter(Boolean);
  if (includesAnyWholeTokenSequence(normalizedAnswer, allAccepted)) {
    return { isCorrect: true, score: 1, reason: 'Exact/accepted answer matched.' };
  }

  const answerTokens = tokenize(normalizedAnswer);
  const modelTokens = tokenize(modelAnswer || acceptedAnswers[0] || '');
  const semanticSimilarity = jaccardSimilarity(answerTokens, modelTokens);

  const keywordList = requiredKeywords.filter(Boolean).map(normalize);
  const matchedKeywords = keywordList.filter((keyword) =>
    (` ${normalizedAnswer} `).includes(` ${keyword} `)
  ).length;
  const keywordCoverage = keywordList.length > 0 ? matchedKeywords / keywordList.length : 0;

  const weightedScore = keywordList.length > 0
    ? (semanticSimilarity * 0.5) + (keywordCoverage * 0.5)
    : semanticSimilarity;

  const passesSemantic = semanticSimilarity >= 0.35;
  const passesKeywords = keywordList.length === 0 ? true : keywordCoverage >= 0.5;
  const isCorrect = passesSemantic && passesKeywords;

  return {
    isCorrect,
    score: Number(weightedScore.toFixed(2)),
    reason: isCorrect
      ? 'Related answer accepted by semantic + keyword checks.'
      : 'Answer did not meet similarity/keyword threshold.',
  };
};

export const evaluateQuizQuestion = (question: QuizQuestion, answer: string): QuizQuestionResult => {
  if (question.type === 'mcq') {
    const selectedIndex = Number(answer);
    const isCorrect = Number.isInteger(selectedIndex) && selectedIndex === question.correctOptionIndex;
    return {
      questionId: question.id,
      answer,
      isCorrect,
      score: isCorrect ? question.marks : 0,
      maxScore: question.marks,
      reason: isCorrect ? 'Correct option selected.' : 'Incorrect option selected.',
    };
  }

  const evaluation = evaluateTextAnswer(
    answer,
    question.modelAnswer || '',
    question.acceptedAnswers || [],
    question.requiredKeywords || []
  );

  return {
    questionId: question.id,
    answer,
    isCorrect: evaluation.isCorrect,
    score: Math.round(question.marks * evaluation.score),
    maxScore: question.marks,
    reason: evaluation.reason,
  };
};
