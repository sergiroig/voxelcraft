// VoxelCraft HTML5 — 07-physics-camera.js (9. 3D DDA RAYCASTER, 10. PLAYER PHYSICS, FRUSTUM CULLING, 3RD-PERSON & STREAMING)
'use strict';

// ============================================================================
// 9. FAST 3D DDA VOXEL RAYCASTER
// ============================================================================
function raycastVoxel(ox, oy, oz, dx, dy, dz, maxDist) {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);

  const stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
  const stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
  const stepZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : 1e30;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : 1e30;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : 1e30;

  let tMaxX = stepX > 0 ? (x + 1 - ox) * tDeltaX : (ox - x) * tDeltaX;
  let tMaxY = stepY > 0 ? (y + 1 - oy) * tDeltaY : (oy - y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (z + 1 - oz) * tDeltaZ : (oz - z) * tDeltaZ;

  let nx = 0, ny = 0, nz = 0;
  let dist = 0;

  while (dist <= maxDist) {
    const b = getVoxelGlobal(x, y, z);
    if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
      if (b === BLOCK.TORCH) {
        const hx = ox + dx * dist - x;
        const hy = oy + dy * dist - y;
        const hz = oz + dz * dist - z;
        if (hx >= 0.28 && hx <= 0.72 && hz >= 0.28 && hz <= 0.72 && hy <= 0.75) {
          return { x, y, z, nx, ny, nz, block: b };
        }
      } else {
        return { x, y, z, nx, ny, nz, block: b };
      }
    }
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX; dist = tMaxX; tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY; dist = tMaxY; tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }
    }
  }
  return null;
}

// ============================================================================
// 10. PLAYER PHYSICS, HEALTH, PROGRESSIVE MINING & CONTROLS
// ============================================================================
const player = {
  x: 8.5,
  y: 42,
  z: 8.5,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: -0.15,
  radius: 0.3,
  height: 1.75,
  eyeHeight: 1.58,
  onGround: false,
  flying: false,
  stepAccum: 0,
  bobTime: 0,
  swingTime: 0,
  health: 10,
  maxHealth: 10,
  regenTimer: 0,
  maxFallVel: 0
};

const heartsRowEl = document.getElementById('hearts-row');
function renderHeartsUI() {
  let html = '';
  for (let i = 0; i < player.maxHealth; i++) {
    html += `<span class="heart ${i < player.health ? '' : 'empty'}">❤</span>`;
  }
  heartsRowEl.innerHTML = html;
}
renderHeartsUI();

function damagePlayer(amount) {
  if (player.flying) return;
  player.health = Math.max(1, player.health - amount);
  renderHeartsUI();
  sfx.play('hurt');
  const hurtEl = document.getElementById('hurt-overlay');
  hurtEl.style.opacity = '1';
  setTimeout(() => { hurtEl.style.opacity = '0'; }, 240);
}

function findSpawnHeight(wx, wz) {
  getChunkData(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE));
  for (let y = CHUNK_HEIGHT - 1; y > 1; y--) {
    const b = getVoxelGlobal(Math.floor(wx), y, Math.floor(wz));
    if (BLOCK_DEFS[b].solid) return y + 1.5;
  }
  return 35;
}

const keys = {};
let isLocked = false;
let isTouchMode = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let touchPlaying = false;
let menuOpen = true;
let lastPointerLockExitTime = 0;
let invOpen = false;
let chestOpen = false;
let activeChestKey = null;
let selectedSlot = 0;
let renderDistance = 5;
let isNight = false;
let hudVisible = true;

// Multi-touch state (Virtual Joystick + Camera Look + Action Buttons)
let joyX = 0;       // -1 (left) to +1 (right)
let joyY = 0;       // -1 (back) to +1 (forward)
let joySprint = false;
let touchJump = false;
let touchDown = false;

const isGameActive = () => (!menuOpen || isLocked || touchPlaying) && !invOpen && !chestOpen;

// Progressive Mining state
let isMiningHeld = false;
let mineTargetKey = '';
let mineProgress = 0;
let mineHitTimer = 0;

function checkAABBCollision(px, py, pz) {
  const minX = Math.floor(px - player.radius);
  const maxX = Math.floor(px + player.radius);
  const minY = Math.floor(py);
  const maxY = Math.floor(py + player.height - 0.01);
  const minZ = Math.floor(pz - player.radius);
  const maxZ = Math.floor(pz + player.radius);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const b = getVoxelGlobal(x, y, z);
        if (BLOCK_DEFS[b].solid) return true;
      }
    }
  }
  return false;
}

