import { canvas, centerX, centerY, radius, W, H } from './dom.js';

const frostCanvas = document.createElement("canvas");
frostCanvas.width = radius * 2;
frostCanvas.height = radius * 2;
export const frostCtx = frostCanvas.getContext("2d");
export { frostCanvas };

export function resetFrost() {
  frostCtx.globalCompositeOperation = "source-over";
  frostCtx.clearRect(0, 0, frostCanvas.width, frostCanvas.height);

  const grad = frostCtx.createRadialGradient(
    radius, radius, radius * 0.15,
    radius, radius, radius
  );
  grad.addColorStop(0, "rgba(224, 242, 254, 0.42)");
  grad.addColorStop(0.75, "rgba(240, 249, 255, 0.68)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.85)");

  frostCtx.fillStyle = grad;
  frostCtx.fillRect(0, 0, frostCanvas.width, frostCanvas.height);
}

export function scratchAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = (clientX - rect.left) * (W / rect.width);
  const y = (clientY - rect.top) * (H / rect.height);

  if (Math.hypot(x - centerX, y - centerY) > radius) return;

  const localX = x - (centerX - radius);
  const localY = y - (centerY - radius);

  frostCtx.save();
  frostCtx.globalCompositeOperation = "destination-out";
  frostCtx.beginPath();
  frostCtx.arc(localX, localY, 40, 0, Math.PI * 2);
  frostCtx.fill();
  frostCtx.restore();
}

// Inicializar escarcha
resetFrost();
