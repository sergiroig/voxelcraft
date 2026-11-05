// VoxelCraft HTML5 — 05-simulation-entities.js (8C. VOXEL SIMULATION, WEATHER, ARROWS/GRAPPLE, REDSTONE/PISTONS, CHESTS & MINECARTS)
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
  activeTNTs.push({ x: wx + 0.5, y: wy + 0.5, z: wz + 0.5, vy: 3.5, fuse, mesh });
}

function explodeAt(ex, ey, ez, radius = 3.6) {
  sfx.play('boom');
  spawnBlockParticles(ex, ey, ez, BLOCK.TNT, 48);
  spawnBlockParticles(ex, ey, ez, BLOCK.STONE, 36);

  const dirtySet = new Set();
  const rCeil = Math.ceil(radius);
  const bx0 = Math.floor(ex), by0 = Math.floor(ey), bz0 = Math.floor(ez);

  for (let dy = -rCeil; dy <= rCeil; dy++) {
    for (let dz = -rCeil; dz <= rCeil; dz++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
        const wx = bx0 + dx, wy = by0 + dy, wz = bz0 + dz;
        if (wy <= 1 || wy >= CHUNK_HEIGHT) continue;
        const b = getVoxelGlobal(wx, wy, wz);
        if (b === BLOCK.AIR || b === BLOCK.BEDROCK) continue;
        setVoxelRawNoRebuild(wx, wy, wz, BLOCK.AIR, dirtySet);
        if (b === BLOCK.TNT) igniteTNT(wx, wy, wz, 0.45 + Math.random() * 0.35);
      }
    }
  }
  rebuildAffectedChunksSet(dirtySet);

  const pdx = player.x - ex, pdy = (player.y + 0.9) - ey, pdz = player.z - ez;
  const pDist = Math.hypot(pdx, pdy, pdz);
  if (pDist < radius * 2.1 && pDist > 0.01) {
    const force = (1 - pDist / (radius * 2.1)) * 14;
    player.vy = Math.max(player.vy, 6.5);
    player.x += (pdx / pDist) * 0.4;
    player.z += (pdz / pDist) * 0.4;
    damagePlayer(Math.max(1, Math.round(force * 0.45)));
  }

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    const mdx = m.x - ex, mdy = m.y - ey, mdz = m.z - ez;
    if (Math.hypot(mdx, mdy, mdz) < radius * 2.0) damageMob(m, 8, mdx, mdz);
  }
}

let simAccum = 0;

function growTreeAt(wx, wy, wz, dirtySet) {
  const targetSet = dirtySet || new Set();
  const trunkH = 4;
  for (let ty = 0; ty < trunkH; ty++) {
    if (wy + ty < CHUNK_HEIGHT) setVoxelRawNoRebuild(wx, wy + ty, wz, BLOCK.WOOD, targetSet);
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
  for (let i = activeTNTs.length - 1; i >= 0; i--) {
    const t = activeTNTs[i];
    t.fuse -= dt;
    t.vy -= 18.0 * dt;
    const nextY = t.y + t.vy * dt;
    if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(t.x), Math.floor(nextY - 0.48), Math.floor(t.z))].solid) t.y = nextY;
    else t.vy = 0;
    t.mesh.position.set(t.x, t.y, t.z);
    const blink = Math.floor(t.fuse * (t.fuse < 0.8 ? 16 : 7)) % 2 === 0;
    t.mesh.material = blink ? tntMatWhite : tntMatRed;
    t.mesh.scale.setScalar(t.fuse < 0.35 ? 1.0 + (0.35 - t.fuse) * 0.65 : 1.0);
    if (t.fuse <= 0) {
      scene.remove(t.mesh);
      activeTNTs.splice(i, 1);
      explodeAt(t.x, t.y, t.z, 3.6);
    }
  }

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
      if (!turnedToObsidian && getVoxelGlobal(wx, wy - 1, wz) === BLOCK.AIR && wy - 1 > 1) {
        setVoxelRawNoRebuild(wx, wy - 1, wz, BLOCK.LAVA, dirtySet);
        movedThisTick.add(`${wx},${wy - 1},${wz}`);
      }
    } else if (b === BLOCK.SAPLING) {
      const soil = getVoxelGlobal(wx, wy - 1, wz);
      if ((soil === BLOCK.GRASS || soil === BLOCK.DIRT) && (getLightGlobal(wx, wy, wz) >> 4) >= 9) growTreeAt(wx, wy, wz, dirtySet);
    } else if (b === BLOCK.WHEAT_1 && (getLightGlobal(wx, wy, wz) >> 4) >= 7) {
      setVoxelRawNoRebuild(wx, wy, wz, BLOCK.WHEAT_2, dirtySet);
      simQueue.add(`${wx},${wy},${wz}`);
      movedThisTick.add(`${wx},${wy},${wz}`);
    } else if (b === BLOCK.WHEAT_2 && (getLightGlobal(wx, wy, wz) >> 4) >= 7) {
      setVoxelRawNoRebuild(wx, wy, wz, BLOCK.WHEAT_3, dirtySet);
      movedThisTick.add(`${wx},${wy},${wz}`);
    }
  }
  rebuildAffectedChunksSet(dirtySet);
}

