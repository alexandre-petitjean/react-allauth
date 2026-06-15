// Empty base URL → requests are relative (e.g. /_allauth/...) and served
// same-origin through the Vite dev proxy (see vite.config.ts), which forwards
// them to the local backend. This avoids CORS and keeps cookies/CSRF working.
export const BASE_URL = ''
