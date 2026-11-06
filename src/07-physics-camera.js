// VoxelCraft HTML5 — 07-physics-camera.js (9. DDA RAYCASTER, 10. PLAYER PHYSICS, SHIELD, ICE, BOATS, PORTALS, FRUSTUM CULLING & STREAMING)
'use strict';

// ============================================================================
// 9. FAST 3D DDA VOXEL RAYCASTER
// ============================================================================
function raycastVoxel(ox, oy, oz, dx, dy, dz, maxDist) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0), stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0), stepZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : 1e30, tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : 1e30, tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : 1e30;
  let tMaxX = stepX > 0 ? (x + 1 - ox) * tDeltaX : (ox - x) * tDeltaX;
  let tMaxY = stepY > 0 ? (y + 1 - oy) * tDeltaY : (oy - y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (z + 1 - oz) * tDeltaZ : (oz - z) * tDeltaZ;
  let nx = 0, ny = 0, nz = 0, dist = 0;

  while (dist <= maxDist) {
    const b = getVoxelGlobal(x, y, z);
    if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
      if (b === BLOCK.TORCH) {
        const hx = ox + dx * dist - x, hy = oy + dy * dist - y, hz = oz + dz * dist - z;
        if (hx >= 0.28 && hx <= 0.72 && hz >= 0.28 && hz <= 0.72 && hy <= 0.75) return { x, y, z, nx, ny, nz, block: b };
      } else return { x, y, z, nx, ny, nz, block: b };
    }
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) { x += stepX; dist = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else { z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    } else {
      if (tMaxY < tMaxZ) { y += stepY; dist = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
  }
  return null;
}

// ============================================================================
// 10. PLAYER PHYSICS, SHIELD BLOCK (PUNTO 25), SLIPPERY ICE (PUNTO 26) & BOATS/PORTALS
// ============================================================================
const player = {
  x: 8.5, y: 42, z: 8.5, vx: 0, vy: 0, vz: 0, iceVx: 0, iceVz: 0,
  yaw: 0, pitch: -0.15, radius: 0.3, height: 1.75, eyeHeight: 1.58,
  onGround: false, flying: false, stepAccum: 0, bobTime: 0, swingTime: 0,
  health: 10, maxHealth: 10, regenTimer: 0, hunger: 10, maxHunger: 10, saturation: 5.0, exhaustion: 0, starveTimer: 0,
  air: 10, maxAir: 10, airTimer: 0, wasInFluid: false, maxFallVel: 0, portalCooldown: 0,
  spawnX: 8.5, spawnY: 42, spawnZ: 8.5, hasBedSpawn: false
};

const heartsRowEl = document.getElementById('hearts-row');
const hungerRowEl = document.getElementById('hunger-row');
const airRowEl = document.getElementById('air-row');
function renderHeartsUI() {
  let hHtml = '', fHtml = '', aHtml = '';
  for (let i = 0; i < player.maxHealth; i++) hHtml += `<span class="heart ${i < player.health ? '' : 'empty'}">❤</span>`;
  heartsRowEl.innerHTML = hHtml;
  if (hungerRowEl) {
    const maxF = player.maxHunger || 10, curF = player.hunger !== undefined ? player.hunger : maxF;
    for (let i = 0; i < maxF; i++) fHtml += `<span class="drumstick ${i < curF ? '' : 'empty'}">🍗</span>`;
    hungerRowEl.innerHTML = fHtml;
  }
  if (airRowEl) {
    const maxA = player.maxAir || 10, curA = player.air !== undefined ? player.air : maxA;
    if (curA < maxA) {
      for (let i = 0; i < maxA; i++) aHtml += `<span class="bubble ${i < curA ? '' : 'empty'}">🫧</span>`;
    }
    airRowEl.innerHTML = aHtml;
  }
}
function addHungerExhaustion(amount) {
  if (gameMode !== 'survival' || player.flying) return player.hunger;
  player.exhaustion = (player.exhaustion || 0) + amount;
  let changed = false;
  while (player.exhaustion >= 4.0) {
    player.exhaustion -= 4.0;
    if ((player.saturation || 0) > 0) player.saturation = Math.max(0, player.saturation - 1.0);
    else if (player.hunger > 0) { player.hunger--; changed = true; }
  }
  if (changed) renderHeartsUI();
  return player.hunger;
}
renderHeartsUI();

function damagePlayer(amount) {
  if (player.flying) return;
  if (isShieldBlocking) { sfx.play('shield'); amount = Math.floor(amount * 0.2); if (amount <= 0) return; }
  const armorDef = getArmorDefenseRatio();
  if (armorDef > 0) amount = Math.max(1, Math.round(amount * (1 - armorDef)));
  if (player.health - amount <= 0 && player.hasBedSpawn && typeof respawnPlayerAtBed === 'function') {
    respawnPlayerAtBed();
    return;
  }
  player.health = Math.max(1, player.health - amount);
  renderHeartsUI(); sfx.play('hurt');
  const hurtEl = document.getElementById('hurt-overlay');
  hurtEl.style.opacity = '1'; setTimeout(() => { hurtEl.style.opacity = '0'; }, 240);
}

function findSpawnHeight(wx, wz) {
  getChunkData(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE));
  for (let y = CHUNK_HEIGHT - 1; y > 1; y--) {
    if (BLOCK_DEFS[getVoxelGlobal(Math.floor(wx), y, Math.floor(wz))].solid) return y + 1.5;
  }
  return 35;
}