// ============================================================================
// 8C-2. DYNAMIC WEATHER (RAIN, BIOME SNOW, STORMS & LIGHTNING) IN 1 DRAW CALL
// ============================================================================
const MAX_WEATHER_DROPS = 180;
const weatherGeo = new THREE.BoxGeometry(0.05, 0.55, 0.05);
const weatherMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.72, depthWrite: false });
const weatherInstanced = new THREE.InstancedMesh(weatherGeo, weatherMat, MAX_WEATHER_DROPS);
weatherInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
weatherInstanced.visible = false;
scene.add(weatherInstanced);

const weatherDrops = [];
for (let i = 0; i < MAX_WEATHER_DROPS; i++) {
  weatherDrops.push({ ox: (Math.random() - 0.5) * 22, oy: Math.random() * 16, oz: (Math.random() - 0.5) * 22, phase: Math.random() * Math.PI * 2 });
}

let weatherMode = 'clear';
let isSnowing = false;
let lightningFlash = 0.0;
let stormThunderAccum = 0.0;
let lightningCount = 0;
const weatherScaleVec = new THREE.Vector3(1, 1, 1);
const weatherPosVec = new THREE.Vector3();
const weatherQuat = new THREE.Quaternion();

function toggleWeather(forceMode) {
  const modes = ['clear', 'rain', 'storm'];
  weatherMode = modes.includes(forceMode) ? forceMode : modes[(modes.indexOf(weatherMode) + 1) % modes.length];
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
    if (!isCameraUnderwater) scene.background.lerp(new THREE.Color(0xf8fafc), lightningFlash * 0.75);
  }
  if (weatherMode === 'clear') return;

  const curBiome = generator.getBiomeAt(player.x, player.z);
  isSnowing = (curBiome === 'Taiga Nevada' || player.y >= 42);
  weatherMat.color.setHex(isSnowing ? 0xf8fafc : 0x7dd3fc);
  weatherScaleVec.set(isSnowing ? 2.4 : 0.9, isSnowing ? 0.25 : 1.0, isSnowing ? 2.4 : 0.9);

  if (weatherMode === 'storm') {
    stormThunderAccum += dt;
    if (stormThunderAccum > 9.5) { stormThunderAccum = 0; triggerLightningFlash(); }
  }

  const fallSpeed = isSnowing ? 3.2 : (weatherMode === 'storm' ? 21.0 : 16.0);
  const px = player.x, py = player.y, pz = player.z, timeVal = gpuShaderUniforms.uTime.value;

  for (let i = 0; i < MAX_WEATHER_DROPS; i++) {
    const d = weatherDrops[i];
    d.oy -= fallSpeed * dt;
    if (d.oy < -4) d.oy += 16;
    const swayX = isSnowing ? Math.sin(timeVal * 2.0 + d.phase) * 0.8 : (weatherMode === 'storm' ? 0.6 : 0.15);
    const wx = px + d.ox + swayX, wy = py + d.oy, wz = pz + d.oz;
    if ((getLightGlobal(Math.floor(wx), Math.floor(wy), Math.floor(wz)) >> 4) === 0) {
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
// 8C-3. 3D BALLISTIC ARROWS, GRAPPLING HOOK (PUNTO 23) & CONSUMABLE FOOD
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
  arrows.push({ active: false, stuck: false, isGrapple: false, fromMob: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, age: 0 });
  dummyMatrix.makeTranslation(0, -999, 0);
  arrowInstanced.setMatrixAt(i, dummyMatrix);
}
let arrowCursor = 0;

function shootArrow(ox, oy, oz, dx, dy, dz, opts = {}) {
  const a = arrows[arrowCursor];
  const idx = arrowCursor;
  arrowCursor = (arrowCursor + 1) % MAX_ARROWS;

  const len = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / len, ny = dy / len, nz = dz / len;
  const speed = opts.isGrapple ? 28.0 : (opts.fromMob ? 18.0 : 24.0);

  a.active = true; a.stuck = false;
  a.isGrapple = !!opts.isGrapple; a.fromMob = !!opts.fromMob;
  a.x = ox + nx * 0.45; a.y = oy + ny * 0.45; a.z = oz + nz * 0.45;
  a.vx = nx * speed; a.vy = ny * speed; a.vz = nz * speed;
  a.age = 0;

  arrowPosVec.set(a.x, a.y, a.z);
  arrowTargetVec.set(a.x + a.vx, a.y + a.vy, a.z + a.vz);
  arrowLookMat.lookAt(arrowPosVec, arrowTargetVec, camera.up);
  arrowQuat.setFromRotationMatrix(arrowLookMat);
  dummyMatrix.compose(arrowPosVec, arrowQuat, arrowScaleVec);
  arrowInstanced.setMatrixAt(idx, dummyMatrix);
  arrowInstanced.instanceMatrix.needsUpdate = true;

  sfx.play(a.isGrapple ? 'grapple' : 'bow');
  return a;
}

function grapplePullPlayerTo(tx, ty, tz) {
  const dx = tx - player.x, dy = (ty + 1.0) - player.y, dz = tz - player.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  player.vx = (dx / dist) * 16.0;
  player.vy = Math.max(8.5, (dy / dist) * 15.0 + 4.5);
  player.vz = (dz / dist) * 16.0;
  player.x += dx * 0.65;
  player.y = Math.max(player.y + 0.5, ty + 1.05);
  player.z += dz * 0.65;
  player.maxFallVel = 0;
  spawnBlockParticles(tx, ty, tz, BLOCK.AMETHYST, 18);
  sfx.play('grapple');
  return true;
}

function shootGrappleHook(ox, oy, oz, dx, dy, dz) {
  const hit = raycastVoxel(ox, oy, oz, dx, dy, dz, 24.0);
  const proj = shootArrow(ox, oy, oz, dx, dy, dz, { isGrapple: true });
  if (hit && BLOCK_DEFS[hit.block].solid) {
    grapplePullPlayerTo(hit.x + hit.nx * 0.5, hit.y + Math.max(0, hit.ny), hit.z + hit.nz * 0.5);
  }
  return proj;
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

    if (a.fromMob) {
      const pDist = Math.hypot(a.x - player.x, a.y - (player.y + 0.9), a.z - player.z);
      if (pDist < 0.85) {
        if (typeof isShieldBlocking !== 'undefined' && isShieldBlocking) {
          a.vx = -a.vx * 0.85; a.vy = 4.2; a.vz = -a.vz * 0.85;
          a.fromMob = false;
          sfx.play('shield');
        } else {
          damagePlayer(2);
          a.active = false;
          dummyMatrix.makeTranslation(0, -999, 0);
          arrowInstanced.setMatrixAt(i, dummyMatrix);
          continue;
        }
      }
    } else {
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
    }

    a.vy -= 14.0 * dt;
    const nx = a.x + a.vx * dt, ny = a.y + a.vy * dt, nz = a.z + a.vz * dt;
    const b = getVoxelGlobal(Math.floor(nx), Math.floor(ny), Math.floor(nz));

    if (b === BLOCK.TNT) {
      igniteTNT(Math.floor(nx), Math.floor(ny), Math.floor(nz), 1.4);
      a.active = false;
      dummyMatrix.makeTranslation(0, -999, 0);
      arrowInstanced.setMatrixAt(i, dummyMatrix);
      continue;
    } else if (BLOCK_DEFS[b].solid) {
      if (a.isGrapple) {
        grapplePullPlayerTo(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z));
        a.active = false;
        dummyMatrix.makeTranslation(0, -999, 0);
        arrowInstanced.setMatrixAt(i, dummyMatrix);
        continue;
      }
      a.stuck = true;
      sfx.play('hit');
    } else {
      a.x = nx; a.y = ny; a.z = nz;
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
    if (inventoryCounts[heldId] <= 0 && hotbarSlots[selectedSlot] === heldId) hotbarSlots[selectedSlot] = BLOCK.AIR;
  }
  player.health = Math.min(player.maxHealth, player.health + healAmount);
  renderHeartsUI();
  refreshInventoryCountsUI();
  saveWorldData();
  player.swingTime = 1.0;
  sfx.play('eat');
  return true;
}

