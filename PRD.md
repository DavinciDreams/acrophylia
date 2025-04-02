# Product Requirements Document: Acrophylia Game Extension

## Executive Summary
This PRD outlines the extension of the existing Acrophylia game from solely acronym-based gameplay to include additional category types: Dates and Movie Titles. The core gameplay loop of submission and voting will remain intact, with modifications to accommodate the new content types.

## Background
The current Acrophylia game successfully implements a Balderdash-like experience where players:
1. Are presented with random letters (acronyms)
2. Submit creative phrases that match those letters
3. Vote on submissions
4. Score points based on votes received

## Product Goals
- Extend the game to support multiple category types beyond acronyms
- Maintain the core gameplay loop and scoring system
- Ensure a seamless transition between different category types

## Category Types

### 1. Acronyms (Existing)
- **Current Implementation**: Players create phrases matching random generated letters
- **No Changes Required**: This feature works as expected

### 2. Dates (New)
- **Description**: Players are presented with a historical date and must create fictional events that occurred on that date
- **Example**: For "October 15, 1967" players might submit "The first banana phone was invented"

### 3. Movie Titles (New)
- **Description**: Players are presented with a fictional movie title and must create a plot synopsis
- **Example**: For "The Purple Horizon" players might submit "A coming-of-age story about a color-blind astronomer"

## Technical Requirements

### Server Changes

1. **Category Type System**
   - Add `gameType` property to room object (values: "acronym", "date", "movie")
   - Create category selection at game start or randomize for each round
   - Modify `startRound` function to handle different content types

```javascript
// Add to room initialization
room = {
  // existing properties...
  gameType: 'acronym', // Default game type
  // other properties...
}

// Update generateContent function
async function generateContent(gameType) {
  switch (gameType) {
    case 'acronym':
      return {
        content: generateLetters(room.round),
        category: await generateCategory() 
      };
    case 'date':
      return {
        content: generateRandomDate(),
        category: 'Historical Event'
      };
    case 'movie':
      return {
        content: await generateMovieTitle(),
        category: 'Movie Plot'
      };
    default:
      return generateLetters(room.round);
  }
}
```

2. **Content Generation**
   - Create new helper functions to generate dates and movie titles:

```javascript
function generateRandomDate() {
  const start = new Date(1800, 0, 1);
  const end = new Date(2010, 11, 31);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function generateMovieTitle() {
  const prompt = 'Generate a fictional but plausible movie title (3-6 words). Return only the title, no explanation.';
  try {
    return await callLLM(prompt);
  } catch (error) {
    console.error('Movie title generation error:', error);
    return 'The Unexpected Journey';
  }
}
```

3. **Bot Logic**
   - Update bot prompts to handle different game types:

```javascript
// For dates
const prompt = `Create a fictional but plausible historical event that happened on "${content}" that sounds believable. Return only the event, no explanation.`;

// For movies
const prompt = `Write a brief, creative movie plot summary (1-2 sentences) for a movie titled "${content}". Return only the plot summary, no explanation.`;
```

### Client Changes

1. **UI Updates**
   - Modify GameRoom component to display different prompts based on game type
   - Update SubmissionForm to show appropriate instructions

```jsx
// Example UI logic
const renderPrompt = () => {
  switch (gameType) {
    case 'acronym':
      return (
        <div>
          <h3>Create an acronym using these letters:</h3>
          <div className="letters">{letters.join(' ')}</div>
          <p>Category: {category}</p>
        </div>
      );
    case 'date':
      return (
        <div>
          <h3>What happened on this date?</h3>
          <div className="date">{content}</div>
          <p>Create a fictional historical event</p>
        </div>
      );
    case 'movie':
      return (
        <div>
          <h3>Write a plot for this movie:</h3>
          <div className="movie-title">{content}</div>
          <p>Create a brief, creative plot summary</p>
        </div>
      );
  }
};
```

2. **Game Setup**
   - Add game type selection in the lobby:

