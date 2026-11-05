// VoxelCraft HTML5 — 05-simulation-entities.js (8C. VOXEL SIMULATION, FARMING, TNT, WEATHER, ARROWS & REDSTONE CIRCUITS)
'use strict';

// ============================================================================
// 8C. VOXEL PHYSICS TICK QUEUE (SAND, WATER) & PRIMED TNT EXPLOSIONS
// ============================================================================
const activeTNTs = [];
const tntGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
const tntMatRed = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
const tntMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

function igniteTNT(wx, wy, wz, fuse = 2.6) {
  setVoxelGlobal(wx, wy, wz, BLOCK.AIR);
  sfx.play('fuse');
  const mesh = new THREE.Mesh(tntGeo, tntMatRed);
  mesh.position.set(wx + 0.5, wy + 0.3, wz + 0.5);
  scene.add(mesh);
  activeTNTs.push({
    x: wx + 0.5,
    y: wy + 0.5,
    z: wz + 0.5,
    vy: 3.5,
    fuse,
    mesh
  });
}

function explodeAt(ex, ey, ez, radius = 3.6) {
  sfx.play('boom');
  spawnBlockParticles(ex, ey, ez, BLOCK.TNT, 48);
  spawnBlockParticles(ex, ey, ez, BLOCK.STONE, 36);

  const dirtySet = new Set();
  const rCeil = Math.ceil(radius);
  const bx0 = Math.floor(ex);
  const by0 = Math.floor(ey);
  const bz0 = Math.floor(ez);

  for (let dy = -rCeil; dy <= rCeil; dy++) {
    for (let dz = -rCeil; dz <= rCeil; dz++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > radius * radius) continue;
        const wx = bx0 + dx;
        const wy = by0 + dy;
        const wz = bz0 + dz;
        if (wy <= 1 || wy >= CHUNK_HEIGHT) continue;
        const b = getVoxelGlobal(wx, wy, wz);
        if (b === BLOCK.AIR || b === BLOCK.BEDROCK) continue;

        if (b === BLOCK.TNT) {
          // Chain reaction!
          setVoxelRawNoRebuild(wx, wy, wz, BLOCK.AIR, dirtySet);
          igniteTNT(wx, wy, wz, 0.45 + Math.random() * 0.35);
        } else {
          setVoxelRawNoRebuild(wx, wy, wz, BLOCK.AIR, dirtySet);
        }
      }
    }
  }

  // Single batch relight & mesh rebuild for the entire crater
  rebuildAffectedChunksSet(dirtySet);

  // Blast shockwave on Player
  const pdx = player.x - ex;
  const pdy = (player.y + 0.9) - ey;
  const pdz = player.z - ez;
  const pDist = Math.hypot(pdx, pdy, pdz);
  if (pDist < radius * 2.1 && pDist > 0.01) {
    const force = (1 - pDist / (radius * 2.1)) * 14;
    player.vy = Math.max(player.vy, 6.5);
    player.x += (pdx / pDist) * 0.4;
    player.z += (pdz / pDist) * 0.4;
    const dmg = Math.max(1, Math.round(force * 0.45));
    damagePlayer(dmg);
  }

  // Blast shockwave on Mobs
  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    const mdx = m.x - ex;
    const mdy = m.y - ey;
    const mdz = m.z - ez;
    const mDist = Math.hypot(mdx, mdy, mdz);
    if (mDist < radius * 2.0) {
      damageMob(m, 8, mdx, mdz);
    }
  }
}

let simAccum = 0;

