/**
 * Keyword Extraction Service
 * Extracts relevant keywords from course content for YouTube search
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'as', 'if'
]);

/**
 * Extract keywords from course content
 * @param {Object} course - Course object with title, description, topics
 * @param {string} course.title - Course title
 * @param {string} course.description - Course description
 * @param {Array<string>} course.topics - Array of topic strings
 * @returns {Array<string>} - Filtered and ranked keywords
 */
function extractKeywords(course) {
  if (!course) return [];

  const { title = '', description = '', topics = [] } = course;
  
  // Combine all text sources
  const allText = [title, description, ...topics].join(' ').toLowerCase();
  
  // Remove special characters and split into words
  const words = allText
    .replace(/[^\w\s-]/g, ' ') // Remove special chars except hyphens
    .split(/\s+/)
    .filter(word => word.length > 3); // Only words longer than 3 chars
  
  // Calculate word frequencies
  const wordFreq = {};
  words.forEach(word => {
    // Skip stop words
    if (STOP_WORDS.has(word)) return;
    
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Extract nouns using simple pattern matching
  // Words that appear less frequently but are meaningful (adjectives, course topics)
  const titleWords = title
    .toLowerCase().match(/\b[a-z]+\b/g) || [];
  
  // Score calculation: prioritize title words and frequently occurring words
  const scoredKeywords = Object.entries(wordFreq)
    .map(([word, freq]) => {
      let score = freq;
      
      // Boost score if word is in title
      if (titleWords.includes(word)) {
        score *= 2;
      }
      
      // Boost technical/course-related words
      if (isCourseTerm(word)) {
        score *= 1.5;
      }
      
      return { word, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Top 10 keywords
    .map(item => item.word);
  
  return Array.from(new Set([
    ...titleWords.filter(w => !STOP_WORDS.has(w)).slice(0, 3),
    ...scoredKeywords
  ])).slice(0, 12);
}

/**
 * Check if a word is a course-related term
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function isCourseTerm(word) {
  const courseTerms = [
    'learn', 'course', 'tutorial', 'guide', 'training', 'class',
    'lesson', 'development', 'programming', 'design', 'business',
    'marketing', 'project', 'advanced', 'beginner', 'intermediate',
    'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack',
    'python', 'javascript', 'react', 'node', 'database', 'sql',
    'api', 'rest', 'graphql', 'framework', 'library', 'tool'
  ];
  
  return courseTerms.includes(word);
}

/**
 * Generate search queries from keywords
 * @param {Array<string>} keywords - Array of keywords
 * @param {string} courseTitle - Original course title for context
 * @returns {Array<string>} - Array of search queries
 */
function generateSearchQueries(keywords, courseTitle = '') {
  const queries = [];
  
  // Primary: full course title + first keyword
  if (courseTitle) {
    queries.push(courseTitle);
  }
  
  // Secondary: keyword pairs (technique + topic)
  for (let i = 0; i < keywords.length; i += 2) {
    if (keywords[i + 1]) {
      queries.push(`${keywords[i]} ${keywords[i + 1]}`);
    } else {
      queries.push(keywords[i]);
    }
  }
  
  // Tertiary: individual keywords
  queries.push(...keywords.slice(0, 5));
  
  // Remove duplicates and limit
  return Array.from(new Set(queries))
    .filter(q => q && q.trim())
    .slice(0, 8);
}

/**
 * Main function: analyze course and return search queries
 * @param {Object} course - Course object
 * @returns {Object} - Analysis result with keywords and queries
 */
function analyzeCourse(course) {
  const keywords = extractKeywords(course);
  const queries = generateSearchQueries(keywords, course.title);
  
  return {
    courseId: course.id,
    keywords: keywords.slice(0, 8),
    searchQueries: queries,
    extractedAt: new Date().toISOString()
  };
}

module.exports = {
  extractKeywords,
  generateSearchQueries,
  analyzeCourse,
  isCourseTerm
};
