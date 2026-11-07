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
  if (blockId !== BLOCK.AIR && (!ch.maxY || wy > ch.maxY)) ch.maxY = wy;

  if (!worldDeltas[key]) worldDeltas[key] = [];
  const dArr = worldDeltas[key];
  let found = false;
  for (let i = 0; i < dArr.length; i += 2) {
    if (dArr[i] === idx) { dArr[i + 1] = blockId; found = true; break; }
  }
  if (!found) dArr.push(idx, blockId);

  if (blockId === BLOCK.AIR && wy + 1 < CHUNK_HEIGHT) {
    const above = ch.data[idx + 1];
    if (BLOCK_DEFS[above].shape === 'cross' && above !== BLOCK.VINE) { ch.data[idx + 1] = BLOCK.AIR; dArr.push(idx + 1, BLOCK.AIR); }
    for (let vy = wy - 1; vy >= 1 && ch.data[voxelIndex(lx, vy, lz)] === BLOCK.VINE; vy--) { ch.data[voxelIndex(lx, vy, lz)] = BLOCK.AIR; dArr.push(voxelIndex(lx, vy, lz), BLOCK.AIR); }
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
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE), ch = getChunkData(cx, cz);
  saveWorldData(); computeChunkLighting(ch, getChunkIfLoaded);
  for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) { const nCh = getChunkIfLoaded(cx + dx, cz + dz); if (nCh) computeChunkLighting(nCh, getChunkIfLoaded); }
  computeChunkLighting(ch, getChunkIfLoaded);
  rebuildChunkImmediate(cx, cz); rebuildChunkImmediate(cx - 1, cz); rebuildChunkImmediate(cx + 1, cz); rebuildChunkImmediate(cx, cz - 1); rebuildChunkImmediate(cx, cz + 1);
  return true;
}

// ============================================================================
// 8. THREE.JS SCENE, MATERIALS, INSTANCED PARTICLE POOL & 1ST PERSON HAND
// ============================================================================
const canvasEl = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5), minPixelRatio = 0.65;
let currentPixelRatio = maxPixelRatio, dynamicResEnabled = true;
renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(currentPixelRatio);

function updateDynamicResolution(fpsSample) {
  if (!dynamicResEnabled || typeof fpsSample !== 'number' || fpsSample <= 0) return currentPixelRatio;
  let nextRatio = currentPixelRatio;
  if (fpsSample < 45 && currentPixelRatio > minPixelRatio) nextRatio = Math.max(minPixelRatio, +(currentPixelRatio - 0.15).toFixed(2));
  else if (fpsSample >= 56 && currentPixelRatio < maxPixelRatio) nextRatio = Math.min(maxPixelRatio, +(currentPixelRatio + 0.10).toFixed(2));
  if (nextRatio !== currentPixelRatio) { currentPixelRatio = nextRatio; renderer.setPixelRatio(currentPixelRatio); }
  return currentPixelRatio;
}

const scene = new THREE.Scene(), chunkSolidGroup = new THREE.Scene();
scene.add(chunkSolidGroup);
const skyColorDay = new THREE.Color(0x6ec6ff), skyColorGolden = new THREE.Color(0xf4845f), skyColorTwilight = new THREE.Color(0xb84a39), skyColorNight = new THREE.Color(0x070b16);
const fogColorDay = new THREE.Color(0x9ecff8), fogColorTwilight = new THREE.Color(0x52567a), fogColorNight = new THREE.Color(0x070b16), currentFogColor = fogColorDay.clone();
const currentSkyColor = skyColorDay.clone(), sunColHorizon = new THREE.Color(0xff5e2b), sunColGolden = new THREE.Color(0xffe8cc), sunColNoon = new THREE.Color(0xffffff);
const cloudColDay = new THREE.Color(0xf8fafc), cloudColSunset = new THREE.Color(0xfdba8c), cloudColNight = new THREE.Color(0x263147);
scene.background = currentSkyColor.clone(); scene.fog = new THREE.FogExp2(0x6ec6ff, 0.0055);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 850);
scene.add(camera);
const { texture: atlasTexture, canvas: atlasCanvas } = createProceduralAtlas(), crackTextures = createCrackTextures();

function detectDefaultLightingMode(customIsMobile) {
  const isMob = typeof customIsMobile === 'boolean'
    ? customIsMobile
    : (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '') || (('ontouchstart' in window) && window.innerWidth <= 960));
  return isMob ? 'shader' : 'shadowmap';
}
let lightingMode = detectDefaultLightingMode(), shadowPassCount = 0;
const SHADOW_MAP_SIZE = 1024;
const shadowMapTarget = new THREE.WebGLRenderTarget(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
const shadowCamera = new THREE.OrthographicCamera(-44, 44, 44, -44, 2, 160), shadowMatrix = new THREE.Matrix4(), shadowClearCol = new THREE.Color();
const shadowDepthMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, alphaTest: 0.15, side: THREE.DoubleSide });
shadowDepthMaterial.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n#include <packing>').replace('#include <fog_fragment>', 'gl_FragColor = packDepthToRGBA(gl_FragCoord.z);');
};

