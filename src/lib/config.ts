const PROD_API_URL = 'https://watch-party-backend-x9wl.onrender.com';

// Always use Render — works on simulator, real device, and TestFlight builds
export const API_URL = PROD_API_URL;
export const API_BASE = `${API_URL}/api`;
export const SOCKET_URL = API_URL;

// Deep linking
export const APP_SCHEME = 'watchpartylive';
export const APP_UNIVERSAL_URL = 'https://watchpartylive.app';