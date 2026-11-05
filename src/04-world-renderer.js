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
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch) return BLOCK.AIR;
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  return ch.data[(lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT + wy];
}

function getLightGlobal(wx, wy, wz) {
  if (wy < 0) return 0;
  if (wy >= CHUNK_HEIGHT) return 0xF0;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch || !ch.lightReady) return 0xF0;
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  return ch.light[(lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT + wy];
}

// Active Cellular Automata Tick Queue (Falling Sand & Flowing Water)
const simQueue = new Set();

function enqueueSimNeighbors(wx, wy, wz) {
  simQueue.add(`${wx},${wy},${wz}`);
  simQueue.add(`${wx},${wy + 1},${wz}`);
  simQueue.add(`${wx},${wy - 1},${wz}`);
  simQueue.add(`${wx + 1},${wy},${wz}`);
  simQueue.add(`${wx - 1},${wy},${wz}`);
  simQueue.add(`${wx},${wy},${wz + 1}`);
  simQueue.add(`${wx},${wy},${wz - 1}`);
}

function setVoxelRawNoRebuild(wx, wy, wz, blockId, dirtyChunksSet) {
  if (wy <= 0 || wy >= CHUNK_HEIGHT) return false;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  const key = chunkKey(cx, cz);
  const ch = getChunkData(cx, cz);
  const idx = voxelIndex(lx, wy, lz);

  if (ch.data[idx] === blockId) return false;
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
  if (wy <= 0 || wy >= CHUNK_HEIGHT) return false;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  const key = chunkKey(cx, cz);
  const ch = getChunkData(cx, cz);
  const idx = voxelIndex(lx, wy, lz);

  if (ch.data[idx] === blockId) return false;
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

  enqueueSimNeighbors(wx, wy, wz);
  saveWorldData();

  computeChunkLighting(ch, getChunkIfLoaded);
  for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nCh = getChunkIfLoaded(cx + dx, cz + dz);
    if (nCh) computeChunkLighting(nCh, getChunkIfLoaded);
  }
  computeChunkLighting(ch, getChunkIfLoaded);

  rebuildChunkImmediate(cx, cz);
  const isLightChange = BLOCK_DEFS[blockId].light > 0 || true;
  if (lx <= 14 || isLightChange) {
    if (lx < 4 || isLightChange) rebuildChunkImmediate(cx - 1, cz);
    if (lx > CHUNK_SIZE - 5 || isLightChange) rebuildChunkImmediate(cx + 1, cz);
    if (lz < 4 || isLightChange) rebuildChunkImmediate(cx, cz - 1);
    if (lz > CHUNK_SIZE - 5 || isLightChange) rebuildChunkImmediate(cx, cz + 1);
  }
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
const skyColorDay = new THREE.Color(0x7ec0ee);
const skyColorNight = new THREE.Color(0x070b16);
scene.background = skyColorDay.clone();
scene.fog = new THREE.FogExp2(0x7ec0ee, 0.012);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 220);
scene.add(camera);

const { texture: atlasTexture, canvas: atlasCanvas } = createProceduralAtlas();
const crackTextures = createCrackTextures();

// Shared GPU Shader Uniforms (0 CPU overhead per vertex: animated entirely on GPU!)
const gpuShaderUniforms = {
  uTime:         { value: 0.0 },
  uWindStrength: { value: 1.0 },
  uSunFactor:    { value: 1.0 },
  uUnderwater:   { value: 0.0 }
};
let solidShaderRef = null;
let waterShaderRef = null;
let isCameraUnderwater = false;
const waterFogColorDay = new THREE.Color(0x0b4f7c);
const waterFogColorNight = new THREE.Color(0x052036);

const solidMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture,
  vertexColors: true,
  alphaTest: 0.15
});

solidMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = gpuShaderUniforms.uTime;
  shader.uniforms.uWindStrength = gpuShaderUniforms.uWindStrength;
  shader.uniforms.uSunFactor = gpuShaderUniforms.uSunFactor;
  solidShaderRef = shader;

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uSunFactor;
      varying float vTileIdx;
      varying vec3 vWorldPos;`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(transformed, 1.0);
      vWorldPos = wp.xyz;
      float tileIdx = floor(uv.x * ${ATLAS_COLS}.0 + 0.0001);
      vTileIdx = tileIdx;

      // Cross-Quad Flora & Crop Wind Sway (22-24: Grass/Flowers, 34-37: Sapling/Wheat, 39: Glow Mushroom, 47: Lily Pad)
      if ((tileIdx >= 21.5 && tileIdx <= 24.5) || (tileIdx >= 33.5 && tileIdx <= 37.5) || (tileIdx >= 38.5 && tileIdx <= 39.5) || (tileIdx >= 46.5 && tileIdx <= 47.5)) {
        float rootMask = clamp(uv.y, 0.0, 1.0);
        float windPhase = uTime * 2.8 + wp.x * 0.75 + wp.z * 0.65;
        transformed.x += sin(windPhase) * 0.12 * rootMask * uWindStrength;
        transformed.z += cos(windPhase * 0.85 + 1.3) * 0.09 * rootMask * uWindStrength;
      }
      // Tree Leaves 3D Breeze (7: Leaves) — continuous in world-space so shared vertices never crack
      else if (tileIdx >= 6.5 && tileIdx <= 7.5) {
        float leafPhase = uTime * 2.1 + wp.x * 0.8 + wp.y * 0.5 + wp.z * 0.8;
        transformed.x += sin(leafPhase) * 0.042 * uWindStrength;
        transformed.y += cos(uTime * 1.7 + wp.x * 0.6 - wp.z * 0.6) * 0.024 * uWindStrength;
        transformed.z += sin(uTime * 1.9 - wp.x * 0.7 + wp.z * 0.5) * 0.042 * uWindStrength;
      }
      // Torch Flame Micro-Dance (21: Torch)
      else if (tileIdx >= 20.5 && tileIdx <= 21.5) {
        float flameMask = smoothstep(0.45, 1.0, uv.y);
        transformed.x += sin(uTime * 11.0 + wp.x * 3.1 + wp.z * 2.7) * 0.025 * flameMask;
        transformed.z += cos(uTime * 9.5 + wp.z * 3.3 - wp.x * 2.1) * 0.025 * flameMask;
      }`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uSunFactor;
      varying float vTileIdx;
      varying vec3 vWorldPos;`
    )
    .replace(
      '#include <fog_fragment>',
      `if ((vTileIdx >= 20.5 && vTileIdx <= 21.5) || (vTileIdx >= 14.5 && vTileIdx <= 15.5) || (vTileIdx >= 32.5 && vTileIdx <= 33.5)) {
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

const waterMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture,
  vertexColors: true,
  transparent: true,
  opacity: 0.76,
  depthWrite: false,
  side: THREE.DoubleSide
});

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = gpuShaderUniforms.uTime;
  shader.uniforms.uWindStrength = gpuShaderUniforms.uWindStrength;
  shader.uniforms.uSunFactor = gpuShaderUniforms.uSunFactor;
  waterShaderRef = shader;

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uSunFactor;
      varying float vWaveH;
      varying vec3 vWorldPos;`
    )
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
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uSunFactor;
      varying float vWaveH;
      varying vec3 vWorldPos;`
    )
    .replace(
      '#include <fog_fragment>',
      `float caustic = sin(vWorldPos.x * 2.4 + uTime * 2.8) * cos(vWorldPos.z * 2.4 - uTime * 2.2);
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
    const targetSkyCol = isNight ? skyColorNight : skyColorDay;
    scene.fog.color.copy(targetSkyCol);
    scene.background.copy(targetSkyCol);
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

// 1st-Person Held Block / Pickaxe attached to Camera
const handGroup = new THREE.Group();
camera.add(handGroup);
handGroup.position.set(0.42, -0.34, -0.58);

const handGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
const handMat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0x5decf5 });
const handMesh = new THREE.Mesh(handGeo, handMat);
handGroup.add(handMesh);

function updateHeldItemVisual() {
  const bId = getActiveHeldItem();
  if (bId === BLOCK.AIR) { handMat.color.setHex(0xf1c27d); handMesh.scale.set(0.48, 0.48, 1.15); handMesh.rotation.set(0.35, -0.35, 0.12); return; }
  const def = BLOCK_DEFS[bId];
  handMat.color.setHex(def.color || 0xffffff);
  if (bId === BLOCK.TOOL_PICKAXE || bId === BLOCK.TOOL_SWORD) {
    handMesh.scale.set(0.28, 1.35, 0.28);
    handMesh.rotation.set(0.4, 0.3, -0.3);
  } else if (bId === BLOCK.TOOL_BOW || bId === BLOCK.TOOL_GRAPPLING_HOOK) {
    handMesh.scale.set(0.24, 1.15, 0.45);
    handMesh.rotation.set(0.2, 0.15, -0.1);
  } else if (bId === BLOCK.ITEM_APPLE || bId === BLOCK.ITEM_BREAD) {
    handMesh.scale.set(0.65, 0.65, 0.65);
    handMesh.rotation.set(0.15, 0.4, 0);
  } else if (def.shape === 'cross') {
    handMesh.scale.set(0.32, 1.1, 0.32);
    handMesh.rotation.set(0.1, 0.4, 0);
  } else {
    handMesh.scale.set(1, 1, 1);
    handMesh.rotation.set(0.2, 0.65, 0);
  }
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
    p.x = wx + 0.2 + Math.random() * 0.6;
    p.y = wy + 0.2 + Math.random() * 0.6;
    p.z = wz + 0.2 + Math.random() * 0.6;
    p.vx = (Math.random() - 0.5) * 3.8;
    p.vy = 1.5 + Math.random() * 3.2;
    p.vz = (Math.random() - 0.5) * 3.8;
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
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
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
const dropPosVec = new THREE.Vector3();
const dropQuat = new THREE.Quaternion();
const dropEuler = new THREE.Euler();
const dropScaleVec = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < MAX_DROPS; i++) {
  itemDrops.push({
    active: false,
    x: 0, y: -999, z: 0,
    vx: 0, vy: 0, vz: 0,
    itemId: BLOCK.COBBLE,
    count: 1,
    age: 0,
    pickupDelay: 0
  });
  dummyMatrix.makeTranslation(0, -999, 0);
  dropInstanced.setMatrixAt(i, dummyMatrix);
  dropInstanced.setColorAt(i, dummyColor.setHex(0xffffff));
}
let dropCursor = 0;

function spawnItemDrop(wx, wy, wz, blockOrItemId, count = 1, pickupDelay = 0.22) {
  const itemId = getDropItemForBlock(blockOrItemId);
  if (itemId === BLOCK.AIR || itemId === BLOCK.WATER || itemId === BLOCK.BEDROCK) return null;

  const d = itemDrops[dropCursor];
  const idx = dropCursor;
  dropCursor = (dropCursor + 1) % MAX_DROPS;

  d.active = true;
  d.x = wx + 0.35 + Math.random() * 0.3;
  d.y = wy + 0.35;
  d.z = wz + 0.35 + Math.random() * 0.3;
  d.vx = (Math.random() - 0.5) * 2.2;
  d.vy = 2.6 + Math.random() * 1.4;
  d.vz = (Math.random() - 0.5) * 2.2;
  d.itemId = itemId;
  d.count = count;
  d.age = Math.random() * 3.0;
  d.pickupDelay = pickupDelay;

  const colHex = BLOCK_DEFS[itemId]?.color || 0xffffff;
  dummyColor.setHex(colHex);
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
// 8B. DYNAMIC SKY: CUBIC SUN, CUBIC MOON, STARS & 1-DRAW-CALL 3D VOXEL CLOUDS
// ============================================================================
const skyGroup = new THREE.Group();
scene.add(skyGroup);

const celestialOrbit = new THREE.Group();
skyGroup.add(celestialOrbit);

const sunMesh = new THREE.Mesh(
  new THREE.BoxGeometry(14, 14, 14),
  new THREE.MeshBasicMaterial({ color: 0xfff48f, fog: false })
);
sunMesh.position.set(0, 145, -60);
celestialOrbit.add(sunMesh);

const moonMesh = new THREE.Mesh(
  new THREE.BoxGeometry(11, 11, 11),
  new THREE.MeshBasicMaterial({ color: 0xdbeafe, fog: false })
);
moonMesh.position.set(0, -145, 60);
celestialOrbit.add(moonMesh);

const starPositions = new Float32Array(220 * 3);
for (let i = 0; i < 220; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 165;
  starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, fog: false, transparent: true, opacity: 0.0 });
const starField = new THREE.Points(starGeo, starMat);
celestialOrbit.add(starField);

// Merged 3D Voxel Clouds (Single BufferGeometry = 1 Draw Call!)
const cloudMesh = (() => {
  const boxes = [];
  let cSeed = 9001;
  const cRand = () => { cSeed = (cSeed * 1664525 + 1013904223) >>> 0; return (cSeed & 0xffff) / 0x10000; };
  for (let i = 0; i < 26; i++) {
    const cx = (cRand() - 0.5) * 220;
    const cz = (cRand() - 0.5) * 220;
    const w = 8 + Math.floor(cRand() * 14);
    const d = 6 + Math.floor(cRand() * 12);
    boxes.push({ x: cx, z: cz, w, d });
  }
  const pos = [];
  const idx = [];
  let vOff = 0;
  const pushQuad = (p0, p1, p2, p3) => {
    pos.push(...p0, ...p1, ...p2, ...p3);
    idx.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
    vOff += 4;
  };
  for (const b of boxes) {
    const x0 = b.x, x1 = b.x + b.w;
    const y0 = 65,  y1 = 67.2;
    const z0 = b.z, z1 = b.z + b.d;
    pushQuad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]);
    pushQuad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
    pushQuad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
    pushQuad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]);
    pushQuad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]);
    pushQuad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  scene.add(m);
  return m;
})();

let cloudDrift = 0;
let targetSkyAngle = 0;

function updateDynamicSky(dt) {
  skyGroup.position.set(player.x, 0, player.z);
  targetSkyAngle = isNight ? Math.PI : 0;
  celestialOrbit.rotation.x += (targetSkyAngle - celestialOrbit.rotation.x) * Math.min(1, dt * 3.5);
  starMat.opacity = isNight ? 0.85 : 0.0;

  cloudDrift = (cloudDrift + dt * 1.6) % 220;
  const snapX = Math.floor(player.x / 220) * 220;
  const snapZ = Math.floor(player.z / 220) * 220;
  cloudMesh.position.set(snapX + cloudDrift - 110, 0, snapZ);
  cloudMesh.material.color.setScalar(isNight ? 0.28 : 0.96);
}
