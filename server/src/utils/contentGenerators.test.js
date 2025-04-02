/**
 * Tests for content generators
 */
const { generateContent, generateBotSubmission } = require('./contentGenerators');

// We're not mocking OpenAI here since we're testing the fallback implementation
// The test will use the actual implementation which handles missing API keys

describe('Content Generators', () => {
  describe('generateContent', () => {
    test('should generate acronym content', async () => {
      const result = await generateContent('acronym', 1);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('acronym');
      expect(Array.isArray(result.content)).toBe(true);
      // Round 1 should have 3 letters
      expect(result.content.length).toBe(3);
    });
    
    test('should generate date content', async () => {
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
    
    test('should generate movie content', async () => {
      const result = await generateContent('movie', 1);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('movie');
      expect(typeof result.content).toBe('string');
      expect(result.category).toBe('Movie Plot');
    });
    
    test('should default to acronym for invalid type', async () => {
      const result = await generateContent('invalid', 1);
      
      expect(result.type).toBe('acronym');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });
  
  describe('generateBotSubmission', () => {
    test('should generate bot submission for acronym', async () => {
      const content = ['A', 'B', 'C'];
      const category = 'Animals';
      
      const result = await generateBotSubmission('acronym', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // With fallback, we can't predict the exact response
    });
    
    test('should generate bot submission for date', async () => {
      const content = 'January 1, 1900';
      const category = 'Historical Event';
      
      const result = await generateBotSubmission('date', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Just check that we got a non-empty string response
      // The exact format may vary based on the fallback implementation
    });
    
    test('should generate bot submission for movie', async () => {
      const content = 'The Last Horizon';
      const category = 'Movie Plot';
      
      const result = await generateBotSubmission('movie', content, category);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Just check that we got a non-empty string response
      // The exact format may vary based on the fallback implementation
    });
  });
});