// ============================================================================
// 10A. DIMENSIONAL OBSIDIAN PORTALS (PUNTO 24) & SAILING BOATS (PUNTO 21)
// ============================================================================
const portals = [];

function registerPortalAt(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  let existing = portals.find(p => Math.hypot(p.x - bx, p.y - by, p.z - bz) < 2.5);
  if (!existing) { existing = { x: bx, y: by, z: bz }; portals.push(existing); }
  return existing;
}

function activateObsidianPortal(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  setVoxelGlobal(bx, by, bz, BLOCK.PORTAL); sfx.play('portal');
  spawnBlockParticles(bx, by, bz, BLOCK.AMETHYST, 20);
  return registerPortalAt(bx, by, bz);
}

function useVoxelPortal(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  registerPortalAt(bx, by, bz);
  let target = portals.find(p => Math.hypot(p.x - bx, p.y - by, p.z - bz) >= 4.0);
  if (!target) {
    const destX = bx + 32, destZ = bz + 32, destY = Math.max(SEA_LEVEL + 4, Math.floor(findSpawnHeight(destX, destZ)));
    setVoxelGlobal(destX, destY - 1, destZ, BLOCK.OBSIDIAN);
    setVoxelGlobal(destX, destY, destZ, BLOCK.PORTAL);
    target = registerPortalAt(destX, destY, destZ);
  }
  player.x = target.x + 0.5; player.y = target.y + 0.1; player.z = target.z + 1.2;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0; player.portalCooldown = 2.0;
  sfx.play('portal'); spawnBlockParticles(target.x, target.y, target.z, BLOCK.PORTAL, 24);
  if (typeof updateMinimap === 'function') updateMinimap(0, true);
  return target;
}

const boats = [];
let ridingBoat = null;
const boatMatOak = new THREE.MeshBasicMaterial({ color: 0xb45309 });
const boatMatTrim = new THREE.MeshBasicMaterial({ color: 0x78350f });

function spawnBoat(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  for (const existing of boats) {
    if (Math.hypot(existing.x - (bx + 0.5), existing.y - (by + 0.5), existing.z - (bz + 0.5)) < 1.1) return existing;
  }
  const root = new THREE.Group();
  const hull = new THREE.Mesh(cartOuterGeo, boatMatOak); hull.scale.set(1.15, 0.75, 1.35); hull.position.y = 0.22; root.add(hull);
  const deck = new THREE.Mesh(cartInnerGeo, boatMatTrim); deck.scale.set(1.05, 0.55, 1.20); deck.position.y = 0.28; root.add(deck);
  const boat = { x: bx + 0.5, y: by + 0.65, z: bz + 0.5, vx: 0, vz: 0, yaw: player.yaw, splashTimer: 0, root };
  root.position.set(boat.x, boat.y, boat.z); scene.add(root); boats.push(boat); sfx.play('splash');
  return boat;
}

function toggleRideBoat(boatOverride) {
  const btn = document.getElementById('tbtn-cart');
  if (ridingBoat) {
    ridingBoat.vx = 0; ridingBoat.vz = 0; ridingBoat = null; player.vy = 4.5;
    if (btn) btn.classList.remove('toggled');
    sfx.play('splash'); return false;
  }
  let targetBoat = boatOverride || boats.find(b => Math.hypot(b.x - player.x, b.y - player.y, b.z - player.z) < 4.5) || spawnBoat(player.x, player.y, player.z);
  ridingBoat = targetBoat; targetBoat.yaw = player.yaw;
  targetBoat.vx = -Math.sin(player.yaw) * 9.5; targetBoat.vz = -Math.cos(player.yaw) * 9.5;
  player.x = targetBoat.x; player.y = targetBoat.y + 0.35; player.z = targetBoat.z;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  if (btn) btn.classList.add('toggled');
  sfx.play('splash'); return true;
}

function updateBoats(dt) {
  for (let i = 0; i < boats.length; i++) {
    const b = boats[i];
    if (ridingBoat === b) {
      const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) + joyY;
      b.yaw = player.yaw;
      if (Math.abs(fwd) > 0.05) { b.vx = -Math.sin(b.yaw) * 9.5 * Math.sign(fwd); b.vz = -Math.cos(b.yaw) * 9.5 * Math.sign(fwd); }
    }
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > 0.05) {
      const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(nx), Math.floor(b.y + 0.2), Math.floor(nz))].solid) { b.x = nx; b.z = nz; }
      else { b.vx = 0; b.vz = 0; }
      b.vx *= Math.max(0.85, 1.0 - dt * 1.2); b.vz *= Math.max(0.85, 1.0 - dt * 1.2);
      b.splashTimer += dt;
      if (b.splashTimer > 0.35) { b.splashTimer = 0; sfx.play('splash'); }
    }
    b.root.position.set(b.x, b.y + Math.sin(gpuShaderUniforms.uTime.value * 3.0 + i) * 0.04, b.z);
    b.root.rotation.y = b.yaw;
    if (ridingBoat === b) { player.x = b.x; player.y = b.y + 0.35; player.z = b.z; player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0; }
  }
}

