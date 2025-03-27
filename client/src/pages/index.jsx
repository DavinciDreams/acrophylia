import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Head from 'next/head';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

const Home = () => {
  const router = useRouter();
  const [letters, setLetters] = useState([]);
  const containerRef = useRef(null);
  const lastScrollY = useRef(0);
  const letterColors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2'];
  const letterCount = useRef(0);

  // Function to create a new letter element
  const createLetter = (scrollDirection, mouseX, mouseY) => {
    if (!containerRef.current) return;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    // Determine position based on mouse coordinates if provided
    let x, y;
    
    if (mouseX !== undefined && mouseY !== undefined) {
      // Use mouse position with small random offset
      x = mouseX + (Math.random() * 60 - 30); // Random offset ±30px
      y = mouseY + (Math.random() * 60 - 30); // Random offset ±30px
    } else {
      // Fallback to viewport-based positioning for scroll events
      // Random position (but not over the main card)
      const cardWidth = 600; // maxWidth of the card
      const cardPadding = 40; // padding around the card
      const safeZoneWidth = cardWidth + (cardPadding * 2);
      
      // Determine x position (avoid center area where the card is)
      if (windowWidth <= safeZoneWidth) {
        // If window is small, just place randomly
        x = Math.random() * windowWidth;
      } else {
        // Place either on left or right side of the card
        const centerX = windowWidth / 2;
        const safeZoneHalfWidth = safeZoneWidth / 2;
        const leftBound = centerX - safeZoneHalfWidth;
        const rightBound = centerX + safeZoneHalfWidth;
        
        if (Math.random() > 0.5) {
          x = Math.random() * leftBound;
        } else {
          x = rightBound + (Math.random() * (windowWidth - rightBound));
        }
      }
      
      // Random y position based on scroll direction and current viewport
      if (scrollDirection === 'down') {
        // Place at bottom of viewport when scrolling down
        y = scrollY + windowHeight - 100;
      } else {
        // Place at top of viewport when scrolling up
        y = scrollY + 100;
      }
      
      // Add some randomness to Y position
      y += (Math.random() * 100) - 50;
    }
    
    // Random letter
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
    
    // Random color
    const color = letterColors[Math.floor(Math.random() * letterColors.length)];
    
    // Random rotation
    const rotation = Math.random() * 20 - 10;
    
    // Random size
    const size = Math.floor(Math.random() * 20) + 20;
    
    // Random movement animation
    const moveX = (Math.random() * 100) - 50; // -50 to 50px
    const moveY = scrollDirection === 'down' ? -100 - Math.random() * 100 : 100 + Math.random() * 100;
    
    return {
      id: letterCount.current++,
      letter,
      x,
      y,
      moveX,
      moveY,
      color,
      rotation,
      size,
      opacity: 1,
      createdAt: Date.now()
    };
  };

  // Handle scroll event
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    // Only create letters if there was significant scroll
    if (Math.abs(currentScrollY - lastScrollY.current) > 5) {
      // Use current mouse position if available, otherwise use viewport center
      const mouseX = currentMousePos.current.x || window.innerWidth/2;
      const mouseY = (currentMousePos.current.y || window.innerHeight/2) + window.scrollY;
      const newLetter = createLetter(scrollDirection, mouseX, mouseY);
      if (newLetter) {
        console.log('Created new letter on scroll:', newLetter);
        setLetters(prev => [...prev, newLetter]);
      }
      lastScrollY.current = currentScrollY;
    }
  };

  // Handle mouse movement
  const lastMousePos = useRef({ x: 0, y: 0 });
  const currentMousePos = useRef({ x: 0, y: 0 });
  
  const handleMouseMove = (e) => {
    // Always update current mouse position
    currentMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Only create letters if mouse moved significantly
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 50) { // Only create letter after significant mouse movement
      const scrollDirection = dy > 0 ? 'down' : 'up';
      const newLetter = createLetter(scrollDirection, e.clientX, e.clientY + window.scrollY);
      if (newLetter) {
        console.log('Created new letter on mouse move:', newLetter);
        setLetters(prev => [...prev, newLetter]);
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  // Clean up old letters
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const before = letters.length;
      setLetters(prev => {
        const filtered = prev.filter(letter => {
          // Remove letters older than 3 seconds
          return now - letter.createdAt < 3000;
        });
        
        // Debug log if letters were removed
        if (filtered.length !== before && before > 0) {
          console.log(`Cleaned up letters: ${before} → ${filtered.length}`);
        }
        
        return filtered;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [letters.length]);

  // Set up scroll and mouse listeners
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Debug message
    console.log('Letter effect initialized, container:', containerRef.current);
    
    // Force create a letter for testing
    setTimeout(() => {
      const testLetter = createLetter('down', window.innerWidth/2, window.innerHeight/2 + window.scrollY);
      if (testLetter) {
        console.log('Created test letter:', testLetter);
        setLetters(prev => [...prev, testLetter]);
      } else {
        console.warn('Failed to create test letter, container may not be ready');
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    socket.on('connect', () => console.debug('Socket connected on index, ID:', socket.id));
    socket.on('connect_error', (err) => console.error('Socket connect error on index:', err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const createRoom = () => {
    socket.emit('createRoom', 'Neobrutalist Room');
    
    socket.once('roomCreated', (roomId) => {
      console.debug('Room created received, roomId:', roomId);
      sessionStorage.setItem('isCreator', 'true');
      sessionStorage.setItem('creatorSocketId', socket.id);
      router.push(`/room/${roomId}?creatorId=${socket.id}`);
    });
  };

  return (
    <>
      <Head>
        <title>Acrophylia | Word Game</title>
        <meta name="description" content="A fun word game where players create phrases from random letters" />
      </Head>
      
      <div style={styles.container} ref={containerRef}>
        {/* Letter sprinkles */}
        {letters.map(letter => (
          <div 
            key={letter.id}
            style={{
              position: 'fixed',
              left: `${letter.x}px`,
              top: `${letter.y - window.scrollY}px`,
              backgroundColor: letter.color,
              color: '#000',
              padding: '2px 6px',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 'bold',
              fontSize: `${letter.size}px`,
              transform: `rotate(${letter.rotation}deg)`,
              opacity: letter.opacity,
              transition: 'all 3s ease-out',
              animation: `float-${letter.id % 3} 3s forwards ease-out`,
              border: '2px solid #000',
              boxShadow: '2px 2px 0 #000',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            {letter.letter}
          </div>
        ))}
        <div style={styles.card}>
          <div style={styles.glitch}>
            <h1 style={styles.title}>ACROPHYLIA</h1>
            <div style={styles.subtitle}>THE ULTIMATE WORD GAME</div>
          </div>
          
          <div style={styles.inputContainer}>
            <button 
              style={styles.button} 
              onClick={createRoom}
            >
              CREATE ROOM
            </button>
          </div>
          
          <div className="info-box">
            <p>Create a room and invite friends to play!</p>
            <p>Each round, players create phrases from random letters.</p>
            <p>Vote for your favorites and score points!</p>
          </div>
        </div>
        
        <footer style={styles.footer}>
          <div style={styles.footerText}>NEOBRUTALIST EDITION © 2025</div>
        </footer>
      </div>
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--secondary)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  '@keyframes float-0': {
    '0%': {
      transform: 'rotate(0deg) translate(0, 0)',
      opacity: 1,
    },
    '100%': {
      transform: 'rotate(10deg) translate(50px, -100px)',
      opacity: 0,
    },
  },
  '@keyframes float-1': {
    '0%': {
      transform: 'rotate(0deg) translate(0, 0)',
      opacity: 1,
    },
    '100%': {
      transform: 'rotate(-10deg) translate(-50px, -100px)',
      opacity: 0,
    },
  },
  '@keyframes float-2': {
    '0%': {
      transform: 'rotate(0deg) translate(0, 0)',
      opacity: 1,
    },
    '100%': {
      transform: 'rotate(5deg) translate(30px, -120px)',
      opacity: 0,
    },
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'var(--background)',
    border: 'var(--border)',
    boxShadow: 'var(--shadow)',
    padding: '40px 30px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  glitch: {
    position: 'relative',
    marginBottom: '30px',
  },
  title: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '4.5rem',
    fontWeight: 'bold',
    color: 'var(--text)',
    textTransform: 'uppercase',
    margin: '0 0 5px 0',
    position: 'relative',
    textShadow: `2px 0 0 var(--primary), -2px 0 0 var(--accent)`,
    letterSpacing: '-2px',
  },
  subtitle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: 'var(--primary)',
    color: 'white',
    padding: '5px 10px',
    display: 'inline-block',
    transform: 'rotate(-1deg)',
    border: '2px solid var(--text)',
  },
  inputContainer: {
    marginBottom: '30px',
  },
  input: {
    width: '100%',
    padding: '15px',
    marginBottom: '15px',
    fontFamily: '"Space Mono", monospace',
    fontSize: '1rem',
    border: '3px solid var(--text)',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '15px',
    backgroundColor: 'var(--accent)',
    color: 'var(--text)',
    border: '3px solid var(--text)',
    boxShadow: '5px 5px 0px var(--text)',
    cursor: 'pointer',
    fontFamily: '"Space Mono", monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    transition: 'transform 0.1s, box-shadow 0.1s',
    marginTop: '10px',
  },
  instructions: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f0f0f0',
    border: '3px solid var(--text)',
    textAlign: 'left',
  },
  footer: {
    marginTop: '40px',
    width: '100%',
    textAlign: 'center',
  },
  footerText: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'var(--text)',
    backgroundColor: 'var(--background)',
    padding: '5px 15px',
    border: '2px solid var(--text)',
    display: 'inline-block',
  }
};

export default Home;