function growTreeAt(wx, wy, wz, dirtySet) {
  const targetSet = dirtySet || new Set();
  const trunkH = 4;
  for (let ty = 0; ty < trunkH; ty++) {
    if (wy + ty < CHUNK_HEIGHT) {
      setVoxelRawNoRebuild(wx, wy + ty, wz, BLOCK.WOOD, targetSet);
    }
  }
  const canopyBase = wy + trunkH - 1;
  for (let dy = 0; dy <= 2; dy++) {
    const rad = dy === 2 ? 1 : 2;
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy > 0) continue;
        const py = canopyBase + dy;
        if (py < CHUNK_HEIGHT && getVoxelGlobal(wx + dx, py, wz + dz) === BLOCK.AIR) {
          setVoxelRawNoRebuild(wx + dx, py, wz + dz, BLOCK.LEAVES, targetSet);
        }
      }
    }
  }
  if (!dirtySet) rebuildAffectedChunksSet(targetSet);
  return true;
}

function updateVoxelSimulation(dt) {
  // 1. Update primed TNT entities
  for (let i = activeTNTs.length - 1; i >= 0; i--) {
    const t = activeTNTs[i];
    t.fuse -= dt;
    t.vy -= 18.0 * dt;
    const nextY = t.y + t.vy * dt;
    if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(t.x), Math.floor(nextY - 0.48), Math.floor(t.z))].solid) {
      t.y = nextY;
    } else {
      t.vy = 0;
    }
    t.mesh.position.set(t.x, t.y, t.z);
    // Blink faster as fuse approaches 0
    const blink = Math.floor(t.fuse * (t.fuse < 0.8 ? 16 : 7)) % 2 === 0;
    t.mesh.material = blink ? tntMatWhite : tntMatRed;
    const swell = t.fuse < 0.35 ? 1.0 + (0.35 - t.fuse) * 0.65 : 1.0;
    t.mesh.scale.setScalar(swell);

    if (t.fuse <= 0) {
      scene.remove(t.mesh);
      activeTNTs.splice(i, 1);
      explodeAt(t.x, t.y, t.z, 3.6);
    }
  }

  // 2. Cellular Automata Tick Queue (every 160ms) for Falling Sand & Flowing Water
  simAccum += dt;
  if (simAccum < 0.16 || simQueue.size === 0) return;
  simAccum = 0;

  const batch = Array.from(simQueue).slice(0, 256);
  for (const key of batch) simQueue.delete(key);

  const dirtySet = new Set();
  const movedThisTick = new Set();
  for (let i = 0; i < batch.length; i++) {
    if (movedThisTick.has(batch[i])) continue;
    const [wx, wy, wz] = batch[i].split(',').map(Number);
    if (wy <= 1 || wy >= CHUNK_HEIGHT) continue;
    const b = getVoxelGlobal(wx, wy, wz);

    if (b === BLOCK.SAND) {
      const below = getVoxelGlobal(wx, wy - 1, wz);
      if (below === BLOCK.AIR || below === BLOCK.WATER) {
        setVoxelRawNoRebuild(wx, wy, wz, below === BLOCK.WATER ? BLOCK.WATER : BLOCK.AIR, dirtySet);
        setVoxelRawNoRebuild(wx, wy - 1, wz, BLOCK.SAND, dirtySet);
        movedThisTick.add(`${wx},${wy - 1},${wz}`);
      }
    } else if (b === BLOCK.WATER) {
      const below = getVoxelGlobal(wx, wy - 1, wz);
      if (below === BLOCK.LAVA) {
        // Water + Lava reaction -> Solidifies Lava into Obsidian!
        setVoxelRawNoRebuild(wx, wy - 1, wz, BLOCK.OBSIDIAN, dirtySet);
        sfx.play('hiss');
        spawnBlockParticles(wx, wy - 1, wz, BLOCK.OBSIDIAN, 10);
      } else if (below === BLOCK.AIR && wy - 1 > 1) {
        setVoxelRawNoRebuild(wx, wy - 1, wz, BLOCK.WATER, dirtySet);
        movedThisTick.add(`${wx},${wy - 1},${wz}`);
      } else {
        for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const sideB = getVoxelGlobal(wx + dx, wy, wz + dz);
          if (sideB === BLOCK.LAVA) {
            setVoxelRawNoRebuild(wx + dx, wy, wz + dz, BLOCK.OBSIDIAN, dirtySet);
            sfx.play('hiss');
            spawnBlockParticles(wx + dx, wy, wz + dz, BLOCK.OBSIDIAN, 10);
          } else if (wy <= SEA_LEVEL && sideB === BLOCK.AIR) {
            const underSide = getVoxelGlobal(wx + dx, wy - 1, wz + dz);
            if (BLOCK_DEFS[underSide].solid || underSide === BLOCK.WATER) {
              setVoxelRawNoRebuild(wx + dx, wy, wz + dz, BLOCK.WATER, dirtySet);
              movedThisTick.add(`${wx + dx},${wy},${wz + dz}`);
            }
          }
        }
      }
    } else if (b === BLOCK.LAVA) {
      // Check if adjacent to water -> turns into Obsidian
      let turnedToObsidian = false;
      for (const [dx, dy, dz] of [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) {
        if (getVoxelGlobal(wx + dx, wy + dy, wz + dz) === BLOCK.WATER) {
          setVoxelRawNoRebuild(wx, wy, wz, BLOCK.OBSIDIAN, dirtySet);
          sfx.play('hiss');
          spawnBlockParticles(wx, wy, wz, BLOCK.OBSIDIAN, 10);
          turnedToObsidian = true;
          break;
        }
      }
      if (!turnedToObsidian) {
        const below = getVoxelGlobal(wx, wy - 1, wz);
        if (below === BLOCK.AIR && wy - 1 > 1) {
          setVoxelRawNoRebuild(wx, wy - 1, wz, BLOCK.LAVA, dirtySet);
          movedThisTick.add(`${wx},${wy - 1},${wz}`);
        }
      }
    } else if (b === BLOCK.SAPLING) {
      const soil = getVoxelGlobal(wx, wy - 1, wz);
      const sunL = getLightGlobal(wx, wy, wz) >> 4;
      if ((soil === BLOCK.GRASS || soil === BLOCK.DIRT) && sunL >= 9) {
        growTreeAt(wx, wy, wz, dirtySet);
      }
    } else if (b === BLOCK.WHEAT_1) {
      const sunL = getLightGlobal(wx, wy, wz) >> 4;
      if (sunL >= 7) {
        setVoxelRawNoRebuild(wx, wy, wz, BLOCK.WHEAT_2, dirtySet);
        simQueue.add(`${wx},${wy},${wz}`);
        movedThisTick.add(`${wx},${wy},${wz}`);
      }
    } else if (b === BLOCK.WHEAT_2) {
      const sunL = getLightGlobal(wx, wy, wz) >> 4;
      if (sunL >= 7) {
        setVoxelRawNoRebuild(wx, wy, wz, BLOCK.WHEAT_3, dirtySet);
        movedThisTick.add(`${wx},${wy},${wz}`);
      }
    }
  }

  rebuildAffectedChunksSet(dirtySet);
}

