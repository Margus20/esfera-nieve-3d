import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, THEMES } from './state.js';

let scene, camera, renderer, controls;
let globeGlass, snowParticles, photoPlane, baseMesh, textMesh, textCanvas, textTexture;
let snowVelocity = [];

let frostProgress = 1.0; // 1.0 = Empañado, 0.0 = Limpio
let isClearingFrost = false;

export function initThree() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null; 

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 18); 

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
  renderer.toneMapping = THREE.ACESFilmicToneMapping; 
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; 
  controls.dampingFactor = 0.05;
  controls.enablePan = false; 
  controls.minDistance = 10;
  controls.maxDistance = 25;
  controls.maxPolarAngle = Math.PI / 2 + 0.2; 

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // 3. La Base (Cilindro principal)
  const baseGeo = new THREE.CylinderGeometry(5, 5.2, 1.5, 64);
  const baseMat = new THREE.MeshStandardMaterial({
    color: THEMES[state.currentTheme].stops[1],
    roughness: 0.4,
    metalness: 0.1
  });
  baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -4.5;
  scene.add(baseMesh);

  // 3.1 LA PLAQUITA FRONTAL (Más delgada y estilizada)
  textCanvas = document.createElement('canvas');
  // Aumentamos la resolución para que no tenga dientes de sierra
  textCanvas.width = 2048; 
  textCanvas.height = 512;
  textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.colorSpace = THREE.SRGBColorSpace;
  textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Mejora la nitidez
  
  // Geometría de cilindro abierto, altura reducida a 0.6 para que sea estilizada
  const textGeo = new THREE.CylinderGeometry(5.05, 5.15, 0.6, 64, 1, true, -Math.PI / 4, Math.PI / 2);
  const textMat = new THREE.MeshStandardMaterial({
    map: textTexture,
    transparent: true,
    roughness: 0.2, // Más brillante
    metalness: 0.4  // Efecto metálico/oro
  });
  textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.position.y = -4.5;
  scene.add(textMesh);

  // Esperar a que la fuente navideña cargue antes de dibujar el texto
  document.fonts.ready.then(() => {
    updateBaseText(state.lastText || "Feliz Navidad", state.currentTheme);
  });

  // 4. La Foto
  const photoGeo = new THREE.PlaneGeometry(4, 4);
  const photoMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  });
  photoPlane = new THREE.Mesh(photoGeo, photoMat);
  photoPlane.position.set(0, 0, 0); 
  scene.add(photoPlane);

  // 5. El Cristal (SOLUCIÓN DEFINITIVA: Usamos opacidad en lugar de transmission)
  const glassGeo = new THREE.SphereGeometry(5, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.9,      // Empieza empañado (rugoso)
    transparent: true,
    opacity: 0.85,       // Empieza semi-opaco
    clearcoat: 1.0,
    clearcoatRoughness: 0.8
  });
  globeGlass = new THREE.Mesh(glassGeo, glassMat);
  globeGlass.position.y = 0;
  scene.add(globeGlass);

  // 6. La Nieve 3D
  const snowGeo = new THREE.BufferGeometry();
  const snowCount = 300; 
  const positions = new Float32Array(snowCount * 3);
  
  for (let i = 0; i < snowCount; i++) {
    const r = 4.6 * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    snowVelocity.push({ 
      baseSpeed: Math.random() * 0.01 + 0.005, 
      currentSpeed: Math.random() * 0.01 + 0.005,
      sway: Math.random() * Math.PI * 2 
    });
  }
  
  snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const snowMat = new THREE.PointsMaterial({ 
    color: 0xffffff, 
    size: 0.15, 
    transparent: true, 
    opacity: 0.8,
    depthWrite: false 
  });
  snowParticles = new THREE.Points(snowGeo, snowMat);
  scene.add(snowParticles);

  animate();
  window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES EXPORTABLES ---

