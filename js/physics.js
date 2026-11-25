import { centerX, centerY, radius } from './dom.js';
import { state } from './state.js';

export const flakes = Array.from({ length: 150 }, () => ({
  x: centerX + (Math.random() - 0.5) * radius * 1.7,
  y: centerY + (Math.random() - 0.5) * radius * 1.7,
  r: Math.random() * 4.2 + 1.6,
  vy: Math.random() * 1.2 + 0.45,
  vx: (Math.random() - 0.5) * 0.7,
  swayPhase: Math.random() * Math.PI * 2,
  alpha: Math.random() * 0.55 + 0.45
}));

export function triggerShake() {
  state.shakeEnergy = 18;
  state.glowPulse = 1;
  flakes.forEach((f) => {
    f.vx = (Math.random() - 0.5) * 15;
    f.vy = (Math.random() - 0.75) * 15;
  });
}

export function updateFlakes() {
  flakes.forEach((f) => {
    f.swayPhase += 0.035;
    f.x += f.vx + Math.sin(f.swayPhase) * 0.35;
    f.y += f.vy;

    f.vx *= 0.965;
    if (f.vy > 1.5) {
      f.vy *= 0.955;
    } else {
      f.vy = Math.min(f.vy + 0.04, 1.5);
    }

    const dx = f.x - centerX;
    const dy = f.y - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > radius - 10) {
      const angle = Math.atan2(dy, dx);
      f.x = centerX + Math.cos(angle) * (radius - 12);
      f.y = centerY + Math.sin(angle) * (radius - 12);
      f.vx *= -0.55;
    }

    if (f.y > centerY + radius - 45) {
      f.y = centerY - radius + 20 + Math.random() * 40;
      f.x = centerX + (Math.random() - 0.5) * radius * 1.4;
    }
  });
}