// ============================================================================
// 8C-2. DYNAMIC WEATHER (RAIN, BIOME SNOW, STORMS & LIGHTNING) IN 1 DRAW CALL
// ============================================================================
const MAX_WEATHER_DROPS = 180;
const weatherGeo = new THREE.BoxGeometry(0.05, 0.55, 0.05);
const weatherMat = new THREE.MeshBasicMaterial({
  color: 0x93c5fd,
  transparent: true,
  opacity: 0.72,
  depthWrite: false
});
const weatherInstanced = new THREE.InstancedMesh(weatherGeo, weatherMat, MAX_WEATHER_DROPS);
weatherInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
weatherInstanced.visible = false;
scene.add(weatherInstanced);

const weatherDrops = [];
for (let i = 0; i < MAX_WEATHER_DROPS; i++) {
  weatherDrops.push({
    ox: (Math.random() - 0.5) * 22,
    oy: Math.random() * 16,
    oz: (Math.random() - 0.5) * 22,
    phase: Math.random() * Math.PI * 2
  });
}

let weatherMode = 'clear'; // 'clear' | 'rain' | 'storm'
let isSnowing = false;
let lightningFlash = 0.0;
let stormThunderAccum = 0.0;
let lightningCount = 0;
const weatherScaleVec = new THREE.Vector3(1, 1, 1);
const weatherPosVec = new THREE.Vector3();
const weatherQuat = new THREE.Quaternion();

