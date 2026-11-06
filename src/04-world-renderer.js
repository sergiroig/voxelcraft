// VoxelCraft HTML5 — 04-world-renderer.js (7. WORLD STATE, 8. THREE.JS SCENE, GPU SHADERS, POOLS & 8B. DYNAMIC SKY)
'use strict';

// ============================================================================
// 7. WORLD STATE, LIGHTING & CHUNK STORAGE
// ============================================================================
const STORAGE_KEY = 'voxelcraft_opt_save_v2';
let worldSeed = 42069;
let worldDeltas = {};
let chestLootMap = {};
let waypoints = [{ name: 'Base Inicial', x: 8, y: 28, z: 8, color: '#38bdf8' }];
let sunFactor = 1.0;

function loadSaveData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.seed === 'number') {
      worldSeed = parsed.seed;
      worldDeltas = parsed.deltas || {};
      if (parsed.chests && typeof parsed.chests === 'object') chestLootMap = parsed.chests;
      if (Array.isArray(parsed.waypoints) && parsed.waypoints.length > 0) waypoints = parsed.waypoints;
      if (parsed.inventory && typeof parsed.inventory === 'object') Object.assign(inventoryCounts, parsed.inventory);
      if (Array.isArray(parsed.hotbar) && parsed.hotbar.length === 9) for (let i = 0; i < 9; i++) hotbarSlots[i] = parsed.hotbar[i];
    }
  } catch (_) {}
}

function saveWorldData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed: worldSeed, deltas: worldDeltas, chests: chestLootMap, waypoints, inventory: inventoryCounts, hotbar: hotbarSlots }));
  } catch (_) {}
}

loadSaveData();
let generator = createWorldGenerator(worldSeed);

const chunks = new Map();
const buildQueue = [];

const chunkKey = (cx, cz) => `${cx},${cz}`;
const voxelIndex = (lx, y, lz) => (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT + y;

function getChunkData(cx, cz) {
  const key = chunkKey(cx, cz);
  let ch = chunks.get(key);
  if (!ch) {
    const data = generator.generateChunkVoxels(cx, cz, worldDeltas[key]);
    const light = new Uint8Array(CHUNK_VOLUME);
    ch = { cx, cz, data, light, lightReady: false, solidMesh: null, waterMesh: null, dirty: true, queued: false, meshVersion: 0 };
    chunks.set(key, ch);
  }
  return ch;
}

function getChunkIfLoaded(cx, cz) {
  return chunks.get(chunkKey(cx, cz));
}

function getVoxelGlobal(wx, wy, wz) {
  if (wy < 0) return BLOCK.BEDROCK;
  if (wy >= CHUNK_HEIGHT) return BLOCK.AIR;
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch) return BLOCK.AIR;
  return ch.data[((wz - cz * CHUNK_SIZE) * CHUNK_SIZE + (wx - cx * CHUNK_SIZE)) * CHUNK_HEIGHT + wy];
}

function getLightGlobal(wx, wy, wz) {
  if (wy < 0) return 0;
  if (wy >= CHUNK_HEIGHT) return 0xF0;
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch || !ch.lightReady) return 0xF0;
  return ch.light[((wz - cz * CHUNK_SIZE) * CHUNK_SIZE + (wx - cx * CHUNK_SIZE)) * CHUNK_HEIGHT + wy];
}

// Active Cellular Automata Tick Queue (Falling Sand & Flowing Water)
const simQueue = new Set();

function enqueueSimNeighbors(wx, wy, wz) {
  simQueue.add(`${wx},${wy},${wz}`);
  simQueue.add(`${wx},${wy + 1},${wz}`); simQueue.add(`${wx},${wy - 1},${wz}`);
  simQueue.add(`${wx + 1},${wy},${wz}`); simQueue.add(`${wx - 1},${wy},${wz}`);
  simQueue.add(`${wx},${wy},${wz + 1}`); simQueue.add(`${wx},${wy},${wz - 1}`);
}