export function updateBaseText(text, themeName = "wood") {
  const ctx = textCanvas.getContext('2d');
  const theme = THEMES[themeName];
  
  // Fondo de la placa
  if (themeName === 'midnight') {
    // Efecto Cuarzo/Granito Blanco para Medianoche
    ctx.fillStyle = '#f8fafc'; 
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    // Sutiles vetas de granito
    ctx.fillStyle = '#e2e8f0';
    for(let i=0; i<50; i++) {
       ctx.fillRect(Math.random()*textCanvas.width, Math.random()*textCanvas.height, Math.random()*40, 2);
    }
    ctx.fillStyle = theme.text; // Texto azul oscuro
  } else {
    // Efecto Oro Pulido para Madera y Dorado
    const grad = ctx.createLinearGradient(0, 0, 0, textCanvas.height);
    grad.addColorStop(0, '#fdf08a');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = theme.text; // Texto oscuro
  }
  
  // Bordes decorativos
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, textCanvas.width, 10);
  ctx.fillRect(0, textCanvas.height - 10, textCanvas.width, 10);
  
  // Tipografía Navideña
  let fontSize = 180; // Letra inicial grande
  ctx.font = `bold ${fontSize}px 'Mountains of Christmas', cursive, serif`;
  
  // Auto-escalado
  while (ctx.measureText(text).width > textCanvas.width * 0.85 && fontSize > 40) {
    fontSize -= 10;
    ctx.font = `bold ${fontSize}px 'Mountains of Christmas', cursive, serif`;
  }
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Sombra suave para simular grabado
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);
  
  // Resetear sombra
  ctx.shadowColor = 'transparent';
  
  if (textTexture) textTexture.needsUpdate = true;
}

export function updatePhoto(img) {
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  
  photoPlane.material.map = texture;
  photoPlane.material.needsUpdate = true;
  
  addFrost3D(); 
}

export function updateBaseTheme(themeName) {
  const theme = THEMES[themeName];
  if (theme && baseMesh) {
    baseMesh.material.color.set(theme.stops[1]); 
    updateBaseText(state.lastText || "Feliz Navidad", themeName);
  }
}

export function shake3DSnow() {
  snowVelocity.forEach(v => {
    v.currentSpeed = v.baseSpeed + (Math.random() * 0.08 + 0.05); 
    v.sway += Math.random() * 5; 
  });
}

export function clearFrost3D() { isClearingFrost = true; }

export function addFrost3D() {
  frostProgress = 1.0;
  isClearingFrost = false;
  if (globeGlass) {
    globeGlass.material.roughness = 0.9;
    globeGlass.material.opacity = 0.85; // Vuelve a empañarse
    globeGlass.material.clearcoatRoughness = 0.8;
  }
}

export function getRendererCanvas() { return renderer.domElement; }

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (snowParticles) {
    const positions = snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      positions[i3 + 1] -= snowVelocity[i].currentSpeed;
      positions[i3] += Math.sin(snowVelocity[i].sway) * 0.005;
      positions[i3 + 2] += Math.cos(snowVelocity[i].sway) * 0.005;
      snowVelocity[i].sway += 0.02;

      if (positions[i3 + 1] < -4.5) {
        positions[i3 + 1] = 4.5;
        positions[i3] = (Math.random() - 0.5) * 8;
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
        snowVelocity[i].currentSpeed = snowVelocity[i].baseSpeed; 
      }
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  // --- ANIMACIÓN DE LIMPIEZA (Usando Opacidad y Rugosidad) ---
  if (isClearingFrost && frostProgress > 0) {
    frostProgress -= 0.02; 
    if (frostProgress < 0) frostProgress = 0;

    // Transición suave: opacity de 0.85 a 0.0, roughness de 0.9 a 0.0
    globeGlass.material.opacity = THREE.MathUtils.lerp(0.0, 0.85, frostProgress);
    globeGlass.material.roughness = THREE.MathUtils.lerp(0.0, 0.9, frostProgress);
    globeGlass.material.clearcoatRoughness = THREE.MathUtils.lerp(0.0, 0.8, frostProgress);
    globeGlass.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