// ============================================================================
// 8C-4. REDSTONE VOXEL CIRCUITS & MECHANICAL PISTONS (PUNTO 22)
// ============================================================================
function toggleVoxelDoor(wx, wy, wz) {
  const cur = getVoxelGlobal(wx, wy, wz);
  if (cur !== BLOCK.DOOR_CLOSED && cur !== BLOCK.DOOR_OPEN) return false;
  const nextId = cur === BLOCK.DOOR_CLOSED ? BLOCK.DOOR_OPEN : BLOCK.DOOR_CLOSED;
  setVoxelGlobal(wx, wy, wz, nextId);
  sfx.play('door');
  return nextId === BLOCK.DOOR_OPEN;
}

function toggleVoxelTrapdoor(wx, wy, wz) {
  const cur = getVoxelGlobal(wx, wy, wz);
  if (cur !== BLOCK.TRAPDOOR_CLOSED && cur !== BLOCK.TRAPDOOR_OPEN) return false;
  const nextId = cur === BLOCK.TRAPDOOR_CLOSED ? BLOCK.TRAPDOOR_OPEN : BLOCK.TRAPDOOR_CLOSED;
  setVoxelGlobal(wx, wy, wz, nextId);
  sfx.play('door');
  return nextId === BLOCK.TRAPDOOR_OPEN;
}