function setVoxelRawNoRebuild(wx, wy, wz, blockId, dirtyChunksSet) {
  if (wy <= 0 || wy >= CHUNK_HEIGHT) return false;
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
  const lx = wx - cx * CHUNK_SIZE, lz = wz - cz * CHUNK_SIZE;
  const key = chunkKey(cx, cz), ch = getChunkData(cx, cz), idx = voxelIndex(lx, wy, lz);
  const prevId = ch.data[idx];
  if (prevId === blockId) return false;
  ch.data[idx] = blockId;

  if (!worldDeltas[key]) worldDeltas[key] = [];
  const dArr = worldDeltas[key];
  let found = false;
  for (let i = 0; i < dArr.length; i += 2) {
    if (dArr[i] === idx) { dArr[i + 1] = blockId; found = true; break; }
  }
  if (!found) dArr.push(idx, blockId);

  if (blockId === BLOCK.AIR && wy + 1 < CHUNK_HEIGHT) {
    const above = ch.data[idx + 1];
    if (BLOCK_DEFS[above].shape === 'cross') {
      ch.data[idx + 1] = BLOCK.AIR;
      dArr.push(idx + 1, BLOCK.AIR);
    }
  }
  if (prevId === BLOCK.WOOD && blockId === BLOCK.AIR && typeof enqueueLeafDecayAround === 'function') {
    enqueueLeafDecayAround(wx, wy, wz);
  }
  enqueueSimNeighbors(wx, wy, wz);
  if (dirtyChunksSet) {
    dirtyChunksSet.add(key);
    if (lx <= 2) dirtyChunksSet.add(chunkKey(cx - 1, cz));
    if (lx >= CHUNK_SIZE - 3) dirtyChunksSet.add(chunkKey(cx + 1, cz));
    if (lz <= 2) dirtyChunksSet.add(chunkKey(cx, cz - 1));
    if (lz >= CHUNK_SIZE - 3) dirtyChunksSet.add(chunkKey(cx, cz + 1));
  }
  return true;
}

function rebuildAffectedChunksSet(dirtyChunksSet) {
  if (dirtyChunksSet.size === 0) return;
  saveWorldData();
  const chList = [];
  for (const key of dirtyChunksSet) {
    const ch = chunks.get(key);
    if (ch) chList.push(ch);
  }
  for (const ch of chList) computeChunkLighting(ch, getChunkIfLoaded);
  for (const ch of chList) rebuildChunkImmediate(ch.cx, ch.cz);
}

function setVoxelGlobal(wx, wy, wz, blockId) {
  if (!setVoxelRawNoRebuild(wx, wy, wz, blockId, null)) return false;
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
  const ch = getChunkData(cx, cz);
  saveWorldData();
  computeChunkLighting(ch, getChunkIfLoaded);
  for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nCh = getChunkIfLoaded(cx + dx, cz + dz);
    if (nCh) computeChunkLighting(nCh, getChunkIfLoaded);
  }
  computeChunkLighting(ch, getChunkIfLoaded);
  rebuildChunkImmediate(cx, cz);
  rebuildChunkImmediate(cx - 1, cz);
  rebuildChunkImmediate(cx + 1, cz);
  rebuildChunkImmediate(cx, cz - 1);
  rebuildChunkImmediate(cx, cz + 1);
  return true;
}

// ============================================================================
// 8. THREE.JS SCENE, MATERIALS, INSTANCED PARTICLE POOL & 1ST PERSON HAND
// ============================================================================
const canvasEl = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas: canvasEl,
  antialias: false,
  powerPreference: 'high-performance'
});
const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
const minPixelRatio = 0.65;
let currentPixelRatio = maxPixelRatio;
let dynamicResEnabled = true;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(currentPixelRatio);

function updateDynamicResolution(fpsSample) {
  if (!dynamicResEnabled || typeof fpsSample !== 'number' || fpsSample <= 0) return currentPixelRatio;
  let nextRatio = currentPixelRatio;
  if (fpsSample < 45 && currentPixelRatio > minPixelRatio) {
    nextRatio = Math.max(minPixelRatio, +(currentPixelRatio - 0.15).toFixed(2));
  } else if (fpsSample >= 56 && currentPixelRatio < maxPixelRatio) {
    nextRatio = Math.min(maxPixelRatio, +(currentPixelRatio + 0.10).toFixed(2));
  }
  if (nextRatio !== currentPixelRatio) {
    currentPixelRatio = nextRatio;
    renderer.setPixelRatio(currentPixelRatio);
  }
  return currentPixelRatio;
}

const scene = new THREE.Scene();
const skyColorDay      = new THREE.Color(0x6ec6ff);
const skyColorGolden   = new THREE.Color(0xf4845f);
const skyColorTwilight = new THREE.Color(0x4a3560);
const skyColorNight    = new THREE.Color(0x070b16);
const currentSkyColor  = skyColorDay.clone();
const sunColHorizon    = new THREE.Color(0xff5e2b);
const sunColGolden     = new THREE.Color(0xffe8cc);
const sunColNoon       = new THREE.Color(0xffffff);
const cloudColDay      = new THREE.Color(0xf8fafc);
const cloudColSunset   = new THREE.Color(0xfdba8c);
const cloudColNight    = new THREE.Color(0x263147);
scene.background = currentSkyColor.clone();
scene.fog = new THREE.FogExp2(0x6ec6ff, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 220);
scene.add(camera);

const { texture: atlasTexture, canvas: atlasCanvas } = createProceduralAtlas();
const crackTextures = createCrackTextures();

// Shared GPU Shader Uniforms (0 CPU overhead per vertex: animated entirely on GPU!)
const gpuShaderUniforms = {
  uTime:          { value: 0.0 },
  uWindStrength:  { value: 1.0 },
  uSunFactor:     { value: 1.0 },
  uUnderwater:    { value: 0.0 },
  uSunLightColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) }
};
let solidShaderRef = null;
let waterShaderRef = null;
let isCameraUnderwater = false;
const waterFogColorDay = new THREE.Color(0x0b4f7c);
const waterFogColorNight = new THREE.Color(0x052036);

const solidMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, vertexColors: true, alphaTest: 0.15 });

solidMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = gpuShaderUniforms.uTime;
  shader.uniforms.uWindStrength = gpuShaderUniforms.uWindStrength;
  shader.uniforms.uSunFactor = gpuShaderUniforms.uSunFactor;
  shader.uniforms.uSunLightColor = gpuShaderUniforms.uSunLightColor;
  solidShaderRef = shader;

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nuniform float uSunFactor;\nvarying float vTileIdx;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(transformed, 1.0);
      vWorldPos = wp.xyz;
      float leafWindMask = vColor.r < 0.0 ? 0.0 : 1.0;
      vColor.r = abs(vColor.r);
      float tileIdx = floor(uv.x * ${ATLAS_COLS}.0 + 0.0001);
      vTileIdx = tileIdx;
      if ((tileIdx >= 21.5 && tileIdx <= 24.5) || (tileIdx >= 33.5 && tileIdx <= 37.5) || (tileIdx >= 38.5 && tileIdx <= 39.5) || (tileIdx >= 46.5 && tileIdx <= 47.5)) {
        float rootMask = clamp(uv.y, 0.0, 1.0);
        float windPhase = uTime * 2.8 + wp.x * 0.75 + wp.z * 0.65;
        transformed.x += sin(windPhase) * 0.12 * rootMask * uWindStrength;
        transformed.z += cos(windPhase * 0.85 + 1.3) * 0.09 * rootMask * uWindStrength;
      } else if (tileIdx >= 6.5 && tileIdx <= 7.5 && leafWindMask > 0.5) {
        float leafPhase = uTime * 2.1 + wp.x * 0.8 + wp.y * 0.5 + wp.z * 0.8;
        transformed.x += sin(leafPhase) * 0.042 * uWindStrength;
        transformed.y += cos(uTime * 1.7 + wp.x * 0.6 - wp.z * 0.6) * 0.024 * uWindStrength;
        transformed.z += sin(uTime * 1.9 - wp.x * 0.7 + wp.z * 0.5) * 0.042 * uWindStrength;
      } else if (tileIdx >= 20.5 && tileIdx <= 21.5) {
        float flameMask = smoothstep(0.45, 1.0, uv.y);
        transformed.x += sin(uTime * 11.0 + wp.x * 3.1 + wp.z * 2.7) * 0.025 * flameMask;
        transformed.z += cos(uTime * 9.5 + wp.z * 3.3 - wp.x * 2.1) * 0.025 * flameMask;
      }`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uSunFactor;\nuniform vec3 uSunLightColor;\nvarying float vTileIdx;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <fog_fragment>',
      `float isEmissiveTile = ((vTileIdx >= 20.5 && vTileIdx <= 21.5) || (vTileIdx >= 14.5 && vTileIdx <= 15.5) || (vTileIdx >= 27.5 && vTileIdx <= 28.5) || (vTileIdx >= 32.5 && vTileIdx <= 33.5) || (vTileIdx >= 37.5 && vTileIdx <= 39.5) || (vTileIdx >= 48.5 && vTileIdx <= 49.5)) ? 1.0 : 0.0;
      float torchMask = clamp((vColor.r - vColor.b) * 3.8, 0.0, 1.0);
      gl_FragColor.rgb *= mix(uSunLightColor, vec3(1.0), max(isEmissiveTile, torchMask));
      if ((vTileIdx >= 20.5 && vTileIdx <= 21.5) || (vTileIdx >= 14.5 && vTileIdx <= 15.5) || (vTileIdx >= 32.5 && vTileIdx <= 33.5)) {
        float flicker = 1.0 + 0.09 * sin(uTime * 9.5 + vWorldPos.x * 2.3 + vWorldPos.z * 2.3);
        gl_FragColor.rgb *= vec3(flicker * 1.04, flicker, flicker * 0.92);
      } else if (vTileIdx >= 27.5 && vTileIdx <= 28.5) {
        float magma = 0.92 + 0.14 * sin(uTime * 4.2 + vWorldPos.x * 1.8 + vWorldPos.z * 1.8);
        gl_FragColor.rgb *= vec3(magma * 1.08, magma * 0.96, magma * 0.82);
      } else if (vTileIdx >= 18.5 && vTileIdx <= 20.5) {
        float glint = max(0.0, sin(uTime * 3.2 + vWorldPos.x * 4.0 + vWorldPos.y * 4.0 + vWorldPos.z * 4.0));
        gl_FragColor.rgb += vec3(0.08, 0.11, 0.14) * pow(glint, 6.0);
      } else if (vTileIdx >= 37.5 && vTileIdx <= 38.5) {
        float crystalGlint = max(0.0, sin(uTime * 4.2 + vWorldPos.x * 3.5 + vWorldPos.y * 3.5 + vWorldPos.z * 3.5));
        gl_FragColor.rgb += vec3(0.14, 0.06, 0.22) * pow(crystalGlint, 4.0);
      } else if (vTileIdx >= 38.5 && vTileIdx <= 39.5) {
        float bioPulse = 0.94 + 0.14 * sin(uTime * 3.8 + vWorldPos.x * 2.2 + vWorldPos.z * 2.2);
        gl_FragColor.rgb *= vec3(bioPulse * 0.88, bioPulse * 1.08, bioPulse * 1.12);
      } else if (vTileIdx >= 48.5 && vTileIdx <= 49.5) {
        float vortex = 0.92 + 0.18 * sin(uTime * 5.2 + vWorldPos.x * 3.2 + vWorldPos.y * 3.2 + vWorldPos.z * 3.2);
        gl_FragColor.rgb *= vec3(vortex * 1.12, vortex * 0.82, vortex * 1.24);
      } else if (vTileIdx >= 49.5 && vTileIdx <= 50.5) {
        float frostGlint = max(0.0, sin(uTime * 2.6 + vWorldPos.x * 3.0 + vWorldPos.z * 3.0));
        gl_FragColor.rgb += vec3(0.08, 0.12, 0.16) * pow(frostGlint, 5.0);
      }
      #include <fog_fragment>`
    );
};

const waterMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.76, depthWrite: false, side: THREE.DoubleSide });

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = gpuShaderUniforms.uTime;
  shader.uniforms.uWindStrength = gpuShaderUniforms.uWindStrength;
  shader.uniforms.uSunFactor = gpuShaderUniforms.uSunFactor;
  shader.uniforms.uSunLightColor = gpuShaderUniforms.uSunLightColor;
  waterShaderRef = shader;

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nuniform float uSunFactor;\nvarying float vWaveH;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(transformed, 1.0);
      vWorldPos = wp.xyz;
      float w1 = sin(uTime * 2.3 + wp.x * 0.85 + wp.z * 0.65) * 0.055;
      float w2 = cos(uTime * 1.7 - wp.x * 0.55 + wp.z * 0.90) * 0.035;
      float wH = (w1 + w2) * uWindStrength;
      transformed.y += wH;
      vWaveH = wH;`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uSunFactor;\nuniform vec3 uSunLightColor;\nvarying float vWaveH;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <fog_fragment>',
      `gl_FragColor.rgb *= uSunLightColor;
      float caustic = sin(vWorldPos.x * 2.4 + uTime * 2.8) * cos(vWorldPos.z * 2.4 - uTime * 2.2);
      float crestFoam = smoothstep(0.032, 0.082, vWaveH + caustic * 0.024);
      vec3 crestCol = vec3(0.76, 0.93, 1.0) * (0.35 + 0.65 * uSunFactor);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, crestCol, crestFoam * 0.38);
      gl_FragColor.rgb += vec3(0.03, 0.07, 0.11) * caustic * (0.4 + 0.6 * uSunFactor);
      #include <fog_fragment>`
    );
};

// Pre-compile both GPU shaders at startup to avoid any runtime shader compilation hitch
(() => {
  const dummyGeo = new THREE.PlaneGeometry(1, 1);
  const m1 = new THREE.Mesh(dummyGeo, solidMaterial);
  const m2 = new THREE.Mesh(dummyGeo, waterMaterial);
  scene.add(m1, m2);
  renderer.compile(scene, camera);
  scene.remove(m1, m2);
  dummyGeo.dispose();
})();

function updateGPUShaders(dt) {
  gpuShaderUniforms.uTime.value += dt;
  gpuShaderUniforms.uSunFactor.value = sunFactor;

  const headBlock = getVoxelGlobal(
    Math.floor(camera.position.x),
    Math.floor(camera.position.y),
    Math.floor(camera.position.z)
  );
  const submerged = headBlock === BLOCK.WATER;
  gpuShaderUniforms.uUnderwater.value = submerged ? 1.0 : 0.0;

  if (submerged !== isCameraUnderwater) {
    isCameraUnderwater = submerged;
    document.getElementById('water-overlay').style.display = submerged ? 'block' : 'none';
  }

  if (submerged) {
    const targetWaterCol = isNight ? waterFogColorNight : waterFogColorDay;
    scene.fog.color.copy(targetWaterCol);
    scene.background.copy(targetWaterCol);
    scene.fog.density = 0.068;
  } else {
    scene.fog.color.copy(currentSkyColor);
    scene.background.copy(currentSkyColor);
    scene.fog.density = 0.055 / renderDistance;
  }
}

// Wireframe target box + Crack overlay mesh
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006));
const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000 });
const highlightBox = new THREE.LineSegments(highlightGeo, highlightMat);
highlightBox.visible = false;
scene.add(highlightBox);