const keys = {};
let isLocked = false, isTouchMode = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0), touchPlaying = false;
let menuOpen = true, lastPointerLockExitTime = 0, invOpen = false, chestOpen = false, activeChestKey = null;
let selectedSlot = 0, renderDistance = 5, isNight = false, hudVisible = true;
let joyX = 0, joyY = 0, joySprint = false, touchJump = false, touchDown = false;
const isGameActive = () => (!menuOpen || isLocked || touchPlaying) && !invOpen && !chestOpen;
let isMiningHeld = false, mineTargetKey = '', mineProgress = 0, mineHitTimer = 0;

function checkAABBCollision(px, py, pz) {
  const minX = Math.floor(px - player.radius), maxX = Math.floor(px + player.radius);
  const minY = Math.floor(py), maxY = Math.floor(py + player.height - 0.01);
  const minZ = Math.floor(pz - player.radius), maxZ = Math.floor(pz + player.radius);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const bId = getVoxelGlobal(x, y, z);
        if (BLOCK_DEFS[bId].solid && (bId !== BLOCK.LILY_PAD || (y === minY && py >= y + 0.85 && player.vy <= 0))) return true;
      }
    }
  }
  return false;
}

// ============================================================================
// 10B. SMART FRUSTUM CULLING (PUNTO 11) + 3RD-PERSON AVATAR & ZOOM (PUNTO 15)
// ============================================================================
let thirdPersonMode = false, isZoomed = false, baseFov = 75, visibleChunksCount = 0, culledChunksCount = 0;
const projScreenMat = new THREE.Matrix4(), viewFrustum = new THREE.Frustum();

const playerAvatar = (() => {
  const grp = new THREE.Group();
  const skinMat = new THREE.MeshBasicMaterial({ color: 0xf1c27d }), shirtMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 }), pantsMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
  const torso = new THREE.Mesh(mobGeos.bodyBiped, shirtMat); torso.position.set(0, 0.90, 0); grp.add(torso);
  const head = new THREE.Mesh(mobGeos.head, skinMat); head.position.set(0, 1.46, 0); grp.add(head);
  const leftArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat); leftArm.position.set(-0.32, 0.94, 0); grp.add(leftArm);
  const rightArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat); rightArm.position.set(0.32, 0.94, 0); grp.add(rightArm);
  const heldIcon = new THREE.Mesh(handIconGeo, new THREE.MeshBasicMaterial({ map: handIconTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
  heldIcon.position.set(0, -0.30, -0.18); heldIcon.rotation.y = Math.PI / 2; heldIcon.visible = false; rightArm.add(heldIcon);
  const leftLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat); leftLeg.position.set(-0.12, 0.31, 0); grp.add(leftLeg);
  const rightLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat); rightLeg.position.set(0.12, 0.31, 0); grp.add(rightLeg);
  grp.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, heldIcon };
  grp.visible = false; scene.add(grp);
  return grp;
})();

function toggleCameraMode(force3rd) {
  thirdPersonMode = typeof force3rd === 'boolean' ? force3rd : !thirdPersonMode;
  playerAvatar.visible = thirdPersonMode; handGroup.visible = !thirdPersonMode;
  const tbtnCam = document.getElementById('tbtn-cam');
  if (tbtnCam) { tbtnCam.textContent = thirdPersonMode ? '🎥 1ªP' : '🎥 3ªP'; tbtnCam.classList.toggle('toggled', thirdPersonMode); }
  return thirdPersonMode;
}

function toggleZoom(forceZoom) {
  isZoomed = typeof forceZoom === 'boolean' ? forceZoom : !isZoomed;
  camera.fov = isZoomed ? 24 : baseFov; camera.updateProjectionMatrix();
  const tbtnZoom = document.getElementById('tbtn-zoom');
  if (tbtnZoom) tbtnZoom.classList.toggle('toggled', isZoomed);
  return isZoomed;
}

function updateFrustumCulling() {
  camera.updateMatrixWorld();
  projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  viewFrustum.setFromProjectionMatrix(projScreenMat);
  const pcx = Math.floor(player.x / CHUNK_SIZE), pcz = Math.floor(player.z / CHUNK_SIZE);
  let vis = 0, culled = 0;
  for (const ch of chunks.values()) {
    if (!ch.solidMesh && !ch.waterMesh) continue;
    const dx = ch.cx - pcx, dz = ch.cz - pcz;
    const inView = (dx * dx + dz * dz <= 2) || (ch.worldBox ? viewFrustum.intersectsBox(ch.worldBox) : true);
    if (ch.solidMesh) ch.solidMesh.visible = inView;
    if (ch.waterMesh) ch.waterMesh.visible = inView;
    if (inView) vis++; else culled++;
  }
  visibleChunksCount = vis; culledChunksCount = culled;
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    if (!m.root) continue;
    const mdx = m.x - player.x, mdz = m.z - player.z;
    m.root.visible = (mdx * mdx + mdz * mdz <= 64) || viewFrustum.containsPoint(m.root.position);
  }
}