function toggleWeather(forceMode) {
  const modes = ['clear', 'rain', 'storm'];
  if (modes.includes(forceMode)) {
    weatherMode = forceMode;
  } else {
    const nextIdx = (modes.indexOf(weatherMode) + 1) % modes.length;
    weatherMode = modes[nextIdx];
  }
  weatherInstanced.visible = weatherMode !== 'clear';
  gpuShaderUniforms.uWindStrength.value = weatherMode === 'storm' ? 2.2 : (weatherMode === 'rain' ? 1.45 : 1.0);
  const btn = document.getElementById('tbtn-weather');
  if (btn) {
    btn.classList.toggle('toggled', weatherMode !== 'clear');
    btn.textContent = weatherMode === 'storm' ? '⛈ Tormenta' : (weatherMode === 'rain' ? '🌧 Lluvia' : '☀ Clima');
  }
  return weatherMode;
}

function triggerLightningFlash() {
  lightningFlash = 1.0;
  lightningCount++;
  sfx.play('thunder');
  return true;
}

function updateWeather(dt) {
  if (lightningFlash > 0) {
    lightningFlash = Math.max(0, lightningFlash - dt * 3.2);
    if (!isCameraUnderwater) {
      scene.background.lerp(new THREE.Color(0xf8fafc), lightningFlash * 0.75);
    }
  }

  if (weatherMode === 'clear') return;

  const curBiome = generator.getBiomeAt(player.x, player.z);
  isSnowing = (curBiome === 'Taiga Nevada' || player.y >= 42);
  weatherMat.color.setHex(isSnowing ? 0xf8fafc : 0x7dd3fc);
  weatherScaleVec.set(isSnowing ? 2.4 : 0.9, isSnowing ? 0.25 : 1.0, isSnowing ? 2.4 : 0.9);

  if (weatherMode === 'storm') {
    stormThunderAccum += dt;
    if (stormThunderAccum > 9.5) {
      stormThunderAccum = 0;
      triggerLightningFlash();
    }
  }

  const fallSpeed = isSnowing ? 3.2 : (weatherMode === 'storm' ? 21.0 : 16.0);
  const px = player.x;
  const py = player.y;
  const pz = player.z;
  const timeVal = gpuShaderUniforms.uTime.value;

  for (let i = 0; i < MAX_WEATHER_DROPS; i++) {
    const d = weatherDrops[i];
    d.oy -= fallSpeed * dt;
    if (d.oy < -4) d.oy += 16;

    const swayX = isSnowing ? Math.sin(timeVal * 2.0 + d.phase) * 0.8 : (weatherMode === 'storm' ? 0.6 : 0.15);
    const wx = px + d.ox + swayX;
    const wy = py + d.oy;
    const wz = pz + d.oz;

    // Hide precipitation inside caves or under solid roofs (where sunlight == 0)
    const sunL = getLightGlobal(Math.floor(wx), Math.floor(wy), Math.floor(wz)) >> 4;
    if (sunL === 0) {
      dummyMatrix.makeTranslation(0, -999, 0);
    } else {
      weatherPosVec.set(wx, wy, wz);
      dummyMatrix.compose(weatherPosVec, weatherQuat, weatherScaleVec);
    }
    weatherInstanced.setMatrixAt(i, dummyMatrix);
  }
  weatherInstanced.instanceMatrix.needsUpdate = true;
}

