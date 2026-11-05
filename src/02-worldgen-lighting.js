// VoxelCraft HTML5 — 02-worldgen-lighting.js (3. WORLD GENERATOR (BIOMES, 3D CAVES, STRUCTURES) & 4. VOXEL BFS LIGHTING)
'use strict';

// ============================================================================
// 3. WORLD GENERATOR: BIOMES, 4x4x4 TRILINEAR 3D CAVES & ORES
// ============================================================================
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
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = p[X] + Y;
    const B = p[X + 1] + Y;
    return lerp(
      v,
      lerp(u, grad2(p[A], x, y), grad2(p[B], x - 1, y)),
      lerp(u, grad2(p[A + 1], x, y - 1), grad2(p[B + 1], x - 1, y - 1))
    ) * 0.35;
  }

  function noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A  = p[X] + Y,     AA = p[A] + Z,     AB = p[A + 1] + Z;
    const B  = p[X + 1] + Y, BA = p[B] + Z,     BB = p[B + 1] + Z;
    return lerp(w,
      lerp(v,
        lerp(u, grad3(p[AA], x, y, z),     grad3(p[BA], x - 1, y, z)),
        lerp(u, grad3(p[AB], x, y - 1, z), grad3(p[BB], x - 1, y - 1, z))
      ),
      lerp(v,
        lerp(u, grad3(p[AA + 1], x, y, z - 1),     grad3(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad3(p[AB + 1], x, y - 1, z - 1), grad3(p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  function fbm2D(x, z, octaves, lacunarity, gain) {
    let total = 0, freq = 1, amp = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * freq, z * freq) * amp;
      max += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return total / max;
  }

  function hash3D(x, y, z) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function getBiomeAt(wx, wz) {
    const temp = noise2D(wx * 0.0045 + 500, wz * 0.0045 + 500);
    const moist = noise2D(wx * 0.0045 - 500, wz * 0.0045 - 500);
    if (temp > 0.25 && moist < 0.05) return 'Desierto';
    if (temp < -0.22) return 'Taiga Nevada';
    if (moist > 0.15) return 'Bosque';
    return 'Llanura';
  }

  // Pre-allocated 5x17x5 coarse 3D noise grid for 4x4x4 trilinear interpolation
  const coarseCave = new Float32Array(5 * 17 * 5);
  const cIdx = (gx, gy, gz) => (gz * 5 + gx) * 17 + gy;

  function generateChunkVoxels(cx, cz, deltaList) {
    const data = new Uint8Array(CHUNK_VOLUME);
    const wx0 = cx * CHUNK_SIZE;
    const wz0 = cz * CHUNK_SIZE;

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

    // Step 2: Heightmap, Biomes & Strata
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wz = wz0 + lz;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = wx0 + lx;
        const biome = getBiomeAt(wx, wz);

        const continental = fbm2D(wx * 0.008, wz * 0.008, 3, 2.0, 0.5);
        const detail = fbm2D(wx * 0.032, wz * 0.032, 2, 2.0, 0.5);
        const mountain = Math.max(0, fbm2D(wx * 0.012 + 100, wz * 0.012 + 100, 3, 2.1, 0.55));

        let h = Math.floor(
          SEA_LEVEL + 5 +
          continental * 14 +
          detail * 4 +
          mountain * mountain * 26
        );
        if (h < 5) h = 5;
        if (h >= CHUNK_HEIGHT - 4) h = CHUNK_HEIGHT - 5;
        surfaceMap[lz * CHUNK_SIZE + lx] = h;

        const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
        data[colOffset] = BLOCK.BEDROCK;

        for (let y = 1; y <= h; y++) {
          if (y === h) {
            if (h <= SEA_LEVEL + 1 || biome === 'Desierto') {
              data[colOffset + y] = BLOCK.SAND;
            } else if (h >= 42 || biome === 'Taiga Nevada') {
              data[colOffset + y] = BLOCK.SNOW;
            } else {
              data[colOffset + y] = BLOCK.GRASS;
            }
          } else if (y >= h - 3) {
            data[colOffset + y] = (h <= SEA_LEVEL + 1 || biome === 'Desierto') ? BLOCK.SAND : BLOCK.DIRT;
          } else {
            data[colOffset + y] = BLOCK.STONE;
          }
        }

        if (h < SEA_LEVEL) {
          for (let y = h + 1; y <= SEA_LEVEL; y++) {
            if (y === SEA_LEVEL && biome === 'Taiga Nevada') {
              data[colOffset + y] = BLOCK.ICE;
            } else {
              data[colOffset + y] = BLOCK.WATER;
            }
          }
          if ((biome === 'Llanura' || biome === 'Bosque') && hash3D(wx, SEA_LEVEL, wz) > 0.962) {
            data[colOffset + SEA_LEVEL + 1] = BLOCK.LILY_PAD;
          }
        }
      }
    }

    // Step 3: Carve 3D Caves via Trilinear Interpolation + Place Ores
    for (let gz = 0; gz < 4; gz++) {
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 15; gy++) {
          const v000 = coarseCave[cIdx(gx, gy, gz)];
          const v100 = coarseCave[cIdx(gx + 1, gy, gz)];
          const v010 = coarseCave[cIdx(gx, gy + 1, gz)];
          const v110 = coarseCave[cIdx(gx + 1, gy + 1, gz)];
          const v001 = coarseCave[cIdx(gx, gy, gz + 1)];
          const v101 = coarseCave[cIdx(gx + 1, gy, gz + 1)];
          const v011 = coarseCave[cIdx(gx, gy + 1, gz + 1)];
          const v111 = coarseCave[cIdx(gx + 1, gy + 1, gz + 1)];

          for (let dz = 0; dz < 4; dz++) {
            const fz = dz * 0.25;
            const lz = gz * 4 + dz;
            for (let dx = 0; dx < 4; dx++) {
              const fx = dx * 0.25;
              const lx = gx * 4 + dx;
              const surfY = surfaceMap[lz * CHUNK_SIZE + lx];
              const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;

              for (let dy = 0; dy < 4; dy++) {
                const y = gy * 4 + dy;
                if (y <= 1 || y >= surfY) continue;
                // Don't break ocean floors so water doesn't flood caves
                if (surfY <= SEA_LEVEL + 1 && y >= surfY - 4) continue;

                const fy = dy * 0.25;
                const c00 = v000 + fx * (v100 - v000);
                const c10 = v010 + fx * (v110 - v010);
                const c01 = v001 + fx * (v101 - v001);
                const c11 = v011 + fx * (v111 - v011);
                const c0 = c00 + fy * (c10 - c00);
                const c1 = c01 + fy * (c11 - c01);
                const caveVal = c0 + fz * (c1 - c0);

                if (caveVal < 0.165) {
                  if (y <= 4) {
                    data[colOffset + y] = BLOCK.LAVA;
                  } else if (y <= 22 && data[colOffset + y - 1] === BLOCK.STONE && hash3D(wx0 + lx, y, wz0 + lz) > 0.968) {
                    data[colOffset + y] = BLOCK.GLOW_MUSHROOM;
                  } else {
                    data[colOffset + y] = BLOCK.AIR;
                  }
                } else if (data[colOffset + y] === BLOCK.STONE) {
                  // Underground Ore & Amethyst Geode Distribution
                  const r = hash3D(wx0 + lx, y, wz0 + lz);
                  if (caveVal < 0.192 && y >= 5 && y <= 20 && r > 0.945) {
                    data[colOffset + y] = BLOCK.AMETHYST;
                  } else if (y < 14 && r > 0.992) {
                    data[colOffset + y] = BLOCK.DIAMOND_ORE;
                  } else if (y < 24 && r > 0.988) {
                    data[colOffset + y] = BLOCK.GOLD_ORE;
                  } else if (y < 40 && r > 0.978) {
                    data[colOffset + y] = BLOCK.IRON_ORE;
                  } else if (y < 52 && r > 0.965) {
                    data[colOffset + y] = BLOCK.COAL_ORE;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Step 4: Trees, Cacti & Surface Cross-Quad Flora (Tall Grass, Roses, Dandelions)
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        const sy = surfaceMap[lz * CHUNK_SIZE + lx];
        if (sy <= SEA_LEVEL + 1 || sy >= 44) continue;

        const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
        const topBlock = data[colOffset + sy];
        const r = hash3D(wx, sy, wz);
        const biome = getBiomeAt(wx, wz);

        if (topBlock === BLOCK.SAND && biome === 'Desierto') {
          // Desert Cactus
          if (r > 0.985) {
            const ch = 2 + ((r * 100) & 1);
            for (let ty = 1; ty <= ch; ty++) {
              data[colOffset + sy + ty] = BLOCK.CACTUS;
            }
          }
        } else if (topBlock === BLOCK.GRASS || topBlock === BLOCK.SNOW) {
          const treeThreshold = biome === 'Bosque' ? 0.976 : 0.989;
          if (r > treeThreshold) {
            const trunkH = 4 + ((r * 1000) & 1);
            for (let ty = 1; ty <= trunkH; ty++) {
              data[colOffset + sy + ty] = BLOCK.WOOD;
            }
            const canopyBase = sy + trunkH - 1;
            for (let dy = 0; dy <= 2; dy++) {
              const rad = dy === 2 ? 1 : 2;
              for (let dz = -rad; dz <= rad; dz++) {
                for (let dx = -rad; dx <= rad; dx++) {
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > 0) continue;
                  const tCol = ((lz + dz) * CHUNK_SIZE + (lx + dx)) * CHUNK_HEIGHT;
                  const py = canopyBase + dy;
                  if (py < CHUNK_HEIGHT && data[tCol + py] === BLOCK.AIR) {
                    data[tCol + py] = BLOCK.LEAVES;
                  }
                }
              }
            }
          } else if (topBlock === BLOCK.GRASS && data[colOffset + sy + 1] === BLOCK.AIR) {
            // Flora (Tall grass & flowers)
            if (r < 0.085) {
              data[colOffset + sy + 1] = BLOCK.TALL_GRASS;
            } else if (r < 0.096) {
              data[colOffset + sy + 1] = BLOCK.FLOWER_RED;
            } else if (r < 0.106) {
              data[colOffset + sy + 1] = BLOCK.FLOWER_YELLOW;
            } else if (r < 0.111) {
              data[colOffset + sy + 1] = BLOCK.WHEAT_1;
            }
          }
        }
      }
    }

    // Step 4B: Procedural Structures (Desert Pyramids & Explorer Cabins)
    const structHash = ((Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ Math.imul(seed, 83492791)) >>> 0);
    if ((cx !== 0 || cz !== 0) && (structHash % 9 === 0)) {
      const centerBiome = getBiomeAt(wx0 + 8, wz0 + 8);
      const centerY = surfaceMap[8 * CHUNK_SIZE + 8];
      if (centerY > SEA_LEVEL + 2 && centerY < CHUNK_HEIGHT - 12) {
        placeStructureInChunk(data, surfaceMap, cx, cz, centerBiome === 'Desierto' ? 'pyramid' : 'cabin');
      }
    }

    // Step 5: Apply user delta modifications
    if (deltaList && deltaList.length > 0) {
      for (let i = 0; i < deltaList.length; i += 2) {
        data[deltaList[i]] = deltaList[i + 1];
      }
    }

    return data;
  }

  function placeStructureInChunk(data, surfaceMap, cx, cz, type = 'pyramid') {
    const baseY = surfaceMap ? surfaceMap[8 * CHUNK_SIZE + 8] : 28;
    const setLocal = (lx, y, lz, bId) => {
      if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y <= 1 || y >= CHUNK_HEIGHT) return;
      data[(lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT + y] = bId;
    };

    if (type === 'pyramid') {
      // Stepped 9x5x9 Desert Pyramid + Underground Treasure Chamber (Gold, Diamond, Glowstone & TNT trap)
      for (let layer = 0; layer <= 4; layer++) {
        const r = 4 - layer;
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            const blockId = (layer === 1 && (Math.abs(dx) === r || Math.abs(dz) === r)) ? BLOCK.BRICK : BLOCK.SAND;
            setLocal(8 + dx, baseY + 1 + layer, 8 + dz, blockId);
          }
        }
      }
      // Hollow interior & entrance on South (+Z)
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          setLocal(8 + dx, baseY + 1, 8 + dz, BLOCK.AIR);
          setLocal(8 + dx, baseY + 2, 8 + dz, BLOCK.AIR);
        }
      }
      setLocal(8, baseY + 1, 12, BLOCK.AIR);
      setLocal(8, baseY + 2, 12, BLOCK.AIR);
      setLocal(8, baseY + 3, 8, BLOCK.GLOWSTONE);

      // Hidden Treasure Chamber 3 blocks below floor
      const chamberY = Math.max(4, baseY - 3);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          setLocal(8 + dx, chamberY, 8 + dz, BLOCK.BRICK);
          setLocal(8 + dx, chamberY + 1, 8 + dz, BLOCK.AIR);
          setLocal(8 + dx, chamberY + 2, 8 + dz, BLOCK.AIR);
        }
      }
      setLocal(7, chamberY + 1, 8, BLOCK.GOLD_ORE);
      setLocal(9, chamberY + 1, 8, BLOCK.DIAMOND_ORE);
      setLocal(8, chamberY + 1, 7, BLOCK.CHEST);
      setLocal(8, chamberY + 1, 8, BLOCK.TNT);
      setLocal(8, chamberY + 2, 8, BLOCK.GLOWSTONE);
      for (let ly = chamberY + 1; ly <= baseY + 1; ly++) {
        setLocal(7, ly, 7, BLOCK.LADDER);
      }
      return { type: 'pyramid', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8, chamberY };
    } else {
      // 5x4x5 Explorer Cabin (Oak corner pillars, Plank walls, Glass windows, Torch & Treasure Chest inside)
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          setLocal(8 + dx, baseY, 8 + dz, BLOCK.COBBLE);
          for (let dy = 1; dy <= 3; dy++) {
            const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
            const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
            if (isCorner) {
              setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.WOOD);
            } else if (isWall) {
              if (dx === 0 && dz === 2 && dy <= 2) {
                setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR); // Doorway
              } else if (dy === 2 && (dx === 0 || dz === 0)) {
                setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.GLASS); // Window
              } else {
                setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.PLANKS);
              }
            } else {
              setLocal(8 + dx, baseY + dy, 8 + dz, BLOCK.AIR);
            }
          }
          setLocal(8 + dx, baseY + 4, 8 + dz, BLOCK.WOOD);
        }
      }
      setLocal(8, baseY + 1, 8, BLOCK.TORCH);
      setLocal(7, baseY + 1, 7, BLOCK.CHEST);
      return { type: 'cabin', x: cx * CHUNK_SIZE + 8, y: baseY + 1, z: cz * CHUNK_SIZE + 8 };
    }
  }

  return { generateChunkVoxels, getBiomeAt, placeStructureInChunk };
}