// ============================================================================
// 10B. SMART FRUSTUM CULLING (PUNTO 11) + 3RD-PERSON AVATAR & ZOOM (PUNTO 15)
// ============================================================================
let thirdPersonMode = false;
let isZoomed = false;
let baseFov = 75;
let visibleChunksCount = 0;
let culledChunksCount = 0;

const projScreenMat = new THREE.Matrix4();
const viewFrustum = new THREE.Frustum();

// Build 6-part articulated voxel player avatar for 3rd-person view
const playerAvatar = (() => {
  const grp = new THREE.Group();
  const skinMat  = new THREE.MeshBasicMaterial({ color: 0xf1c27d });
  const shirtMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const pantsMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

  const torso = new THREE.Mesh(mobGeos.bodyBiped, shirtMat);
  torso.position.set(0, 0.90, 0);
  grp.add(torso);

  const head = new THREE.Mesh(mobGeos.head, skinMat);
  head.position.set(0, 1.46, 0);
  grp.add(head);

  const leftArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat);
  leftArm.position.set(-0.32, 0.94, 0);
  grp.add(leftArm);

  const rightArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat);
  rightArm.position.set(0.32, 0.94, 0);
  grp.add(rightArm);

  const leftLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat);
  leftLeg.position.set(-0.12, 0.31, 0);
  grp.add(leftLeg);

  const rightLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat);
  rightLeg.position.set(0.12, 0.31, 0);
  grp.add(rightLeg);

  grp.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg };
  grp.visible = false;
  scene.add(grp);
  return grp;
})();

function toggleCameraMode(force3rd) {
  thirdPersonMode = typeof force3rd === 'boolean' ? force3rd : !thirdPersonMode;
  playerAvatar.visible = thirdPersonMode;
  handGroup.visible = !thirdPersonMode;
  const tbtnCam = document.getElementById('tbtn-cam');
  if (tbtnCam) {
    tbtnCam.textContent = thirdPersonMode ? '🎥 1ªP' : '🎥 3ªP';
    tbtnCam.classList.toggle('toggled', thirdPersonMode);
  }
  return thirdPersonMode;
}

function toggleZoom(forceZoom) {
  isZoomed = typeof forceZoom === 'boolean' ? forceZoom : !isZoomed;
  camera.fov = isZoomed ? 24 : baseFov;
  camera.updateProjectionMatrix();
  const tbtnZoom = document.getElementById('tbtn-zoom');
  if (tbtnZoom) {
    tbtnZoom.classList.toggle('toggled', isZoomed);
  }
  return isZoomed;
}

function updateFrustumCulling() {
  camera.updateMatrixWorld();
  projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  viewFrustum.setFromProjectionMatrix(projScreenMat);

  const pcx = Math.floor(player.x / CHUNK_SIZE);
  const pcz = Math.floor(player.z / CHUNK_SIZE);
  let vis = 0;
  let culled = 0;

  for (const ch of chunks.values()) {
    if (!ch.solidMesh && !ch.waterMesh) continue;
    const dx = ch.cx - pcx;
    const dz = ch.cz - pcz;
    // Always keep the immediate 3x3 chunk neighborhood around the player visible
    const inView = (dx * dx + dz * dz <= 2) || (ch.worldBox ? viewFrustum.intersectsBox(ch.worldBox) : true);
    if (ch.solidMesh) ch.solidMesh.visible = inView;
    if (ch.waterMesh) ch.waterMesh.visible = inView;
    if (inView) vis++;
    else culled++;
  }

  visibleChunksCount = vis;
  culledChunksCount = culled;

  // Also cull distant mobs outside the camera frustum
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    if (!m.root) continue;
    const mdx = m.x - player.x;
    const mdz = m.z - player.z;
    if (mdx * mdx + mdz * mdz <= 64) {
      m.root.visible = true;
    } else {
      m.root.visible = viewFrustum.containsPoint(m.root.position);
    }
  }
}