// Shared GPU Shader Uniforms (0 CPU overhead per vertex: animated entirely on GPU!)
const gpuShaderUniforms = {
  uTime: { value: 0.0 }, uWindStrength: { value: 1.0 }, uWetness: { value: 0.0 }, uSunFactor: { value: 1.0 }, uUnderwater: { value: 0.0 },
  uSunLightColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) }, uLightDir: { value: new THREE.Vector3(0.45, 0.85, -0.25).normalize() },
  uCloudDrift: { value: 0.0 }, uUseShadowMap: { value: lightingMode === 'shadowmap' ? 1.0 : 0.0 }, uShadowMap: { value: shadowMapTarget.texture }, uShadowMatrix: { value: shadowMatrix }
};
let solidShaderRef = null, waterShaderRef = null, isCameraUnderwater = false;
const waterFogColorDay = new THREE.Color(0x0b4f7c), waterFogColorNight = new THREE.Color(0x052036);

function setLightingMode(mode) {
  lightingMode = (mode === 'shader') ? 'shader' : 'shadowmap';
  gpuShaderUniforms.uUseShadowMap.value = lightingMode === 'shadowmap' ? 1.0 : 0.0;
  const selEl = document.getElementById('lighting-select'), lblEl = document.getElementById('lbl-lighting'), statEl = document.getElementById('stat-worker');
  if (selEl && selEl.value !== lightingMode) selEl.value = lightingMode;
  if (lblEl) lblEl.textContent = lightingMode === 'shadowmap' ? 'Ultra PC (Shadow Map 3D)' : 'Ligero Móvil (Shader GPU)';
  if (statEl) statEl.textContent = lightingMode === 'shadowmap' ? 'SHADOW MAP 3D + SHADERS' : 'BFS LIGHT + GPU SHADERS';
  if (lightingMode === 'shadowmap') updateShadowMapPass();
  return lightingMode;
}

function updateShadowMapPass() {
  if (lightingMode !== 'shadowmap') return false;
  if (typeof player === 'undefined' || !player || chunkSolidGroup.children.length === 0) return false;
  const ld = gpuShaderUniforms.uLightDir.value;
  const sx = Math.round(player.x * 4) * 0.25, sy = Math.round(player.y * 4) * 0.25, sz = Math.round(player.z * 4) * 0.25;
  shadowCamera.position.set(sx + ld.x * 68, sy + Math.max(18, ld.y * 68), sz + ld.z * 68);
  shadowCamera.lookAt(sx, sy, sz);
  shadowCamera.updateMatrixWorld();
  shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);
  const prevClearHex = renderer.getClearColor(shadowClearCol).getHex(), prevClearAlpha = renderer.getClearAlpha();
  chunkSolidGroup.overrideMaterial = shadowDepthMaterial;
  renderer.setClearColor(0xffffff, 1.0);
  renderer.setRenderTarget(shadowMapTarget); renderer.clear(); renderer.render(chunkSolidGroup, shadowCamera); renderer.setRenderTarget(null);
  chunkSolidGroup.overrideMaterial = null; renderer.setClearColor(prevClearHex, prevClearAlpha);
  shadowPassCount++;
  return true;
}

const solidMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, vertexColors: true, alphaTest: 0.15 });

solidMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = gpuShaderUniforms.uTime; shader.uniforms.uWindStrength = gpuShaderUniforms.uWindStrength; shader.uniforms.uWetness = gpuShaderUniforms.uWetness;
  shader.uniforms.uSunFactor = gpuShaderUniforms.uSunFactor; shader.uniforms.uSunLightColor = gpuShaderUniforms.uSunLightColor; shader.uniforms.uLightDir = gpuShaderUniforms.uLightDir;
  shader.uniforms.uCloudDrift = gpuShaderUniforms.uCloudDrift; shader.uniforms.uUseShadowMap = gpuShaderUniforms.uUseShadowMap; shader.uniforms.uShadowMap = gpuShaderUniforms.uShadowMap; shader.uniforms.uShadowMatrix = gpuShaderUniforms.uShadowMatrix;
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
      if ((tileIdx >= 21.5 && tileIdx <= 24.5) || (tileIdx >= 33.5 && tileIdx <= 37.5) || (tileIdx >= 38.5 && tileIdx <= 39.5)) {
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
    .replace('#include <common>', `#include <common>\n#include <packing>\nuniform float uTime;\nuniform float uWetness;\nuniform float uSunFactor;\nuniform vec3 uSunLightColor;\nuniform vec3 uLightDir;\nuniform float uCloudDrift;\nuniform float uUseShadowMap;\nuniform sampler2D uShadowMap;\nuniform mat4 uShadowMatrix;\nvarying float vTileIdx;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <fog_fragment>',
      `float isEmissiveTile = ((vTileIdx >= 20.5 && vTileIdx <= 21.5) || (vTileIdx >= 14.5 && vTileIdx <= 15.5) || (vTileIdx >= 27.5 && vTileIdx <= 28.5) || (vTileIdx >= 32.5 && vTileIdx <= 33.5) || (vTileIdx >= 37.5 && vTileIdx <= 39.5) || (vTileIdx >= 48.5 && vTileIdx <= 49.5)) ? 1.0 : 0.0;
      float torchMask = clamp((vColor.r - vColor.b) * 3.8, 0.0, 1.0);
      vec3 faceN = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
      float ndotl = dot(faceN, uLightDir);
      float sunLow = 1.0 - clamp(uLightDir.y, 0.0, 1.0);
      float bakedLuma = max(vColor.r, max(vColor.g, vColor.b));
      float horizonCut = 0.54 + sunLow * 0.28;
      float selfShadow = smoothstep(horizonCut - 0.18, horizonCut + 0.08, bakedLuma + ndotl * 0.22);
      float realShadow = 1.0;
      if (uUseShadowMap > 0.5) {
        vec4 sc = uShadowMatrix * vec4(vWorldPos + faceN * 0.08, 1.0);
        vec3 sProj = sc.xyz / sc.w * 0.5 + 0.5;
        if (sProj.x > 0.01 && sProj.x < 0.99 && sProj.y > 0.01 && sProj.y < 0.99 && sProj.z > 0.0 && sProj.z < 0.995) {
          float bias = max(0.0022, 0.0045 * (1.0 - max(ndotl, 0.0)));
          float shSum = 0.0;
          const float texel = 1.0 / 1024.0;
          shSum += (sProj.z - bias > unpackRGBAToDepth(texture2D(uShadowMap, sProj.xy))) ? 0.30 : 1.0;
          shSum += (sProj.z - bias > unpackRGBAToDepth(texture2D(uShadowMap, sProj.xy + vec2(texel, 0.0)))) ? 0.30 : 1.0;
          shSum += (sProj.z - bias > unpackRGBAToDepth(texture2D(uShadowMap, sProj.xy - vec2(texel, 0.0)))) ? 0.30 : 1.0;
          shSum += (sProj.z - bias > unpackRGBAToDepth(texture2D(uShadowMap, sProj.xy + vec2(0.0, texel)))) ? 0.30 : 1.0;
          shSum += (sProj.z - bias > unpackRGBAToDepth(texture2D(uShadowMap, sProj.xy - vec2(0.0, texel)))) ? 0.30 : 1.0;
          float edgeFade = smoothstep(0.48, 0.42, max(abs(sProj.x - 0.5), abs(sProj.y - 0.5)));
          realShadow = mix(1.0, shSum * 0.2, edgeFade);
        }
      }
      vec2 cloudRayXZ = vWorldPos.xz + uLightDir.xz * ((60.0 - vWorldPos.y) / max(0.22, uLightDir.y));
      vec2 cUV = (cloudRayXZ - vec2(uCloudDrift, uTime * 0.35)) * 0.042;
      float cWave = sin(cUV.x) * cos(cUV.y) + 0.5 * sin(cUV.x * 1.9 - cUV.y * 1.6);
      float cloudShadow = 1.0 - smoothstep(0.22, 0.85, cWave) * 0.22 * uSunFactor;
      float directLit = clamp((ndotl * 0.5 + 0.5) * selfShadow * realShadow, 0.0, 1.0) * cloudShadow;
      vec3 shadowAmbient = uSunLightColor * vec3(0.68, 0.76, 0.92);
      vec3 directSunCol = uSunLightColor * (1.16 + 0.16 * sunLow);
      vec3 dynamicShaderLight = mix(shadowAmbient, directSunCol, directLit);
      gl_FragColor.rgb *= mix(dynamicShaderLight, vec3(1.0), max(isEmissiveTile, torchMask));
      if (uWetness > 0.01 && faceN.y > 0.7 && isEmissiveTile < 0.5) {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float puddle = smoothstep(-0.2, 0.55, sin(vWorldPos.x * 0.55 + cos(vWorldPos.z * 0.45)) * cos(vWorldPos.z * 0.55 - sin(vWorldPos.x * 0.45)));
        float ringD = length(fract(vWorldPos.xz * 1.6 + vec2(sin(floor(vWorldPos.z * 1.6) * 3.1), cos(floor(vWorldPos.x * 1.6) * 2.7)) * 0.22) - 0.5);
        float rainRing = max(0.0, sin(ringD * 28.0 - uTime * 16.0)) * smoothstep(0.42, 0.06, ringD);
        float fresnelWet = pow(1.0 - max(dot(faceN, viewDir), 0.0), 2.6);
        float specWet = pow(max(dot(faceN, normalize(uLightDir + viewDir)), 0.0), 22.0);
        gl_FragColor.rgb *= 1.0 - 0.14 * uWetness * (0.4 + 0.6 * puddle);
        vec3 wetSkyCol = mix(vec3(0.18, 0.20, 0.24), uSunLightColor * vec3(0.82, 0.86, 0.92), uSunFactor);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, wetSkyCol, clamp(uWetness * (0.35 + 0.65 * puddle) * (fresnelWet * 0.45 + specWet * 0.38 + rainRing * 0.22) * clamp(bakedLuma, 0.18, 1.0), 0.0, 0.55));
      }
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
  shader.uniforms.uLightDir = gpuShaderUniforms.uLightDir;
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
    .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uSunFactor;\nuniform vec3 uSunLightColor;\nuniform vec3 uLightDir;\nvarying float vWaveH;\nvarying vec3 vWorldPos;`)
    .replace(
      '#include <fog_fragment>',
      `float vLuma = max(vColor.r, max(vColor.g, vColor.b));
      float vLit = clamp((vLuma - 0.085) / 0.915, 0.0, 1.0);
      float vSunLit = clamp((vColor.b - 0.085) / 0.85, 0.0, 1.0) * uSunFactor;
      gl_FragColor.rgb *= uSunLightColor * mix(0.22, 1.0, vLit);
      float crestFoam = 0.0;
      vec3 waveN = normalize(vec3(-cos(uTime * 2.3 + vWorldPos.x * 0.85 + vWorldPos.z * 0.65) * 0.12, 1.0, sin(uTime * 1.7 - vWorldPos.x * 0.55 + vWorldPos.z * 0.90) * 0.10));
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfVec = normalize(uLightDir + viewDir);
      float spec = pow(max(dot(waveN, halfVec), 0.0), 48.0) + crestFoam;
      float fresnel = pow(1.0 - max(dot(waveN, viewDir), 0.0), 3.2) * 0.22;
      gl_FragColor.rgb += uSunLightColor * (spec * 0.65 + fresnel * 0.18) * vSunLit;
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
  if (typeof player !== 'undefined' && player) {
    const pL1 = getLightGlobal(Math.floor(player.x), Math.floor(player.y + 1.4), Math.floor(player.z)), pL2 = getLightGlobal(Math.floor(player.x), Math.floor(player.y + 0.5), Math.floor(player.z));
    const armSun = (Math.max(pL1 >> 4, pL2 >> 4) / 15) * sunFactor, armBlk = Math.max(pL1 & 15, pL2 & 15) / 15, armLit = Math.min(1.0, Math.max(0.05, Math.max(armSun, armBlk))), sc = gpuShaderUniforms.uSunLightColor.value;
    handArmMat.color.setRGB(armLit * sc.x, armLit * (1 - armBlk * 0.08) * sc.y, armLit * (1 - armBlk * 0.24) * sc.z);
    if (handMesh.visible) { const hEmit = (BLOCK_DEFS[getActiveHeldItem()]?.light || 0) > 5; handMat.color.setRGB(hEmit ? 1 : handArmMat.color.r, hEmit ? 1 : handArmMat.color.g, hEmit ? 1 : handArmMat.color.b); }
    if (typeof farHorizonMesh !== 'undefined' && farHorizonMesh) farHorizonMesh.material.color.setRGB(sc.x, sc.y, sc.z);
  }

  const headBlock = getVoxelGlobal(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
  const submerged = headBlock === BLOCK.WATER, inLavaCam = headBlock === BLOCK.LAVA;
  gpuShaderUniforms.uUnderwater.value = (submerged || inLavaCam) ? 1.0 : 0.0;
  const wOv = document.getElementById('water-overlay');
  if (submerged !== isCameraUnderwater || inLavaCam) {
    isCameraUnderwater = submerged;
    wOv.style.display = (submerged || inLavaCam) ? 'block' : 'none';
    wOv.style.background = inLavaCam ? 'rgba(234, 88, 12, 0.55)' : '';
  } else if (!submerged && !inLavaCam && wOv.style.display !== 'none') {
    wOv.style.display = 'none'; wOv.style.background = '';
  }

  if (typeof skyDomeMesh !== 'undefined') skyDomeMesh.visible = !(submerged || inLavaCam);
  if (submerged) {
    const targetWaterCol = isNight ? waterFogColorNight : waterFogColorDay;
    scene.fog.color.copy(targetWaterCol); scene.background.copy(targetWaterCol);
    scene.fog.density = 0.068;
  } else if (inLavaCam) {
    scene.fog.color.setHex(0xd97706); scene.background.setHex(0xd97706);
    scene.fog.density = 0.14;
  } else {
    scene.fog.color.copy(currentFogColor); scene.background.copy(currentSkyColor);
    const overK = (typeof weatherMode !== 'undefined' && weatherMode !== 'clear') ? (weatherMode === 'storm' ? 0.45 : 0.25) : 0.0;
    if (typeof skyDomeUniforms !== 'undefined') skyDomeUniforms.uOvercast.value = overK;
    if (overK > 0) {
      const dayK = THREE.MathUtils.smoothstep(sunFactor, 0.30, 0.88), strength = overK * 0.55 * dayK;
      scene.fog.color.lerp(dummyColor.setHex(0x334155), strength); scene.background.lerp(dummyColor.setHex(0x334155), strength);
    }
    scene.fog.density = 0.055 / renderDistance;
  }
}

// Wireframe target box + Crack overlay mesh
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)), highlightMat = new THREE.LineBasicMaterial({ color: 0x000000 });
const highlightBox = new THREE.LineSegments(highlightGeo, highlightMat); highlightBox.visible = false; scene.add(highlightBox);
const crackMat = new THREE.MeshBasicMaterial({ map: crackTextures[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const crackBox = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), crackMat); crackBox.visible = false; scene.add(crackBox);

// 1st-Person Held Item + Gripping 3D Voxel Arm/Hand attached to Camera
const handGroup = new THREE.Group(); camera.add(handGroup); handGroup.position.set(0.42, -0.34, -0.58);
const handIconCanvas = document.createElement('canvas'); handIconCanvas.width = 16; handIconCanvas.height = 16;
const handIconTex = new THREE.CanvasTexture(handIconCanvas);
handIconTex.magFilter = THREE.NearestFilter; handIconTex.minFilter = THREE.NearestFilter; handIconTex.generateMipmaps = false;

function shadeBoxGeo(geo, hex) {
  const c = new THREE.Color(hex), shades = [0.82, 0.88, 1.0, 0.64, 0.78, 0.94], cols = new Float32Array(72);
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = (f * 4 + v) * 3, s = shades[f]; cols[i] = c.r * s; cols[i + 1] = c.g * s; cols[i + 2] = c.b * s; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); return geo;
}
const handGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26), handIconGeo = new THREE.PlaneGeometry(0.30, 0.30);
const handArmGeo = shadeBoxGeo(new THREE.BoxGeometry(0.13, 0.13, 0.64), 0xf1c27d), handSleeveGeo = shadeBoxGeo(new THREE.BoxGeometry(0.13, 0.13, 0.44), 0xe8b474);
const handArmMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1.0, fog: false, depthTest: false, depthWrite: false });
const handArmMesh = new THREE.Mesh(handArmGeo, handArmMat); handArmMesh.renderOrder = 997;
const handSleeveMesh = new THREE.Mesh(handSleeveGeo, handArmMat); handSleeveMesh.position.set(0, 0, 0.28); handSleeveMesh.renderOrder = 998;
handArmMesh.add(handSleeveMesh); handGroup.add(handArmMesh);
const handMat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xf1c27d, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
const handMesh = new THREE.Mesh(handGeo, handMat); handMesh.renderOrder = 999; handGroup.add(handMesh);