const crackMat = new THREE.MeshBasicMaterial({
  map: crackTextures[0],
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2
});
const crackBox = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), crackMat);
crackBox.visible = false;
scene.add(crackBox);

// 1st-Person Held Item / Hand attached to Camera (renders exact 16x16 item icon)
const handGroup = new THREE.Group();
camera.add(handGroup);
handGroup.position.set(0.42, -0.34, -0.58);

const handIconCanvas = document.createElement('canvas');
handIconCanvas.width = 16; handIconCanvas.height = 16;
const handIconTex = new THREE.CanvasTexture(handIconCanvas);
handIconTex.magFilter = THREE.NearestFilter;
handIconTex.minFilter = THREE.NearestFilter;
handIconTex.generateMipmaps = false;

const handGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
const handIconGeo = new THREE.PlaneGeometry(0.30, 0.30);
const handMat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xf1c27d, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
const handMesh = new THREE.Mesh(handGeo, handMat);
handMesh.renderOrder = 999;
handGroup.add(handMesh);

function updateHeldItemVisual() {
  const bId = getActiveHeldItem();
  const avHeld = typeof playerAvatar !== 'undefined' && playerAvatar.userData ? playerAvatar.userData.heldIcon : null;
  if (bId === BLOCK.AIR || typeof drawItemIcon !== 'function') {
    handMesh.geometry = handGeo; handMat.map = null; handMat.color.setHex(0xf1c27d); handMat.needsUpdate = true;
    handMesh.scale.set(0.48, 0.48, 1.15); handMesh.rotation.set(0.35, -0.35, 0.12);
    if (avHeld) avHeld.visible = false;
    return;
  }
  drawItemIcon(handIconCanvas, bId);
  handIconTex.needsUpdate = true;
  handMesh.geometry = handIconGeo; handMat.map = handIconTex; handMat.color.setHex(0xffffff); handMat.needsUpdate = true;
  handMesh.scale.set(1, 1, 1); handMesh.rotation.set(0, 0, 0);
  if (avHeld) avHeld.visible = true;
}

// Object-Pooled InstancedMesh Particle System (120 particles = 1 Draw Call!)
const MAX_PARTICLES = 120;
const partGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const particleInstanced = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(particleInstanced);

const particles = [];
const dummyMatrix = new THREE.Matrix4();
const dummyColor = new THREE.Color();
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  dummyMatrix.makeTranslation(0, -999, 0);
  particleInstanced.setMatrixAt(i, dummyMatrix);
  particleInstanced.setColorAt(i, dummyColor.setHex(0xffffff));
}
let partCursor = 0;

function spawnBlockParticles(wx, wy, wz, blockId, count = 16) {
  const baseColor = BLOCK_DEFS[blockId]?.color || 0xaaaaaa;
  for (let i = 0; i < count; i++) {
    const p = particles[partCursor];
    p.active = true;
    p.x = wx + 0.2 + Math.random() * 0.6; p.y = wy + 0.2 + Math.random() * 0.6; p.z = wz + 0.2 + Math.random() * 0.6;
    p.vx = (Math.random() - 0.5) * 3.8; p.vy = 1.5 + Math.random() * 3.2; p.vz = (Math.random() - 0.5) * 3.8;
    p.life = 0.45 + Math.random() * 0.35;
    dummyColor.setHex(baseColor).multiplyScalar(0.75 + Math.random() * 0.35);
    particleInstanced.setColorAt(partCursor, dummyColor);
    partCursor = (partCursor + 1) % MAX_PARTICLES;
  }
  particleInstanced.instanceColor.needsUpdate = true;
}

function updateParticles(dt) {
  let anyUpdated = false;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) continue;
    anyUpdated = true;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      particleInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    }
    p.vy -= 14.0 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    dummyMatrix.makeTranslation(p.x, p.y, p.z);
    particleInstanced.setMatrixAt(i, dummyMatrix);
  }
  if (anyUpdated) particleInstanced.instanceMatrix.needsUpdate = true;
}

// Object-Pooled InstancedMesh 3D Magnetized Item Drops (64 drops = 1 Draw Call!)
const MAX_DROPS = 64;
const dropGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const dropMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dropInstanced = new THREE.InstancedMesh(dropGeo, dropMat, MAX_DROPS);
dropInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(dropInstanced);

const itemDrops = [];
const dropPosVec = new THREE.Vector3(), dropQuat = new THREE.Quaternion(), dropEuler = new THREE.Euler(), dropScaleVec = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < MAX_DROPS; i++) {
  itemDrops.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, itemId: BLOCK.COBBLE, count: 1, age: 0, pickupDelay: 0 });
  dummyMatrix.makeTranslation(0, -999, 0);
  dropInstanced.setMatrixAt(i, dummyMatrix);
  dropInstanced.setColorAt(i, dummyColor.setHex(0xffffff));
}
let dropCursor = 0;

