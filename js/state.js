/* ==========================================================================
   CONFIGURACIÓN GENERAL Y ESTADO GLOBAL (VERSIÓN 3D)
   ========================================================================== */

// Precio y duración de la generación de video
export const GENERATION_PRICE_USD = 1.0;
export const VIDEO_DURATION_MS = 4000;

// Estado global de la aplicación
export const state = {
  currentTheme: "wood",
  userImage: null,
  isRecording: false,
  
  // --- LÓGICA DEL MODO SUITE Y PAGOS ---
  // Lee el localStorage. Si el valor es 'true', el usuario es el creador (tú) 
  // o ya compró acceso premium.
  isDeveloper: localStorage.getItem('devSuite') === 'true',
  isPremium: localStorage.getItem('isPremium') === 'true'
};

// Paleta de colores para la base de la esfera
export const THEMES = {
  wood: {
    stops: ["#5c2d16", "#8b4513", "#3e1d0d"],
    trim: "#d4af37",
    plate: "#f5d77f",
    plateBorder: "#9a7b2c",
    text: "#3b230a"
  },
  gold: {
    stops: ["#9a7b2c", "#facc15", "#713f12"],
    trim: "#fef08a",
    plate: "#fffbeb",
    plateBorder: "#ca8a04",
    text: "#422006"
  },
  midnight: {
    stops: ["#1e293b", "#0f172a", "#020617"],
    trim: "#38bdf8",
    plate: "#e0f2fe",
    plateBorder: "#0284c7",
    text: "#082f49"
  }
};