function updateHeldItemVisual() {
  const bId = getActiveHeldItem(), avHeld = typeof playerAvatar !== 'undefined' && playerAvatar.userData ? playerAvatar.userData.heldIcon : null;
  const isSwinging = (typeof player !== 'undefined' && player && player.swingTime > 0) || (typeof isMiningHeld !== 'undefined' && isMiningHeld);
  if (bId === BLOCK.AIR || typeof drawItemIcon !== 'function') {
    handArmMesh.visible = !!isSwinging; handMesh.visible = false;
    handMesh.geometry = handGeo; handMat.map = null; handMat.color.setHex(0xf1c27d); handMat.needsUpdate = true;
    handArmMesh.position.set(0.14, -0.14, 0.18); handArmMesh.rotation.set(0.38, 0.32, -0.14);
    if (avHeld) avHeld.visible = false; return;
  }
  handArmMesh.visible = true; handMesh.visible = true; drawItemIcon(handIconCanvas, bId); handIconTex.needsUpdate = true;
  handMesh.geometry = handIconGeo; handMat.map = handIconTex; handMat.color.setHex(0xffffff); handMat.needsUpdate = true;
  handMesh.position.set(0, 0, 0); handMesh.scale.set(1, 1, 1); handMesh.rotation.set(0, 0, 0);
  handArmMesh.position.set(0.14, -0.14, 0.18); handArmMesh.rotation.set(0.38, 0.32, -0.14);
  if (avHeld) avHeld.visible = true;
}