function spawnItemDrop(wx, wy, wz, blockOrItemId, count = 1, pickupDelay = 0.22) {
  const itemId = getDropItemForBlock(blockOrItemId);
  if (itemId === BLOCK.AIR || itemId === BLOCK.WATER || itemId === BLOCK.BEDROCK) return null;
  const d = itemDrops[dropCursor], idx = dropCursor;
  dropCursor = (dropCursor + 1) % MAX_DROPS;
  d.active = true;
  d.x = wx + 0.35 + Math.random() * 0.3; d.y = wy + 0.35; d.z = wz + 0.35 + Math.random() * 0.3;
  d.vx = (Math.random() - 0.5) * 2.2; d.vy = 2.6 + Math.random() * 1.4; d.vz = (Math.random() - 0.5) * 2.2;
  d.itemId = itemId; d.count = count; d.age = Math.random() * 3.0; d.pickupDelay = pickupDelay;

  dummyColor.setHex(BLOCK_DEFS[itemId]?.color || 0xffffff);
  dropInstanced.setColorAt(idx, dummyColor);
  dropInstanced.instanceColor.needsUpdate = true;

  dropPosVec.set(d.x, d.y, d.z);
  dropEuler.set(0.2, d.age * 2.4, 0.15);
  dropQuat.setFromEuler(dropEuler);
  dummyMatrix.compose(dropPosVec, dropQuat, dropScaleVec);
  dropInstanced.setMatrixAt(idx, dummyMatrix);
  dropInstanced.instanceMatrix.needsUpdate = true;
  return d;
}

function addInventoryItem(itemId, count = 1) {
  if (!ALL_INVENTORY_ITEMS.includes(itemId)) return;
  inventoryCounts[itemId] = (inventoryCounts[itemId] || 0) + count;
  autoEquipToHotbar(itemId); saveWorldData();
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
}

function updateItemDrops(dt) {
  let anyUpdated = false;
  const px = player.x;
  const py = player.y + 0.9;
  const pz = player.z;

  for (let i = 0; i < MAX_DROPS; i++) {
    const d = itemDrops[i];
    if (!d.active) continue;
    anyUpdated = true;

    d.age += dt;
    if (d.pickupDelay > 0) d.pickupDelay = Math.max(0, d.pickupDelay - dt);

    if (d.age > 90) {
      d.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      dropInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    }

    const dx = px - d.x;
    const dy = py - d.y;
    const dz = pz - d.z;
    const dist = Math.hypot(dx, dy, dz);

    if (d.pickupDelay <= 0 && dist < 2.8) {
      if (dist < 0.88) {
        d.active = false;
        dummyMatrix.makeTranslation(0, -999, 0);
        dropInstanced.setMatrixAt(i, dummyMatrix);
        addInventoryItem(d.itemId, d.count);
        sfx.play('pickup');
        continue;
      }
      const pull = Math.min(1.0, (1.0 - dist / 2.8) * 14.0 * dt + 0.12);
      d.x += dx * pull;
      d.y += dy * pull;
      d.z += dz * pull;
      d.vy = 0;
    } else {
      d.vy -= 16.0 * dt;
      if (d.vy < -20) d.vy = -20;

      const nx = d.x + d.vx * dt;
      const nz = d.z + d.vz * dt;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(nx), Math.floor(d.y), Math.floor(d.z))].solid) d.x = nx;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(d.x), Math.floor(d.y), Math.floor(nz))].solid) d.z = nz;
      d.vx *= 0.86;
      d.vz *= 0.86;

      const ny = d.y + d.vy * dt;
      const groundSolid = BLOCK_DEFS[getVoxelGlobal(Math.floor(d.x), Math.floor(ny - 0.16), Math.floor(d.z))].solid;
      if (!groundSolid) {
        d.y = ny;
      } else {
        if (d.vy < 0) d.y = Math.floor(ny - 0.16) + 1.18;
        d.vy = 0;
      }
    }

    const bob = Math.sin(d.age * 3.8) * 0.065;
    dropPosVec.set(d.x, d.y + bob, d.z);
    dropEuler.set(0.22, d.age * 2.5, 0.18);
    dropQuat.setFromEuler(dropEuler);
    dummyMatrix.compose(dropPosVec, dropQuat, dropScaleVec);
    dropInstanced.setMatrixAt(i, dummyMatrix);
  }

  if (anyUpdated) dropInstanced.instanceMatrix.needsUpdate = true;
}

// ============================================================================
// 8B. DYNAMIC SKY: INDEPENDENT GLOWING SUN & MOON, SLOW CYCLE, STARS & CLOUDS
// ============================================================================
const skyGroup = new THREE.Group();
scene.add(skyGroup);
const celestialOrbit = new THREE.Group();
skyGroup.add(celestialOrbit);

const celestialGlowTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, 'rgba(255,254,248,0.75)');
  g.addColorStop(0.36, 'rgba(255,248,230,0.42)');
  g.addColorStop(0.58, 'rgba(255,240,210,0.14)');
  g.addColorStop(0.82, 'rgba(255,232,195,0.03)');
  g.addColorStop(1.0, 'rgba(255,230,190,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
})();

