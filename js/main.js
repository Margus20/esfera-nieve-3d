import * as dom from './dom.js';
import { state, GENERATION_PRICE_USD, VIDEO_DURATION_MS } from './state.js';
import { resetFrost, scratchAt } from './frost.js';
import { triggerShake } from './physics.js';
import { animate } from './renderer.js';

// --- EVENTOS DE USUARIO ---
dom.photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.userImage = img;
      resetFrost();
      triggerShake();
      dom.setStatus("Foto cargada. Desliza para limpiar la escarcha.");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

dom.themeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    dom.themeChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.currentTheme = chip.dataset.theme;
    dom.setStatus(`Base cambiada a ${chip.textContent.toLowerCase()}.`);
  });
});

dom.shakeBtn.addEventListener("click", triggerShake);

dom.frostBtn.addEventListener("click", () => {
  resetFrost();
  dom.setStatus("Escarcha renovada.");
});

dom.canvas.addEventListener("pointerdown", (e) => {
  state.isScratching = true;
  scratchAt(e.clientX, e.clientY);
});

dom.canvas.addEventListener("pointermove", (e) => {
  if (!state.isScratching) return;
  scratchAt(e.clientX, e.clientY);
});

window.addEventListener("pointerup", () => {
  state.isScratching = false;
});

let lastAccel = { x: 0, y: 0, z: 0 };
window.addEventListener("devicemotion", (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;
  const delta = Math.abs(acc.x - lastAccel.x) + Math.abs(acc.y - lastAccel.y) + Math.abs(acc.z - lastAccel.z);
  if (delta > 28) triggerShake();
  lastAccel = { x: acc.x, y: acc.y, z: acc.z };
});

dom.shareBtn.addEventListener("click", async () => {
  try {
    const blob = await new Promise((resolve) => dom.canvas.toBlob(resolve, "image/png"));
    if (!blob) return dom.setStatus("No se pudo generar la vista previa.");

    const file = new File([blob], "esfera-de-nieve.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Mi Esfera de Nieve Interactiva",
        text: dom.dedicationInput.value.trim() || "Felices Fiestas",
        files: [file]
      });
      dom.setStatus("Compartido correctamente.");
    } else {
      const link = document.createElement("a");
      link.download = "esfera-de-nieve.png";
      link.href = dom.canvas.toDataURL("image/png");
      link.click();
      dom.setStatus("Compartir directo no disponible; imagen descargada.");
    }
  } catch (err) {
    dom.setStatus("Envío cancelado.");
  }
});

// --- LÓGICA DE VIDEO Y PAGO ---
dom.videoBtn.addEventListener("click", () => {
  if (state.isRecording) return;
  dom.payModal.classList.add("open");
  dom.payModal.setAttribute("aria-hidden", "false");
});

dom.cancelPayBtn.addEventListener("click", () => {
  dom.payModal.classList.remove("open");
  dom.payModal.setAttribute("aria-hidden", "true");
});

dom.payModal.addEventListener("click", (e) => {
  if (e.target === dom.payModal) dom.payModal.classList.remove("open");
});

async function processOneDollarPayment() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ paid: true, amount: GENERATION_PRICE_USD }), 350);
  });
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function recordAndDownloadVideo(durationMs = VIDEO_DURATION_MS) {
  if (!dom.canvas.captureStream || typeof MediaRecorder === "undefined") {
    return dom.setStatus("Tu navegador no soporta grabación de video.");
  }

  const mimeType = getSupportedMimeType();
  const stream = dom.canvas.captureStream(30);
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];

  state.isRecording = true;
  dom.videoBtn.disabled = true;
  dom.setStatus("Grabando clip de 4 segundos...");
  triggerShake();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = () => {
    const finalType = recorder.mimeType || mimeType || "video/webm";
    const extension = finalType.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunks, { type: finalType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `esfera-de-nieve.${extension}`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
    state.isRecording = false;
    dom.videoBtn.disabled = false;
    dom.setStatus(`Video listo y descargado ($${GENERATION_PRICE_USD.toFixed(2)}).`);
  };

  recorder.start();
  setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, durationMs);
}

dom.confirmPayBtn.addEventListener("click", async () => {
  dom.payModal.classList.remove("open");
  dom.setStatus("Validando pago de $1.00...");
  const payment = await processOneDollarPayment();

  if (payment.paid) {
    await recordAndDownloadVideo(VIDEO_DURATION_MS);
  } else {
    dom.setStatus("No se pudo confirmar el pago.");
  }
});

// --- INICIO ---
animate();