// ============================================================================
// 8C-3. 3D BALLISTIC ARROWS (INSTANCEDMESH) & CONSUMABLE FOOD (APPLE)
// ============================================================================
const MAX_ARROWS = 24;
const arrowGeo = new THREE.BoxGeometry(0.08, 0.08, 0.62);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
const arrowInstanced = new THREE.InstancedMesh(arrowGeo, arrowMat, MAX_ARROWS);
arrowInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(arrowInstanced);

const arrows = [];
const arrowPosVec = new THREE.Vector3();
const arrowTargetVec = new THREE.Vector3();
const arrowLookMat = new THREE.Matrix4();
const arrowQuat = new THREE.Quaternion();
const arrowScaleVec = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < MAX_ARROWS; i++) {
  arrows.push({
    active: false,
    stuck: false,
    x: 0, y: -999, z: 0,
    vx: 0, vy: 0, vz: 0,
    age: 0
  });
  dummyMatrix.makeTranslation(0, -999, 0);
  arrowInstanced.setMatrixAt(i, dummyMatrix);
}
let arrowCursor = 0;

function shootArrow(ox, oy, oz, dx, dy, dz) {
  const a = arrows[arrowCursor];
  const idx = arrowCursor;
  arrowCursor = (arrowCursor + 1) % MAX_ARROWS;

  const len = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / len, ny = dy / len, nz = dz / len;
  const speed = 24.0;

  a.active = true;
  a.stuck = false;
  a.x = ox + nx * 0.45;
  a.y = oy + ny * 0.45;
  a.z = oz + nz * 0.45;
  a.vx = nx * speed;
  a.vy = ny * speed;
  a.vz = nz * speed;
  a.age = 0;

  arrowPosVec.set(a.x, a.y, a.z);
  arrowTargetVec.set(a.x + a.vx, a.y + a.vy, a.z + a.vz);
  arrowLookMat.lookAt(arrowPosVec, arrowTargetVec, camera.up);
  arrowQuat.setFromRotationMatrix(arrowLookMat);
  dummyMatrix.compose(arrowPosVec, arrowQuat, arrowScaleVec);
  arrowInstanced.setMatrixAt(idx, dummyMatrix);
  arrowInstanced.instanceMatrix.needsUpdate = true;

  sfx.play('bow');
  return a;
}

function updateArrows(dt) {
  let anyUpdated = false;
  for (let i = 0; i < MAX_ARROWS; i++) {
    const a = arrows[i];
    if (!a.active) continue;
    anyUpdated = true;
    a.age += dt;

    if (a.age > 12.0) {
      a.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      arrowInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    }
    if (a.stuck) continue;

    const stepDist = Math.hypot(a.vx * dt, a.vy * dt, a.vz * dt);
    const speed = Math.hypot(a.vx, a.vy, a.vz) || 1;
    const hitM = raycastMob(a.x, a.y, a.z, a.vx / speed, a.vy / speed, a.vz / speed, stepDist + 0.55);
    if (hitM) {
      damageMob(hitM, 4, a.vx, a.vz);
      a.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      arrowInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    }

    a.vy -= 14.0 * dt;
    const nx = a.x + a.vx * dt;
    const ny = a.y + a.vy * dt;
    const nz = a.z + a.vz * dt;
    const b = getVoxelGlobal(Math.floor(nx), Math.floor(ny), Math.floor(nz));

    if (b === BLOCK.TNT) {
      igniteTNT(Math.floor(nx), Math.floor(ny), Math.floor(nz), 1.4);
      a.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      arrowInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    } else if (BLOCK_DEFS[b].solid) {
      a.stuck = true;
      sfx.play('hit');
    } else {
      a.x = nx;
      a.y = ny;
      a.z = nz;
    }

    arrowPosVec.set(a.x, a.y, a.z);
    arrowTargetVec.set(a.x + a.vx, a.y + a.vy, a.z + a.vz);
    arrowLookMat.lookAt(arrowPosVec, arrowTargetVec, camera.up);
    arrowQuat.setFromRotationMatrix(arrowLookMat);
    dummyMatrix.compose(arrowPosVec, arrowQuat, arrowScaleVec);
    arrowInstanced.setMatrixAt(i, dummyMatrix);
  }
  if (anyUpdated) arrowInstanced.instanceMatrix.needsUpdate = true;
}

