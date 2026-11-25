const videoBtn = document.getElementById("videoBtn");
const payModal = document.getElementById("payModal");
const cancelPayBtn = document.getElementById("cancelPayBtn");
const confirmPayBtn = document.getElementById("confirmPayBtn");

const GENERATION_PRICE_USD = 1.0;
const VIDEO_DURATION_MS = 4000;
let isRecording = false;

function openPayModal() {
  if (isRecording) return;
  payModal.classList.add("open");
  payModal.setAttribute("aria-hidden", "false");
}

function closePayModal() {
  payModal.classList.remove("open");
  payModal.setAttribute("aria-hidden", "true");
}

videoBtn.addEventListener("click", openPayModal);
cancelPayBtn.addEventListener("click", closePayModal);

payModal.addEventListener("click", (e) => {
  if (e.target === payModal) closePayModal();
});

// Aquí en el futuro integrarías la verificación real del pago de $1.00
async function processOneDollarPayment() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ paid: true, amount: GENERATION_PRICE_USD });
    }, 350);
  });
}

function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4"
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function recordAndDownloadVideo(durationMs = VIDEO_DURATION_MS) {
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    setStatus("Tu navegador no soporta grabación de video desde canvas.");
    return;
  }

  const mimeType = getSupportedMimeType();
  const stream = canvas.captureStream(30);
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks = [];
  isRecording = true;
  videoBtn.disabled = true;
  setStatus("Grabando clip de 4 segundos...");
  triggerShake();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
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
    isRecording = false;
    videoBtn.disabled = false;
    setStatus(`Video listo y descargado ($${GENERATION_PRICE_USD.toFixed(2)}).`);
  };

  recorder.start();
  setTimeout(() => {
    if (recorder.state === "recording") {
      recorder.stop();
    }
  }, durationMs);
}

confirmPayBtn.addEventListener("click", async () => {
  closePayModal();
  setStatus("Validando pago de $1.00...");
  const payment = await processOneDollarPayment();

  if (payment.paid) {
    await recordAndDownloadVideo(VIDEO_DURATION_MS);
  } else {
    setStatus("No se pudo confirmar el
              pago.");
  }
});
