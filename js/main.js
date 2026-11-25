import * as dom from './dom.js';
import { state, GENERATION_PRICE_USD, VIDEO_DURATION_MS } from './state.js';
// Mantenemos assembleGlobe en las importaciones
import { initThree, updatePhoto, updateBaseText, updateBaseTheme, shake3DSnow, getRendererCanvas, clearFrost3D, addFrost3D, assembleGlobe } from './three-scene.js';
import { iniciarProcesoVideo } from './payment.js';

/* ==========================================================================
   1. INICIALIZACIÓN DEL MOTOR 3D
   ========================================================================== */
initThree();

/* ==========================================================================
   2. EVENTOS DE LA INTERFAZ (FOTO Y TEXTO)
   ========================================================================== */
// Cargar foto
dom.photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.userImage = img;
      updatePhoto(img); // Manda la foto a Three.js
      
      // ¡CAMBIO AQUÍ! Ya no ensamblamos automáticamente.
      // En su lugar, le pedimos al usuario que termine de personalizar.
      
      shake3DSnow();    // Agita la nieve al poner la foto
      dom.setStatus("Foto cargada. Personaliza y pulsa 'Armar Esfera'.");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Actualizar texto de la base en tiempo real
dom.dedicationInput.addEventListener("input", (e) => {
  const text = e.target.value.trim() || "Feliz Navidad";
  state.lastText = text; 
  updateBaseText(text, state.currentTheme); 
});

// Cambiar tema de la base (Madera, Oro, Medianoche)
dom.themeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    dom.themeChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.currentTheme = chip.dataset.theme;
    updateBaseTheme(chip.dataset.theme); 
    dom.setStatus(`Base cambiada a ${chip.textContent.toLowerCase()}.`);
  });
});

/* ==========================================================================
   3. ACCIONES 3D (AGITAR, LIMPIAR ESCARCHA Y SENSOR)
   ========================================================================== */
// Botón Agitar: Mueve la nieve y vuelve a empañar el cristal
dom.shakeBtn.addEventListener("click", () => {
  shake3DSnow();
  addFrost3D(); 
  dom.setStatus("¡Nieve agitada! La escarcha ha vuelto.");
});

// Botón Limpiar Escarcha: Hace la animación de transparencia automática
dom.frostBtn.addEventListener("click", () => {
  clearFrost3D();
  dom.setStatus("Limpiando la escarcha... ¡Mira cómo se revela la foto!");
});

// Sensor de movimiento (Agitar el dispositivo físico)
let lastAccel = { x: 0, y: 0, z: 0 };
window.addEventListener("devicemotion", (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;
  const delta = Math.abs(acc.x - lastAccel.x) + Math.abs(acc.y - lastAccel.y) + Math.abs(acc.z - lastAccel.z);
  if (delta > 28) {
    shake3DSnow();
    addFrost3D(); 
    dom.setStatus("¡Agitado por movimiento!");
  }
  lastAccel = { x: acc.x, y: acc.y, z: acc.z };
});

/* ==========================================================================
   4. COMPARTIR IMAGEN (CAPTURA 3D)
   ========================================================================== */
dom.shareBtn.addEventListener("click", async () => {
  try {
    const canvas3D = getRendererCanvas();
    const blob = await new Promise((resolve) => canvas3D.toBlob(resolve, "image/png"));
    
    if (!blob) return dom.setStatus("No se pudo generar la vista previa.");

    const file = new File([blob], "esfera-navidad-3d.png", { type: "image/png" });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Mi Esfera de Nieve 3D",
        text: dom.dedicationInput.value.trim() || "¡Feliz Navidad!",
        files: [file]
      });
      dom.setStatus("Compartido correctamente.");
    } else {
      const link = document.createElement("a");
      link.download = "esfera-navidad-3d.png";
      link.href = canvas3D.toDataURL("image/png");
      link.click();
      dom.setStatus("Compartir directo no disponible; imagen descargada.");
    }
  } catch (err) {
    dom.setStatus("Envío cancelado.");
  }
});

/* ==========================================================================
   5. GRABACIÓN DE VIDEO Y PAGOS
   ========================================================================== */
function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function recordAndDownloadVideo(durationMs = VIDEO_DURATION_MS) {
  const canvas3D = getRendererCanvas();

  if (!canvas3D.captureStream || typeof MediaRecorder === "undefined") {
    return dom.setStatus("Tu navegador no soporta grabación de video 3D.");
  }

  const mimeType = getSupportedMimeType();
  const stream = canvas3D.captureStream(30); 
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];

  state.isRecording = true;
  dom.videoBtn.disabled = true;
  dom.setStatus("Grabando clip 3D...");
  
  shake3DSnow(); 

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
    link.download = `esfera-3d-navidad.${extension}`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
    state.isRecording = false;
    dom.videoBtn.disabled = false;
    dom.setStatus(`¡Video 3D descargado con éxito!`);
  };

  recorder.start();
  setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, durationMs);
}

dom.videoBtn.addEventListener("click", () => {
  if (state.isRecording) return;
  iniciarProcesoVideo(recordAndDownloadVideo); 
});

/* ==========================================================================
   6. NUEVO: BOTÓN PARA ENSAMBLAR LA ESFERA (Se conectará con el HTML)
   ========================================================================== */
// Verificamos si el botón existe en el DOM para que no dé error mientras lo creamos
if (dom.assembleBtn) {
  dom.assembleBtn.addEventListener("click", () => {
    assembleGlobe(); // Llama a la animación en three-scene.js
    dom.setStatus("¡Esfera ensamblada! Ya puedes agitarla y quitarle la escarcha.");
    
    // Opcional: Ocultar el botón después de armar
    dom.assembleBtn.style.display = 'none';
  });
}
