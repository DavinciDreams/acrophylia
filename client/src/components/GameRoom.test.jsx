import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SocketProvider } from '../lib/socket';
import GameRoom from './GameRoom';

// Mock the socket context
jest.mock('../lib/socket', () => ({
  useSocket: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }),
  SocketProvider: ({ children }) => <div data-testid="socket-provider">{children}</div>
}));

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ roomId: 'test-room' })
}));

describe('GameRoom Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders waiting state correctly', () => {
    render(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    expect(screen.getByText(/waiting for players/i)).toBeInTheDocument();
  });

  test('displays game type indicator when in submitting state', () => {
    const { rerender } = render(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    // Manually set component state to simulate a new round with acronym game type
    const gameRoomInstance = screen.getByTestId('socket-provider').firstChild;
    gameRoomInstance.setState({
      gameState: 'submitting',
      roundNum: 1,
      gameType: 'acronym',
      content: ['A', 'B', 'C'],
      category: 'Animals'
    });
    
    rerender(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Acronyms');
  });

  test('displays date game type correctly', () => {
    const { rerender } = render(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    // Manually set component state to simulate a new round with date game type
    const gameRoomInstance = screen.getByTestId('socket-provider').firstChild;
    gameRoomInstance.setState({
      gameState: 'submitting',
      roundNum: 1,
      gameType: 'date',
      content: 'January 1, 1900',
      category: 'Historical Event'
    });
    
    rerender(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Historical Dates');
  });

  test('displays movie game type correctly', () => {
    const { rerender } = render(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    // Manually set component state to simulate a new round with movie game type
    const gameRoomInstance = screen.getByTestId('socket-provider').firstChild;
    gameRoomInstance.setState({
      gameState: 'submitting',
      roundNum: 1,
      gameType: 'movie',
      content: 'The Last Horizon',
      category: 'Movie Plot'
    });
    
    rerender(
      <SocketProvider>
        <GameRoom />
      </SocketProvider>
    );
    
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Movie Plots');
  });
});