function updatePlayerPhysics(dt) {
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX   =  Math.cos(player.yaw);
  const rightZ   = -Math.sin(player.yaw);

  let inputFwd = 0, inputRight = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    inputFwd += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  inputFwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) inputRight += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  inputRight -= 1;

  // Merge virtual analog joystick
  inputFwd   += joyY;
  inputRight += joyX;

  let moveX = forwardX * inputFwd + rightX * inputRight;
  let moveZ = forwardZ * inputFwd + rightZ * inputRight;

  const len = Math.hypot(moveX, moveZ);
  const moveMag = Math.min(1.0, len);
  if (len > 0) {
    moveX = (moveX / len) * moveMag;
    moveZ = (moveZ / len) * moveMag;
  }

  const inWater = getVoxelGlobal(
    Math.floor(player.x),
    Math.floor(player.y + 0.6),
    Math.floor(player.z)
  ) === BLOCK.WATER;

  const wantJump = keys['Space'] || touchJump;
  const wantDown = keys['ShiftLeft'] || keys['ShiftRight'] || touchDown;
  const sprint   = keys['ShiftLeft'] || keys['ShiftRight'] || joySprint;

  const speed = player.flying
    ? (sprint ? 22 : 12)
    : (inWater ? 3.8 : (sprint ? 7.2 : 4.7));

  player.vx = moveX * speed;
  player.vz = moveZ * speed;

  const groundBlock = getVoxelGlobal(
    Math.floor(player.x),
    Math.floor(player.y - 0.15),
    Math.floor(player.z)
  );
  const onLadder =
    getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.15), Math.floor(player.z)) === BLOCK.LADDER ||
    getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 1.05), Math.floor(player.z)) === BLOCK.LADDER;

  if (ridingCart) {
    if (wantDown) {
      toggleRideMinecart();
    } else {
      player.x = ridingCart.x;
      player.y = ridingCart.y + 0.35;
      player.z = ridingCart.z;
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      player.maxFallVel = 0;
      player.onGround = true;
    }
  } else if (player.flying) {
    player.vy = 0;
    player.maxFallVel = 0;
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
        if (player.stepAccum > 1.4) {
          player.stepAccum = 0;
          sfx.play('climb');
        }
      } else if (wantDown) {
        player.vy = 0;
      } else {
        player.vy = -2.2;
      }
    } else if (inWater) {
      player.vy -= 9.0 * dt;
      player.vy *= 0.88;
      player.maxFallVel = 0;
      if (wantJump) player.vy = 4.2;
    } else {
      player.vy -= 26.0 * dt;
      if (player.vy < -38) player.vy = -38;
      if (player.vy < player.maxFallVel) player.maxFallVel = player.vy;
      if (wantJump && player.onGround) {
        if (groundBlock === BLOCK.SLIME) {
          player.vy = 12.8;
          sfx.play('boing');
        } else {
          player.vy = 8.6;
        }
        player.onGround = false;
      }
    }

    const nextX = player.x + player.vx * dt;
    if (!checkAABBCollision(nextX, player.y, player.z)) player.x = nextX;

    const nextZ = player.z + player.vz * dt;
    if (!checkAABBCollision(player.x, player.y, nextZ)) player.z = nextZ;

    const nextY = player.y + player.vy * dt;
    if (!checkAABBCollision(player.x, nextY, player.z)) {
      player.y = nextY;
      player.onGround = false;
    } else {
      if (player.vy < 0) {
        const landBlock = getVoxelGlobal(
          Math.floor(player.x),
          Math.floor(nextY - 0.08),
          Math.floor(player.z)
        );
        if (landBlock === BLOCK.SLIME) {
          // Slime Block cancels all fall damage and bounces the player elastically!
          player.maxFallVel = 0;
          if (player.vy < -3.0 && !wantDown) {
            player.vy = Math.min(16.5, Math.max(9.2, -player.vy * 0.86));
            player.onGround = false;
            sfx.play('boing');
          } else {
            player.vy = 0;
            player.onGround = true;
          }
        } else {
          if (player.maxFallVel < -16.5) {
            const dmg = Math.max(1, Math.floor((-player.maxFallVel - 15.0) * 0.45));
            damagePlayer(dmg);
          }
          player.maxFallVel = 0;
          player.onGround = true;
          player.vy = 0;
        }
      } else {
        player.vy = 0;
      }
    }

    if (player.onGround && moveMag > 0.15) {
      player.stepAccum += dt * speed * moveMag;
      if (player.stepAccum > 2.2) {
        player.stepAccum = 0;
        if (groundBlock === BLOCK.AMETHYST) {
          sfx.play('chime');
        } else {
          sfx.play('step');
        }
      }
    }
  }

  // Passive health regeneration
  if (player.health < player.maxHealth) {
    player.regenTimer += dt;
    if (player.regenTimer > 4.0) {
      player.regenTimer = 0;
      player.health++;
      renderHeartsUI();
    }
  }

  // 1st-person hand bobbing & swing animation
  if (moveMag > 0.1 && (player.onGround || player.flying)) {
    player.bobTime += dt * speed * moveMag * 1.6;
  }
  if (player.swingTime > 0) {
    player.swingTime = Math.max(0, player.swingTime - dt * 5.0);
  }
  const swingAngle = Math.sin(player.swingTime * Math.PI);
  handGroup.position.set(
    0.42 + Math.cos(player.bobTime) * 0.022 - swingAngle * 0.08,
    -0.34 + Math.abs(Math.sin(player.bobTime)) * 0.025 - swingAngle * 0.06,
    -0.58 - swingAngle * 0.14
  );
  handGroup.rotation.x = -swingAngle * 0.65;

  // Update 3rd-person player avatar position & limb animations
  playerAvatar.position.set(player.x, player.y, player.z);
  playerAvatar.rotation.y = player.yaw;
  const av = playerAvatar.userData;
  const limbSwing = moveMag > 0.08 ? Math.sin(player.bobTime * 1.2) * 0.65 : 0;
  av.leftLeg.rotation.x  =  limbSwing;
  av.rightLeg.rotation.x = -limbSwing;
  av.leftArm.rotation.x  = -limbSwing * 0.8;
  av.rightArm.rotation.x =  limbSwing * 0.8 - swingAngle * 1.25;
  av.head.rotation.x     =  player.pitch * 0.65;

  const eyeX = player.x;
  const eyeY = player.y + player.eyeHeight;
  const eyeZ = player.z;

  if (thirdPersonMode) {
    // Raycast backward from eye position so the 3rd-person camera never clips into solid walls
    const backX =  Math.sin(player.yaw) * Math.cos(player.pitch);
    const backY = -Math.sin(player.pitch);
    const backZ =  Math.cos(player.yaw) * Math.cos(player.pitch);
    const maxCamDist = 3.6;
    let camDist = maxCamDist;
    const wallHit = raycastVoxel(eyeX, eyeY, eyeZ, backX, backY, backZ, maxCamDist);
    if (wallHit && BLOCK_DEFS[wallHit.block].solid) {
      const hitDist = Math.hypot(wallHit.x + 0.5 - eyeX, wallHit.y + 0.5 - eyeY, wallHit.z + 0.5 - eyeZ);
      camDist = Math.max(0.45, Math.min(maxCamDist, hitDist - 0.55));
    }
    camera.position.set(
      eyeX + backX * camDist,
      eyeY + backY * camDist,
      eyeZ + backZ * camDist
    );
  } else {
    camera.position.set(eyeX, eyeY, eyeZ);
  }

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  const headBlock = getVoxelGlobal(
    Math.floor(camera.position.x),
    Math.floor(camera.position.y),
    Math.floor(camera.position.z)
  );
  document.getElementById('water-overlay').style.display =
    headBlock === BLOCK.WATER ? 'block' : 'none';
}

