/* ==========================================================================
   REFERENCIAS AL DOM (VERSIÓN 3D)
   ========================================================================== */

// Elementos de la interfaz de usuario
export const photoInput = document.getElementById("photoInput");
export const dedicationInput = document.getElementById("dedicationInput");
export const shakeBtn = document.getElementById("shakeBtn");
export const frostBtn = document.getElementById("frostBtn");
export const videoBtn = document.getElementById("videoBtn");
export const shareBtn = document.getElementById("shareBtn");
export const statusMsg = document.getElementById("statusMsg");
export const themeChips = document.querySelectorAll(".theme-chip");

// Elemento para el "Modo Suite" (Tocar 5 veces)
export const mainTitle = document.getElementById("mainTitle");

// Modal de pago (Mantenemos las referencias por si usamos el modal visual)
export const payModal = document.getElementById("payModal");
export const cancelPayBtn = document.getElementById("cancelPayBtn");
export const confirmPayBtn = document.getElementById("confirmPayBtn");

// Función para actualizar el texto de estado en la pantalla
export function setStatus(msg) {
  if (statusMsg) statusMsg.textContent = msg;
}
