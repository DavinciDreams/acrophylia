/**
 * Application configuration
 */

const config = {
  // Default to localhost:3002, but allow override from environment variables if available
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002',
};

export default config;
