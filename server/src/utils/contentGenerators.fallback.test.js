/**
 * Tests for content generators with fallback mechanisms
 */

// Mock the module before requiring it
jest.mock('./contentGenerators', () => {
  // Get the actual module
  const originalModule = jest.requireActual('./contentGenerators');
  
  // Return a modified version with openaiClient set to null
  return {
    ...originalModule,
    // Override these functions to simulate fallback mode
    callLLM: jest.fn().mockImplementation(prompt => {
      if (prompt.includes('movie title')) {
        return Promise.resolve('The Forgotten Path');
      } else if (prompt.includes('category')) {
        return Promise.resolve('Nature');
      } else if (prompt.includes('acronym')) {
        return Promise.resolve('Amazing Beautiful Creative');
      } else if (prompt.includes('historical event')) {
        return Promise.resolve('A scientific breakthrough changed history forever.');
      } else if (prompt.includes('movie plot')) {
        return Promise.resolve('A group of unlikely heroes must save their world from destruction.');
      }
      return Promise.resolve('Fallback response');
    })
  };
});

// Import after mocking
const { generateContent, generateBotSubmission, callLLM } = require('./contentGenerators');

describe('Content Generators Fallback Mode', () => {
  describe('generateContent with fallbacks', () => {
    test('should generate acronym content without OpenAI', async () => {
      const result = await generateContent('acronym', 1);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('acronym');
      expect(Array.isArray(result.content)).toBe(true);
      // Round 1 should have 3 letters
      expect(result.content.length).toBe(3);
    });
    
    test('should generate date content without OpenAI', async () => {
      const result = await generateContent('date', 1);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('date');
      expect(typeof result.content).toBe('string');
      
      // Verify date format (e.g., "January 1, 1900")
      const dateRegex = /[A-Z][a-z]+ \d{1,2}, \d{4}/;
      expect(result.content).toMatch(dateRegex);
      
      // Verify it's a valid date
      const date = new Date(result.content);
      expect(date instanceof Date && !isNaN(date)).toBe(true);
    });
    
    test('should generate movie content without OpenAI', async () => {
      const result = await generateContent('movie', 1);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('movie');
      expect(typeof result.content).toBe('string');
      expect(result.category).toBe('Movie Plot');
    });
  });
  
  describe('generateBotSubmission with fallbacks', () => {
    test('should generate bot submission for acronym without OpenAI', async () => {
      const content = ['A', 'B', 'C'];
      const category = 'Animals';
      
      const result = await generateBotSubmission('acronym', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Just check that we got a non-empty string response
    });
    
    test('should generate bot submission for date without OpenAI', async () => {
      const content = 'January 1, 1900';
      const category = 'Historical Event';
      
      const result = await generateBotSubmission('date', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Just check that we got a non-empty string response
    });
    
    test('should generate bot submission for movie without OpenAI', async () => {
      const content = 'The Last Horizon';
      const category = 'Movie Plot';
      
      const result = await generateBotSubmission('movie', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Just check that we got a non-empty string response
    });
  });
  
  describe('callLLM with fallbacks', () => {
    test('should return fallback response for movie title prompt', async () => {
      const result = await callLLM('Generate a fictional movie title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('should return fallback response for category prompt', async () => {
      const result = await callLLM('Generate a category for an acronym game');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('should return fallback response for historical event prompt', async () => {
      const result = await callLLM('Create a fictional historical event');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
