import '../styles/globals.css'  // Move the import here
import { SocketProvider } from '../lib/socket'

function MyApp({ Component, pageProps }) {
  return (
    <SocketProvider>
      <Component {...pageProps} />
    </SocketProvider>
  )
}

export default MyApp