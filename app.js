/* ==========================================================================
   1. CONFIGURACIÓN Y ESTADO
   ========================================================================== */
const canvas = document.getElementById("globeCanvas");
const ctx = canvas.getContext("2d");

const photoInput = document.getElementById("photoInput");
const dedicationInput = document.getElementById("dedicationInput");
const shakeBtn = document.getElementById("shakeBtn");
const frostBtn = document.getElementById("frostBtn");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const statusMsg = document.getElementById("statusMsg");
const themeChips = document.querySelectorAll(".theme-chip");

const W = canvas.width;
const H = canvas.height;
const centerX = W / 2;
const centerY = 320;
const radius = 265;

const THEMES = {
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

let currentTheme = "wood";
let userImage = null;
let shakeEnergy = 0;
let glowPulse = 0;
let isScratching = false;

function setStatus(msg) {
  statusMsg.textContent = msg;
}

/* ==========================================================================
   2. CAPA DE ESCARCHA RASPABLE
   ========================================================================== */
const frostCanvas = document.createElement("canvas");
frostCanvas.width = radius * 2;
frostCanvas.height = radius * 2;
const frostCtx = frostCanvas.getContext("2d");

function resetFrost() {
  frostCtx.globalCompositeOperation = "source-over";
  frostCtx.clearRect(0, 0, frostCanvas.width, frostCanvas.height);

  const grad = frostCtx.createRadialGradient(
    radius,
    radius,
    radius * 0.15,
    radius,
    radius,
    radius
  );
  grad.addColorStop(0, "rgba(224, 242, 254, 0.42)");
  grad.addColorStop(0.75, "rgba(240, 249, 255, 0.68)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.85)");

  frostCtx.fillStyle = grad;
  frostCtx.fillRect(0, 0, frostCanvas.width, frostCanvas.height);
}

function scratchAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
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

resetFrost();

/* ==========================================================================
   3. PARTÍCULAS DE NIEVE Y EFECTOS
   ========================================================================== */
const flakes = Array.from({ length: 150 }, () => ({
  x: centerX + (Math.random() - 0.5) * radius * 1.7,
  y: centerY + (Math.random() - 0.5) * radius * 1.7,
  r: Math.random() * 4.2 + 1.6,
  vy: Math.random() * 1.2 + 0.45,
  vx: (Math.random() - 0.5) * 0.7,
  swayPhase: Math.random() * Math.PI * 2,
  alpha: Math.random() * 0.55 + 0.45
}));

function triggerShake() {
  shakeEnergy = 18;
  glowPulse = 1;
  flakes.forEach((f) => {
    f.vx = (Math.random() - 0.5) * 15;
    f.vy = (Math.random() - 0.75) * 15;
  });
  setStatus("¡Nieve agitada!");
}

function updateFlakes() {
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

/* ==========================================================================
   4. EVENTOS DE USUARIO Y COMPARTIR
   ========================================================================== */
photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      userImage = img;
      resetFrost();
      triggerShake();
      setStatus("Foto cargada. Desliza para limpiar la escarcha.");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

themeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    themeChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentTheme = chip.dataset.theme;
    setStatus(`Base cambiada a ${chip.textContent.toLowerCase()}.`);
  });
});

shakeBtn.addEventListener("click", triggerShake);

frostBtn.addEventListener("click", () => {
  resetFrost();
  setStatus("Escarcha renovada.");
});

canvas.addEventListener("pointerdown", (e) => {
  isScratching = true;
  scratchAt(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isScratching) return;
  scratchAt(e.clientX, e.clientY);
});

window.addEventListener("pointerup", () => {
  isScratching = false;
});

let lastAccel = { x: 0, y: 0, z: 0 };
window.addEventListener("devicemotion", (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;
  const delta =
    Math.abs(acc.x - lastAccel.x) +
    Math.abs(acc.y - lastAccel.y) +
    Math.abs(acc.z - lastAccel.z);
  if (delta > 28) {
    triggerShake();
  }
  lastAccel = { x: acc.x, y: acc.y, z: acc.z };
});

downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "mi-esfera-de-nieve.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("Postal descargada.");
});

shareBtn.addEventListener("click", async () => {
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "esfera-de-nieve.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Mi Esfera de Nieve Interactiva",
        text: dedicationInput.value.trim() || "Felices Fiestas",
        files: [file]
      });
      setStatus("Compartido correctamente.");
    } else {
      downloadBtn.click();
      setStatus("Compartir directo no disponible; imagen descargada.");
    }
  } catch (err) {
    setStatus("Envío cancelado.");
  }
});

/* ==========================================================================
   5. DIBUJO Y BUCLE PRINCIPAL
   ========================================================================== */
function drawBackground() {
  const bgGrad = ctx.createRadialGradient(centerX, centerY - 60, 40, centerX, H / 2, 500);
  bgGrad.addColorStop(0, "#1e3a5f");
  bgGrad.addColorStop(1, "#090f21");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
}

function drawBase(offsetX) {
  const theme = THEMES[currentTheme];
  ctx.save();
  ctx.translate(offsetX, 0);

  // Sombra de apoyo
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.beginPath();
  ctx.ellipse(centerX, 685, 195, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo de la base
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

  // Moldura superior
  ctx.fillStyle = theme.trim;
  ctx.fillRect(centerX - 150, 540, 300, 14);

  // Placa de dedicatoria
  ctx.fillStyle = theme.plate;
  ctx.beginPath();
  ctx.roundRect(centerX - 125, 582, 250, 54, 10);
  ctx.fill();
  ctx.strokeStyle = theme.plateBorder;
  ctx.lineWidth = 3;
  ctx.stroke();

  const text = dedicationInput.value.trim() || "Felices Fiestas";
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

  if (userImage) {
    const imgRatio = userImage.width / userImage.height;
    const boxSize = radius * 2;
    const drawW = imgRatio > 1 ? boxSize * imgRatio : boxSize;
    const drawH = imgRatio > 1 ? boxSize : boxSize / imgRatio;
    ctx.drawImage(userImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Toca 'Seleccionar foto'", centerX, centerY - 12);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
    ctx.fillText("para colocar tu imagen aquí", centerX, centerY + 22);
  }

  // Capa de escarcha
  ctx.drawImage(frostCanvas, centerX - radius, centerY - radius);

  // Base nevada interna
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + radius - 18, radius * 0.85, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Copos
  flakes.forEach((f) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Destello al agitar
  if (glowPulse > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${glowPulse * 0.16})`;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    glowPulse *= 0.92;
  }

  // Brillo curvo de cristal
  const gloss = ctx.createRadialGradient(
    centerX - 95,
    centerY - 105,
    10,
    centerX - 80,
    centerY - 90,
    155
  );
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Borde exterior de cristal
  ctx.save();
  ctx.translate(offsetX, 0);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function animate() {
  let offsetX = 0;
  if (shakeEnergy > 0.2) {
    offsetX = Math.sin(shakeEnergy * 2.6) * shakeEnergy * 0.7;
    shakeEnergy *= 0.9;
  } else {
    shakeEnergy = 0;
  }

  updateFlakes();
  drawBackground();
  drawGlobe(offsetX);
  drawBase(offsetX);

  requestAnimationFrame(animate);
}

animate();
                 
