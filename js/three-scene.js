import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, THEMES } from './state.js';

let scene, camera, renderer, controls;
let globeGlass, snowParticles, photoPlane, baseMesh, textCanvas, textTexture;
let snowVelocity = [];

export function initThree() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Configuración básica de la escena
  scene = new THREE.Scene();
  
  // (Opcional) Fondo transparente para que se vea el fondo minimalista del CSS
  scene.background = null; 

  // Cámara (Perspectiva, relación de aspecto, planos de recorte)
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 16);

  // Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimización para móviles
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Colores realistas
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Controles táctiles (Girar la esfera con el dedo)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Efecto de inercia suave
  controls.dampingFactor = 0.05;
  controls.enablePan = false; // Evita que el usuario mueva la esfera de su sitio
  controls.minDistance = 10;
  controls.maxDistance = 22;
  controls.maxPolarAngle = Math.PI / 2 + 0.2; // Evita ver por debajo de la mesa

  // 2. Iluminación y Entorno (Vital para el efecto Cristal)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // 3. La Base (Cilindro)
  textCanvas = document.createElement('canvas');
  textCanvas.width = 1024; // Alta resolución para el texto
  textCanvas.height = 256;
  textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.colorSpace = THREE.SRGBColorSpace;
  
  updateBaseText("Feliz Navidad"); // Texto por defecto

  const baseGeo = new THREE.CylinderGeometry(4.5, 4.8, 1.5, 64);
  const baseMat = new THREE.MeshStandardMaterial({
    color: THEMES.wood.stops[1],
    roughness: 0.4,
    metalness: 0.1,
    map: textTexture
  });
  baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -4.5;
  scene.add(baseMesh);

  // 4. La Foto (Plano 2D que vive dentro de la esfera)
  const photoGeo = new THREE.PlaneGeometry(5.5, 5.5);
  const photoMat = new THREE.MeshBasicMaterial({ 
    color: 0xeeeeee,
    transparent: true,
    opacity: 0.9
  });
  photoPlane = new THREE.Mesh(photoGeo, photoMat);
  photoPlane.position.set(0, 0, -1.5); // Al fondo de la esfera
  scene.add(photoPlane);

  // 5. El Cristal de la Esfera
  const glassGeo = new THREE.SphereGeometry(5, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,     // Muy liso
    transmission: 1.0,   // Transmisión de luz (Efecto vidrio)
    thickness: 1.5,      // Grosor del cristal
    ior: 1.5,            // Índice de refracción
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
  });
  globeGlass = new THREE.Mesh(glassGeo, glassMat);
  globeGlass.position.y = 0;
  scene.add(globeGlass);

  // 6. La Nieve 3D
  const snowGeo = new THREE.BufferGeometry();
  const snowCount = 300; // Cantidad de copos
  const positions = new Float32Array(snowCount * 3);
  
  for (let i = 0; i < snowCount; i++) {
    // Distribución esférica dentro del cristal
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

  // Iniciar animación
  animate();

  // Adaptar a pantallas que cambian de tamaño (Responsive)
  window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES EXPORTABLES PARA MAIN.JS ---

export function updateBaseText(text) {
  const ctx = textCanvas.getContext('2d');
  ctx.fillStyle = '#f5d77f'; // Fondo dorado
  ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  
  // Borde superior e inferior para que parezca una placa metálica
  ctx.fillStyle = '#9a7b2c';
  ctx.fillRect(0, 0, textCanvas.width, 15);
  ctx.fillRect(0, textCanvas.height - 15, textCanvas.width, 15);
  
  ctx.fillStyle = '#3b230a'; // Texto oscuro
  ctx.font = 'bold 100px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);
  
  if (textTexture) textTexture.needsUpdate = true;
}

export function updatePhoto(img) {
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  
  photoPlane.material.map = texture;
  photoPlane.material.color.setHex(0xffffff); // Quita el color gris
  photoPlane.material.opacity = 1.0;
  photoPlane.material.needsUpdate = true;
}

export function updateBaseTheme(themeName) {
  const theme = THEMES[themeName];
  if (theme && baseMesh) {
    baseMesh.material.color.set(theme.stops[1]); // Usa el color central del tema
  }
}

export function shake3DSnow() {
  snowVelocity.forEach(v => {
    // Aumenta la velocidad de caída temporalmente
    v.currentSpeed = v.baseSpeed + (Math.random() * 0.08 + 0.05); 
    v.sway += Math.random() * 5; // Desordena el vaivén
  });
}

export function getRendererCanvas() {
  return renderer.domElement;
}

// --- BUCLE DE ANIMACIÓN ---

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

  // Animación de la nieve
  if (snowParticles) {
    const positions = snowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      
      // Caída (Y)
      positions[i3 + 1] -= snowVelocity[i].currentSpeed;
      
      // Vaivén lateral (X y Z)
      positions[i3] += Math.sin(snowVelocity[i].sway) * 0.005;
      positions[i3 + 2] += Math.cos(snowVelocity[i].sway) * 0.005;
      snowVelocity[i].sway += 0.02;

      // Si el copo toca el fondo de la esfera, reiniciarlo arriba
      if (positions[i3 + 1] < -4.5) {
        positions[i3 + 1] = 4.5;
        positions[i3] = (Math.random() - 0.5) * 8;
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
        // Restaurar la velocidad normal después del "shake"
        snowVelocity[i].currentSpeed = snowVelocity[i].baseSpeed; 
      }
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}
