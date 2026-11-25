export const canvas = document.getElementById("globeCanvas");
export const ctx = canvas.getContext("2d");

export const photoInput = document.getElementById("photoInput");
export const dedicationInput = document.getElementById("dedicationInput");
export const shakeBtn = document.getElementById("shakeBtn");
export const frostBtn = document.getElementById("frostBtn");
export const videoBtn = document.getElementById("videoBtn");
export const shareBtn = document.getElementById("shareBtn");
export const statusMsg = document.getElementById("statusMsg");
export const themeChips = document.querySelectorAll(".theme-chip");

export const payModal = document.getElementById("payModal");
export const cancelPayBtn = document.getElementById("cancelPayBtn");
export const confirmPayBtn = document.getElementById("confirmPayBtn");

export const W = canvas.width;
export const H = canvas.height;
export const centerX = W / 2;
export const centerY = 320;
export const radius = 265;

export function setStatus(msg) {
  if (statusMsg) statusMsg.textContent = msg;
}
