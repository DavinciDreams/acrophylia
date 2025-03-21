// src/pages/_app.jsx
import '../styles/globals.css'; // Adjust if you have CSS

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;