const sunGeo = new THREE.SphereGeometry(10.0, 36, 24);
(() => {
  const pos = sunGeo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const mu = Math.max(0, Math.abs(pos.getZ(i)) / 10.0);
    const limb = Math.pow(mu, 0.42);
    col[i * 3] = 1.0; col[i * 3 + 1] = 0.90 + 0.10 * limb; col[i * 3 + 2] = 0.78 + 0.22 * limb;
  }
  sunGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
})();
const sunMesh = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
sunMesh.renderOrder = -2;
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: celestialGlowTex, color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
}));
sunGlow.renderOrder = -1;
sunGlow.scale.set(50, 50, 1);
skyGroup.add(sunMesh, sunGlow);

const moonGeo = new THREE.SphereGeometry(8.5, 36, 24);
(() => {
  const pos = moonGeo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i), ny = pos.getY(i), nz = pos.getZ(i);
    const mu = Math.max(0, Math.abs(nz) / 8.5);
    const crater = Math.sin(nx * 0.45 + ny * 0.35) * Math.cos(nx * 0.28 - ny * 0.42);
    const sphereLit = 0.58 + 0.42 * Math.pow(mu, 0.48);
    const c = (crater > 0.2 ? 0.82 : (crater < -0.25 ? 0.91 : 1.0)) * sphereLit;
    col[i * 3] = c * 0.95; col[i * 3 + 1] = c * 0.98; col[i * 3 + 2] = Math.min(1, c * 1.04);
  }
  moonGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
})();
const moonMesh = new THREE.Mesh(moonGeo, new THREE.MeshBasicMaterial({ color: 0xf8fafc, vertexColors: true, transparent: true, opacity: 1.0, depthWrite: false, fog: false }));
moonMesh.renderOrder = -3;
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: celestialGlowTex, color: 0xdbeafe, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
}));
moonGlow.renderOrder = -2;
moonGlow.scale.set(32, 32, 1);
skyGroup.add(moonMesh, moonGlow);

const starPositions = new Float32Array(220 * 3);
for (let i = 0; i < 220; i++) {
  const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1), r = 165;
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, fog: false, transparent: true, opacity: 0.0, depthWrite: false });
const starField = new THREE.Points(starGeo, starMat);
starField.renderOrder = -4;
celestialOrbit.add(starField);

// Merged 3D Voxel Clouds (Single BufferGeometry = 1 Draw Call!)
const cloudMesh = (() => {
  const boxes = [];
  let cSeed = 9001;
  const cRand = () => { cSeed = (cSeed * 1664525 + 1013904223) >>> 0; return (cSeed & 0xffff) / 0x10000; };
  for (let i = 0; i < 26; i++) {
    boxes.push({ x: (cRand() - 0.5) * 220, z: (cRand() - 0.5) * 220, w: 8 + Math.floor(cRand() * 14), d: 6 + Math.floor(cRand() * 12) });
  }
  const pos = [], idx = [];
  let vOff = 0;
  const pushQuad = (p0, p1, p2, p3) => { pos.push(...p0, ...p1, ...p2, ...p3); idx.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3); vOff += 4; };
  for (const b of boxes) {
    const x0 = b.x, x1 = b.x + b.w, y0 = 65, y1 = 67.2, z0 = b.z, z1 = b.z + b.d;
    pushQuad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]); pushQuad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
    pushQuad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]); pushQuad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]);
    pushQuad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]); pushQuad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false }));
  scene.add(m);
  return m;
})();

let cloudDrift = 0;
let celestialAngle = 5.82; // Morning (~10:00 AM); 0 = Noon, PI/2 = Sunset, PI = Midnight, 3*PI/2 = Sunrise
let moonAngle = 2.15;      // Independent lunar orbit (own inclination, phase & orbital speed)
const DAY_CYCLE_SPEED = (Math.PI * 2) / 1200; // Full 24h solar cycle every 20 minutes (1200s)
const MOON_CYCLE_SPEED = DAY_CYCLE_SPEED * 0.915;