// Object-Pooled InstancedMesh Particle System (120 particles = 1 Draw Call!)
const MAX_PARTICLES = 120;
const partGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13), partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const particleInstanced = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(particleInstanced);

const particles = [], dummyMatrix = new THREE.Matrix4(), dummyColor = new THREE.Color();
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  dummyMatrix.makeTranslation(0, -999, 0); particleInstanced.setMatrixAt(i, dummyMatrix); particleInstanced.setColorAt(i, dummyColor.setHex(0xffffff));
}
let partCursor = 0;

function spawnBlockParticles(wx, wy, wz, blockId, count = 16) {
  const baseColor = BLOCK_DEFS[blockId]?.color || 0xaaaaaa;
  for (let i = 0; i < count; i++) {
    const p = particles[partCursor]; p.active = true;
    p.x = wx + 0.2 + Math.random() * 0.6; p.y = wy + 0.2 + Math.random() * 0.6; p.z = wz + 0.2 + Math.random() * 0.6;
    p.vx = (Math.random() - 0.5) * 3.8; p.vy = 1.5 + Math.random() * 3.2; p.vz = (Math.random() - 0.5) * 3.8; p.life = 0.45 + Math.random() * 0.35;
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
    anyUpdated = true; p.life -= dt;
    if (p.life <= 0) { p.active = false; dummyMatrix.makeTranslation(0, -999, 0); particleInstanced.setMatrixAt(i, dummyMatrix); continue; }
    p.vy -= 14.0 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (BLOCK_DEFS[getVoxelGlobal(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))].solid) { p.y -= p.vy * dt; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; }
    dummyMatrix.makeTranslation(p.x, p.y, p.z); particleInstanced.setMatrixAt(i, dummyMatrix);
  }
  if (anyUpdated) particleInstanced.instanceMatrix.needsUpdate = true;
}

// Object-Pooled InstancedMesh 3D Magnetized Item Drops (64 drops = 1 Draw Call!)
const MAX_DROPS = 64;
const dropGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28), dropMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dropInstanced = new THREE.InstancedMesh(dropGeo, dropMat, MAX_DROPS);
dropInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(dropInstanced);

const itemDrops = [];
const dropPosVec = new THREE.Vector3(), dropQuat = new THREE.Quaternion(), dropEuler = new THREE.Euler(), dropScaleVec = new THREE.Vector3(1, 1, 1);
for (let i = 0; i < MAX_DROPS; i++) {
  itemDrops.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, itemId: BLOCK.COBBLE, count: 1, age: 0, pickupDelay: 0 });
  dummyMatrix.makeTranslation(0, -999, 0); dropInstanced.setMatrixAt(i, dummyMatrix); dropInstanced.setColorAt(i, dummyColor.setHex(0xffffff));
}
let dropCursor = 0;

