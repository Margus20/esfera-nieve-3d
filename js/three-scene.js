import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, THEMES } from './state.js';

let scene, camera, renderer, controls;
let globeGlass, snowParticles, photoPlane, baseMesh, textMesh, textCanvas, textTexture, snowFloor, contactShadow;
let snowVelocity = [];

let frostProgress = 1.0; 
let isClearingFrost = false;
let isAssembling = false;
let assemblyProgress = 0;

// --- TEXTURAS PROCEDURALES PARA REALISMO ---
function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#6b3e1b';
  ctx.fillRect(0,0,512,512);
  ctx.strokeStyle = '#3e1d0d';
  ctx.lineWidth = 3;
  for(let i=0; i<80; i++) {
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y+30, 340, y-30, 512, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0,0,512,512);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  for(let i=0; i<40; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random()*512, Math.random()*512);
    ctx.bezierCurveTo(Math.random()*512, Math.random()*512, Math.random()*512, Math.random()*512, Math.random()*512, Math.random()*512);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// --- SOMBRA DE CONTACTO PARA LA FOTO ---
function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function initThree() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null; 

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 1, 22); 

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
  renderer.toneMapping = THREE.ACESFilmicToneMapping; 
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; 
  controls.dampingFactor = 0.05;
  controls.enablePan = false; 
  controls.minDistance = 12;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI / 2 + 0.2; 
  controls.enabled = false; 

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-5, 0, 5);
  scene.add(fillLight);

  // ==========================================
  // ELEMENTO 1: LA VASIJA (LatheGeometry Realista)
  // ==========================================
  const profilePoints = [];
  profilePoints.push(new THREE.Vector2(0, 0));
  profilePoints.push(new THREE.Vector2(4.2, 0));
  profilePoints.push(new THREE.Vector2(4.8, 0.6));
  profilePoints.push(new THREE.Vector2(4.4, 1.4));
  profilePoints.push(new THREE.Vector2(4.0, 1.4));
  profilePoints.push(new THREE.Vector2(0, 1.4));

  const baseGeo = new THREE.LatheGeometry(profilePoints, 64);
  
  const woodTex = createWoodTexture();
  const baseMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.1
  });
  
  baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -8;
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
  
  const textGeo = new THREE.CylinderGeometry(4.4, 4.4, 1, 64, 1, true);
  const textMat = new THREE.MeshStandardMaterial({
    map: textTexture,
    transparent: true,
    roughness: 0.3,
    metalness: 0.5 
  });
  textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.position.y = -6;
  scene.add(textMesh);

  document.fonts.ready.then(() => {
    updateBaseText(state.lastText || "Feliz Navidad", "gold");
  });

  // ==========================================
  // ELEMENTO 3: LA ESFERA (Cristal, Foto, Nieve)
  // ==========================================
  
  // 3.1 Piso de Nieve
  const snowFloorGeo = new THREE.SphereGeometry(4.8, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const positions = snowFloorGeo.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += (Math.random() - 0.5) * 0.1;
    positions[i+1] += (Math.random() - 0.5) * 0.1;
    positions[i+2] += (Math.random() - 0.5) * 0.1;
  }
  snowFloorGeo.computeVertexNormals();

  const snowFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, 
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  snowFloor = new THREE.Mesh(snowFloorGeo, snowFloorMat);
  snowFloor.position.y = -2.5;
  snowFloor.renderOrder = 1;
  scene.add(snowFloor);

  // 3.2 La Foto (Plano simple vertical, apoyado en la nieve)
  const photoGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const photoMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.0
  });
  photoPlane = new THREE.Mesh(photoGeo, photoMat);
  // El piso de nieve está en y=-2.5. La foto mide 3.5 de alto.
  // El centro debe estar en y = -2.5 + (3.5/2) = -2.5 + 1.75 = -0.75
  photoPlane.position.set(0, -0.75, 0);
  photoPlane.renderOrder = 10;
  scene.add(photoPlane);

  // 3.3 Sombra de contacto bajo la foto (nuevo)
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.8
  });
  contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, -2.45, 0);
  contactShadow.renderOrder = 5;
  scene.add(contactShadow);

  // 3.4 El Cristal (corregido para ser transparente como vidrio real)
  const glassGeo = new THREE.SphereGeometry(5, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false,
    side: THREE.FrontSide
  });
  globeGlass = new THREE.Mesh(glassGeo, glassMat);
  globeGlass.position.y = 0;
  globeGlass.renderOrder = 100;
  scene.add(globeGlass);

  // 3.5 La Nieve 3D
  const snowGeo = new THREE.BufferGeometry();
  const snowCount = 300; 
  const snowPositions = new Float32Array(snowCount * 3);
  
  for (let i = 0; i < snowCount; i++) {
    const r = 4.6 * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    
    snowPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    snowPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    snowPositions[i * 3 + 2] = r * Math.cos(phi);
    
    snowVelocity.push({ 
      baseSpeed: Math.random() * 0.01 + 0.005, 
      currentSpeed: Math.random() * 0.01 + 0.005,
      sway: Math.random() * Math.PI * 2 
    });
  }
  
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMat = new THREE.PointsMaterial({ 
    color: 0xffffff, 
    size: 0.12,
    transparent: true, 
    opacity: 0.9,
    depthWrite: false 
  });
  snowParticles = new THREE.Points(snowGeo, snowMat);
  snowParticles.renderOrder = 999; 
  scene.add(snowParticles);

  animate();
  window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES EXPORTABLES ---