```jsx
// Game setup component
const GameSetupOptions = ({ onRoundChange, onGameTypeToggle, selectedGameTypes }) => {
  // Default game types
  const gameTypes = [
    { id: 'acronym', label: 'Acronyms' },
    { id: 'date', label: 'Historical Dates' },
    { id: 'movie', label: 'Movie Plots' }
  ];
  
  return (
    <div className="game-setup-options">
      <div className="round-selector">
        <h3>Number of Rounds</h3>
        <select onChange={(e) => onRoundChange(parseInt(e.target.value))}>
          <option value="3">3 Rounds</option>
          <option value="5" selected>5 Rounds</option>
          <option value="7">7 Rounds</option>
          <option value="10">10 Rounds</option>
        </select>
      </div>
      
      <div className="game-type-selector">
        <h3>Select Game Types</h3>
        <p className="info-text">Each round will randomly select from your chosen game types</p>
        <div className="type-options">
          {gameTypes.map(type => (
            <label key={type.id} className="game-type-checkbox">
              <input
                type="checkbox"
                checked={selectedGameTypes.includes(type.id)}
                onChange={() => onGameTypeToggle(type.id)}
              />
              {type.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
```

3. **Socket Events**
   - Update socket handling to include game type information:

```javascript
// In client/src/lib/socket.js
socket.on('newRound', ({ roundNum, gameType, content, timeLeft, category }) => {
  // Update state based on game type
  setCurrentRound(roundNum);
  setGameType(gameType);
  setContent(content); // letters, date, or movie title
  setTimeLeft(timeLeft);
  setCategory(category);
});
```

## Game Flow Changes

1. **Game Start**
   - Host selects number of rounds (3, 5, 7, or 10)
   - Host selects which game types to include via checkboxes (Acronyms, Historical Dates, Movie Plots)
   - System initializes game with selected parameters
   - Each round randomly selects a game type from the user's chosen options
   
2. **Round Structure**
   - Each round randomly selects a game type from the user-selected options
   - Each round follows the same flow: content presentation → submissions → voting → results
   - Game runs for the user-specified number of rounds (3, 5, 7, or 10)

3. **Scoring**
   - No changes to scoring system (votes = points)

## Implementation Phases

### Phase 1: Core Framework
- Implement game type selection in lobby
- Update server to handle different game types
- Modify content generation for dates and movie titles

### Phase 2: Client Updates
- Update UI components to display appropriate content
- Enhance submission forms with type-specific guidance
- Create new visual assets for different game types

### Phase 3: Bot Intelligence
- Enhance bot submission logic for new game types
- Improve LLM prompts for more creative responses

## User Experience Considerations
- Provide clear instructions for each game type
- Keep time limits consistent across game types
- Consider visual cues to indicate the current game type

## Success Metrics
- Player engagement with new game types
- Session length increase
- Return player rate improvement
- Positive player feedback

## Testing Strategy

### Unit Tests

```javascript
// utils/gameLogic.test.js
describe('Content Generation', () => {
  test('generateRandomDate should return properly formatted date', () => {
    const date = generateRandomDate();
    expect(date).toMatch(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
    const parsed = new Date(date);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBeGreaterThanOrEqual(1800);
    expect(parsed.getFullYear()).toBeLessThanOrEqual(2010);
  });

  test('generateMovieTitle should return a non-empty string', async () => {
    const mockLLM = jest.fn().mockResolvedValue('The Midnight Express');
    global.callLLM = mockLLM;
    const title = await generateMovieTitle();
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  test('generateContent should return appropriate content for each game type', async () => {
    // Test acronym type
    const acronymContent = await generateContent('acronym');
    expect(acronymContent).toHaveProperty('content');
    expect(acronymContent).toHaveProperty('category');
    expect(Array.isArray(acronymContent.content)).toBe(true);
    
    // Test date type
    const dateContent = await generateContent('date');
    expect(dateContent).toHaveProperty('content');
    expect(dateContent).toHaveProperty('category');
    expect(typeof dateContent.content).toBe('string');
    
    // Test movie type
    const movieContent = await generateContent('movie');
    expect(movieContent).toHaveProperty('content');
    expect(movieContent).toHaveProperty('category');
    expect(typeof movieContent.content).toBe('string');
  });
});
```