function updatePlayerPhysics(dt) {
  if (player.portalCooldown > 0) player.portalCooldown = Math.max(0, player.portalCooldown - dt);
  const forwardX = -Math.sin(player.yaw), forwardZ = -Math.cos(player.yaw), rightX = Math.cos(player.yaw), rightZ = -Math.sin(player.yaw);
  let inputFwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) + joyY;
  let inputRight = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) + joyX;
  let moveX = forwardX * inputFwd + rightX * inputRight, moveZ = forwardZ * inputFwd + rightZ * inputRight;
  const len = Math.hypot(moveX, moveZ), moveMag = Math.min(1.0, len);
  if (len > 0) { moveX = (moveX / len) * moveMag; moveZ = (moveZ / len) * moveMag; }

  const feetInWater = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.35), Math.floor(player.z)) === BLOCK.WATER;
  const waistInWater = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.6), Math.floor(player.z)) === BLOCK.WATER;
  const inWater = feetInWater || waistInWater;
  const inLava = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.15), Math.floor(player.z)) === BLOCK.LAVA || getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.6), Math.floor(player.z)) === BLOCK.LAVA;
  if ((inWater || inLava) !== !!player.wasInFluid) {
    player.wasInFluid = inWater || inLava;
    sfx.play(inLava ? 'hiss' : 'splash');
    spawnBlockParticles(player.x, player.y + 0.5, player.z, inLava ? BLOCK.LAVA : BLOCK.WATER, 10);
  }
  const wantJump = keys['Space'] || touchJump, wantDown = keys['ShiftLeft'] || keys['ShiftRight'] || touchDown;
  const canSprint = gameMode === 'creative' || player.flying || (player.hunger === undefined || player.hunger > 3);
  const sprint = canSprint && (keys['ShiftLeft'] || keys['ShiftRight'] || joySprint);
  if (moveMag > 0.15) addHungerExhaustion(dt * (sprint ? 0.25 : (inWater ? 0.15 : 0.06)));

  const groundBlock = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y - 0.15), Math.floor(player.z));
  const onIce = !player.flying && !inWater && !inLava && (groundBlock === BLOCK.ICE || getVoxelGlobal(Math.floor(player.x), Math.floor(player.y - 0.55), Math.floor(player.z)) === BLOCK.ICE);

  const baseSpeed = player.flying ? (sprint ? 22 : 12) : (inLava ? 2.4 : (inWater ? (sprint ? 5.1 : 3.8) : (sprint ? 7.2 : 4.7)));
  const speed = baseSpeed * (onIce ? 1.45 : 1.0) * (isShieldBlocking ? 0.65 : 1.0);

  if (onIce) {
    if (moveMag > 0.05) {
      const accel = Math.min(1, dt * 8.5);
      player.iceVx += (moveX * speed - player.iceVx) * accel;
      player.iceVz += (moveZ * speed - player.iceVz) * accel;
    } else {
      const decay = Math.pow(0.18, dt);
      player.iceVx *= decay;
      player.iceVz *= decay;
    }
    player.vx = player.iceVx;
    player.vz = player.iceVz;
  } else {
    player.iceVx = moveX * speed;
    player.iceVz = moveZ * speed;
    player.vx = moveX * speed;
    player.vz = moveZ * speed;
  }

  const onLadder =
    getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.15), Math.floor(player.z)) === BLOCK.LADDER ||
    getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 1.05), Math.floor(player.z)) === BLOCK.LADDER;

  if (ridingCart) {
    if (wantDown) toggleRideMinecart();
    else {
      player.x = ridingCart.x; player.y = ridingCart.y + 0.35; player.z = ridingCart.z;
      player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0; player.onGround = true;
    }
  } else if (ridingBoat) {
    if (wantDown) toggleRideBoat();
    else {
      player.x = ridingBoat.x; player.y = ridingBoat.y + 0.35; player.z = ridingBoat.z;
      player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0; player.onGround = true;
    }
  } else if (player.flying) {
    player.vy = 0; player.maxFallVel = 0;
    if (wantJump) player.vy = speed * 0.75;
    if (wantDown) player.vy = -speed * 0.75;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.z += player.vz * dt;
  } else {
    if (onLadder) {
      player.maxFallVel = 0;
      if (wantJump || inputFwd > 0.15) {
        player.vy = 4.6;
        player.stepAccum += dt * 5.0;
        if (player.stepAccum > 1.4) { player.stepAccum = 0; sfx.play('climb'); }
      } else if (wantDown) {
        player.vy = 0;
      } else {
        player.vy = -2.2;
      }
    } else if (inWater || inLava) {
      player.vy -= (inLava ? 6.0 : 9.0) * dt;
      player.vy *= Math.pow(inLava ? 0.72 : 0.88, dt * 60);
      player.maxFallVel = 0;
      if (wantJump) player.vy = inLava ? 4.2 : 5.45;
      else if (wantDown) player.vy = inLava ? -2.2 : -3.8;
      if (moveMag > 0.15) {
        player.stepAccum += dt * speed * moveMag;
        if (player.stepAccum > 1.9) { player.stepAccum = 0; sfx.play('splash'); }
      }
      if (inLava && gameMode === 'survival') {
        player.lavaBurnTimer = (player.lavaBurnTimer || 0) + dt;
        if (player.lavaBurnTimer >= 0.6) { player.lavaBurnTimer = 0; damagePlayer(2); spawnBlockParticles(player.x, player.y + 0.5, player.z, BLOCK.LAVA, 8); }
      }
    } else {
      player.vy -= 26.0 * dt;
      if (player.vy < -38) player.vy = -38;
      if (player.vy < player.maxFallVel) player.maxFallVel = player.vy;
      if (wantJump && player.onGround) {
        if (groundBlock === BLOCK.SLIME) { player.vy = 12.8; sfx.play('boing'); }
        else player.vy = 8.6;
        player.onGround = false; addHungerExhaustion(0.08);
      }
    }

    const nextX = player.x + player.vx * dt;
    if (!checkAABBCollision(nextX, player.y, player.z)) player.x = nextX;
    const nextZ = player.z + player.vz * dt;
    if (!checkAABBCollision(player.x, player.y, nextZ)) player.z = nextZ;
    const nextY = player.y + player.vy * dt;
    if (!checkAABBCollision(player.x, nextY, player.z)) {
      player.y = nextY; player.onGround = false;
    } else {
      if (player.vy < 0) {
        const landBlock = getVoxelGlobal(Math.floor(player.x), Math.floor(nextY - 0.08), Math.floor(player.z));
        if (landBlock === BLOCK.SLIME) {
          player.maxFallVel = 0;
          if (player.vy < -3.0 && !wantDown) { player.vy = Math.min(16.5, Math.max(9.2, -player.vy * 0.86)); player.onGround = false; sfx.play('boing'); }
          else { player.vy = 0; player.onGround = true; }
        } else {
          if (player.maxFallVel < -16.5) damagePlayer(Math.max(1, Math.floor((-player.maxFallVel - 15.0) * 0.45)));
          player.maxFallVel = 0; player.onGround = true; player.vy = 0;
        }
      } else player.vy = 0;
    }

    if (player.onGround && moveMag > 0.15) {
      player.stepAccum += dt * speed * moveMag;
      if (player.stepAccum > 2.2) { player.stepAccum = 0; sfx.play(groundBlock === BLOCK.AMETHYST ? 'chime' : 'step'); }
    }
  }

  // Passive health regeneration (fast at hunger=10+saturation, normal at hunger>=8) & starvation damage (hunger===0)
  if (player.health < player.maxHealth && (gameMode === 'creative' || (player.hunger ?? 10) >= 8)) {
    const regenInterval = (gameMode === 'survival' && player.hunger >= 10 && (player.saturation || 0) > 0) ? 1.0 : 4.0;
    player.regenTimer += dt;
    if (player.regenTimer >= regenInterval) { player.regenTimer = 0; player.health++; addHungerExhaustion(1.5); renderHeartsUI(); }
  }
  if (gameMode === 'survival' && !player.flying && player.hunger <= 0) {
    player.starveTimer = (player.starveTimer || 0) + dt;
    if (player.starveTimer >= 4.0) { player.starveTimer = 0; if (player.health > 1) damagePlayer(1); }
  } else player.starveTimer = 0;

  // 1st-person hand bobbing, shield block pose & 3D arm+item attack/swing animation
  if (moveMag > 0.1 && (player.onGround || player.flying || inWater || inLava)) player.bobTime += dt * speed * moveMag * 1.6;
  if (player.swingTime > 0) player.swingTime = Math.max(0, player.swingTime - dt * 5.0);
  const swingProg = player.swingTime > 0 ? 1.0 - player.swingTime : 0;
  const swingAngle = Math.sin(Math.sqrt(swingProg) * Math.PI);
  if (isShieldBlocking) {
    handGroup.position.set(0.18, -0.22, -0.46);
    handGroup.rotation.set(-0.35, 0.55, 0.85);
  } else {
    handGroup.position.set(
      0.42 + Math.cos(player.bobTime) * 0.022 - swingAngle * 0.19,
      -0.34 + Math.abs(Math.sin(player.bobTime)) * 0.025 + Math.sin(swingProg * Math.PI * 2) * 0.05 - swingAngle * 0.09,
      -0.58 - swingAngle * 0.18
    );
    handGroup.rotation.set(-swingAngle * 0.82, swingAngle * 0.46, swingAngle * 0.54);
  }

  // Update 3rd-person player avatar position & limb animations
  playerAvatar.position.set(player.x, player.y, player.z);
  playerAvatar.rotation.y = player.yaw;
  playerAvatar.rotation.x = (inWater && moveMag > 0.15) ? 0.35 : 0;
  const av = playerAvatar.userData, limbSwing = moveMag > 0.08 ? Math.sin(player.bobTime * 1.2) * (inWater ? 0.95 : 0.65) : 0;
  av.leftLeg.rotation.x  =  limbSwing; av.rightLeg.rotation.x = -limbSwing;
  av.leftArm.rotation.x  = -limbSwing * 0.8; av.rightArm.rotation.x = limbSwing * 0.8 - swingAngle * 1.25;
  av.head.rotation.x     =  player.pitch * 0.65;

  const eyeX = player.x, eyeY = player.y + player.eyeHeight, eyeZ = player.z;
  if (thirdPersonMode) {
    const backX = Math.sin(player.yaw) * Math.cos(player.pitch), backY = -Math.sin(player.pitch), backZ = Math.cos(player.yaw) * Math.cos(player.pitch);
    let camDist = 3.6;
    const wallHit = raycastVoxel(eyeX, eyeY, eyeZ, backX, backY, backZ, 3.6);
    if (wallHit && BLOCK_DEFS[wallHit.block].solid) {
      const hitDist = Math.hypot(wallHit.x + 0.5 - eyeX, wallHit.y + 0.5 - eyeY, wallHit.z + 0.5 - eyeZ);
      camDist = Math.max(0.45, Math.min(3.6, hitDist - 0.55));
    }
    camera.position.set(eyeX + backX * camDist, eyeY + backY * camDist, eyeZ + backZ * camDist);
  } else {
    camera.position.set(eyeX, eyeY, eyeZ);
  }

  camera.rotation.order = 'YXZ'; camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
  const headBlock = getVoxelGlobal(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
  if (headBlock === BLOCK.WATER && gameMode === 'survival' && !player.flying) {
    player.airTimer = (player.airTimer || 0) + dt;
    if (player.airTimer >= 1.5) { player.airTimer = 0; if (player.air > 0) { player.air--; renderHeartsUI(); } else damagePlayer(1); }
  } else {
    if (player.air < (player.maxAir || 10)) { player.air = player.maxAir || 10; renderHeartsUI(); }
    player.airTimer = 0;
  }
  const wOv = document.getElementById('water-overlay');
  wOv.style.display = (headBlock === BLOCK.WATER || headBlock === BLOCK.LAVA) ? 'block' : 'none';
  wOv.style.background = headBlock === BLOCK.LAVA ? 'rgba(234, 88, 12, 0.55)' : '';
}

