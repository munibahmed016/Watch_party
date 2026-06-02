// src/lib/config.ts
// Single place to control API endpoints.
// Currently configured to ALWAYS use the live Render backend.
// To switch back to localhost for dev, uncomment the DEV section below.

// import { Platform } from 'react-native';

// ---- DEV URLs (uncomment to use localhost during development) ----
// const DEV_API_URL = Platform.select({
//   ios: 'http://localhost:4000',
//   android: 'http://10.0.2.2:4000',
//   default: 'http://localhost:4000',
// });

// ---- PRODUCTION URL (Render-hosted backend) ----
const PROD_API_URL = 'https://watch-party-backend-x9wl.onrender.com';

// Always use Render — works on simulator, real device, and TestFlight builds
export const API_URL = PROD_API_URL;
export const API_BASE = `${API_URL}/api`;
export const SOCKET_URL = API_URL;

// Deep linking
export const APP_SCHEME = 'watchpartylive';
export const APP_UNIVERSAL_URL = 'https://watchpartylive.app';