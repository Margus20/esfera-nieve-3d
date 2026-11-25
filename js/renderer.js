import { ctx, W, H, centerX, centerY, radius, dedicationInput } from './dom.js';
import { state, THEMES } from './state.js';
import { flakes } from './physics.js';
import { frostCanvas } from './frost.js';

// Polyfill para navegadores que no tienen roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

function drawBackground() {
  const bgGrad = ctx.createRadialGradient(centerX, centerY - 60, 40, centerX, H / 2, 500);
  bgGrad.addColorStop(0, "#1e3a5f");
  bgGrad.addColorStop(1, "#090f21");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
}

function drawBase(offsetX) {
  const theme = THEMES[state.currentTheme] || THEMES.wood;
  ctx.save();
  ctx.translate(offsetX, 0);

  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.beginPath();
  ctx.ellipse(centerX, 685, 195, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  const baseGrad = ctx.createLinearGradient(centerX - 180, 540, centerX + 180, 680);
  baseGrad.addColorStop(0, theme.stops[0]);
  baseGrad.addColorStop(0.5, theme.stops[1]);
  baseGrad.addColorStop(1, theme.stops[2]);

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - 145, 545);
  ctx.lineTo(centerX + 145, 545);
  ctx.lineTo(centerX + 185, 665);
  ctx.quadraticCurveTo(centerX, 690, centerX - 185, 665);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.trim;
  ctx.fillRect(centerX - 150, 540, 300, 14);

  ctx.fillStyle = theme.plate;
  ctx.beginPath();
  ctx.roundRect(centerX - 125, 582, 250, 54, 10);
  ctx.fill();
  ctx.strokeStyle = theme.plateBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  const text = (dedicationInput && dedicationInput.value.trim()) || "Felices Fiestas";
  ctx.fillStyle = theme.text;
  ctx.font = "bold 24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, 609);

  ctx.restore();
}

function drawGlobe(offsetX) {
  ctx.save();
  ctx.translate(offsetX, 0);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  const innerGrad = ctx.createRadialGradient(centerX, centerY - 50, 20, centerX, centerY, radius);
  innerGrad.addColorStop(0, "#2b5876");
  innerGrad.addColorStop(1, "#0f2027");
  ctx.fillStyle = innerGrad;
  ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

  if (state.userImage) {
    // Algoritmo "cover" para que la imagen llene el círculo sin deformarse
    const boxSize = radius * 2;
    const scale = Math.max(boxSize / state.userImage.width, boxSize / state.userImage.height);
    const drawW = state.userImage.width * scale;
    const drawH = state.userImage.height * scale;
    ctx.drawImage(state.userImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Toca 'Seleccionar foto'", centerX, centerY - 12);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
    ctx.fillText("para colocar tu imagen aquí", centerX, centerY + 22);
  }

  ctx.drawImage(frostCanvas, centerX - radius, centerY - radius);

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + radius - 18, radius * 0.85, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  flakes.forEach((f) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  });

  if (state.glowPulse > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.glowPulse * 0.16})`;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    state.glowPulse *= 0.92;
  }

  const gloss = ctx.createRadialGradient(centerX - 95, centerY - 105, 10, centerX - 80, centerY - 90, 155);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.translate(offsetX, 0);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function animate() {
  let offsetX = 0;
  if (state.shakeEnergy > 0.2) {
    offsetX = Math.sin(state.shakeEnergy * 2.6) * state.shakeEnergy * 0.7;
    state.shakeEnergy *= 0.9;
  } else {
    state.shakeEnergy = 0;
  }

  // Nota: updateFlakes se llama desde main.js o justo aquí. 
  // Para evitar acoplamiento circular, lo importamos.
  import('./physics.js').then(({ updateFlakes }) => updateFlakes());

  drawBackground();
  drawGlobe(offsetX);
  drawBase(offsetX);

  requestAnimationFrame(animate);
}