const mineBarWrap = document.getElementById('mine-progress-wrap'), mineBarEl = document.getElementById('mine-progress-bar');

function updateMining(dt, currentHit) {
  if (isGameActive() && isMiningHeld && player.swingTime <= 0.04) player.swingTime = 1.0;
  if (!isGameActive() || !isMiningHeld || !currentHit || currentHit.block === BLOCK.BEDROCK) {
    mineProgress = 0; mineTargetKey = '';
    crackBox.visible = false; mineBarWrap.style.display = 'none';
    return;
  }

  if (currentHit.block === BLOCK.TNT) {
    igniteTNT(currentHit.x, currentHit.y, currentHit.z, 2.6);
    isMiningHeld = false; mineProgress = 0;
    crackBox.visible = false; mineBarWrap.style.display = 'none';
    return;
  }

  const key = `${currentHit.x},${currentHit.y},${currentHit.z}`;
  if (key !== mineTargetKey) { mineTargetKey = key; mineProgress = 0; }

  const def = BLOCK_DEFS[currentHit.block], b = currentHit.block, heldId = getActiveHeldItem();
  const isWoodLike = b === BLOCK.WOOD || b === BLOCK.PLANKS || b === BLOCK.CRAFTING_TABLE || b === BLOCK.CHEST || b === BLOCK.BOOKSHELF || b === BLOCK.BED || b === BLOCK.DOOR_CLOSED || b === BLOCK.TRAPDOOR_CLOSED || b === BLOCK.LADDER;
  const isEarthLike = b === BLOCK.GRASS || b === BLOCK.DIRT || b === BLOCK.SAND || b === BLOCK.GRAVEL || b === BLOCK.CLAY || b === BLOCK.SNOW;
  const isFoliage = b === BLOCK.LEAVES || b === BLOCK.WOOL || b === BLOCK.TALL_GRASS || b === BLOCK.FLOWER_RED || b === BLOCK.FLOWER_YELLOW || b === BLOCK.LILY_PAD;
  let speedMult = def.stoneLike ? 0.35 : 0.55;
  if (isPickaxeItem(heldId)) {
    const pMult = heldId === BLOCK.TOOL_GOLD_PICKAXE ? 4.2 : (heldId === BLOCK.TOOL_PICKAXE ? 3.5 : (heldId === BLOCK.TOOL_IRON_PICKAXE ? 2.9 : (heldId === BLOCK.TOOL_STONE_PICKAXE ? 2.3 : 1.7)));
    speedMult = def.stoneLike ? pMult : 1.5;
  } else if (heldId === BLOCK.TOOL_AXE && isWoodLike) speedMult = 3.8;
  else if (heldId === BLOCK.TOOL_SHOVEL && isEarthLike) speedMult = 3.8;
  else if (heldId === BLOCK.TOOL_SHEARS && isFoliage) speedMult = 8.0;
  const enchLvl = typeof getItemEnchantLevel === 'function' ? getItemEnchantLevel(heldId) : 0;
  if (enchLvl > 0) speedMult *= (1.0 + 0.30 * enchLvl);
  const duration = Math.max(0.05, def.hardness / speedMult);

  mineProgress += dt / duration;
  player.swingTime = (player.swingTime > 0.05) ? player.swingTime : 1.0;

  mineHitTimer += dt;
  if (mineHitTimer > 0.16) {
    mineHitTimer = 0; sfx.play('hit');
    spawnBlockParticles(currentHit.x + (currentHit.nx || 0) * 0.35, currentHit.y + (currentHit.ny || 0) * 0.35, currentHit.z + (currentHit.nz || 0) * 0.35, currentHit.block, 4);
  }

  if (mineProgress >= 1.0) {
    const brokenId = currentHit.block;
    if (setVoxelGlobal(currentHit.x, currentHit.y, currentHit.z, BLOCK.AIR)) {
      sfx.play(brokenId === BLOCK.AMETHYST ? 'chime' : 'break');
      spawnBlockParticles(currentHit.x, currentHit.y, currentHit.z, brokenId, 18);
      if (gameMode === 'creative' || canHarvestBlockWithTool(brokenId, heldId)) {
        spawnItemDrop(currentHit.x, currentHit.y, currentHit.z, brokenId, 1, 0.22, heldId);
      } else {
        const lbl = document.getElementById('block-label');
        if (lbl) lbl.textContent = '⚠ Necesitas un pico de mayor nivel para extraer este mineral';
      }
      addHungerExhaustion(0.12);
    }
    mineProgress = 0; mineTargetKey = '';
    crackBox.visible = false; mineBarWrap.style.display = 'none';
  } else {
    const stage = Math.min(7, Math.floor(mineProgress * 8));
    if (crackMat.map !== crackTextures[stage]) { crackMat.map = crackTextures[stage]; crackMat.needsUpdate = true; }
    const pulse = 1.0 + Math.max(0, 0.06 - mineHitTimer) * 0.15;
    crackBox.scale.set(pulse, pulse, pulse);
    crackBox.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
    crackBox.visible = def.shape === 'cube';
    mineBarWrap.style.display = 'block';
    mineBarEl.style.width = `${Math.min(100, mineProgress * 100)}%`;
  }
}