// ============================================================================
// 4. VOXEL LIGHTING ENGINE (1 BYTE PER VOXEL: 4-BIT SUN + 4-BIT BLOCK BFS)
// ============================================================================
// Fast BFS lighting calculation per chunk (reads light sources from chunk & 1-block border)
const bfsQueue = new Int32Array(CHUNK_VOLUME * 2);

function computeChunkLighting(ch, getChunkAt) {
  const light = ch.light;
  const data = ch.data;
  light.fill(0);

  let qHead = 0, qTail = 0;

  // 1. Cast vertical sunlight rays from top (y = 63 -> 0) + seed block light emitters + cache 2D minimap surface colors
  if (!ch.mapColors) ch.mapColors = new Uint32Array(CHUNK_SIZE * CHUNK_SIZE);
  const mapColors = ch.mapColors;
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const colOffset = (lz * CHUNK_SIZE + lx) * CHUNK_HEIGHT;
      let sun = 15;
      let topFound = false;
      for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
        const idx = colOffset + y;
        const b = data[idx];
        const def = BLOCK_DEFS[b];
        if (!topFound && b !== BLOCK.AIR) {
          topFound = true;
          const hex = def.color || 0x58a83a;
          const hShade = Math.min(1.28, Math.max(0.62, 0.72 + (y - SEA_LEVEL) * 0.018));
          const r = Math.min(255, ((hex >> 16) & 255) * hShade) | 0;
          const g = Math.min(255, ((hex >> 8) & 255) * hShade) | 0;
          const bl = Math.min(255, (hex & 255) * hShade) | 0;
          mapColors[lz * CHUNK_SIZE + lx] = (255 << 24) | (bl << 16) | (g << 8) | r;
        }
        if (def.opaque) {
          sun = 0;
        } else if (b === BLOCK.WATER || b === BLOCK.LEAVES) {
          sun = Math.max(0, sun - 2);
        }
        const emit = def.light;
        light[idx] = (sun << 4) | emit;
        if (sun > 0 || emit > 0) {
          bfsQueue[qTail++] = idx;
        }
      }
    }
  }

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
      const nVal = light[nIdx];
      let ns = nVal >> 4;
      let nb = nVal & 15;
      let changed = false;
      if (sL - 1 > ns) { ns = sL - 1; changed = true; }
      if (bL - 1 > nb) { nb = bL - 1; changed = true; }
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