const mineBarWrap = document.getElementById('mine-progress-wrap');
const mineBarEl   = document.getElementById('mine-progress-bar');

function updateMining(dt, currentHit) {
  if (!isGameActive() || !isMiningHeld || !currentHit || currentHit.block === BLOCK.BEDROCK) {
    mineProgress = 0;
    mineTargetKey = '';
    crackBox.visible = false;
    mineBarWrap.style.display = 'none';
    return;
  }

  // Clicking / punching a placed TNT block ignites it immediately!
  if (currentHit.block === BLOCK.TNT) {
    igniteTNT(currentHit.x, currentHit.y, currentHit.z, 2.6);
    isMiningHeld = false;
    mineProgress = 0;
    crackBox.visible = false;
    mineBarWrap.style.display = 'none';
    return;
  }

  const key = `${currentHit.x},${currentHit.y},${currentHit.z}`;
  if (key !== mineTargetKey) {
    mineTargetKey = key;
    mineProgress = 0;
  }

  const def = BLOCK_DEFS[currentHit.block];
  const holdingPickaxe = hotbarSlots[selectedSlot] === BLOCK.TOOL_PICKAXE;
  const speedMult = (holdingPickaxe && def.stoneLike) ? 3.5 : (holdingPickaxe ? 1.5 : 1.0);
  const duration = Math.max(0.05, def.hardness / speedMult);

  mineProgress += dt / duration;
  player.swingTime = (player.swingTime > 0.05) ? player.swingTime : 1.0;

  mineHitTimer += dt;
  if (mineHitTimer > 0.16) {
    mineHitTimer = 0;
    sfx.play('hit');
    spawnBlockParticles(currentHit.x, currentHit.y, currentHit.z, currentHit.block, 3);
  }

  if (mineProgress >= 1.0) {
    const brokenId = currentHit.block;
    if (setVoxelGlobal(currentHit.x, currentHit.y, currentHit.z, BLOCK.AIR)) {
      if (brokenId === BLOCK.AMETHYST) sfx.play('chime');
      else sfx.play('break');
      spawnBlockParticles(currentHit.x, currentHit.y, currentHit.z, brokenId, 18);
      spawnItemDrop(currentHit.x, currentHit.y, currentHit.z, brokenId, 1);
    }
    mineProgress = 0;
    mineTargetKey = '';
    crackBox.visible = false;
    mineBarWrap.style.display = 'none';
  } else {
    const stage = Math.min(7, Math.floor(mineProgress * 8));
    crackMat.map = crackTextures[stage];
    crackMat.needsUpdate = true;
    crackBox.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
    crackBox.visible = def.shape === 'cube';
    mineBarWrap.style.display = 'block';
    mineBarEl.style.width = `${Math.min(100, mineProgress * 100)}%`;
  }
}