// ============================================================================
// 11. DISTANT HORIZONS RING (1 DRAW CALL, 0 CHUNKS IN RAM) & STREAMING MANAGER
// ============================================================================
const farHorizonMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
const farHorizonMesh = new THREE.Mesh(new THREE.BufferGeometry(), farHorizonMat);
farHorizonMesh.frustumCulled = false;
scene.add(farHorizonMesh);
let lastHorizonCx = null, lastHorizonCz = null, lastHorizonDist = null, lastHorizonSeed = null;

function updateFarHorizon(force = false) {
  const pcx = Math.floor(player.x / CHUNK_SIZE), pcz = Math.floor(player.z / CHUNK_SIZE);
  const hcx = pcx >> 1, hcz = pcz >> 1;
  if (!force && hcx === lastHorizonCx && hcz === lastHorizonCz && lastHorizonDist === renderDistance && lastHorizonSeed === worldSeed) return false;
  lastHorizonCx = hcx; lastHorizonCz = hcz; lastHorizonDist = renderDistance; lastHorizonSeed = worldSeed;

  const STEP = 4, outerChunks = renderDistance + 6;
  const innerR = Math.max(16, (renderDistance - 0.35) * CHUNK_SIZE), outerR = outerChunks * CHUNK_SIZE;
  const innerRSq = innerR * innerR, outerRSq = outerR * outerR;
  const halfSteps = Math.ceil(outerR / STEP), gridN = halfSteps * 2 + 1;
  const centerX = pcx * CHUNK_SIZE + 8, centerZ = pcz * CHUNK_SIZE + 8;
  const gridY = new Float32Array(gridN * gridN), gridCol = new Uint32Array(gridN * gridN);

  for (let gz = 0; gz < gridN; gz++) {
    const wz = centerZ + (gz - halfSteps) * STEP;
    for (let gx = 0; gx < gridN; gx++) {
      const s = generator.sampleSurfaceAt(centerX + (gx - halfSteps) * STEP, wz), idx = gz * gridN + gx;
      gridY[idx] = s.topBlock === BLOCK.WATER ? s.y - 0.15 : s.y;
      gridCol[idx] = s.color;
    }
  }

  const maxCells = gridN * gridN;
  const pos = new Float32Array(maxCells * 12), col = new Float32Array(maxCells * 12), indices = new Uint32Array(maxCells * 6);
  let vCount = 0, iCount = 0;

  for (let gz = 0; gz < gridN - 1; gz++) {
    const z0 = centerZ + (gz - halfSteps) * STEP, z1 = z0 + STEP, dz = (z0 + 2) - centerZ;
    for (let gx = 0; gx < gridN - 1; gx++) {
      const x0 = centerX + (gx - halfSteps) * STEP, x1 = x0 + STEP, dx = (x0 + 2) - centerX, dSq = dx * dx + dz * dz;
      if (dSq < innerRSq || dSq > outerRSq) continue;
      const i00 = gz * gridN + gx, i10 = i00 + 1, i01 = i00 + gridN, i11 = i01 + 1;
      const y00 = gridY[i00], y10 = gridY[i10], y11 = gridY[i11], y01 = gridY[i01];
      const slopeShade = Math.min(1.18, Math.max(0.68, 0.92 + ((y00 - y10) + (y00 - y01)) * 0.04));
      const pts = [[x0, y00, z0, gridCol[i00]], [x0, y01, z1, gridCol[i01]], [x1, y11, z1, gridCol[i11]], [x1, y10, z0, gridCol[i10]]];
      const baseV = vCount;
      for (let c = 0; c < 4; c++) {
        const pt = pts[c], pOff = (baseV + c) * 3, hex = pt[3];
        pos[pOff] = pt[0]; pos[pOff + 1] = pt[1]; pos[pOff + 2] = pt[2];
        const hShade = Math.min(1.22, Math.max(0.65, 0.78 + (pt[1] - SEA_LEVEL) * 0.015)) * slopeShade;
        col[pOff] = Math.min(1, (((hex >> 16) & 255) / 255) * hShade);
        col[pOff + 1] = Math.min(1, (((hex >> 8) & 255) / 255) * hShade);
        col[pOff + 2] = Math.min(1, ((hex & 255) / 255) * hShade);
      }
      indices[iCount++] = baseV; indices[iCount++] = baseV + 1; indices[iCount++] = baseV + 2;
      indices[iCount++] = baseV; indices[iCount++] = baseV + 2; indices[iCount++] = baseV + 3;
      vCount += 4;
    }
  }

  farHorizonMesh.geometry.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, vCount * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col.slice(0, vCount * 3), 3));
  geo.setIndex(new THREE.BufferAttribute(indices.slice(0, iCount), 1));
  farHorizonMesh.geometry = geo;
  return true;
}