function triggerVoxelPiston(px, py, pz, leverX = px, leverY = py, leverZ = pz, extDirtySet = null) {
  if (getVoxelGlobal(px, py, pz) !== BLOCK.PISTON) return 0;
  const dirtySet = extDirtySet || new Set();

  let pdx = 0, pdy = 0, pdz = 0;
  const aboveB = getVoxelGlobal(px, py + 1, pz);
  if (aboveB !== BLOCK.AIR && BLOCK_DEFS[aboveB].solid && aboveB !== BLOCK.BEDROCK) {
    pdy = 1;
  } else if (Math.abs(px - leverX) >= Math.abs(pz - leverZ) && px !== leverX) {
    pdx = Math.sign(px - leverX);
  } else if (pz !== leverZ) {
    pdz = Math.sign(pz - leverZ);
  } else {
    pdy = 1;
  }

  if (getVoxelGlobal(px + pdx, py + pdy, pz + pdz) === BLOCK.AIR) {
    for (const [tx, ty, tz] of [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) {
      const nb = getVoxelGlobal(px + tx, py + ty, pz + tz);
      if (nb !== BLOCK.AIR && nb !== BLOCK.BEDROCK && nb !== BLOCK.LEVER_ON && nb !== BLOCK.LEVER_OFF && BLOCK_DEFS[nb].solid) {
        pdx = tx; pdy = ty; pdz = tz;
        break;
      }
    }
  }

  const chain = [];
  for (let step = 1; step <= 4; step++) {
    const cx = px + pdx * step, cy = py + pdy * step, cz = pz + pdz * step;
    const b = getVoxelGlobal(cx, cy, cz);
    if (b === BLOCK.AIR || b === BLOCK.WATER) break;
    if (b === BLOCK.BEDROCK || b === BLOCK.OBSIDIAN) return 0;
    chain.push({ x: cx, y: cy, z: cz, b });
  }

  let moved = 0;
  if (chain.length > 0) {
    const last = chain[chain.length - 1];
    const destB = getVoxelGlobal(last.x + pdx, last.y + pdy, last.z + pdz);
    if (destB === BLOCK.AIR || destB === BLOCK.WATER) {
      for (let i = chain.length - 1; i >= 0; i--) {
        const item = chain[i];
        setVoxelRawNoRebuild(item.x + pdx, item.y + pdy, item.z + pdz, item.b, dirtySet);
        moved++;
      }
      setVoxelRawNoRebuild(chain[0].x, chain[0].y, chain[0].z, BLOCK.AIR, dirtySet);
    }
  }

  if (Math.hypot(player.x - (px + 0.5), player.z - (pz + 0.5)) < 1.35 && Math.abs(player.y - (py + 1)) < 1.6) {
    player.vy = 13.5; player.vx += pdx * 8.0; player.vz += pdz * 8.0;
    player.maxFallVel = 0; player.onGround = false;
  }

  sfx.play('piston');
  if (!extDirtySet) rebuildAffectedChunksSet(dirtySet);
  return Math.max(1, moved);
}

function propagateRedstoneSignal(wx, wy, wz, isPowered) {
  const dirtySet = new Set();
  let affectedCount = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 4) continue;
        const nx = wx + dx, ny = wy + dy, nz = wz + dz;
        const nb = getVoxelGlobal(nx, ny, nz);
        if (isPowered && nb === BLOCK.REDSTONE_LAMP_OFF) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.REDSTONE_LAMP_ON, dirtySet); affectedCount++;
        } else if (!isPowered && nb === BLOCK.REDSTONE_LAMP_ON) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.REDSTONE_LAMP_OFF, dirtySet); affectedCount++;
        } else if (isPowered && nb === BLOCK.DOOR_CLOSED) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.DOOR_OPEN, dirtySet); sfx.play('door'); affectedCount++;
        } else if (!isPowered && nb === BLOCK.DOOR_OPEN) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.DOOR_CLOSED, dirtySet); sfx.play('door'); affectedCount++;
        } else if (isPowered && nb === BLOCK.TRAPDOOR_CLOSED) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.TRAPDOOR_OPEN, dirtySet); sfx.play('door'); affectedCount++;
        } else if (!isPowered && nb === BLOCK.TRAPDOOR_OPEN) {
          setVoxelRawNoRebuild(nx, ny, nz, BLOCK.TRAPDOOR_CLOSED, dirtySet); sfx.play('door'); affectedCount++;
        } else if (isPowered && nb === BLOCK.PISTON) {
          affectedCount += triggerVoxelPiston(nx, ny, nz, wx, wy, wz, dirtySet);
        } else if (isPowered && nb === BLOCK.TNT) {
          igniteTNT(nx, ny, nz, 1.5); affectedCount++;
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

// ============================================================================
// 8C-5. TREASURE CHESTS & PERSISTENT ITEM STORAGE (BLOCK.CHEST)
// ============================================================================
function openVoxelChest(wx, wy, wz) {
  if (getVoxelGlobal(wx, wy, wz) !== BLOCK.CHEST) return null;
  const key = `${wx},${wy},${wz}`;
  sfx.play('chest');
  spawnBlockParticles(wx, wy + 0.65, wz, BLOCK.GOLD_ORE, 14);

  let record = chestLootMap[key];
  if (!record || !record.opened) {
    const lootItems = [
      { id: BLOCK.DIAMOND_ORE, count: 2 },
      { id: BLOCK.GOLD_ORE, count: 3 },
      { id: BLOCK.ITEM_BREAD, count: 2 },
      { id: BLOCK.ITEM_APPLE, count: 2 },
      { id: BLOCK.RAIL, count: 8 },
      { id: BLOCK.ITEM_MINECART, count: 1 }
    ];
    for (const item of lootItems) {
      inventoryCounts[item.id] = (inventoryCounts[item.id] || 0) + item.count;
      autoEquipToHotbar(item.id);
    }
    record = { opened: true, storedId: 0, storedCount: 0, items: [], lastLoot: lootItems, lootAwarded: lootItems.length };
    chestLootMap[key] = record;
    refreshInventoryCountsUI();
    saveWorldData();
    const msg = '🎁 ¡Cofre del Tesoro Abierto! Recibido: +2 Diamantes, +3 Oro, +2 Pan, +2 Manzanas, +8 Vías y +1 Vagoneta';
    const lbl = document.getElementById('block-label');
    if (lbl) lbl.textContent = msg;
    if (typeof openChestModalUI === 'function') openChestModalUI(wx, wy, wz, msg);
    return { action: 'looted', lootItems, record };
  }

  if (!Array.isArray(record.items)) record.items = [];
  const lbl = document.getElementById('block-label');
  if (record.storedCount > 0 && record.storedId > 0) {
    const itemId = record.storedId, count = record.storedCount;
    inventoryCounts[itemId] = (inventoryCounts[itemId] || 0) + count;
    record.storedId = 0; record.storedCount = 0;
    refreshInventoryCountsUI();
    saveWorldData();
    const msg = `📦 Cofre: Retirado ${count}× ${BLOCK_DEFS[itemId]?.name || 'Objeto'} a tu mochila`;
    if (lbl) lbl.textContent = msg;
    if (typeof openChestModalUI === 'function') openChestModalUI(wx, wy, wz, msg);
    return { action: 'withdrawn', itemId, count, record };
  } else {
    const heldId = hotbarSlots[selectedSlot];
    const isTool = (heldId >= 100 && heldId <= 102) || heldId === BLOCK.TOOL_GRAPPLING_HOOK;
    const avail = isTool ? 0 : (gameMode === 'creative' ? 4 : Math.min(4, inventoryCounts[heldId] || 0));
    if (avail > 0) {
      if (gameMode === 'survival') inventoryCounts[heldId] -= avail;
      record.storedId = heldId; record.storedCount = avail;
      refreshInventoryCountsUI();
      saveWorldData();
      const msg = `📦 Cofre: Guardado ${avail}× ${BLOCK_DEFS[heldId]?.name || 'Objeto'} en el cofre`;
      if (lbl) lbl.textContent = msg;
      if (typeof openChestModalUI === 'function') openChestModalUI(wx, wy, wz, msg);
      return { action: 'stored', itemId: heldId, count: avail, record };
    }
  }
  if (typeof openChestModalUI === 'function') openChestModalUI(wx, wy, wz, '📦 Cofre abierto: haz clic en cualquier objeto para guardarlo o retirarlo.');
  return { action: 'empty', record };
}

// ============================================================================
// 8C-6. 3D RIDEABLE MINECARTS (PUNTO 17)
// ============================================================================
const minecarts = [];
let ridingCart = null;

const cartOuterGeo = new THREE.BoxGeometry(0.84, 0.48, 0.68);
const cartInnerGeo = new THREE.BoxGeometry(0.72, 0.36, 0.56);
const cartWheelGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
const cartMatSteel = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
const cartMatDark = new THREE.MeshLambertMaterial({ color: 0x334155 });

function spawnMinecart(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  for (const existing of minecarts) {
    if (Math.hypot(existing.x - (bx + 0.5), existing.y - (by + 0.35), existing.z - (bz + 0.5)) < 0.9) return existing;
  }
  const root = new THREE.Group();
  const hull = new THREE.Mesh(cartOuterGeo, cartMatSteel); hull.position.y = 0.28; root.add(hull);
  const well = new THREE.Mesh(cartInnerGeo, cartMatDark);  well.position.y = 0.36; root.add(well);
  for (const [ox, oz] of [[-0.28, -0.34], [0.28, -0.34], [-0.28, 0.34], [0.28, 0.34]]) {
    const w = new THREE.Mesh(cartWheelGeo, cartMatDark); w.position.set(ox, 0.09, oz); root.add(w);
  }
  let dirX = 1, dirZ = 0;
  if (getVoxelGlobal(bx, by, bz + 1) === BLOCK.RAIL || getVoxelGlobal(bx, by, bz - 1) === BLOCK.RAIL) { dirX = 0; dirZ = 1; }
  const cart = { x: bx + 0.5, y: by + 0.05, z: bz + 0.5, dirX, dirZ, speed: 0, soundTimer: 0, root };
  root.position.set(cart.x, cart.y, cart.z);
  root.rotation.y = Math.atan2(dirX, dirZ);
  scene.add(root);
  minecarts.push(cart);
  sfx.play('rail');
  return cart;
}

function isRailAt(bx, by, bz) { return getVoxelGlobal(bx, by, bz) === BLOCK.RAIL; }

function toggleRideMinecart(cartOverride) {
  const btn = document.getElementById('tbtn-cart');
  if (typeof ridingBoat !== 'undefined' && ridingBoat) return toggleRideBoat();
  if (ridingCart) {
    ridingCart.speed = 0; ridingCart = null; player.vy = 4.2;
    if (btn) btn.classList.remove('toggled');
    sfx.play('step');
    return false;
  }

  let targetCart = cartOverride || null;
  if (!targetCart) {
    let bestDist = 4.5;
    for (const c of minecarts) {
      const d = Math.hypot(c.x - player.x, (c.y + 0.5) - (player.y + 0.8), c.z - player.z);
      if (d < bestDist) { bestDist = d; targetCart = c; }
    }
  }
  if (!targetCart) {
    const px = Math.floor(player.x), py = Math.floor(player.y), pz = Math.floor(player.z);
    if (isRailAt(px, py, pz)) targetCart = spawnMinecart(px, py, pz);
    else if (isRailAt(px, py - 1, pz)) targetCart = spawnMinecart(px, py - 1, pz);
    else if (getVoxelGlobal(px, py, pz) === BLOCK.WATER || getVoxelGlobal(px, py - 1, pz) === BLOCK.WATER) return toggleRideBoat();
  }
  if (!targetCart) return false;

  ridingCart = targetCart;
  const lookX = -Math.sin(player.yaw), lookZ = -Math.cos(player.yaw);
  const bx = Math.floor(targetCart.x), by = Math.floor(targetCart.y + 0.1), bz = Math.floor(targetCart.z);
  let bestDir = [targetCart.dirX, targetCart.dirZ], bestScore = -999;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const hasRail = isRailAt(bx + dx, by, bz + dz) || isRailAt(bx + dx, by + 1, bz + dz) || isRailAt(bx + dx, by - 1, bz + dz);
    const dot = dx * lookX + dz * lookZ + (hasRail ? 2.0 : 0.0);
    if (dot > bestScore) { bestScore = dot; bestDir = [dx, dz]; }
  }
  targetCart.dirX = bestDir[0]; targetCart.dirZ = bestDir[1]; targetCart.speed = 11.5;
  player.x = targetCart.x; player.y = targetCart.y + 0.35; player.z = targetCart.z;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  if (btn) btn.classList.add('toggled');
  sfx.play('rail');
  return true;
}

