import { state, VIDEO_DURATION_MS } from './state.js';
import { setStatus, mainTitle, videoBtn } from './dom.js';

/* ==========================================================================
   1. BOTÓN SECRETO: MODO SUITE (Toca el título 5 veces)
   ========================================================================== */
let tapCount = 0;
let tapTimer;

if (mainTitle) {
  mainTitle.addEventListener("pointerdown", () => {
    tapCount++;
    clearTimeout(tapTimer);
    
    // Si llega a 5 toques
    if (tapCount === 5) {
      state.isDeveloper = !state.isDeveloper; // Invierte el estado (On/Off)
      localStorage.setItem('devSuite', state.isDeveloper);
      
      if (state.isDeveloper) {
        setStatus("👑 Modo Suite Activado (Gratis Ilimitado)");
      } else {
        setStatus("Modo normal restaurado.");
      }
      tapCount = 0; // Reinicia el contador
    }

    // Si pasan 1.5 segundos sin tocar, reinicia el contador
    tapTimer = setTimeout(() => { 
      tapCount = 0; 
    }, 1500); 
  });
}

/* ==========================================================================
   2. FUNCIÓN PRINCIPAL DE PAGO Y GENERACIÓN DE VIDEO
   ========================================================================== */
// Recibimos la función de grabación desde main.js como parámetro
export async function iniciarProcesoVideo(recordFunction) {
  // Verificamos si ya está grabando para no saturar
  if (state.isRecording) return;

  // CASO A: Eres el desarrollador (Modo Suite) o ya pagaste antes
  if (state.isDeveloper || state.isPremium) {
    setStatus(state.isDeveloper ? "👑 Acceso Suite: Generando video gratis..." : "✨ Acceso Premium: Generando video...");
    
    // Ejecutamos la grabación directamente
    await recordFunction(VIDEO_DURATION_MS);
    return;
  }

  // CASO B: Usuario normal. Iniciar flujo de pago.
  setStatus("Abriendo pasarela de Binance Pay...");
  
  // ⚠️ NOTA PARA EL FUTURO:
  // Aquí es donde irá la llamada real a tu servidor en Vercel cuando configures Binance.
  // const response = await fetch('/api/create-order', { method: 'POST' });
  // const data = await response.json();
  // window.open(data.checkoutUrl, '_blank');
  
  // Por ahora, como estamos en GitHub Pages (solo frontend), simulamos la pasarela:
  const confirmacion = confirm("💳 SIMULACIÓN DE PAGO\n\nEsto simula el pago de $1.00 vía Binance Pay.\n\n¿Deseas confirmar el pago y generar tu video 3D?");
  
  if (confirmacion) {
    setStatus("✅ Pago confirmado. Preparando esfera 3D...");
    
    // En una app real, esto se activaría cuando Binance nos confirme el pago (Webhook)
    // Para pruebas, lo desbloqueamos temporalmente.
    state.isPremium = true; 
    localStorage.setItem('isPremium', 'true'); 
    
    // Ejecutamos la grabación
    await recordFunction(VIDEO_DURATION_MS);
    
    // Opcional: Si quieres que sea un pago por uso, puedes volver a poner isPremium en false aquí.
    // state.isPremium = false;
    // localStorage.setItem('isPremium', 'false');
    
  } else {
    setStatus("Pago cancelado. No se ha generado el video.");
  }
}