function spawnItemDrop(wx, wy, wz, blockOrItemId, count = 1, pickupDelay = 0.22, toolId) {
  const itemId = getDropItemForBlock(blockOrItemId, toolId);
  if (itemId === BLOCK.AIR || itemId === BLOCK.WATER || itemId === BLOCK.BEDROCK) return null;
  const d = itemDrops[dropCursor], idx = dropCursor;
  dropCursor = (dropCursor + 1) % MAX_DROPS;
  d.active = true; d.x = wx + 0.35 + Math.random() * 0.3; d.y = wy + 0.35; d.z = wz + 0.35 + Math.random() * 0.3;
  d.vx = (Math.random() - 0.5) * 2.2; d.vy = 2.6 + Math.random() * 1.4; d.vz = (Math.random() - 0.5) * 2.2;
  d.itemId = itemId; d.count = count; d.age = Math.random() * 3.0; d.pickupDelay = pickupDelay;
  dummyColor.setHex(BLOCK_DEFS[itemId]?.color || 0xffffff);
  dropInstanced.setColorAt(idx, dummyColor); dropInstanced.instanceColor.needsUpdate = true;
  dropPosVec.set(d.x, d.y, d.z); dropEuler.set(0.2, d.age * 2.4, 0.15); dropQuat.setFromEuler(dropEuler);
  dummyMatrix.compose(dropPosVec, dropQuat, dropScaleVec);
  dropInstanced.setMatrixAt(idx, dummyMatrix); dropInstanced.instanceMatrix.needsUpdate = true;
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
  const px = player.x, py = player.y + 0.9, pz = player.z;

  for (let i = 0; i < MAX_DROPS; i++) {
    const d = itemDrops[i];
    if (!d.active) continue;
    anyUpdated = true; d.age += dt;
    if (d.pickupDelay > 0) d.pickupDelay = Math.max(0, d.pickupDelay - dt);
    if (d.age > 90) { d.active = false; dummyMatrix.makeTranslation(0, -999, 0); dropInstanced.setMatrixAt(i, dummyMatrix); continue; }

    const dx = px - d.x, dy = py - d.y, dz = pz - d.z, dist = Math.hypot(dx, dy, dz);
    if (d.pickupDelay <= 0 && dist < 2.8) {
      if (dist < 0.88) {
        d.active = false; dummyMatrix.makeTranslation(0, -999, 0); dropInstanced.setMatrixAt(i, dummyMatrix);
        addInventoryItem(d.itemId, d.count); sfx.play('pickup'); continue;
      }
      const pull = Math.min(1.0, (1.0 - dist / 2.8) * 14.0 * dt + 0.12);
      d.x += dx * pull; d.y += dy * pull; d.z += dz * pull; d.vy = 0;
    } else {
      d.vy = Math.max(-20, d.vy - 16.0 * dt);
      const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(nx), Math.floor(d.y), Math.floor(d.z))].solid) d.x = nx;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(d.x), Math.floor(d.y), Math.floor(nz))].solid) d.z = nz;
      d.vx *= 0.86; d.vz *= 0.86;
      const ny = d.y + d.vy * dt;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(d.x), Math.floor(ny - 0.16), Math.floor(d.z))].solid) d.y = ny;
      else { if (d.vy < 0) d.y = Math.floor(ny - 0.16) + 1.18; d.vy = 0; }
    }
    dropPosVec.set(d.x, d.y + Math.sin(d.age * 3.8) * 0.065, d.z);
    dropEuler.set(0.22, d.age * 2.5, 0.18); dropQuat.setFromEuler(dropEuler);
    dummyMatrix.compose(dropPosVec, dropQuat, dropScaleVec);
    dropInstanced.setMatrixAt(i, dummyMatrix);
  }
  if (anyUpdated) dropInstanced.instanceMatrix.needsUpdate = true;
}

