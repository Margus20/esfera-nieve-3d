import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, THEMES } from './state.js';

let scene, camera, renderer, controls;
let globeGlass, snowParticles, photoGroup, baseMesh, textMesh, textCanvas, textTexture, snowFloor;
let snowVelocity = [];

let frostProgress = 1.0; 
let isClearingFrost = false;

// Variables para la animación de ensamblaje
let isAssembling = false;
let assemblyProgress = 0;

export function initThree() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null; 

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 26); 

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
  controls.minDistance = 15;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2 + 0.2; 

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // ==========================================
  // ELEMENTO 1: LA VASIJA (Soporte)
  // ==========================================
  const baseGeo = new THREE.CylinderGeometry(4.5, 5, 1.5, 64);
  const baseMat = new THREE.MeshStandardMaterial({
    color: THEMES[state.currentTheme].stops[1],
    roughness: 0.4,
    metalness: 0.1
  });
  baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -8; // Empieza abajo
  scene.add(baseMesh);

  // ==========================================
  // ELEMENTO 2: EL ANILLO DE TEXTO (Cinta)
  // ==========================================
  textCanvas = document.createElement('canvas');
  textCanvas.width = 2048; 
  textCanvas.height = 512;
  textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.colorSpace = THREE.SRGBColorSpace;
  textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  
  const textGeo = new THREE.CylinderGeometry(4.8, 4.8, 1, 64, 1, true);
  const textMat = new THREE.MeshStandardMaterial({
    map: textTexture,
    transparent: true,
    roughness: 0.2,
    metalness: 0.4 
  });
  textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.position.y = -4.5; // Empieza flotando
  scene.add(textMesh);

  document.fonts.ready.then(() => {
    updateBaseText(state.lastText || "Feliz Navidad", state.currentTheme);
  });

  // ==========================================
  // ELEMENTO 3: LA ESFERA
  // ==========================================
  const snowFloorGeo = new THREE.SphereGeometry(4.9, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const snowFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, 
    roughness: 0.9,
    metalness: 0.1
  });
  snowFloor = new THREE.Mesh(snowFloorGeo, snowFloorMat);
  snowFloor.position.y = 0;
  scene.add(snowFloor);

  photoGroup = new THREE.Group();
  const photoGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const photoMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.1
  });

  for(let i = 0; i < 4; i++) {
    const plane = new THREE.Mesh(photoGeo, photoMat.clone());
    const angle = (i * Math.PI) / 2;
    plane.position.x = Math.sin(angle) * 2.2;
    plane.position.z = Math.cos(angle) * 2.2;
    plane.rotation.y = angle;
    plane.position.y = 0.5; 
    photoGroup.add(plane);
  }
  scene.add(photoGroup);

  const glassGeo = new THREE.SphereGeometry(5, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.9,      
    transparent: true,
    opacity: 0.85,       
    clearcoat: 1.0,
    clearcoatRoughness: 0.8
  });
  globeGlass = new THREE.Mesh(glassGeo, glassMat);
  globeGlass.position.y = 0;
  scene.add(globeGlass);

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
  snowParticles.renderOrder = 999; 
  scene.add(snowParticles);

  animate();
  window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES EXPORTABLES ---

export function updateBaseText(text, themeName = "wood") {
  const ctx = textCanvas.getContext('2d');
  const theme = THEMES[themeName];
  
  if (themeName === 'midnight') {
    ctx.fillStyle = '#f8fafc'; 
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#e2e8f0';
    for(let i=0; i<50; i++) {
       ctx.fillRect(Math.random()*textCanvas.width, Math.random()*textCanvas.height, Math.random()*40, 2);
    }
    ctx.fillStyle = theme.text; 
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, textCanvas.height);
    grad.addColorStop(0, '#fdf08a');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = theme.text; 
  }
  
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, textCanvas.width, 10);
  ctx.fillRect(0, textCanvas.height - 10, textCanvas.width, 10);
  
  let fontSize = 180; 
  ctx.font = `bold ${fontSize}px 'Mountains of Christmas', cursive, serif`;
  
  while (ctx.measureText(text).width > textCanvas.width * 0.85 && fontSize > 40) {
    fontSize -= 10;
    ctx.font = `bold ${fontSize}px 'Mountains of Christmas', cursive, serif`;
  }
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);
  ctx.shadowColor = 'transparent';
  
  if (textTexture) textTexture.needsUpdate = true;
}

