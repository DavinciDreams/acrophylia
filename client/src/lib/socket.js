import { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const serverUrl = 'http://localhost:3001'  // Replace with your Render URL
    const newSocket = io(serverUrl)
    setSocket(newSocket)
    
    newSocket.on('connect', () => console.log('Socket connected'))
    newSocket.on('connect_error', (err) => console.log('Socket connection error:', err))
    
    return () => newSocket.close()
  }, [])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)