function setTimeOfDay(angle, customMoonAngle) {
  celestialAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (typeof customMoonAngle === 'number') {
    moonAngle = ((customMoonAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  } else if (Math.cos(celestialAngle) < -0.5) {
    moonAngle = 0.38; // Visible in the night sky when jumping to night (T), independent of sunset
  } else {
    moonAngle = (celestialAngle * 0.915 + 2.15) % (Math.PI * 2);
  }
  updateDynamicSky(0);
  updateGPUShaders(0);
}

function updateDynamicSky(dt) {
  skyGroup.position.set(player.x, 0, player.z);
  celestialAngle = (celestialAngle + dt * DAY_CYCLE_SPEED) % (Math.PI * 2);
  moonAngle = (moonAngle + dt * MOON_CYCLE_SPEED) % (Math.PI * 2);
  celestialOrbit.rotation.z = celestialAngle * 0.5;

  // Independent 3D orbital trajectories for Sun & Moon
  sunMesh.position.set(-152 * Math.sin(celestialAngle), 152 * Math.cos(celestialAngle), -64 - 18 * Math.cos(celestialAngle));
  sunGlow.position.copy(sunMesh.position);
  moonMesh.position.set(-146 * Math.sin(moonAngle), 146 * Math.cos(moonAngle), -38 + 42 * Math.sin(moonAngle * 0.7 + 0.6));
  moonGlow.position.copy(moonMesh.position);

  const sunElev = Math.cos(celestialAngle); // +1 at zenith, 0 at horizon, -1 at midnight
  const moonElev = Math.cos(moonAngle);
  isNight = sunElev < -0.05;
  sunFactor = THREE.MathUtils.clamp(0.16 + (sunElev + 0.15) * 0.88, 0.16, 1.0);

  // Realistic pure white daytime Sun, shifting to warm gold/coral only near the horizon
  if (sunElev <= 0.10) {
    const t = THREE.MathUtils.clamp(sunElev / 0.10, 0, 1);
    sunMesh.material.color.copy(sunColHorizon).lerp(sunColGolden, t);
  } else {
    const t = THREE.MathUtils.clamp((sunElev - 0.10) / 0.14, 0, 1);
    sunMesh.material.color.copy(sunColGolden).lerp(sunColNoon, t);
  }
  const horizonScale = 1.0 + Math.max(0, 1.0 - Math.abs(sunElev) / 0.35) * 0.22;
  sunMesh.quaternion.copy(camera.quaternion);
  sunMesh.scale.set(horizonScale, horizonScale, 0.04);
  sunGlow.scale.set(50 * horizonScale, 50 * horizonScale, 1);
  moonMesh.quaternion.copy(camera.quaternion);
  moonMesh.scale.set(1, 1, 0.04);
  sunGlow.material.color.copy(sunMesh.material.color);
  sunGlow.material.opacity = THREE.MathUtils.clamp((sunElev + 0.18) * 3.2, 0.0, 0.95);
  sunMesh.material.opacity = THREE.MathUtils.clamp((sunElev + 0.15) * 4.0, 0.0, 1.0);
  const moonVis = THREE.MathUtils.clamp((moonElev + 0.12) * 3.0, 0.0, 1.0) * (1.0 - Math.max(0, sunElev) * 0.62);
  moonMesh.material.opacity = moonVis;
  moonGlow.material.opacity = moonVis * (isNight ? 0.68 : 0.22);

  // Realistic Sky, Fog, Cloud & GPU Terrain Sunlight color across Noon -> Golden Sunset/Sunrise -> Twilight -> Night
  if (sunElev >= 0.0) {
    const t = Math.min(1, sunElev / 0.45);
    currentSkyColor.copy(skyColorGolden).lerp(skyColorDay, t);
    cloudMesh.material.color.copy(cloudColSunset).lerp(cloudColDay, t);
    gpuShaderUniforms.uSunLightColor.value.set(1.0, 0.78 + 0.22 * t, 0.58 + 0.42 * t);
  } else if (sunElev >= -0.18) {
    const t = (sunElev + 0.18) / 0.18;
    currentSkyColor.copy(skyColorTwilight).lerp(skyColorGolden, t);
    cloudMesh.material.color.copy(cloudColNight).lerp(cloudColSunset, t);
    gpuShaderUniforms.uSunLightColor.value.set(0.32 + 0.68 * t, 0.28 + 0.50 * t, 0.38 + 0.20 * t);
  } else if (sunElev >= -0.36) {
    const t = (sunElev + 0.36) / 0.18;
    currentSkyColor.copy(skyColorNight).lerp(skyColorTwilight, t);
    cloudMesh.material.color.copy(cloudColNight);
    gpuShaderUniforms.uSunLightColor.value.set(0.18 + 0.14 * t, 0.22 + 0.06 * t, 0.34 + 0.04 * t);
  } else {
    currentSkyColor.copy(skyColorNight);
    cloudMesh.material.color.copy(cloudColNight);
    gpuShaderUniforms.uSunLightColor.value.set(0.18, 0.22, 0.34);
  }
  gpuShaderUniforms.uSunFactor.value = sunFactor;
  if (!isCameraUnderwater) { scene.background.copy(currentSkyColor); scene.fog.color.copy(currentSkyColor); }

  starMat.opacity = THREE.MathUtils.clamp((-sunElev + 0.05) * 2.6, 0, 0.88);
  cloudDrift = (cloudDrift + dt * 1.6) % 220;
  const snapX = Math.floor(player.x / 220) * 220, snapZ = Math.floor(player.z / 220) * 220;
  cloudMesh.position.set(snapX + cloudDrift - 110, 0, snapZ);
}
