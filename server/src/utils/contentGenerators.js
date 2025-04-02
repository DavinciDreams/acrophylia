/**
 * Content generators for different game types
 */
const { generateLetters } = require('./gameLogic');
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client with fallback for missing API key
let openaiClient = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('OpenAI client initialized successfully');
  } else {
    console.warn('OPENAI_API_KEY not found in environment variables. Using fallback content generation.');
  }
} catch (error) {
  console.error('Error initializing OpenAI client:', error.message);
}

/**
 * Call LLM (OpenAI) with a prompt
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The response from the LLM
 */
async function callLLM(prompt) {
  // If OpenAI client is not available, use fallback
  if (!openaiClient) {
    console.log('Using fallback response for prompt:', prompt);
    return getFallbackResponse(prompt);
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a creative assistant helping generate content for a game.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return getFallbackResponse(prompt);
  }
}

/**
 * Get a fallback response when OpenAI is not available
 * @param {string} prompt - The original prompt
 * @returns {string} - A fallback response
 */
function getFallbackResponse(prompt) {
  // Movie title fallbacks
  if (prompt.includes('movie title')) {
    const titles = [
      'The Last Horizon', 'Whispers in the Dark', 'Eternal Echoes',
      'Midnight Runners', 'The Silent Guardian', 'Lost in Translation',
      'Beyond the Stars', 'The Forgotten Path', 'Shadows of Tomorrow'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
  
  // Category fallbacks
  if (prompt.includes('category')) {
    const categories = [
      'Animals', 'Space', 'Technology', 'Food', 'Sports', 'Music',
      'Movies', 'Travel', 'History', 'Science', 'Art', 'Nature'
    ];
    return categories[Math.floor(Math.random() * categories.length)];
  }
  
  // Acronym phrase fallbacks
  if (prompt.includes('acronym')) {
    return 'Creative Acronym Phrase';
  }
  
  // Historical event fallbacks
  if (prompt.includes('historical event')) {
    return 'A remarkable discovery changed how historians viewed this period.';
  }
  
  // Movie plot fallbacks
  if (prompt.includes('movie plot')) {
    return 'An unlikely hero must overcome personal challenges to save their community from an impending disaster.';
  }
  
  return 'Fallback response';
}

/**
 * Generate a random date between 1800 and 2010
 * @returns {string} - Formatted date string (e.g., "January 1, 1900")
 */
function generateRandomDate() {
  const start = new Date(1800, 0, 1);
  const end = new Date(2010, 11, 31);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Generate a random movie title using LLM
 * @returns {Promise<string>} - A fictional movie title
 */
async function generateMovieTitle() {
  const prompt = 'Generate a fictional but plausible movie title (3-6 words). Return only the title, no explanation.';
  try {
    return await callLLM(prompt);
  } catch (error) {
    console.error('Movie title generation error:', error);
    return 'The Unexpected Journey';
  }
}

/**
 * Generate a category for acronyms
 * @returns {Promise<string>} - A category name
 */
async function generateCategory() {
  const prompt = 'Generate a single-word category for an acronym game (e.g., "Space", "Animals", "Tech"). Return only the word, no explanation.';
  try {
    const category = await callLLM(prompt);
    return category;
  } catch (error) {
    console.error('Category generation error:', error);
    return 'Random';
  }
}

/**
 * Generate content based on game type
 * @param {string} gameType - The type of game ('acronym', 'date', or 'movie')
 * @param {number} round - The current round number
 * @returns {Promise<Object>} - Content and category for the round
 */
async function generateContent(gameType, round) {
  switch (gameType) {
    case 'acronym':
      return {
        content: generateLetters(round),
        category: await generateCategory(),
        type: 'acronym'
      };
    case 'date':
      return {
        content: generateRandomDate(),
        category: 'Historical Event',
        type: 'date'
      };
    case 'movie':
      return {
        content: await generateMovieTitle(),
        category: 'Movie Plot',
        type: 'movie'
      };
    default:
      // Default to acronym if invalid type
      return {
        content: generateLetters(round),
        category: await generateCategory(),
        type: 'acronym'
      };
  }
}

/**
 * Generate bot submission based on game type
 * @param {string} gameType - The type of game
 * @param {*} content - The content to base submission on
 * @param {string} category - The category for the submission
 * @returns {Promise<string>} - Bot's submission
 */
async function generateBotSubmission(gameType, content, category) {
  let prompt;
  
  switch (gameType) {
    case 'acronym':
      prompt = `Generate a creative acronym phrase using the letters ${content.join(', ')} for the category "${category}". Return only the phrase, no explanation.`;
      break;
    case 'date':
      prompt = `Create a fictional but plausible historical event that happened on "${content}" that sounds believable. Return only the event, no explanation.`;
      break;
    case 'movie':
      prompt = `Write a brief, creative movie plot summary (1-2 sentences) for a movie titled "${content}". Return only the plot summary, no explanation.`;
      break;
    default:
      prompt = `Generate a creative response for "${content}" in the category "${category}". Return only your response, no explanation.`;
  }

  try {
    return await callLLM(prompt);
  } catch (error) {
    console.error('Bot submission generation error:', error);
    
    // Fallback responses based on game type
    if (gameType === 'acronym' && Array.isArray(content)) {
      const words = {
        'A': 'Amazing', 'B': 'Beautiful', 'C': 'Creative', 'D': 'Delightful',
        'E': 'Elegant', 'F': 'Fantastic', 'G': 'Great', 'H': 'Happy',
        'I': 'Incredible', 'J': 'Jolly', 'K': 'Kind', 'L': 'Lovely',
        'M': 'Magnificent', 'N': 'Nice', 'O': 'Outstanding', 'P': 'Perfect',
        'Q': 'Quick', 'R': 'Remarkable', 'S': 'Super', 'T': 'Terrific',
        'U': 'Unique', 'V': 'Vibrant', 'W': 'Wonderful', 'X': 'Xcellent',
        'Y': 'Young', 'Z': 'Zealous'
      };
      return content.map(letter => words[letter] || `${letter}ot`).join(' ');
    } else if (gameType === 'date') {
      return `On ${content}, an unexpected discovery changed how historians viewed this period.`;
    } else if (gameType === 'movie') {
      return `"${content}" follows the journey of an unlikely hero who must overcome personal challenges while saving their community from disaster.`;
    }
    
    return 'Bot submission';
  }
}

module.exports = {
  generateContent,
  generateBotSubmission,
  callLLM
};