export function updatePhoto(img) {
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  
  photoGroup.children.forEach(plane => {
    plane.material.map = texture;
    plane.material.needsUpdate = true;
  });
  
  addFrost3D(); 
}

// --- NUEVAS FUNCIONES PARA CAMBIAR MODELOS ---

export function updateBaseModel(baseType) {
  if (!baseMesh) return;
  
  if (baseType === 'wood') {
    baseMesh.material.color.set('#8b4513');
    baseMesh.material.roughness = 0.6;
    baseMesh.material.metalness = 0.1;
  } else if (baseType === 'marble') {
    baseMesh.material.color.set('#f8fafc'); // Blanco mármol
    baseMesh.material.roughness = 0.2;
    baseMesh.material.metalness = 0.0;
  } else if (baseType === 'gold') {
    baseMesh.material.color.set('#d4af37'); // Dorado
    baseMesh.material.roughness = 0.1;
    baseMesh.material.metalness = 0.8;
  }
  baseMesh.material.needsUpdate = true;
}

export function updateRibbonModel(ribbonType) {
  if (!textMesh) return;
  
  if (ribbonType === 'gold') {
    // El oro ya está en la textura del canvas, solo ajustamos material
    textMesh.material.metalness = 0.6;
    textMesh.material.roughness = 0.1;
  } else if (ribbonType === 'black') {
    // Si eligen cinta negra, cambiamos el material a negro
    textMesh.material.map = null; 
    textMesh.material.color.set('#0f172a');
    textMesh.material.metalness = 0.2;
    textMesh.material.roughness = 0.5;
  } else if (ribbonType === 'white') {
    textMesh.material.map = null;
    textMesh.material.color.set('#ffffff');
    textMesh.material.metalness = 0.1;
    textMesh.material.roughness = 0.4;
  }
  textMesh.material.needsUpdate = true;
}

// --- FUNCIÓN DE ENSAMBLAJE ---
export function assembleGlobe() {
  isAssembling = true;
  assemblyProgress = 0;
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
    globeGlass.material.opacity = 0.85; 
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

  // --- ANIMACIÓN DE ENSAMBLAJE ---
  if (isAssembling && assemblyProgress < 1) {
    assemblyProgress += 0.02; // Velocidad de acople
    if (assemblyProgress > 1) assemblyProgress = 1;
    
    // La vasija sube de -8 a -5.5 (donde toca la esfera)
    baseMesh.position.y = THREE.MathUtils.lerp(-8, -5.5, assemblyProgress);
    
    // El anillo sube de -4.5 a -5.0 (para que quede entre la esfera y la vasija)
    textMesh.position.y = THREE.MathUtils.lerp(-4.5, -5.0, assemblyProgress);
  }

  if (snowParticles) {
    const positions = snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      positions[i3 + 1] -= snowVelocity[i].currentSpeed;
      positions[i3] += Math.sin(snowVelocity[i].sway) * 0.005;
      positions[i3 + 2] += Math.cos(snowVelocity[i].sway) * 0.005;
      snowVelocity[i].sway += 0.02;

      if (positions[i3 + 1] < -3.5) {
        positions[i3 + 1] = 4.5;
        positions[i3] = (Math.random() - 0.5) * 8;
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
        snowVelocity[i].currentSpeed = snowVelocity[i].baseSpeed; 
      }
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  if (isClearingFrost && frostProgress > 0) {
    frostProgress -= 0.02; 
    if (frostProgress < 0) frostProgress = 0;

    globeGlass.material.opacity = THREE.MathUtils.lerp(0.0, 0.85, frostProgress);
    globeGlass.material.roughness = THREE.MathUtils.lerp(0.0, 0.9, frostProgress);
    globeGlass.material.clearcoatRoughness = THREE.MathUtils.lerp(0.0, 0.8, frostProgress);
    globeGlass.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
                             }