function eatHeldApple(foodItemOverride) {
  const heldId = foodItemOverride || (hotbarSlots[selectedSlot] === BLOCK.ITEM_BREAD ? BLOCK.ITEM_BREAD : BLOCK.ITEM_APPLE);
  const healAmount = heldId === BLOCK.ITEM_BREAD ? 5 : 4;
  if (gameMode === 'survival' && (inventoryCounts[heldId] || 0) <= 0) return false;
  if (player.health >= player.maxHealth && gameMode === 'survival') return false;
  if (gameMode === 'survival') {
    inventoryCounts[heldId] = Math.max(0, (inventoryCounts[heldId] || 1) - 1);
  }
  player.health = Math.min(player.maxHealth, player.health + healAmount);
  renderHeartsUI();
  refreshInventoryCountsUI();
  player.swingTime = 1.0;
  sfx.play('eat');
  return true;
}

// ============================================================================
// 8C-4. REDSTONE VOXEL CIRCUITS (LEVERS, REDSTONE LAMPS, DOORS & REMOTE TNT)
// ============================================================================
function toggleVoxelDoor(wx, wy, wz) {
  const cur = getVoxelGlobal(wx, wy, wz);
  if (cur !== BLOCK.DOOR_CLOSED && cur !== BLOCK.DOOR_OPEN) return false;
  const nextId = cur === BLOCK.DOOR_CLOSED ? BLOCK.DOOR_OPEN : BLOCK.DOOR_CLOSED;
  setVoxelGlobal(wx, wy, wz, nextId);
  sfx.play('door');
  return nextId === BLOCK.DOOR_OPEN;
}

function propagateRedstoneSignal(wx, wy, wz, isPowered) {
  const dirtySet = new Set();
  let affectedCount = 0;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 4) continue;
        const nx = wx + dx;
        const ny = wy + dy;
        const nz = wz + dz;
        const nb = getVoxelGlobal(nx, ny, nz);

        if (isPowered && nb === BLOCK.REDSTONE_LAMP_OFF) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.REDSTONE_LAMP_ON, dirtySet);
          affectedCount++;
        } else if (!isPowered && nb === BLOCK.REDSTONE_LAMP_ON) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.REDSTONE_LAMP_OFF, dirtySet);
          affectedCount++;
        } else if (isPowered && nb === BLOCK.DOOR_CLOSED) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.DOOR_OPEN, dirtySet);
          sfx.play('door');
          affectedCount++;
        } else if (!isPowered && nb === BLOCK.DOOR_OPEN) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.DOOR_CLOSED, dirtySet);
          sfx.play('door');
          affectedCount++;
        } else if (isPowered && nb === BLOCK.TNT) {
          igniteTNT(nx, ny, nz, 1.5);
          affectedCount++;
        }
      }
    }
  }
  rebuildAffectedChunksSet(dirtySet);
  return affectedCount;
}

function toggleVoxelLever(wx, wy, wz) {
  const cur = getVoxelGlobal(wx, wy, wz);
  if (cur !== BLOCK.LEVER_OFF && cur !== BLOCK.LEVER_ON) return false;
  const nextState = cur === BLOCK.LEVER_OFF ? BLOCK.LEVER_ON : BLOCK.LEVER_OFF;
  const isPowered = nextState === BLOCK.LEVER_ON;
  setVoxelGlobal(wx, wy, wz, nextState);
  sfx.play('lever');
  propagateRedstoneSignal(wx, wy, wz, isPowered);
  return isPowered;
}