function updateMinecarts(dt) {
  for (let i = 0; i < minecarts.length; i++) {
    const c = minecarts[i];
    if (c.speed <= 0.05) continue;
    let stepRem = c.speed * dt;
    while (stepRem > 0.0001) {
      const step = Math.min(stepRem, 0.25);
      stepRem -= step;
      const nextX = c.x + c.dirX * step, nextZ = c.z + c.dirZ * step;
      const bx = Math.floor(nextX), by = Math.floor(c.y + 0.15), bz = Math.floor(nextZ);

      if (isRailAt(bx, by, bz)) { c.x = nextX; c.z = nextZ; c.y = by + 0.05; }
      else if (isRailAt(bx, by + 1, bz)) { c.x = nextX; c.z = nextZ; c.y = by + 1.05; }
      else if (isRailAt(bx, by - 1, bz)) { c.x = nextX; c.z = nextZ; c.y = by - 0.95; }
      else {
        const curBx = Math.floor(c.x), curBz = Math.floor(c.z);
        const leftX = -c.dirZ, leftZ = c.dirX, rightX = c.dirZ, rightZ = -c.dirX;
        if (isRailAt(curBx + leftX, by, curBz + leftZ) || isRailAt(curBx + leftX, by + 1, curBz + leftZ)) {
          c.x = curBx + 0.5; c.z = curBz + 0.5; c.dirX = leftX; c.dirZ = leftZ;
        } else if (isRailAt(curBx + rightX, by, curBz + rightZ) || isRailAt(curBx + rightX, by + 1, curBz + rightZ)) {
          c.x = curBx + 0.5; c.z = curBz + 0.5; c.dirX = rightX; c.dirZ = rightZ;
        } else if (isRailAt(curBx - c.dirX, by, curBz - c.dirZ) && BLOCK_DEFS[getVoxelGlobal(bx, by, bz)]?.solid) {
          c.dirX = -c.dirX; c.dirZ = -c.dirZ; sfx.play('rail');
        } else { c.speed = 0; break; }
      }
    }
    c.root.position.set(c.x, c.y, c.z);
    c.root.rotation.y = Math.atan2(c.dirX, c.dirZ);
    c.soundTimer += dt;
    if (c.soundTimer > 0.28) { c.soundTimer = 0; sfx.play('rail'); }
    if (ridingCart === c) {
      player.x = c.x; player.y = c.y + 0.35; player.z = c.z;
      player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
    }
  }
}
