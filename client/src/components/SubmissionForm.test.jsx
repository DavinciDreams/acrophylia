import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SubmissionForm from './SubmissionForm';
import { useSocket } from '../lib/socket';

// Mock the socket hook
jest.mock('../lib/socket', () => ({
  useSocket: jest.fn()
}));

describe('SubmissionForm Component', () => {
  const mockSocket = {
    emit: jest.fn()
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    useSocket.mockReturnValue(mockSocket);
  });

  test('renders acronym form correctly', () => {
    render(
      <SubmissionForm 
        gameType="acronym"
        content={['A', 'B', 'C']}
        category="Animals"
        roomId="test-room"
      />
    );
    
    // Check if the form displays the correct game type
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Acronyms');
    
    // Check if the letters are displayed
    expect(screen.getByText('A B C')).toBeInTheDocument();
    
    // Check if the category is displayed
    expect(screen.getByText(/Category: Animals/i)).toBeInTheDocument();
    
    // Check if input field is present (not textarea)
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /textarea/i })).not.toBeInTheDocument();
  });

  test('renders date form correctly', () => {
    render(
      <SubmissionForm 
        gameType="date"
        content="January 1, 1900"
        category="Historical Event"
        roomId="test-room"
      />
    );
    
    // Check if the form displays the correct game type
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Historical Dates');
    
    // Check if the date is displayed
    expect(screen.getByText('January 1, 1900')).toBeInTheDocument();
    
    // Check if textarea is present (not input)
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('renders movie form correctly', () => {
    render(
      <SubmissionForm 
        gameType="movie"
        content="The Last Horizon"
        category="Movie Plot"
        roomId="test-room"
      />
    );
    
    // Check if the form displays the correct game type
    expect(screen.getByTestId('current-game-type')).toHaveTextContent('Movie Plots');
    
    // Check if the movie title is displayed
    expect(screen.getByText('The Last Horizon')).toBeInTheDocument();
    
    // Check if textarea is present (not input)
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('submits acronym correctly', () => {
    render(
      <SubmissionForm 
        gameType="acronym"
        content={['A', 'B', 'C']}
        category="Animals"
        roomId="test-room"
      />
    );
    
    // Enter a submission
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Awesome Bears Climb' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if the socket.emit was called with correct parameters
    expect(mockSocket.emit).toHaveBeenCalledWith('submitContent', {
      roomId: 'test-room',
      submission: 'Awesome Bears Climb'
    });
  });

  test('submits date event correctly', () => {
    render(
      <SubmissionForm 
        gameType="date"
        content="January 1, 1900"
        category="Historical Event"
        roomId="test-room"
      />
    );
    
    // Enter a submission
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'The first day of the new century saw the invention of time travel.' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if the socket.emit was called with correct parameters
    expect(mockSocket.emit).toHaveBeenCalledWith('submitContent', {
      roomId: 'test-room',
      submission: 'The first day of the new century saw the invention of time travel.'
    });
  });

  test('submits movie plot correctly', () => {
    render(
      <SubmissionForm 
        gameType="movie"
        content="The Last Horizon"
        category="Movie Plot"
        roomId="test-room"
      />
    );
    
    // Enter a submission
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'A group of astronauts discover the edge of the universe.' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if the socket.emit was called with correct parameters
    expect(mockSocket.emit).toHaveBeenCalledWith('submitContent', {
      roomId: 'test-room',
      submission: 'A group of astronauts discover the edge of the universe.'
    });
  });

  test('shows error for empty submission', () => {
    render(
      <SubmissionForm 
        gameType="acronym"
        content={['A', 'B', 'C']}
        category="Animals"
        roomId="test-room"
      />
    );
    
    // Submit empty form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText('Please enter a submission')).toBeInTheDocument();
    
    // Check that socket.emit was not called
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  test('shows error for acronym length mismatch', () => {
    render(
      <SubmissionForm 
        gameType="acronym"
        content={['A', 'B', 'C']}
        category="Animals"
        roomId="test-room"
      />
    );
    
    // Enter a submission with wrong length
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'AB' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    // Check if error message is displayed
    expect(screen.getByText('Your acronym must use exactly 3 letters')).toBeInTheDocument();
    
    // Check that socket.emit was not called
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });
});