// ============================================================================
// 8B. DYNAMIC SKY: INDEPENDENT GLOWING SUN & MOON, SLOW CYCLE, STARS & CLOUDS
// ============================================================================
const skyGroup = new THREE.Group(); scene.add(skyGroup);
const celestialOrbit = new THREE.Group(); skyGroup.add(celestialOrbit);
const skyDomeUniforms = { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunElev: { value: 1.0 }, uOvercast: { value: 0.0 } };
const skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 20), new THREE.ShaderMaterial({
  uniforms: skyDomeUniforms, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vDir; uniform vec3 uSunDir; uniform float uSunElev; uniform float uOvercast;
  void main() {
    vec3 d = normalize(vDir), sDir = normalize(uSunDir);
    float h = clamp(d.y * 0.92 + 0.08, 0.0, 1.0), dayAmt = smoothstep(-0.08, 0.46, uSunElev);
    float twiAmt = smoothstep(-0.22, 0.04, uSunElev) * (1.0 - smoothstep(0.06, 0.48, uSunElev));
    vec3 zenithCol = mix(mix(vec3(0.02, 0.035, 0.075), vec3(0.24, 0.56, 0.95), dayAmt), vec3(0.11, 0.19, 0.42), twiAmt * 0.78);
    vec3 horizCol = mix(mix(vec3(0.035, 0.05, 0.10), vec3(0.64, 0.85, 1.0), dayAmt), vec3(0.26, 0.29, 0.46), twiAmt * 0.85);
    vec3 sky = mix(horizCol, zenithCol, pow(h, 0.58));
    float cosT = max(0.0, dot(d, sDir)), sunAz = max(0.0, dot(normalize(vec2(d.x, d.z) + 1e-5), normalize(vec2(sDir.x, sDir.z) + 1e-5)));
    float hBand = pow(1.0 - h, 2.7), glowMask = twiAmt * clamp(hBand * (0.10 + 0.90 * pow(sunAz, 1.6)) + 0.52 * pow(cosT, 3.2) * (1.0 - h * 0.55), 0.0, 1.0);
    vec3 sunsetCol = mix(vec3(0.90, 0.36, 0.22), vec3(1.0, 0.76, 0.40), clamp(pow(cosT, 1.8) + (1.0 - hBand) * 0.25, 0.0, 1.0));
    sky = mix(sky, sunsetCol, glowMask * 0.92) + vec3(1.0, 0.95, 0.85) * (pow(cosT, 8.0) * 0.12 * dayAmt);
    gl_FragColor = vec4(mix(sky, vec3(0.22, 0.27, 0.34) * max(0.15, dayAmt), uOvercast), 1.0);
  }`
}));
skyDomeMesh.renderOrder = -5; skyGroup.add(skyDomeMesh);

const celestialGlowTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.22, 'rgba(255,254,248,0.75)');
  g.addColorStop(0.36, 'rgba(255,248,230,0.42)'); g.addColorStop(0.58, 'rgba(255,240,210,0.14)');
  g.addColorStop(0.82, 'rgba(255,232,195,0.03)'); g.addColorStop(1.0, 'rgba(255,230,190,0.0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
})();

const sunGeo = new THREE.SphereGeometry(10.0, 36, 24);
(() => {
  const pos = sunGeo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const limb = Math.pow(Math.max(0, Math.abs(pos.getZ(i)) / 10.0), 0.42);
    col[i * 3] = 1.0; col[i * 3 + 1] = 0.90 + 0.10 * limb; col[i * 3 + 2] = 0.78 + 0.22 * limb;
  }
  sunGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
})();
const sunMesh = new THREE.Mesh(sunGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
sunMesh.renderOrder = -2;
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: celestialGlowTex, color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
sunGlow.renderOrder = -1; sunGlow.scale.set(50, 50, 1); skyGroup.add(sunMesh, sunGlow);

const moonGeo = new THREE.SphereGeometry(8.5, 36, 24);
(() => {
  const pos = moonGeo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i), ny = pos.getY(i), nz = pos.getZ(i);
    const crater = Math.sin(nx * 0.45 + ny * 0.35) * Math.cos(nx * 0.28 - ny * 0.42);
    const c = (crater > 0.2 ? 0.82 : (crater < -0.25 ? 0.91 : 1.0)) * (0.58 + 0.42 * Math.pow(Math.max(0, Math.abs(nz) / 8.5), 0.48));
    col[i * 3] = c * 0.95; col[i * 3 + 1] = c * 0.98; col[i * 3 + 2] = Math.min(1, c * 1.04);
  }
  moonGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
})();
const moonMesh = new THREE.Mesh(moonGeo, new THREE.MeshBasicMaterial({ color: 0xf8fafc, vertexColors: true, transparent: true, opacity: 1.0, depthWrite: false, fog: false }));
moonMesh.renderOrder = -3;
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: celestialGlowTex, color: 0xdbeafe, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
moonGlow.renderOrder = -2; moonGlow.scale.set(32, 32, 1); skyGroup.add(moonMesh, moonGlow);

const starPositions = new Float32Array(220 * 3);
for (let i = 0; i < 220; i++) {
  const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1), r = 165;
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta); starPositions[i * 3 + 1] = r * Math.cos(phi); starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, fog: false, transparent: true, opacity: 0.0, depthWrite: false });
const starField = new THREE.Points(starGeo, starMat); starField.renderOrder = -4; celestialOrbit.add(starField);

// Merged 3D Voxel Clouds (Single BufferGeometry = 1 Draw Call!)
const cloudMesh = (() => {
  const TILE = 480, boxes = [], pos = [], col = [], idx = [];
  let cSeed = 9001, vOff = 0;
  const cRand = () => { cSeed = (cSeed * 1664525 + 1013904223) >>> 0; return (cSeed & 0xffff) / 0x10000; };
  for (let i = 0; i < 42; i++) { const cx = cRand() * TILE, cz = cRand() * TILE, lobes = 1 + ((cRand() * 3) | 0); for (let l = 0; l < lobes; l++) boxes.push({ x: ((cx + (l ? (cRand() - 0.5) * 26 : 0)) % TILE + TILE) % TILE, z: ((cz + (l ? (cRand() - 0.5) * 22 : 0)) % TILE + TILE) % TILE, w: 14 + Math.floor(cRand() * 24), d: 12 + Math.floor(cRand() * 20) }); }
  const pushQuad = (p0, p1, p2, p3, sh) => { pos.push(...p0, ...p1, ...p2, ...p3); col.push(sh,sh,sh, sh,sh,sh, sh,sh,sh, sh,sh,sh); idx.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3); vOff += 4; };
  for (let tz = -1; tz <= 1; tz++) for (let tx = -1; tx <= 1; tx++) for (const b of boxes) {
    const x0 = tx * TILE + b.x, x1 = x0 + b.w, y0 = 192, y1 = 195.5, z0 = tz * TILE + b.z, z1 = z0 + b.d;
    pushQuad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0], 1.00); pushQuad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1], 0.78);
    pushQuad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1], 0.90); pushQuad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0], 0.90);
    pushQuad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1], 0.84); pushQuad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0], 0.84);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false, fog: false })); m.frustumCulled = false;
  scene.add(m); return m;
})();

let cloudDrift = 0, celestialAngle = 5.82, moonAngle = 2.15;
const DAY_CYCLE_SPEED = (Math.PI * 2) / 1200, MOON_CYCLE_SPEED = DAY_CYCLE_SPEED * 0.915;

function setTimeOfDay(angle, customMoonAngle) {
  celestialAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (typeof customMoonAngle === 'number') moonAngle = ((customMoonAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  else if (Math.cos(celestialAngle) < -0.5) moonAngle = 0.38;
  else moonAngle = (celestialAngle * 0.915 + 2.15) % (Math.PI * 2);
  updateDynamicSky(0); updateGPUShaders(0);
}

function updateDynamicSky(dt) {
  skyGroup.position.set(player.x, player.y, player.z);
  const skyScale = Math.max(1.0, (renderDistance * CHUNK_SIZE + 40) / 140);
  skyGroup.scale.set(skyScale, skyScale, skyScale);
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
  isNight = sunElev < -0.02;
  sunFactor = THREE.MathUtils.clamp(0.16 + THREE.MathUtils.smoothstep(sunElev, -0.10, 0.42) * 0.84, 0.16, 1.0);

  // Realistic pure white daytime Sun, shifting to warm gold/coral as it approaches the terrain horizon
  if (sunElev <= 0.24) {
    const t = THREE.MathUtils.clamp(sunElev / 0.24, 0, 1);
    sunMesh.material.color.copy(sunColHorizon).lerp(sunColGolden, t);
  } else {
    const t = THREE.MathUtils.clamp((sunElev - 0.24) / 0.18, 0, 1);
    sunMesh.material.color.copy(sunColGolden).lerp(sunColNoon, t);
  }
  const horizonScale = 1.0 + Math.max(0, 1.0 - Math.abs(sunElev) / 0.35) * 0.22;
  sunMesh.quaternion.copy(camera.quaternion);
  sunMesh.scale.set(horizonScale, horizonScale, 0.04);
  sunGlow.scale.set(50 * horizonScale, 50 * horizonScale, 1);
  moonMesh.quaternion.copy(camera.quaternion);
  moonMesh.scale.set(1, 1, 0.04);
  sunGlow.material.color.copy(sunMesh.material.color);
  sunGlow.material.opacity = THREE.MathUtils.clamp((sunElev + 0.06) * 4.5, 0.0, 0.95);
  sunMesh.material.opacity = THREE.MathUtils.clamp((sunElev + 0.04) * 5.5, 0.0, 1.0);
  const moonVis = THREE.MathUtils.clamp((moonElev + 0.12) * 3.0, 0.0, 1.0) * (1.0 - Math.max(0, sunElev) * 0.62);
  moonMesh.material.opacity = moonVis;
  moonGlow.material.opacity = moonVis * (isNight ? 0.68 : 0.22);

  skyDomeUniforms.uSunDir.value.copy(sunMesh.position).normalize();
  skyDomeUniforms.uSunElev.value = sunElev;
  const dayF = THREE.MathUtils.smoothstep(sunElev, -0.06, 0.44), twiF = THREE.MathUtils.smoothstep(sunElev, -0.20, 0.04) * (1.0 - THREE.MathUtils.smoothstep(sunElev, 0.06, 0.44));
  currentFogColor.copy(fogColorNight).lerp(fogColorDay, dayF).lerp(fogColorTwilight, twiF * 0.75);
  if (sunElev >= 0.22) {
    const t = THREE.MathUtils.smoothstep(sunElev, 0.22, 0.58);
    currentSkyColor.copy(skyColorGolden).lerp(skyColorDay, t); cloudMesh.material.color.copy(cloudColSunset).lerp(cloudColDay, t);
    gpuShaderUniforms.uSunLightColor.value.set(1.0, 0.78 + 0.22 * t, 0.58 + 0.42 * t);
  } else if (sunElev >= 0.0) {
    const t = THREE.MathUtils.smoothstep(sunElev, 0.0, 0.22);
    currentSkyColor.copy(skyColorTwilight).lerp(skyColorGolden, t); cloudMesh.material.color.copy(cloudColNight).lerp(cloudColSunset, t);
    gpuShaderUniforms.uSunLightColor.value.set(0.52 + 0.48 * t, 0.36 + 0.42 * t, 0.34 + 0.24 * t);
  } else if (sunElev >= -0.12) {
    const t = THREE.MathUtils.smoothstep(sunElev, -0.12, 0.0);
    currentSkyColor.copy(skyColorNight).lerp(skyColorTwilight, t); cloudMesh.material.color.copy(cloudColNight);
    gpuShaderUniforms.uSunLightColor.value.set(0.18 + 0.34 * t, 0.22 + 0.14 * t, 0.34);
  } else {
    currentSkyColor.copy(skyColorNight); cloudMesh.material.color.copy(cloudColNight);
    gpuShaderUniforms.uSunLightColor.value.set(0.18, 0.22, 0.34);
  }
  gpuShaderUniforms.uSunFactor.value = sunFactor;
  const nightBlend = THREE.MathUtils.smoothstep(-sunElev, -0.02, 0.14);
  const lx = THREE.MathUtils.lerp(sunMesh.position.x, moonMesh.position.x, nightBlend);
  const ly = Math.max(12, THREE.MathUtils.lerp(Math.max(8, sunMesh.position.y), Math.max(18, moonMesh.position.y), nightBlend));
  const lz = THREE.MathUtils.lerp(sunMesh.position.z, moonMesh.position.z, nightBlend);
  gpuShaderUniforms.uLightDir.value.set(lx, ly, lz).normalize();
  if (typeof farHorizonMesh !== 'undefined') { const sc = gpuShaderUniforms.uSunLightColor.value; farHorizonMesh.material.color.setRGB(sc.x * sunFactor, sc.y * sunFactor, sc.z * sunFactor); }
  if (!isCameraUnderwater) { scene.background.copy(currentSkyColor); scene.fog.color.copy(currentFogColor); }

  starMat.opacity = THREE.MathUtils.clamp((0.14 - sunElev) * 3.8, 0, 0.88);
  cloudDrift = (cloudDrift + dt * 1.6) % 480;
  gpuShaderUniforms.uCloudDrift.value = cloudDrift;
  const snapX = Math.floor((player.x - cloudDrift) / 480) * 480 + cloudDrift, snapZ = Math.floor(player.z / 480) * 480;
  cloudMesh.position.set(snapX, 0, snapZ);
}
