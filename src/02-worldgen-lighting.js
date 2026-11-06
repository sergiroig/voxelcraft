// VoxelCraft HTML5 — 02-worldgen-lighting.js (3. WORLD GENERATOR (BIOMES, 3D CAVES, STRUCTURES) & 4. VOXEL BFS LIGHTING)
'use strict';

// ============================================================================
// 3. WORLD GENERATOR: 9 BIOMES, BIOME TREES, ENV FEATURES, 3D CAVES & STRUCTURES
// ============================================================================
const BIOME_LIST = [
  'Llanura', 'Bosque', 'Desierto', 'Taiga Nevada',
  'Jungla', 'Pantano', 'Sabana', 'Meseta', 'Cumbres Heladas'
];

function createWorldGenerator(seed) {
  const p = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  let s = (seed >>> 0) || 123456789;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);

  const grad2 = (hash, x, y) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  };

  const grad3 = (hash, x, y, z) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  function noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), A = p[X] + Y, B = p[X + 1] + Y;
    return lerp(v, lerp(u, grad2(p[A], x, y), grad2(p[B], x - 1, y)), lerp(u, grad2(p[A + 1], x, y - 1), grad2(p[B + 1], x - 1, y - 1))) * 0.35;
  }

  function noise3D(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w,
      lerp(v, lerp(u, grad3(p[AA], x, y, z), grad3(p[BA], x - 1, y, z)), lerp(u, grad3(p[AB], x, y - 1, z), grad3(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad3(p[AA + 1], x, y, z - 1), grad3(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad3(p[AB + 1], x, y - 1, z - 1), grad3(p[BB + 1], x - 1, y - 1, z - 1)))
    );
  }

  function fbm2D(x, z, octaves, lacunarity, gain) {
    let total = 0, freq = 1, amp = 1, max = 0;
    for (let i = 0; i < octaves; i++) { total += noise2D(x * freq, z * freq) * amp; max += amp; amp *= gain; freq *= lacunarity; }
    return total / max;
  }

  function hash3D(x, y, z) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function getBiomeAt(wx, wz, dither = 0) {
    const temp = fbm2D(wx * 0.0024 + 500.37, wz * 0.0024 + 500.37, 2, 2.0, 0.5) + dither;
    const moist = fbm2D(wx * 0.0024 - 500.73, wz * 0.0024 - 500.73, 2, 2.0, 0.5) - dither * 0.7;
    const weird = noise2D(wx * 0.0032 + 1234.51, wz * 0.0032 - 1234.51);
    if (temp < -0.11) return (weird > 0.02 || temp < -0.22) ? 'Cumbres Heladas' : 'Taiga Nevada';
    if (temp > 0.11) {
      if (moist < -0.05) return weird > 0.02 ? 'Meseta' : 'Desierto';
      if (moist < 0.09) return 'Sabana';
      return 'Jungla';
    }
    if (moist > 0.09) return weird < 0.0 ? 'Pantano' : 'Bosque';
    if (moist > -0.02) return 'Bosque';
    return 'Llanura';
  }

  function placeTreeInChunk(data, lx, sy, lz, treeType = 'oak', r = 0.5) {
    const setT = (x, y, z, bId, onlyAir = false) => {
      if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y <= 1 || y >= CHUNK_HEIGHT) return;
      const idx = (z * CHUNK_SIZE + x) * CHUNK_HEIGHT + y;
      if (!onlyAir || data[idx] === BLOCK.AIR) data[idx] = bId;
    };
    if (treeType === 'pine') {
      const trunkH = 6 + ((r * 1000) & 1), topY = sy + trunkH;
      for (let ty = 1; ty <= trunkH; ty++) setT(lx, sy + ty, lz, BLOCK.WOOD);
      const layers = [[-3, 2], [-2, 1], [-1, 2], [0, 1]];
      for (const [dy, rad] of layers) {
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
          if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          setT(lx + dx, topY + dy, lz + dz, BLOCK.LEAVES, true);
        }
      }
      setT(lx, topY + 1, lz, BLOCK.LEAVES, true);
      return { type: 'pine', trunkH };
    }
    if (treeType === 'jungle') {
      const trunkH = 7 + ((r * 1000) & 1), topY = sy + trunkH;
      for (let ty = 1; ty <= trunkH; ty++) setT(lx, sy + ty, lz, BLOCK.WOOD);
      setT(lx + 1, sy + 1, lz, BLOCK.WOOD, true); setT(lx - 1, sy + 1, lz, BLOCK.WOOD, true);
      for (let dy = -1; dy <= 1; dy++) {
        const rad = dy === 1 ? 1 : 2;
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
          if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy === 0) continue;
          setT(lx + dx, topY + dy, lz + dz, BLOCK.LEAVES, true);
        }
      }
      for (const [vx, vz] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -1], [2, 1]]) {
        for (let vy = 1; vy <= 3; vy++) setT(lx + vx, topY - 1 - vy, lz + vz, BLOCK.LEAVES, true);
      }
      return { type: 'jungle', trunkH };
    }
    if (treeType === 'acacia') {
      const leanX = r > 0.99 ? 1 : -1, leanZ = (((r * 100) | 0) & 1) ? 1 : 0;
      for (let ty = 1; ty <= 3; ty++) setT(lx, sy + ty, lz, BLOCK.WOOD);
      setT(lx + leanX, sy + 4, lz + leanZ, BLOCK.WOOD);
      setT(lx + leanX, sy + 5, lz + leanZ, BLOCK.WOOD);
      const cxT = lx + leanX, czT = lz + leanZ, topY = sy + 5;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        setT(cxT + dx, topY, czT + dz, BLOCK.LEAVES, true);
      }
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dz) <= 1) setT(cxT + dx, topY + 1, czT + dz, BLOCK.LEAVES, true);
      }
      return { type: 'acacia', trunkH: 5 };
    }
    if (treeType === 'swamp') {
      const trunkH = 4 + ((r * 1000) & 1), topY = sy + trunkH;
      for (let ty = 1; ty <= trunkH; ty++) setT(lx, sy + ty, lz, BLOCK.WOOD);
      for (let dy = -1; dy <= 1; dy++) {
        const rad = dy === 1 ? 1 : 2;
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
          if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy >= 0) continue;
          setT(lx + dx, topY + dy, lz + dz, BLOCK.LEAVES, true);
        }
      }
      for (const [vx, vz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
        for (let vy = 1; vy <= 3; vy++) setT(lx + vx, topY - 1 - vy, lz + vz, BLOCK.LEAVES, true);
      }
      setT(lx + 1, sy + 1, lz, BLOCK.GLOW_MUSHROOM, true);
      return { type: 'swamp', trunkH };
    }
    const trunkH = 4 + ((r * 1000) & 1), canopyBase = sy + trunkH - 1;
    for (let ty = 1; ty <= trunkH; ty++) setT(lx, sy + ty, lz, BLOCK.WOOD);
    for (let dy = 0; dy <= 2; dy++) {
      const rad = dy === 2 ? 1 : 2;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > 0) continue;
        setT(lx + dx, canopyBase + dy, lz + dz, BLOCK.LEAVES, true);
      }
    }
    return { type: 'oak', trunkH };
  }

  function placeEnvFeatureInChunk(data, lx, sy, lz, featureType = 'boulder') {
    const setF = (x, y, z, bId, onlyAir = false) => {
      if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y <= 1 || y >= CHUNK_HEIGHT) return;
      const idx = (z * CHUNK_SIZE + x) * CHUNK_HEIGHT + y;
      if (data[idx] === BLOCK.WOOD || data[idx] === BLOCK.LEAVES) return;
      if (!onlyAir || data[idx] === BLOCK.AIR) data[idx] = bId;
    };
    if (featureType === 'fallen_log') {
      for (let dx = -1; dx <= 1; dx++) setF(lx + dx, sy + 1, lz, BLOCK.WOOD, true);
      setF(lx, sy + 1, lz + 1, BLOCK.GLOW_MUSHROOM, true);
      return { type: 'fallen_log' };
    }
    if (featureType === 'ice_spike') {
      for (let dy = 1; dy <= 5; dy++) setF(lx, sy + dy, lz, BLOCK.ICE);
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        setF(lx + dx, sy + 1, lz + dz, BLOCK.ICE); setF(lx + dx, sy + 2, lz + dz, BLOCK.ICE);
      }
      return { type: 'ice_spike' };
    }
    if (featureType === 'oasis') {
      setF(lx, sy, lz, BLOCK.WATER);
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        setF(lx + dx, sy, lz + dz, BLOCK.GRASS);
      }
      setF(lx + 1, sy + 1, lz, BLOCK.WHEAT_1, true);
      setF(lx - 1, sy + 1, lz, BLOCK.FLOWER_YELLOW, true);
      return { type: 'oasis' };
    }
    if (featureType === 'lava_pool') {
      setF(lx, sy - 1, lz, BLOCK.STONE); setF(lx, sy, lz, BLOCK.LAVA); setF(lx, sy + 1, lz, BLOCK.AIR);
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        setF(lx + dx, sy, lz + dz, BLOCK.STONE);
      }
      setF(lx + 1, sy, lz + 1, BLOCK.OBSIDIAN); setF(lx - 1, sy, lz - 1, BLOCK.GRAVEL);
      return { type: 'lava_pool' };
    }
    if (featureType === 'water_spring') {
      setF(lx, sy - 1, lz, BLOCK.CLAY); setF(lx, sy, lz, BLOCK.WATER); setF(lx, sy + 1, lz, BLOCK.LILY_PAD, true);
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        setF(lx + dx, sy, lz + dz, BLOCK.CLAY);
      }
      return { type: 'water_spring' };
    }
    setF(lx, sy + 1, lz, BLOCK.STONE); setF(lx, sy + 2, lz, BLOCK.COBBLE, true);
    setF(lx + 1, sy + 1, lz, BLOCK.COBBLE, true); setF(lx - 1, sy + 1, lz, BLOCK.GRAVEL, true);
    setF(lx, sy + 1, lz + 1, BLOCK.COBBLE, true);
    return { type: 'boulder' };
  }

  function getRiverFactorAt(wx, wz) {
    const warp = noise2D(wx * 0.015 + 311.7, wz * 0.015 - 193.3) * 14.0;
    const rVal = Math.abs(noise2D((wx + warp) * 0.0042 - 912.4, (wz + warp) * 0.0042 + 417.8));
    return rVal < 0.018 ? (0.018 - rVal) / 0.018 : 0;
  }

  function getRavineFloorAt(wx, wz) {
    const mask = noise2D(wx * 0.004 - 220.5, wz * 0.004 + 220.5);
    if (mask < 0.21) return 0;
    const warp = noise2D(wx * 0.02 + 19.3, wz * 0.02 - 41.7) * 6.0;
    const rVal = Math.abs(noise2D((wx + warp) * 0.0075 + 711.2, (wz - warp) * 0.018 - 388.6));
    return rVal < 0.0095 ? 10 + ((Math.abs(wx + wz)) & 3) : 0;
  }

  function isVillageChunk(cx, cz) {
    if (Math.abs(cx) <= 1 && Math.abs(cz) <= 1) return false;
    const rcx = Math.floor(cx / 12), rcz = Math.floor(cz / 12);
    const regHash = ((Math.imul(rcx, 92837111) ^ Math.imul(rcz, 689287499) ^ Math.imul(seed, 283923481)) >>> 0);
    if (regHash % 3 !== 0) return false;
    const vcx = rcx * 12 + 3 + (regHash % 5), vcz = rcz * 12 + 3 + ((regHash >>> 4) % 5);
    return (cx === vcx || cx === vcx + 1) && (cz === vcz || cz === vcz + 1);
  }

  function isCabinChunk(cx, cz) {
    if (cx === 0 && cz === 0) return false;
    const structHash = ((Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ Math.imul(seed, 83492791)) >>> 0);
    return (structHash % 240 === 0);
  }

  // Pre-allocated 5x17x5 coarse 3D noise grid for 4x4x4 trilinear interpolation
  const coarseCave = new Float32Array(5 * 17 * 5);
  const cIdx = (gx, gy, gz) => (gz * 5 + gx) * 17 + gy;

  function generateChunkVoxels(cx, cz, deltaList) {
    const data = new Uint8Array(CHUNK_VOLUME);
    const wx0 = cx * CHUNK_SIZE, wz0 = cz * CHUNK_SIZE;
    const notOriginChunk = (cx !== 0 || cz !== 0);

    // Step 1: Sample 3D cave noise on 4x4x4 coarse grid (only 425 evaluations!)
    for (let gz = 0; gz <= 4; gz++) {
      const wz = wz0 + gz * 4;
      for (let gx = 0; gx <= 4; gx++) {
        const wx = wx0 + gx * 4;
        for (let gy = 0; gy <= 16; gy++) {
          const wy = gy * 4;
          const n1 = noise3D(wx * 0.045, wy * 0.055, wz * 0.045);
          const n2 = noise3D(wx * 0.09 + 77, wy * 0.09 + 77, wz * 0.09 + 77);
          coarseCave[cIdx(gx, gy, gz)] = Math.abs(n1) + Math.abs(n2) * 0.5;
        }
      }
    }

    const surfaceMap = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

    // Step 2: Heightmap, 9 Biomes, Winding Rivers, Riverbeds (Clay/Gravel) & Strata
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wz = wz0 + lz;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = wx0 + lx, biome = getBiomeAt(wx, wz);
        const continental = fbm2D(wx * 0.008, wz * 0.008, 3, 2.0, 0.5), detail = fbm2D(wx * 0.032, wz * 0.032, 2, 2.0, 0.5);
        const mountain = Math.max(0, fbm2D(wx * 0.012 + 100, wz * 0.012 + 100, 3, 2.1, 0.55));
        const tempC = fbm2D(wx * 0.0024 + 500.37, wz * 0.0024 + 500.37, 2, 2.0, 0.5), moistC = fbm2D(wx * 0.0024 - 500.73, wz * 0.0024 - 500.73, 2, 2.0, 0.5);
        const swampFlat = Math.max(0, Math.min(1, (moistC - 0.04) * 5.0)) * Math.max(0, 1 - Math.abs(tempC) * 6.0);
        let h = Math.floor(SEA_LEVEL + (5 + continental * 14 + detail * 4 + mountain * mountain * 26) * (1 - swampFlat * 0.65) + Math.max(0, (-tempC - 0.08) * 24.0) * mountain);
        if (notOriginChunk && h >= SEA_LEVEL - 1 && h <= SEA_LEVEL + 13) {
          const rf = getRiverFactorAt(wx, wz);
          if (rf > 0) h = Math.floor(h * (1 - rf) + (SEA_LEVEL - 3) * rf);
        }
        if (h < 5) h = 5;
        if (h >= CHUNK_HEIGHT - 6) h = CHUNK_HEIGHT - 7;
        surfaceMap[lz * CHUNK_SIZE + lx] = h;

        const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT, rCol = hash3D(wx, h, wz), sBiome = getBiomeAt(wx, wz, (rCol - 0.5) * 0.028);
        data[colOffset] = BLOCK.BEDROCK;

        for (let y = 1; y <= h; y++) {
          if (y === h) {
            if (h <= SEA_LEVEL) {
              data[colOffset + y] = (sBiome === 'Pantano' || rCol > 0.68) ? BLOCK.CLAY : (rCol < 0.32 ? BLOCK.GRAVEL : BLOCK.SAND);
            } else if (sBiome === 'Cumbres Heladas') {
              data[colOffset + y] = (h >= 34 && rCol > 0.45) ? BLOCK.ICE : BLOCK.SNOW;
            } else if (h >= 42 || sBiome === 'Taiga Nevada') {
              data[colOffset + y] = BLOCK.SNOW;
            } else if (sBiome === 'Desierto' || h === SEA_LEVEL + 1) {
              data[colOffset + y] = (sBiome === 'Pantano' && rCol > 0.5) ? BLOCK.CLAY : BLOCK.SAND;
            } else if (sBiome === 'Meseta') {
              data[colOffset + y] = (h <= SEA_LEVEL + 6) ? (BLOCK.RED_SAND || BLOCK.SAND) : (((y >> 2) & 1) ? (BLOCK.TERRACOTTA || BLOCK.STONE) : (BLOCK.ORANGE_TERRACOTTA || BLOCK.SAND));
            } else {
              data[colOffset + y] = BLOCK.GRASS;
            }
          } else if (y >= h - 3) {
            if (sBiome === 'Meseta') data[colOffset + y] = (h <= SEA_LEVEL + 6) ? (BLOCK.RED_SAND || BLOCK.SAND) : (((y >> 2) & 1) ? (BLOCK.TERRACOTTA || BLOCK.STONE) : (BLOCK.ORANGE_TERRACOTTA || BLOCK.SAND));
            else data[colOffset + y] = (sBiome === 'Desierto' || (h <= SEA_LEVEL + 1 && sBiome !== 'Taiga Nevada' && sBiome !== 'Cumbres Heladas')) ? BLOCK.SAND : BLOCK.DIRT;
          } else {
            data[colOffset + y] = (sBiome === 'Meseta' && y >= h - 8 && rCol > 0.92) ? BLOCK.GOLD_ORE : BLOCK.STONE;
          }
        }

        if (h < SEA_LEVEL) {
          for (let y = h + 1; y <= SEA_LEVEL; y++) {
            data[colOffset + y] = (y === SEA_LEVEL && (biome === 'Taiga Nevada' || biome === 'Cumbres Heladas')) ? BLOCK.ICE : BLOCK.WATER;
          }
          const lilyT = biome === 'Pantano' ? 0.955 : (biome === 'Jungla' ? 0.975 : ((biome === 'Llanura' || biome === 'Bosque') ? 0.990 : 1.0));
          if (lilyT < 1.0 && h >= SEA_LEVEL - 2 && fbm2D(wx * 0.11 + 53, wz * 0.11 + 53, 2, 2.0, 0.5) > 0.22 && hash3D(wx, SEA_LEVEL, wz) > lilyT) data[colOffset + SEA_LEVEL + 1] = BLOCK.LILY_PAD;
        }
      }
    }

    // Step 3: Carve 3D Caves, 3D Mountain Overhangs/Arches, Tectonic Ravines + Place Ores (including Emerald)
    for (let gz = 0; gz < 4; gz++) {
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 15; gy++) {
          const v000 = coarseCave[cIdx(gx, gy, gz)], v100 = coarseCave[cIdx(gx + 1, gy, gz)];
          const v010 = coarseCave[cIdx(gx, gy + 1, gz)], v110 = coarseCave[cIdx(gx + 1, gy + 1, gz)];
          const v001 = coarseCave[cIdx(gx, gy, gz + 1)], v101 = coarseCave[cIdx(gx + 1, gy, gz + 1)];
          const v011 = coarseCave[cIdx(gx, gy + 1, gz + 1)], v111 = coarseCave[cIdx(gx + 1, gy + 1, gz + 1)];

          for (let dz = 0; dz < 4; dz++) {
            const fz = dz * 0.25, lz = gz * 4 + dz;
            for (let dx = 0; dx < 4; dx++) {
              const fx = dx * 0.25, lx = gx * 4 + dx, surfY = surfaceMap[lz * CHUNK_SIZE + lx];
              const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
              const ravFloor = (notOriginChunk && surfY > SEA_LEVEL + 3) ? getRavineFloorAt(wx0 + lx, wz0 + lz) : 0;
              for (let dy = 0; dy < 4; dy++) {
                const y = gy * 4 + dy;
                if (ravFloor > 0 && y >= ravFloor && y <= surfY) {
                  data[colOffset + y] = (y === ravFloor) ? ((lx + lz) & 1 ? BLOCK.LAVA : BLOCK.WATER) : BLOCK.AIR;
                  continue;
                }
                if (y <= 1 || y >= surfY || (surfY <= SEA_LEVEL + 1 && y >= surfY - 4)) continue;
                const fy = dy * 0.25;
                const c0 = (v000 + fx * (v100 - v000)) + fy * ((v010 + fx * (v110 - v010)) - (v000 + fx * (v100 - v000)));
                const c1 = (v001 + fx * (v101 - v001)) + fy * ((v011 + fx * (v111 - v011)) - (v001 + fx * (v101 - v001)));
                const caveVal = c0 + fz * (c1 - c0);
                const isOverhang = notOriginChunk && surfY >= SEA_LEVEL + 9 && y >= SEA_LEVEL + 4 && y <= surfY - 2 && caveVal < 0.195;

                if (caveVal < 0.165 || isOverhang) {
                  if (y <= 4) data[colOffset + y] = BLOCK.LAVA;
                  else if (y <= 22 && data[colOffset + y - 1] === BLOCK.STONE && hash3D(wx0 + lx, y, wz0 + lz) > 0.968) data[colOffset + y] = BLOCK.GLOW_MUSHROOM;
                  else data[colOffset + y] = BLOCK.AIR;
                } else if (data[colOffset + y] === BLOCK.STONE) {
                  const r = hash3D(wx0 + lx, y, wz0 + lz);
                  if (caveVal < 0.192 && y >= 5 && y <= 20 && r > 0.945) data[colOffset + y] = BLOCK.AMETHYST;
                  else if (surfY >= 31 && y < 24 && r > 0.9945) data[colOffset + y] = BLOCK.EMERALD_BLOCK;
                  else if (y < 14 && r > 0.992) data[colOffset + y] = BLOCK.DIAMOND_ORE;
                  else if (y < 24 && r > 0.988) data[colOffset + y] = BLOCK.GOLD_ORE;
                  else if (y < 40 && r > 0.978) data[colOffset + y] = BLOCK.IRON_ORE;
                  else if (y < 52 && r > 0.965) data[colOffset + y] = BLOCK.COAL_ORE;
                }
              }
            }
          }
        }
      }
    }

    // Step 4A: Procedural Structures per Biome (Rare Villages, Extremely Rare Cabins, Landmarks & Subterranean)
    let surfaceStructType = null;
    const structHash = ((Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ Math.imul(seed, 83492791)) >>> 0);
    if (notOriginChunk) {
      const centerBiome = getBiomeAt(wx0 + 8, wz0 + 8), centerY = surfaceMap[8 * CHUNK_SIZE + 8];
      const validSurface = centerY > SEA_LEVEL + 1 && centerY < CHUNK_HEIGHT - 12 && data[(8 * CHUNK_SIZE + 8) * CHUNK_HEIGHT + centerY] !== BLOCK.AIR;
      if (validSurface && isVillageChunk(cx, cz) && centerBiome !== 'Cumbres Heladas' && centerBiome !== 'Pantano' && centerBiome !== 'Jungla') {
        placeStructureInChunk(data, surfaceMap, cx, cz, 'village');
        surfaceStructType = 'village';
      } else if (validSurface && isCabinChunk(cx, cz)) {
        placeStructureInChunk(data, surfaceMap, cx, cz, 'cabin');
        surfaceStructType = 'cabin';
      } else if (validSurface && (structHash % 140 === 0)) {
        const variant = (structHash >>> 4) & 3;
        const sType = variant === 3 ? 'ruined_portal'
          : ((centerBiome === 'Desierto' || centerBiome === 'Meseta') ? 'pyramid'
          : ((centerBiome === 'Taiga Nevada' || centerBiome === 'Cumbres Heladas') ? (variant === 2 ? 'watchtower' : 'igloo')
          : ((centerBiome === 'Jungla' || centerBiome === 'Pantano') ? 'temple' : 'watchtower')));
        placeStructureInChunk(data, surfaceMap, cx, cz, sType);
        surfaceStructType = sType;
      }
      if ((structHash % 14 === 2) && centerY > SEA_LEVEL) {
        placeStructureInChunk(data, surfaceMap, cx, cz, (structHash & 1) ? 'mineshaft' : 'dungeon');
      }
    }

    // Step 4B: Biome-Specific Trees & Surface Flora (skipping structure footprints)
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        if (surfaceStructType === 'village') continue;
        if (surfaceStructType && lx >= 3 && lx <= 13 && lz >= 3 && lz <= 13) continue;
        const wx = wx0 + lx, wz = wz0 + lz, sy = surfaceMap[lz * CHUNK_SIZE + lx];
        if (sy <= SEA_LEVEL || sy >= CHUNK_HEIGHT - 11) continue;
        const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT, topBlock = data[colOffset + sy];
        const r = hash3D(wx, sy, wz), biome = getBiomeAt(wx, wz);

        if (biome === 'Desierto' || biome === 'Meseta') {
          if (r > 0.986 && (topBlock === BLOCK.SAND || topBlock === BLOCK.RED_SAND)) {
            const ch = 2 + ((r * 100) & 1);
            for (let ty = 1; ty <= ch; ty++) data[colOffset + sy + ty] = BLOCK.CACTUS;
          } else if (biome === 'Meseta' && r > 0.988 && data[colOffset + sy + 1] === BLOCK.AIR) {
            data[colOffset + sy + 1] = BLOCK.DEAD_BUSH || BLOCK.TALL_GRASS;
          }
        } else if (biome === 'Cumbres Heladas') {
          if (r > 0.982 && lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) placeTreeInChunk(data, lx, sy, lz, 'pine', r);
        } else if (topBlock === BLOCK.GRASS || topBlock === BLOCK.SNOW) {
          const treeThr = biome === 'Jungla' ? 0.962 : (biome === 'Bosque' ? 0.974 : (biome === 'Taiga Nevada' ? 0.978 : (biome === 'Pantano' ? 0.980 : 0.988)));
          const treeType = (biome === 'Taiga Nevada') ? 'pine' : (biome === 'Jungla' ? 'jungle' : (biome === 'Sabana' ? 'acacia' : (biome === 'Pantano' ? 'swamp' : 'oak')));
          if (r > treeThr && lx >= 3 && lx <= 12 && lz >= 3 && lz <= 12) {
            placeTreeInChunk(data, lx, sy, lz, treeType, r);
          } else if (topBlock === BLOCK.GRASS && data[colOffset + sy + 1] === BLOCK.AIR) {
            const grassLim = (biome === 'Jungla' || biome === 'Sabana') ? 0.16 : 0.085;
            if (r < grassLim) data[colOffset + sy + 1] = BLOCK.TALL_GRASS;
            else if (r < grassLim + 0.012) data[colOffset + sy + 1] = (biome === 'Pantano' && notOriginChunk) ? BLOCK.GLOW_MUSHROOM : BLOCK.FLOWER_RED;
            else if (r < grassLim + 0.022) data[colOffset + sy + 1] = BLOCK.FLOWER_YELLOW;
            else if (r < grassLim + 0.027) data[colOffset + sy + 1] = BLOCK.WHEAT_1;
          }
        }
      }
    }

    if (deltaList && deltaList.length > 0) for (let i = 0; i < deltaList.length; i += 2) data[deltaList[i]] = deltaList[i + 1];
    for (let pass = 0; pass < 2; pass++) for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
        for (let y = SEA_LEVEL; y >= 3; y--) {
          const bBelow = data[colOffset + y - 1];
          if (data[colOffset + y] === BLOCK.WATER && (bBelow === BLOCK.AIR || (BLOCK_DEFS[bBelow].shape === 'cross' && bBelow !== BLOCK.LADDER))) data[colOffset + y - 1] = BLOCK.WATER;
        }
        for (let y = 2; y <= SEA_LEVEL; y++) {
          const b = data[colOffset + y];
          if (b === BLOCK.AIR || (BLOCK_DEFS[b].shape === 'cross' && b !== BLOCK.LADDER)) {
            const wN = (lx > 0 && data[colOffset - CHUNK_HEIGHT + y] === BLOCK.WATER ? 1 : 0) + (lx < 15 && data[colOffset + CHUNK_HEIGHT + y] === BLOCK.WATER ? 1 : 0) + (lz > 0 && data[colOffset - 1024 + y] === BLOCK.WATER ? 1 : 0) + (lz < 15 && data[colOffset + 1024 + y] === BLOCK.WATER ? 1 : 0);
            if ((b !== BLOCK.AIR && wN >= 1) || (b === BLOCK.AIR && (wN >= 3 || (wN >= 1 && data[colOffset + y - 1] === BLOCK.WATER)))) data[colOffset + y] = BLOCK.WATER;
          }
        }
      }
    }
    return data;
  }

  function placeStructureInChunk(data, surfaceMap, cx, cz, type = 'pyramid') {
    const baseY = surfaceMap ? surfaceMap[8 * CHUNK_SIZE + 8] : 28, setLocal = (lx, y, lz, bId) => { if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y > 1 && y < CHUNK_HEIGHT) data[(lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT + y] = bId; };

    if (type === 'village') {
      // 1) Gravel roads across the chunk (N-S and E-W) + Central Well at (7..8, 7..8)
      for (let i = 0; i < CHUNK_SIZE; i++) {
        for (let r = 7; r <= 8; r++) {
          const ry1 = surfaceMap ? surfaceMap[i * CHUNK_SIZE + r] : baseY, ry2 = surfaceMap ? surfaceMap[r * CHUNK_SIZE + i] : baseY;
          setLocal(r, ry1, i, BLOCK.GRAVEL); setLocal(r, ry1 + 1, i, BLOCK.AIR);
          setLocal(i, ry2, r, BLOCK.GRAVEL); setLocal(i, ry2 + 1, r, BLOCK.AIR);
        }
      }
      for (let dz = 6; dz <= 9; dz++) for (let dx = 6; dx <= 9; dx++) {
        const isRim = dx === 6 || dx === 9 || dz === 6 || dz === 9, isCorner = (dx === 6 || dx === 9) && (dz === 6 || dz === 9);
        setLocal(dx, baseY, dz, isRim ? BLOCK.COBBLE : BLOCK.WATER);
        setLocal(dx, baseY + 1, dz, isRim ? BLOCK.COBBLE : BLOCK.AIR);
        if (isCorner) { setLocal(dx, baseY + 2, dz, BLOCK.WOOD); setLocal(dx, baseY + 3, dz, BLOCK.WOOD); }
        setLocal(dx, baseY + 4, dz, BLOCK.PLANKS);
      }
      setLocal(6, baseY + 2, 6, BLOCK.TORCH); setLocal(9, baseY + 2, 9, BLOCK.TORCH);

      // 2) Villager House 1 (NW: lx 1..5, lz 1..5) & House 2 (SW: lx 1..5, lz 10..14)
      for (const z0 of [1, 10]) {
        for (let dz = 0; dz <= 4; dz++) for (let dx = 0; dx <= 4; dx++) {
          const lx = 1 + dx, lz = z0 + dz, isCorner = (dx === 0 || dx === 4) && (dz === 0 || dz === 4), isWall = dx === 0 || dx === 4 || dz === 0 || dz === 4;
          for (let y = baseY - 2; y <= baseY; y++) setLocal(lx, y, lz, BLOCK.COBBLE);
          for (let dy = 1; dy <= 3; dy++) {
            if (dx === 4 && dz === 2 && dy <= 2) setLocal(lx, baseY + dy, lz, BLOCK.AIR);
            else if (isCorner) setLocal(lx, baseY + dy, lz, BLOCK.WOOD);
            else if (isWall) setLocal(lx, baseY + dy, lz, (dy === 2 && (dx === 2 || dz === 2)) ? BLOCK.GLASS : BLOCK.PLANKS);
            else setLocal(lx, baseY + dy, lz, BLOCK.AIR);
          }
          setLocal(lx, baseY + 4, lz, BLOCK.WOOD);
        }
        setLocal(2, baseY + 1, z0 + 1, BLOCK.BED); setLocal(2, baseY + 1, z0 + 3, z0 === 1 ? BLOCK.BOOKSHELF : BLOCK.CHEST);
        setLocal(4, baseY + 1, z0 + 1, BLOCK.CRAFTING_TABLE); setLocal(3, baseY + 2, z0 + 2, BLOCK.TORCH);
      }

      // 3) Blacksmith Forge (NE: lx 10..14, lz 1..5)
      for (let dz = 0; dz <= 4; dz++) for (let dx = 0; dx <= 4; dx++) {
        const lx = 10 + dx, lz = 1 + dz, isWall = dx === 0 || dx === 4 || dz === 0 || dz === 4;
        for (let y = baseY - 2; y <= baseY; y++) setLocal(lx, y, lz, BLOCK.COBBLE);
        for (let dy = 1; dy <= 3; dy++) {
          if (dx === 0 && dz === 2 && dy <= 2) setLocal(lx, baseY + dy, lz, BLOCK.AIR);
          else setLocal(lx, baseY + dy, lz, isWall ? BLOCK.BRICK : BLOCK.AIR);
        }
        setLocal(lx, baseY + 4, lz, BLOCK.COBBLE);
      }
      setLocal(13, baseY + 1, 2, BLOCK.FURNACE); setLocal(13, baseY + 1, 3, BLOCK.LAVA);
      setLocal(11, baseY + 1, 2, BLOCK.ANVIL); setLocal(12, baseY + 1, 4, BLOCK.CHEST); setLocal(12, baseY + 2, 2, BLOCK.TORCH);

      // 4) Irrigated Wheat Farm (SE: lx 10..14, lz 10..14)
      for (let dz = 0; dz <= 4; dz++) for (let dx = 0; dx <= 4; dx++) {
        const lx = 10 + dx, lz = 10 + dz, isBorder = dx === 0 || dx === 4 || dz === 0 || dz === 4;
        for (let y = baseY - 2; y < baseY; y++) setLocal(lx, y, lz, BLOCK.DIRT);
        for (let dy = 1; dy <= 4; dy++) setLocal(lx, baseY + dy, lz, BLOCK.AIR);
        if (isBorder) setLocal(lx, baseY, lz, BLOCK.WOOD);
        else if (dx === 2) setLocal(lx, baseY, lz, BLOCK.WATER);
        else { setLocal(lx, baseY, lz, BLOCK.DIRT); setLocal(lx, baseY + 1, lz, ((dx + dz) & 1) ? BLOCK.WHEAT_3 : BLOCK.WHEAT_2); }
      }
      return { type: 'village', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'mineshaft') {
      const my = 14;
      for (let lz = 2; lz <= 13; lz++) {
        for (let lx = 7; lx <= 9; lx++) {
          setLocal(lx, my - 1, lz, BLOCK.PLANKS);
          for (let dy = 0; dy <= 2; dy++) setLocal(lx, my + dy, lz, BLOCK.AIR);
        }
        setLocal(8, my, lz, BLOCK.RAIL);
        if (lz === 3 || lz === 7 || lz === 11) {
          for (let dy = 0; dy <= 2; dy++) { setLocal(7, my + dy, lz, BLOCK.WOOD); setLocal(9, my + dy, lz, BLOCK.WOOD); }
          setLocal(8, my + 2, lz, BLOCK.PLANKS);
          setLocal(8, my + 1, lz - 1, BLOCK.TORCH);
        }
      }
      setLocal(7, my, 8, BLOCK.CHEST); setLocal(9, my, 8, BLOCK.TNT);
      return { type: 'mineshaft', x: cx * CHUNK_SIZE + 8, y: my, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'dungeon') {
      const dy0 = 12;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        setLocal(8 + dx, dy0, 8 + dz, ((dx + dz) & 1) ? BLOCK.COBBLE : BLOCK.BRICK);
        setLocal(8 + dx, dy0 + 4, 8 + dz, BLOCK.COBBLE);
        const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let h = 1; h <= 3; h++) setLocal(8 + dx, dy0 + h, 8 + dz, isWall ? BLOCK.COBBLE : BLOCK.AIR);
      }
      setLocal(8, dy0 + 1, 10, BLOCK.AIR); setLocal(8, dy0 + 2, 10, BLOCK.AIR);
      setLocal(8, dy0 + 1, 8, BLOCK.CHEST); setLocal(7, dy0 + 1, 7, BLOCK.GOLD_ORE); setLocal(9, dy0 + 1, 7, BLOCK.DIAMOND_ORE);
      setLocal(7, dy0 + 1, 9, BLOCK.GLOW_MUSHROOM); setLocal(9, dy0 + 1, 9, BLOCK.GLOW_MUSHROOM);
      return { type: 'dungeon', x: cx * CHUNK_SIZE + 8, y: dy0 + 1, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'watchtower') {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        setLocal(8 + dx, baseY, 8 + dz, BLOCK.COBBLE);
        const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2, isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
        for (let dy = 1; dy <= 5; dy++) {
          if (dx === 0 && dz === 2 && dy <= 2) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
          else if (isWall) setLocal(8 + dx, baseY + dy, 8 + dz, (dy === 3 && (dx === 0 || dz === 0)) ? BLOCK.AIR : (isCorner ? BLOCK.BRICK : BLOCK.COBBLE));
          else setLocal(8 + dx, baseY + dy, 8 + dz, dy === 5 ? BLOCK.PLANKS : BLOCK.AIR);
        }
        if (isWall && ((dx + dz) & 1) === 0) setLocal(8 + dx, baseY + 6, 8 + dz, BLOCK.COBBLE);
      }
      for (let dy = 1; dy <= 5; dy++) setLocal(7, baseY + dy, 7, BLOCK.LADDER);
      setLocal(8, baseY + 1, 8, BLOCK.ANVIL); setLocal(9, baseY + 1, 7, BLOCK.CHEST); setLocal(8, baseY + 6, 8, BLOCK.TORCH);
      return { type: 'watchtower', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'ruined_portal') {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        setLocal(8 + dx, baseY, 8 + dz, (Math.abs(dx) + Math.abs(dz) <= 2) ? BLOCK.NETHERRACK : BLOCK.COBBLE);
        for (let dy = 1; dy <= 5; dy++) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
      }
      for (let dx = -1; dx <= 1; dx++) { setLocal(8 + dx, baseY + 1, 8, BLOCK.OBSIDIAN); setLocal(8 + dx, baseY + 5, 8, dx === 1 ? BLOCK.GOLD_BLOCK : BLOCK.OBSIDIAN); }
      for (let dy = 2; dy <= 4; dy++) { setLocal(7, baseY + dy, 8, BLOCK.OBSIDIAN); if (dy < 4) setLocal(9, baseY + dy, 8, BLOCK.OBSIDIAN); }
      setLocal(8, baseY, 9, BLOCK.LAVA); setLocal(7, baseY + 1, 9, BLOCK.CHEST); setLocal(9, baseY + 1, 9, BLOCK.GLOWSTONE);
      return { type: 'ruined_portal', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'pyramid') {
      for (let layer = 0; layer <= 4; layer++) {
        const r = 4 - layer;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          const blockId = (layer === 1 && (Math.abs(dx) === r || Math.abs(dz) === r)) ? BLOCK.BRICK : BLOCK.SAND;
          setLocal(8 + dx, baseY + 1 + layer, 8 + dz, blockId);
        }
      }
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        setLocal(8 + dx, baseY + 1, 8 + dz, BLOCK.AIR); setLocal(8 + dx, baseY + 2, 8 + dz, BLOCK.AIR);
      }
      setLocal(8, baseY + 1, 12, BLOCK.AIR); setLocal(8, baseY + 2, 12, BLOCK.AIR); setLocal(8, baseY + 3, 8, BLOCK.GLOWSTONE);

      const chamberY = Math.max(4, baseY - 3);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        setLocal(8 + dx, chamberY, 8 + dz, BLOCK.BRICK);
        setLocal(8 + dx, chamberY + 1, 8 + dz, BLOCK.AIR); setLocal(8 + dx, chamberY + 2, 8 + dz, BLOCK.AIR);
      }
      setLocal(7, chamberY + 1, 8, BLOCK.GOLD_ORE); setLocal(9, chamberY + 1, 8, BLOCK.DIAMOND_ORE);
      setLocal(8, chamberY + 1, 7, BLOCK.CHEST); setLocal(8, chamberY + 1, 8, BLOCK.TNT); setLocal(8, chamberY + 2, 8, BLOCK.GLOWSTONE);
      for (let ly = chamberY + 1; ly <= baseY + 1; ly++) setLocal(7, ly, 7, BLOCK.LADDER);
      return { type: 'pyramid', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8, chamberY };
    }
    if (type === 'igloo') {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        setLocal(8 + dx, baseY, 8 + dz, BLOCK.WOOL);
        const dist = Math.abs(dx) + Math.abs(dz);
        for (let dy = 1; dy <= 3; dy++) {
          const isWall = (Math.abs(dx) === 2 || Math.abs(dz) === 2) && dist <= 3;
          if (dx === 0 && dz === 2 && dy <= 2) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
          else if (isWall) setLocal(8 + dx, baseY + dy, 8 + dz, (dy === 2 && (dx === 0 || dz === 0)) ? BLOCK.ICE : BLOCK.SNOW);
          else if (dist <= 2) setLocal(8 + dx, baseY + dy, 8 + dz, dy === 3 ? BLOCK.SNOW : BLOCK.AIR);
        }
      }
      setLocal(8, baseY + 1, 8, BLOCK.TORCH); setLocal(7, baseY + 1, 7, BLOCK.BED);
      setLocal(9, baseY + 1, 7, BLOCK.FURNACE); setLocal(8, baseY + 1, 7, BLOCK.CHEST);
      return { type: 'igloo', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
    if (type === 'temple') {
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        setLocal(8 + dx, baseY, 8 + dz, BLOCK.COBBLE);
        const onEdge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        for (let dy = 1; dy <= 3; dy++) {
          if (dx === 0 && dz === 3 && dy <= 2) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
          else if (onEdge) setLocal(8 + dx, baseY + dy, 8 + dz, ((dx + dy + dz) & 1) ? BLOCK.COBBLE : BLOCK.STONE);
          else setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
        }
        if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) setLocal(8 + dx, baseY + 4, 8 + dz, BLOCK.BRICK);
      }
      setLocal(8, baseY + 1, 8, BLOCK.ENCHANTING_TABLE); setLocal(8, baseY + 1, 6, BLOCK.CHEST);
      setLocal(7, baseY + 1, 6, BLOCK.EMERALD_BLOCK); setLocal(9, baseY + 1, 6, BLOCK.GOLD_ORE);
      setLocal(6, baseY + 2, 8, BLOCK.TORCH); setLocal(10, baseY + 2, 8, BLOCK.TORCH);
      return { type: 'temple', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      setLocal(8 + dx, baseY, 8 + dz, BLOCK.COBBLE);
      for (let dy = 1; dy <= 3; dy++) {
        const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2, isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (isCorner) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.WOOD);
        else if (isWall) {
          if (dx === 0 && dz === 2 && dy <= 2) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
          else if (dy === 2 && (dx === 0 || dz === 0)) setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.GLASS);
          else setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.PLANKS);
        } else setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
      }
      setLocal(8 + dx, baseY + 4, 8 + dz, BLOCK.WOOD);
    }
    setLocal(8, baseY + 1, 8, BLOCK.TORCH); setLocal(7, baseY + 1, 7, BLOCK.CHEST); setLocal(9, baseY + 1, 7, BLOCK.CRAFTING_TABLE);
    return { type: 'cabin', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
  }

  function sampleSurfaceAt(wx, wz) {
    const continental = fbm2D(wx * 0.008, wz * 0.008, 3, 2.0, 0.5), detail = fbm2D(wx * 0.032, wz * 0.032, 2, 2.0, 0.5);
    const mountain = Math.max(0, fbm2D(wx * 0.012 + 100, wz * 0.012 + 100, 3, 2.1, 0.55));
    const tempC = fbm2D(wx * 0.0024 + 500.37, wz * 0.0024 + 500.37, 2, 2.0, 0.5), moistC = fbm2D(wx * 0.0024 - 500.73, wz * 0.0024 - 500.73, 2, 2.0, 0.5);
    const swampFlat = Math.max(0, Math.min(1, (moistC - 0.04) * 5.0)) * Math.max(0, 1 - Math.abs(tempC) * 6.0);
    let h = Math.floor(SEA_LEVEL + (5 + continental * 14 + detail * 4 + mountain * mountain * 26) * (1 - swampFlat * 0.65) + Math.max(0, (-tempC - 0.08) * 24.0) * mountain);
    if (h >= SEA_LEVEL - 1 && h <= SEA_LEVEL + 13) {
      const rf = getRiverFactorAt(wx, wz);
      if (rf > 0) h = Math.floor(h * (1 - rf) + (SEA_LEVEL - 3) * rf);
    }
    h = Math.max(5, Math.min(CHUNK_HEIGHT - 7, h));
    const biome = getBiomeAt(wx, wz, (hash3D(wx, h, wz) - 0.5) * 0.028);
    let topBlock = BLOCK.GRASS;
    if (h < SEA_LEVEL) topBlock = (biome === 'Taiga Nevada' || biome === 'Cumbres Heladas') ? BLOCK.ICE : BLOCK.WATER;
    else if (biome === 'Cumbres Heladas' || biome === 'Taiga Nevada' || h >= 42) topBlock = BLOCK.SNOW;
    else if (h <= SEA_LEVEL + 1 || biome === 'Desierto') topBlock = BLOCK.SAND;
    else if (biome === 'Meseta') topBlock = (h <= SEA_LEVEL + 6) ? (BLOCK.RED_SAND || BLOCK.SAND) : (((h >> 2) & 1) ? (BLOCK.TERRACOTTA || BLOCK.STONE) : (BLOCK.ORANGE_TERRACOTTA || BLOCK.SAND));
    const surfY = Math.max(h, SEA_LEVEL);
    return { y: surfY, groundY: h, topBlock, color: BLOCK_DEFS[topBlock].color || 0x58a83a };
  }

  return { generateChunkVoxels, sampleSurfaceAt, getBiomeAt, getRiverFactorAt, getRavineFloorAt, isVillageChunk, isCabinChunk, placeTreeInChunk, placeEnvFeatureInChunk, placeStructureInChunk };
}