// ============================================================================
// 11. STREAMING CHUNK MANAGER
// ============================================================================
let lastPlayerChunkX = null;
let lastPlayerChunkZ = null;

function updateChunkStreaming() {
  const pcx = Math.floor(player.x / CHUNK_SIZE);
  const pcz = Math.floor(player.z / CHUNK_SIZE);

  if (pcx !== lastPlayerChunkX || pcz !== lastPlayerChunkZ || buildQueue.length === 0) {
    lastPlayerChunkX = pcx;
    lastPlayerChunkZ = pcz;

    const maxDistSq = (renderDistance + 0.5) * (renderDistance + 0.5);
    // Prune any queued chunks that are now outside renderDistance when player moves
    for (let i = buildQueue.length - 1; i >= 0; i--) {
      const qCh = buildQueue[i];
      const qdx = qCh.cx - pcx;
      const qdz = qCh.cz - pcz;
      if (qdx * qdx + qdz * qdz > maxDistSq) {
        qCh.queued = false;
        buildQueue.splice(i, 1);
      }
    }

    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        const distSq = dx * dx + dz * dz;
        if (distSq > maxDistSq) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const ch = getChunkData(cx, cz);
        if (ch.dirty && !ch.queued) {
          ch.queued = true;
          buildQueue.push(ch);
        }
      }
    }

    if (buildQueue.length > 1) {
      buildQueue.sort((a, b) => {
        const da = (a.cx - pcx) * (a.cx - pcx) + (a.cz - pcz) * (a.cz - pcz);
        const db = (b.cx - pcx) * (b.cx - pcx) + (b.cz - pcz) * (b.cz - pcz);
        return da - db;
      });
    }

    const unloadDistSq = (renderDistance + 2) * (renderDistance + 2);
    for (const [key, ch] of chunks.entries()) {
      const dx = ch.cx - pcx;
      const dz = ch.cz - pcz;
      if (dx * dx + dz * dz > unloadDistSq) {
        if (ch.solidMesh) { scene.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
        if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
        chunks.delete(key);
      }
    }
  }

  const budgetStart = performance.now();
  while (buildQueue.length > 0 && (performance.now() - budgetStart) < 4.5) {
    const nextCh = buildQueue[0];
    if (!chunks.has(chunkKey(nextCh.cx, nextCh.cz))) {
      buildQueue.shift();
      continue;
    }
    const dx = nextCh.cx - pcx;
    const dz = nextCh.cz - pcz;
    // Build inner chunks immediately so player stands on solid ground on frame 1;
    // offload outer streaming chunks to the multithreaded Web Worker with Zero-Copy Transferables
    if (meshWorker && (dx * dx + dz * dz) > 2) {
      if (workerJobsInFlight >= 8) break;
      buildQueue.shift();
      requestChunkMeshWorker(nextCh.cx, nextCh.cz);
    } else {
      buildQueue.shift();
      rebuildChunkImmediate(nextCh.cx, nextCh.cz);
    }
  }
}

