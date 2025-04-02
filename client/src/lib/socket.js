import { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import config from '../config'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const serverUrl = config.socketUrl
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