// ============================================================================
// 4. VOXEL LIGHTING ENGINE (1 BYTE PER VOXEL: 4-BIT SUN + 4-BIT BLOCK BFS)
// ============================================================================
// Fast BFS lighting calculation per chunk (reads light sources from chunk & 1-block border)
const bfsQueue = new Int32Array(CHUNK_VOLUME * 2);

function computeChunkLighting(ch, getChunkAt, surfaceOnly = false) {
  const light = ch.light, data = ch.data;
  light.fill(0);
  let qHead = 0, qTail = 0;

  // 1. Cast vertical sunlight rays from top (y = 63 -> 0) + seed block light emitters + cache 2D minimap surface colors
  if (!ch.mapColors) ch.mapColors = new Uint32Array(CHUNK_SIZE * CHUNK_SIZE);
  const mapColors = ch.mapColors;
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
      let sun = 15, topFound = false;
      for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
        const idx = colOffset + y, b = data[idx], def = BLOCK_DEFS[b];
        if (!topFound && b !== BLOCK.AIR) {
          topFound = true;
          const hex = def.color || 0x58a83a;
          const hShade = Math.min(1.28, Math.max(0.62, 0.72 + (y - SEA_LEVEL) * 0.018));
          const r = Math.min(255, ((hex >> 16) & 255) * hShade) | 0;
          const g = Math.min(255, ((hex >> 8) & 255) * hShade) | 0;
          const bl = Math.min(255, (hex & 255) * hShade) | 0;
          mapColors[lz * CHUNK_SIZE + lx] = (255 << 24) | (bl << 16) | (g << 8) | r;
        }
        if (def.opaque) sun = surfaceOnly ? (y >= SEA_LEVEL - 4 ? 12 : 0) : 0;
        else if (b === BLOCK.WATER || b === BLOCK.LEAVES) sun = Math.max(surfaceOnly ? 12 : 0, sun - 2);
        const emit = def.light;
        light[idx] = (sun << 4) | emit;
        if (!surfaceOnly && (sun > 0 || emit > 0)) bfsQueue[qTail++] = idx;
        else if (surfaceOnly && topFound && sun === 0 && emit === 0) break;
      }
    }
  }
  if (surfaceOnly) { ch.lightReady = 'surface'; return; }

  // 2. Seed border light from the 4 adjacent chunks so torches/sun cross chunk seams!
  const nDirs = [
    [-1, 0, 0, 15],
    [ 1, 0, 15, 0],
    [ 0,-1, 0, 15],
    [ 0, 1, 15, 0]
  ];
  for (let d = 0; d < 4; d++) {
    const [dcx, dcz, myEdge, nEdge] = nDirs[d];
    const nCh = getChunkAt(ch.cx + dcx, ch.cz + dcz);
    if (!nCh || !nCh.lightReady) continue;
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const lx = dcx !== 0 ? myEdge : i;
      const lz = dcz !== 0 ? myEdge : i;
      const nlx = dcx !== 0 ? nEdge : i;
      const nlz = dcz !== 0 ? nEdge : i;
      const myCol = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
      const nCol  = (nlz * CHUNK_SIZE + nlx) * CHUNK_HEIGHT;
      for (let y = 1; y < CHUNK_HEIGHT - 1; y++) {
        const myIdx = myCol + y;
        if (BLOCK_DEFS[data[myIdx]].opaque) continue;
        const nVal = nCh.light[nCol + y];
        const nSun = Math.max(0, (nVal >> 4) - 1);
        const nBlk = Math.max(0, (nVal & 15) - 1);
        const cur = light[myIdx];
        const mSun = Math.max(cur >> 4, nSun);
        const mBlk = Math.max(cur & 15, nBlk);
        if (mSun > (cur >> 4) || mBlk > (cur & 15)) {
          light[myIdx] = (mSun << 4) | mBlk;
          bfsQueue[qTail++] = myIdx;
        }
      }
    }
  }

  // 3. Flood-fill BFS propagation inside chunk
  const strideX = CHUNK_HEIGHT;
  const strideZ = CHUNK_SIZE * CHUNK_HEIGHT;

  while (qHead < qTail) {
    const idx = bfsQueue[qHead++];
    const val = light[idx];
    const sL = val >> 4;
    const bL = val & 15;
    if (sL <= 1 && bL <= 1) continue;

    const y = idx % CHUNK_HEIGHT;
    const rem = (idx / CHUNK_HEIGHT) | 0;
    const lx = rem % CHUNK_SIZE;
    const lz = (rem / CHUNK_SIZE) | 0;

    // 6 neighbors inside chunk
    const tryProp = (nIdx) => {
      if (BLOCK_DEFS[data[nIdx]].opaque) return;
      const nVal = light[nIdx], att = data[nIdx] === BLOCK.WATER ? 2 : 1;
      let ns = nVal >> 4, nb = nVal & 15, changed = false;
      if (sL - att > ns) { ns = sL - att; changed = true; }
      if (bL - att > nb) { nb = bL - att; changed = true; }
      if (changed) {
        light[nIdx] = (ns << 4) | nb;
        bfsQueue[qTail++] = nIdx;
      }
    };

    if (lx > 0)              tryProp(idx - strideX);
    if (lx < CHUNK_SIZE - 1) tryProp(idx + strideX);
    if (lz > 0)              tryProp(idx - strideZ);
    if (lz < CHUNK_SIZE - 1) tryProp(idx + strideZ);
    if (y > 0)               tryProp(idx - 1);
    if (y < CHUNK_HEIGHT - 1) tryProp(idx + 1);
  }

  ch.lightReady = true;
}