let lastPlayerChunkX = null, lastPlayerChunkZ = null;

function updateChunkStreaming() {
  const pcx = Math.floor(player.x / CHUNK_SIZE), pcz = Math.floor(player.z / CHUNK_SIZE);

  if (pcx !== lastPlayerChunkX || pcz !== lastPlayerChunkZ || buildQueue.length === 0) {
    if (pcx !== lastPlayerChunkX || pcz !== lastPlayerChunkZ) updateFarHorizon(false);
    lastPlayerChunkX = pcx; lastPlayerChunkZ = pcz;
    const maxDistSq = (renderDistance + 0.5) * (renderDistance + 0.5);

    for (let i = buildQueue.length - 1; i >= 0; i--) {
      const qCh = buildQueue[i], qdx = qCh.cx - pcx, qdz = qCh.cz - pcz;
      if (qdx * qdx + qdz * qdz > maxDistSq) { qCh.queued = false; buildQueue.splice(i, 1); }
    }

    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        const dSq = dx * dx + dz * dz;
        if (dSq > maxDistSq) continue;
        const ch = getChunkData(pcx + dx, pcz + dz);
        const targetLod = dSq > 12 ? 1 : 0;
        if (!ch.dirty && ch.solidMesh && ch.lodLevel === 1 && targetLod === 0) ch.dirty = true;
        if (ch.dirty && !ch.queued) { ch.queued = true; buildQueue.push(ch); }
      }
    }

    if (buildQueue.length > 1) {
      buildQueue.sort((a, b) => ((a.cx - pcx) ** 2 + (a.cz - pcz) ** 2) - ((b.cx - pcx) ** 2 + (b.cz - pcz) ** 2));
    }

    const unloadDistSq = (renderDistance + 2) * (renderDistance + 2);
    for (const [key, ch] of chunks.entries()) {
      const dx = ch.cx - pcx, dz = ch.cz - pcz;
      if (dx * dx + dz * dz > unloadDistSq) {
        if (ch.solidMesh) { chunkSolidGroup.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
        if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
        chunks.delete(key);
      }
    }
  }

  const budgetStart = performance.now();
  while (buildQueue.length > 0 && (performance.now() - budgetStart) < 4.5) {
    const nextCh = buildQueue[0];
    if (!chunks.has(chunkKey(nextCh.cx, nextCh.cz))) { buildQueue.shift(); continue; }
    const dx = nextCh.cx - pcx, dz = nextCh.cz - pcz, dSq = dx * dx + dz * dz;
    const lod = dSq > 12 ? 1 : 0;
    if (meshWorker && dSq > 2) {
      if (workerJobsInFlight >= 8) break;
      buildQueue.shift(); requestChunkMeshWorker(nextCh.cx, nextCh.cz, lod);
    } else {
      buildQueue.shift(); rebuildChunkImmediate(nextCh.cx, nextCh.cz, lod);
    }
  }
}