export function updateBaseText(text, themeName = "gold") {
  const ctx = textCanvas.getContext('2d');
  
  if (themeName === 'midnight' || themeName === 'white') {
    ctx.fillStyle = '#f8fafc'; 
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#e2e8f0';
    for(let i=0; i<50; i++) {
       ctx.fillRect(Math.random()*textCanvas.width, Math.random()*textCanvas.height, Math.random()*40, 2);
    }
    ctx.fillStyle = '#0f172a'; 
  } else if (themeName === 'black') {
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#f8fafc';
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, textCanvas.height);
    grad.addColorStop(0, '#fdf08a');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#3b230a'; 
  }
  
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, textCanvas.width, 15);
  ctx.fillRect(0, textCanvas.height - 15, textCanvas.width, 15);
  
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
  
  photoPlane.material.map = texture;
  photoPlane.material.needsUpdate = true;
  
  addFrost3D(); 
}

export function updateBaseModel(baseType) {
  if (!baseMesh) return;
  
  if (baseType === 'wood') {
    baseMesh.material.map = createWoodTexture();
    baseMesh.material.color.set(0xffffff);
    baseMesh.material.roughness = 0.7;
    baseMesh.material.metalness = 0.1;
  } else if (baseType === 'marble') {
    baseMesh.material.map = createMarbleTexture();
    baseMesh.material.color.set(0xffffff); 
    baseMesh.material.roughness = 0.2;
    baseMesh.material.metalness = 0.1;
  } else if (baseType === 'gold') {
    baseMesh.material.map = null;
    baseMesh.material.color.set('#d4af37'); 
    baseMesh.material.roughness = 0.15;
    baseMesh.material.metalness = 0.9;
  }
  baseMesh.material.needsUpdate = true;
}

export function updateRibbonModel(ribbonType) {
  if (!textMesh) return;
  
  if (ribbonType === 'gold') {
    textMesh.material.metalness = 0.7;
    textMesh.material.roughness = 0.2;
    updateBaseText(state.lastText || "Feliz Navidad", "gold");
  } else if (ribbonType === 'black') {
    textMesh.material.metalness = 0.3;
    textMesh.material.roughness = 0.6;
    updateBaseText(state.lastText || "Feliz Navidad", "black");
  } else if (ribbonType === 'white') {
    textMesh.material.metalness = 0.1;
    textMesh.material.roughness = 0.4;
    updateBaseText(state.lastText || "Feliz Navidad", "white");
  }
  textMesh.material.needsUpdate = true;
}

export function assembleGlobe() {
  isAssembling = true;
  assemblyProgress = 0;
  controls.enabled = true; 
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
    globeGlass.material.roughness = 0.6;
    globeGlass.material.opacity = 0.5; 
    globeGlass.material.clearcoatRoughness = 0.5;
    globeGlass.material.needsUpdate = true;
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

  if (isAssembling && assemblyProgress < 1) {
    assemblyProgress += 0.02; 
    if (assemblyProgress > 1) assemblyProgress = 1;
    
    // La base sube de -8 a -5 (queda debajo de la esfera)
    baseMesh.position.y = THREE.MathUtils.lerp(-8, -5, assemblyProgress);
    // La cinta sube de -6 a -4.5 (queda en la unión base-esfera)
    textMesh.position.y = THREE.MathUtils.lerp(-6, -4.5, assemblyProgress);
  }

  if (snowParticles) {
    const positions = snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      positions[i3 + 1] -= snowVelocity[i].currentSpeed;
      positions[i3] += Math.sin(snowVelocity[i].sway) * 0.005;
      positions[i3 + 2] += Math.cos(snowVelocity[i].sway) * 0.005;
      snowVelocity[i].sway += 0.02;

      if (positions[i3 + 1] < -2.5) {
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

    globeGlass.material.opacity = THREE.MathUtils.lerp(0.15, 0.5, frostProgress);
    globeGlass.material.roughness = THREE.MathUtils.lerp(0.05, 0.6, frostProgress);
    globeGlass.material.clearcoatRoughness = THREE.MathUtils.lerp(0.05, 0.5, frostProgress);
    globeGlass.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