### Integration Tests

```javascript
// server.test.js
describe('Game Flow', () => {
  let clientSocket, serverSocket;
  
  beforeAll((done) => {
    // Setup test server and client
    // ...
  });
  
  afterAll(() => {
    // Close connections
    // ...
  });
  
  test('should start a game with user-selected game types', (done) => {
    // Create a room
    clientSocket.emit('createRoom');
    
    clientSocket.once('roomCreated', (roomId) => {
      // Set game options
      const gameOptions = {
        roomId,
        rounds: 3,
        gameTypes: ['acronym', 'movie']
      };
      
      clientSocket.emit('setGameOptions', gameOptions);
      clientSocket.emit('startGame', roomId);
      
      // Check if game started with correct options
      clientSocket.once('gameStarted', () => {
        // Verify game state
        clientSocket.emit('getGameState', roomId);
        clientSocket.once('gameState', (state) => {
          expect(state.totalRounds).toBe(3);
          expect(state.availableGameTypes).toEqual(['acronym', 'movie']);
          done();
        });
      });
    });
  });
  
  test('each round should randomly select from available game types', (done) => {
    let roundTypes = [];
    let rounds = 0;
    
    // Track multiple rounds to verify randomness
    clientSocket.on('newRound', ({ gameType }) => {
      roundTypes.push(gameType);
      rounds++;
      
      if (rounds === 3) {
        // Verify game types are from selected options
        roundTypes.forEach(type => {
          expect(['acronym', 'movie']).toContain(type);
        });
        done();
      }
    });
    
    // Start a game with specific options
    // ...
  });
});
```

### End-to-End Tests

```javascript
// e2e/gameFlow.test.js
describe('Game Type Selection UI', () => {
  test('should allow selecting multiple game types', async () => {
    // Navigate to lobby
    await page.goto('http://localhost:3000');
    await page.click('button[data-testid="create-room"]');
    
    // Select rounds
    await page.selectOption('select[data-testid="round-selector"]', '5');
    
    // Select multiple game types
    await page.click('input[data-testid="game-type-acronym"]');
    await page.click('input[data-testid="game-type-movie"]');
    
    // Start game
    await page.click('button[data-testid="start-game"]');
    
    // Verify game started
    await expect(page).toHaveText('h1', /Round 1/i);
    
    // Verify game type shown is either acronym or movie
    const gameTypeElement = await page.$('[data-testid="current-game-type"]');
    const gameType = await gameTypeElement.textContent();
    
    expect(['Acronyms', 'Movie Plots']).toContain(gameType);
  });
});
```

## Implementation Checklist

### Phase 1: Core Framework
- [ ] Add `gameType` and related properties to room object
- [ ] Implement round count selection in lobby UI
- [ ] Create game type checkbox selection component
- [ ] Implement server-side game type tracking
- [ ] Add random game type selection logic for each round
- [ ] Write unit tests for content generation functions

### Phase 2: Game Type Implementation
- [ ] Implement Date content generation
  - [ ] Create `generateRandomDate()` function
  - [ ] Update content presentation for date type
  - [ ] Test date content generation
- [ ] Implement Movie content generation
  - [ ] Create `generateMovieTitle()` function
  - [ ] Update content presentation for movie type
  - [ ] Test movie content generation
- [ ] Update bot logic for new game types

### Phase 3: UI and UX Enhancements
- [ ] Update GameRoom UI to render different content types appropriately
- [ ] Add visual indicators for current game type
- [ ] Create type-specific instructions/help text
- [ ] Design and implement transitions between game types
- [ ] Test responsiveness across devices

### Phase 4: Testing and Refinement
- [ ] Run integration tests for game flow
- [ ] Conduct user acceptance testing
- [ ] Fix any identified bugs or UX issues
- [ ] Optimize performance if needed
- [ ] Document new features for users
