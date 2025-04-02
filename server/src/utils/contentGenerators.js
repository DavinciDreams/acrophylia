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
// Generate a random obscure word
async function generateObscureWord() {
  try {
    const prompt = 'Give me one obscure English word that most people wouldn\'t know. Just return the word and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating obscure word:', error);
    return 'Quixotic'; // Fallback word
  }
}

// Generate a random historical person
async function generateHistoricalPerson() {
  try {
    const prompt = 'Give me the name of an obscure historical figure that most people wouldn\'t know. Just return the name and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating historical person:', error);
    return 'Ignaz Semmelweis'; // Fallback person
  }
}

// Generate random initials (2-5 letters)
function generateInitials() {
  const length = Math.floor(Math.random() * 4) + 2; // 2-5 letters
  let initials = '';
  for (let i = 0; i < length; i++) {
    initials += String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  }
  return initials;
}

// Generate a random strange law
async function generateStrangeLaw() {
  try {
    const prompt = 'Give me a brief description of a strange-sounding but plausible law that could exist somewhere in the world. Just return the law description and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating strange law:', error);
    return 'In Switzerland, it is illegal to flush a toilet after 10 PM'; // Fallback law
  }
}

// Generate a random app name
async function generateAppName() {
  try {
    const prompt = 'Create a silly but plausible-sounding app name that doesn\'t actually exist. Just return the app name and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating app name:', error);
    return 'SnorklMate'; // Fallback app name
  }
}

// Generate a random conspiracy theory name
async function generateConspiracyTheory() {
  try {
    const prompt = 'Create a name for a fictional conspiracy theory that sounds intriguing but isn\'t real. Just return the name and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating conspiracy theory:', error);
    return 'The Denver Airport Underground Colony'; // Fallback conspiracy
  }
}

// Generate a random weird product name
async function generateWeirdProduct() {
  try {
    const prompt = 'Create a name for a weird but plausible product that could exist. Just return the product name and nothing else.';
    const response = await callLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('Error generating weird product:', error);
    return 'Nose Hair Styling Gel'; // Fallback product
  }
}

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
    case 'words':
      return {
        content: await generateObscureWord(),
        category: 'Word Definition',
        type: 'words'
      };
    case 'people':
      return {
        content: await generateHistoricalPerson(),
        category: 'Historical Person',
        type: 'people'
      };
    case 'initials':
      return {
        content: generateInitials(),
        category: 'Acronym Meaning',
        type: 'initials'
      };
    case 'laws':
      return {
        content: await generateStrangeLaw(),
        category: 'Law Explanation',
        type: 'laws'
      };
    case 'apps':
      return {
        content: await generateAppName(),
        category: 'App Description',
        type: 'apps'
      };
    case 'conspiracies':
      return {
        content: await generateConspiracyTheory(),
        category: 'Conspiracy Details',
        type: 'conspiracies'
      };
    case 'reviews':
      return {
        content: await generateWeirdProduct(),
        category: 'Product Review',
        type: 'reviews'
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
      prompt = `Make up a phrase using the letters ${content.join(', ')} for "${category}". Keep it casual and fun, like something a friend would write. Just give me the phrase.`;
      break;
    case 'date':
      prompt = `Make up a quick fake historical event for "${content}". Sound casual like you're just making it up on the spot. Just the event, no explanation.`;
      break;
    case 'movie':
      prompt = `Write a super short, fun movie plot for "${content}". Make it sound like a casual friend describing a movie. Keep it to 1-2 sentences max.`;
      break;
    case 'words':
      prompt = `Make up a quick, casual definition for the word "${content}". Sound like a friend just making something up, not like a dictionary. Keep it short and fun.`;
      break;
    case 'people':
      prompt = `Make up a brief, casual story about who "${content}" was. Sound like you're just making it up on the spot with friends. Keep it short and a bit silly.`;
      break;
    case 'initials':
      prompt = `What could the initials "${content}" stand for? Make up something funny and casual, like you're joking with friends. Just give me the phrase.`;
      break;
    case 'laws':
      prompt = `Make up a quick explanation for why this law exists: "${content}". Sound casual like you're just guessing with friends. Keep it short and somewhat believable.`;
      break;
    case 'apps':
      prompt = `What does the app "${content}" do? Make up something quick and casual, like you're just guessing with friends. Keep it short and a bit ridiculous.`;
      break;
    case 'conspiracies':
      prompt = `Make up some quick details about the conspiracy theory "${content}". Sound casual like you're just making it up with friends. Keep it brief and a bit out there.`;
      break;
    case 'reviews':
      prompt = `Write a short, casual product review for "${content}". Sound like a real person, not too formal. Make it funny or weirdly enthusiastic. Keep it brief.`;
      break;
    default:
      prompt = `Make up a creative response for "${content}" in the category "${category}". Sound casual and fun like you're just chatting with friends.`;
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
      return `So on ${content}, some guy apparently found a weird old coin and it totally changed what historians thought about that time.`;
    } else if (gameType === 'movie') {
      return `"${content}" is about this random person who has to deal with a bunch of problems while trying to save their town from some disaster. Pretty wild stuff.`;
    } else if (gameType === 'words') {
      return `${content}? Oh that's when you accidentally put too much hot sauce on your burrito and regret it immediately.`;
    } else if (gameType === 'people') {
      return `${content} was this random person from the 1800s who supposedly invented a machine to talk to cats. Didn't work, obviously.`;
    } else if (gameType === 'initials') {
      return `${content} clearly stands for "${content.split('').map(letter => {
        const options = {
          'A': 'Awesome', 'B': 'Bizarre', 'C': 'Crazy', 'D': 'Dramatic',
          'E': 'Extreme', 'F': 'Funky', 'G': 'Groovy', 'H': 'Hilarious',
          'I': 'Intense', 'J': 'Jumbo', 'K': 'Kooky', 'L': 'Loud',
          'M': 'Mega', 'N': 'Nutty', 'O': 'Odd', 'P': 'Peculiar',
          'Q': 'Quirky', 'R': 'Radical', 'S': 'Silly', 'T': 'Totally',
          'U': 'Unusual', 'V': 'Very', 'W': 'Wacky', 'X': 'Xtreme',
          'Y': 'Yikes', 'Z': 'Zany'
        };
        return options[letter] || letter;
      }).join(' ')}".`;
    } else if (gameType === 'laws') {
      return `That law about "${content}" was made because some mayor's pet got into trouble once and they got super dramatic about it.`;
    } else if (gameType === 'apps') {
      return `${content} is this app that helps you track how many times your cat judges you throughout the day. Super useful, right?`;
    } else if (gameType === 'conspiracies') {
      return `The "${content}" theory is about how all the world's sock-disappearances are actually part of a secret government energy project.`;
    } else if (gameType === 'reviews') {
      return `OMG this ${content} changed my life!!! 5 stars! Would buy again even though it broke after 2 days lol.`;
    }
    
    return 'Bot submission';
  }
}

module.exports = {
  generateContent,
  generateBotSubmission,
  callLLM
};
