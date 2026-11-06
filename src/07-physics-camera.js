// VoxelCraft HTML5 — 07-physics-camera.js (9. DDA RAYCASTER, 10. PLAYER PHYSICS, SHIELD, ICE, BOATS, PORTALS, FRUSTUM CULLING & STREAMING)
'use strict';

// ============================================================================
// 9. FAST 3D DDA VOXEL RAYCASTER
// ============================================================================
function raycastVoxel(ox, oy, oz, dx, dy, dz, maxDist) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
  const stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
  const stepZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : 1e30;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : 1e30;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : 1e30;

  let tMaxX = stepX > 0 ? (x + 1 - ox) * tDeltaX : (ox - x) * tDeltaX;
  let tMaxY = stepY > 0 ? (y + 1 - oy) * tDeltaY : (oy - y) * tDeltaY;
  let tMaxZ = stepZ > 0 ? (z + 1 - oz) * tDeltaZ : (oz - z) * tDeltaZ;

  let nx = 0, ny = 0, nz = 0, dist = 0;

  while (dist <= maxDist) {
    const b = getVoxelGlobal(x, y, z);
    if (b !== BLOCK.AIR && b !== BLOCK.WATER) {
      if (b === BLOCK.TORCH) {
        const hx = ox + dx * dist - x, hy = oy + dy * dist - y, hz = oz + dz * dist - z;
        if (hx >= 0.28 && hx <= 0.72 && hz >= 0.28 && hz <= 0.72 && hy <= 0.75) {
          return { x, y, z, nx, ny, nz, block: b };
        }
      } else {
        return { x, y, z, nx, ny, nz, block: b };
      }
    }
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX; dist = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY; dist = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
  }
  return null;
}

// ============================================================================
// 10. PLAYER PHYSICS, SHIELD BLOCK (PUNTO 25), SLIPPERY ICE (PUNTO 26) & BOATS/PORTALS
// ============================================================================
const player = {
  x: 8.5, y: 42, z: 8.5,
  vx: 0, vy: 0, vz: 0,
  iceVx: 0, iceVz: 0,
  yaw: 0, pitch: -0.15,
  radius: 0.3, height: 1.75, eyeHeight: 1.58,
  onGround: false, flying: false,
  stepAccum: 0, bobTime: 0, swingTime: 0,
  health: 10, maxHealth: 10, regenTimer: 0,
  maxFallVel: 0, portalCooldown: 0
};

let isShieldBlocking = false;
const armorSlots = [0, 0, 0, 0]; // [Helmet, Chestplate, Leggings, Boots]

function getArmorDefenseRatio() {
  let def = 0;
  for (let i = 0; i < 4; i++) {
    const id = armorSlots[i];
    if (id >= BLOCK.ARMOR_DIAMOND_HELMET && id <= BLOCK.ARMOR_DIAMOND_BOOTS) def += 0.18;
    else if (id >= BLOCK.ARMOR_IRON_HELMET && id <= BLOCK.ARMOR_IRON_BOOTS) def += 0.12;
  }
  return Math.min(0.75, def);
}

function equipArmorItem(itemId) {
  const sIdx = getArmorSlotForItem(itemId);
  if (sIdx < 0) return false;
  if (gameMode === 'survival' && (inventoryCounts[itemId] || 0) <= 0) return false;
  const prevId = armorSlots[sIdx];
  if (prevId > 0 && gameMode === 'survival') inventoryCounts[prevId] = (inventoryCounts[prevId] || 0) + 1;
  if (gameMode === 'survival') {
    if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === itemId && hotbarCounts[selectedSlot] > 0) hotbarCounts[selectedSlot]--;
    inventoryCounts[itemId] = Math.max(0, (inventoryCounts[itemId] || 1) - 1);
    if (inventoryCounts[itemId] <= 0 && selectedSlot >= 0 && hotbarSlots[selectedSlot] === itemId) hotbarSlots[selectedSlot] = BLOCK.AIR;
  }
  armorSlots[sIdx] = itemId;
  sfx.play('shield');
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  if (typeof saveWorldData === 'function') saveWorldData();
  return true;
}

function applyBoneMealAt(wx, wy, wz) {
  if (gameMode === 'survival' && (inventoryCounts[BLOCK.ITEM_BONE_MEAL] || 0) <= 0) return false;
  const b = getVoxelGlobal(wx, wy, wz);
  let applied = false;
  if (b === BLOCK.WHEAT_1 || b === BLOCK.WHEAT_2) {
    setVoxelGlobal(wx, wy, wz, BLOCK.WHEAT_3); applied = true;
  } else if (b === BLOCK.SAPLING) {
    growTreeAt(wx, wy, wz); applied = true;
  } else if (b === BLOCK.GRASS || b === BLOCK.DIRT) {
    if (b === BLOCK.DIRT) setVoxelGlobal(wx, wy, wz, BLOCK.GRASS);
    if (getVoxelGlobal(wx, wy + 1, wz) === BLOCK.AIR) setVoxelGlobal(wx, wy + 1, wz, BLOCK.TALL_GRASS);
    applied = true;
  }
  if (!applied) return false;
  if (gameMode === 'survival') {
    if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_BONE_MEAL && hotbarCounts[selectedSlot] > 0) hotbarCounts[selectedSlot]--;
    inventoryCounts[BLOCK.ITEM_BONE_MEAL] = Math.max(0, (inventoryCounts[BLOCK.ITEM_BONE_MEAL] || 1) - 1);
    if (inventoryCounts[BLOCK.ITEM_BONE_MEAL] <= 0 && selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_BONE_MEAL) hotbarSlots[selectedSlot] = BLOCK.AIR;
  }
  spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.SAPLING, 14);
  sfx.play('chime'); player.swingTime = 1.0;
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  if (typeof saveWorldData === 'function') saveWorldData();
  return true;
}

function useFishingRod(wx, wy, wz) {
  const tx = wx !== undefined ? wx : Math.floor(player.x - Math.sin(player.yaw) * 2.5);
  const ty = wy !== undefined ? wy : Math.floor(player.y), tz = wz !== undefined ? wz : Math.floor(player.z - Math.cos(player.yaw) * 2.5);
  spawnBlockParticles(tx, ty + 0.5, tz, BLOCK.WATER, 16); sfx.play('splash'); player.swingTime = 1.0;
  addInventoryItem(BLOCK.ITEM_RAW_FISH, 1);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '🎣 ¡Has pescado 1× Pescado Crudo (+2❤)!';
  return BLOCK.ITEM_RAW_FISH;
}

function sleepInBed(wx, wy, wz) {
  if (typeof setTimeOfDay === 'function') setTimeOfDay(0.25);
  player.health = Math.min(player.maxHealth, player.health + 4);
  renderHeartsUI(); sfx.play('chime');
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.BED, 12);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '🛏 ¡Has descansado en la Cama! Amanece y recuperas +4❤';
  return true;
}

function useAnvilAt(wx, wy, wz) {
  const held = getActiveHeldItem();
  const upMap = { [BLOCK.TOOL_WOOD_PICKAXE]: BLOCK.TOOL_STONE_PICKAXE, [BLOCK.TOOL_STONE_PICKAXE]: BLOCK.TOOL_IRON_PICKAXE, [BLOCK.TOOL_IRON_PICKAXE]: BLOCK.TOOL_PICKAXE, [BLOCK.TOOL_WOOD_SWORD]: BLOCK.TOOL_STONE_SWORD, [BLOCK.TOOL_STONE_SWORD]: BLOCK.TOOL_IRON_SWORD, [BLOCK.TOOL_IRON_SWORD]: BLOCK.TOOL_SWORD };
  const upgraded = upMap[held] || BLOCK.ITEM_DIAMOND;
  if (upMap[held] && selectedSlot >= 0) {
    hotbarSlots[selectedSlot] = upgraded;
    inventoryCounts[upgraded] = (inventoryCounts[upgraded] || 0) + 1;
  } else {
    addInventoryItem(BLOCK.ITEM_IRON_INGOT, 1);
  }
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.6, wz, BLOCK.IRON_BLOCK, 14);
  sfx.play('shield');
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  return upgraded;
}

function useEnchantingTableAt(wx, wy, wz) {
  player.health = player.maxHealth; renderHeartsUI();
  addInventoryItem(BLOCK.ITEM_ENDER_PEARL, 1);
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.8, wz, BLOCK.AMETHYST, 18);
  sfx.play('chime');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '✨ ¡Mesa de Encantamientos activada! Salud al máximo + 1× Perla de Ender';
  return BLOCK.ITEM_ENDER_PEARL;
}

function throwEnderPearl() {
  if (gameMode === 'survival' && (inventoryCounts[BLOCK.ITEM_ENDER_PEARL] || 0) <= 0) return false;
  if (gameMode === 'survival') {
    if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_ENDER_PEARL && hotbarCounts[selectedSlot] > 0) hotbarCounts[selectedSlot]--;
    inventoryCounts[BLOCK.ITEM_ENDER_PEARL] = Math.max(0, (inventoryCounts[BLOCK.ITEM_ENDER_PEARL] || 1) - 1);
    if (inventoryCounts[BLOCK.ITEM_ENDER_PEARL] <= 0 && selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_ENDER_PEARL) hotbarSlots[selectedSlot] = BLOCK.AIR;
  }
  const destX = currentHit ? currentHit.x + currentHit.nx + 0.5 : player.x - Math.sin(player.yaw) * 8.0;
  const destZ = currentHit ? currentHit.z + currentHit.nz + 0.5 : player.z - Math.cos(player.yaw) * 8.0;
  const destY = currentHit ? currentHit.y + Math.max(1, currentHit.ny) + 0.2 : findSpawnHeight(destX, destZ);
  player.x = destX; player.y = destY; player.z = destZ;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  spawnBlockParticles(destX, destY, destZ, BLOCK.PORTAL, 20);
  sfx.play('portal');
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  return true;
}

function toggleShieldBlock(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !isShieldBlocking;
  if (next !== isShieldBlocking && next) sfx.play('shield');
  isShieldBlocking = next;
  return isShieldBlocking;
}

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
  if (isShieldBlocking) {
    sfx.play('shield');
    amount = Math.floor(amount * 0.2);
    if (amount <= 0) return;
  }
  const armorDef = getArmorDefenseRatio();
  if (armorDef > 0) amount = Math.max(1, Math.round(amount * (1 - armorDef)));
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

// ============================================================================
// 10A. DIMENSIONAL OBSIDIAN PORTALS (PUNTO 24) & SAILING BOATS (PUNTO 21)
// ============================================================================
const portals = [];

function registerPortalAt(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  let existing = portals.find(p => Math.hypot(p.x - bx, p.y - by, p.z - bz) < 2.5);
  if (!existing) {
    existing = { x: bx, y: by, z: bz };
    portals.push(existing);
  }
  return existing;
}

function activateObsidianPortal(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  setVoxelGlobal(bx, by, bz, BLOCK.PORTAL);
  sfx.play('portal');
  spawnBlockParticles(bx, by, bz, BLOCK.AMETHYST, 20);
  return registerPortalAt(bx, by, bz);
}

function useVoxelPortal(wx, wy, wz) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  registerPortalAt(bx, by, bz);
  let target = portals.find(p => Math.hypot(p.x - bx, p.y - by, p.z - bz) >= 4.0);
  if (!target) {
    const destX = bx + 32, destZ = bz + 32;
    const destY = Math.max(SEA_LEVEL + 4, Math.floor(findSpawnHeight(destX, destZ)));
    setVoxelGlobal(destX, destY - 1, destZ, BLOCK.OBSIDIAN);
    setVoxelGlobal(destX, destY, destZ, BLOCK.PORTAL);
    target = registerPortalAt(destX, destY, destZ);
  }
  player.x = target.x + 0.5;
  player.y = target.y + 0.1;
  player.z = target.z + 1.2;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  player.portalCooldown = 2.0;
  sfx.play('portal');
  spawnBlockParticles(target.x, target.y, target.z, BLOCK.PORTAL, 24);
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
  root.position.set(boat.x, boat.y, boat.z);
  scene.add(root);
  boats.push(boat);
  sfx.play('splash');
  return boat;
}

function toggleRideBoat(boatOverride) {
  const btn = document.getElementById('tbtn-cart');
  if (ridingBoat) {
    ridingBoat.vx = 0; ridingBoat.vz = 0; ridingBoat = null; player.vy = 4.5;
    if (btn) btn.classList.remove('toggled');
    sfx.play('splash');
    return false;
  }
  let targetBoat = boatOverride || null;
  if (!targetBoat) {
    for (const b of boats) {
      if (Math.hypot(b.x - player.x, b.y - player.y, b.z - player.z) < 4.5) { targetBoat = b; break; }
    }
  }
  if (!targetBoat) targetBoat = spawnBoat(player.x, player.y, player.z);
  ridingBoat = targetBoat;
  targetBoat.yaw = player.yaw;
  targetBoat.vx = -Math.sin(player.yaw) * 9.5;
  targetBoat.vz = -Math.cos(player.yaw) * 9.5;
  player.x = targetBoat.x; player.y = targetBoat.y + 0.35; player.z = targetBoat.z;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  if (btn) btn.classList.add('toggled');
  sfx.play('splash');
  return true;
}

function updateBoats(dt) {
  for (let i = 0; i < boats.length; i++) {
    const b = boats[i];
    if (ridingBoat === b) {
      const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) + joyY;
      b.yaw = player.yaw;
      if (Math.abs(fwd) > 0.05) {
        b.vx = -Math.sin(b.yaw) * 9.5 * Math.sign(fwd);
        b.vz = -Math.cos(b.yaw) * 9.5 * Math.sign(fwd);
      }
    }
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > 0.05) {
      const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
      if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(nx), Math.floor(b.y + 0.2), Math.floor(nz))].solid) {
        b.x = nx; b.z = nz;
      } else {
        b.vx = 0; b.vz = 0;
      }
      b.vx *= Math.max(0.85, 1.0 - dt * 1.2);
      b.vz *= Math.max(0.85, 1.0 - dt * 1.2);
      b.splashTimer += dt;
      if (b.splashTimer > 0.35) { b.splashTimer = 0; sfx.play('splash'); }
    }
    b.root.position.set(b.x, b.y + Math.sin(gpuShaderUniforms.uTime.value * 3.0 + i) * 0.04, b.z);
    b.root.rotation.y = b.yaw;
    if (ridingBoat === b) {
      player.x = b.x; player.y = b.y + 0.35; player.z = b.z;
      player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
    }
  }
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

let joyX = 0, joyY = 0, joySprint = false, touchJump = false, touchDown = false;
const isGameActive = () => (!menuOpen || isLocked || touchPlaying) && !invOpen && !chestOpen;

let isMiningHeld = false;
let mineTargetKey = '';
let mineProgress = 0;
let mineHitTimer = 0;

function checkAABBCollision(px, py, pz) {
  const minX = Math.floor(px - player.radius), maxX = Math.floor(px + player.radius);
  const minY = Math.floor(py), maxY = Math.floor(py + player.height - 0.01);
  const minZ = Math.floor(pz - player.radius), maxZ = Math.floor(pz + player.radius);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (BLOCK_DEFS[getVoxelGlobal(x, y, z)].solid) return true;
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

const playerAvatar = (() => {
  const grp = new THREE.Group();
  const skinMat  = new THREE.MeshBasicMaterial({ color: 0xf1c27d });
  const shirtMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const pantsMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

  const torso = new THREE.Mesh(mobGeos.bodyBiped, shirtMat); torso.position.set(0, 0.90, 0); grp.add(torso);
  const head = new THREE.Mesh(mobGeos.head, skinMat); head.position.set(0, 1.46, 0); grp.add(head);
  const leftArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat); leftArm.position.set(-0.32, 0.94, 0); grp.add(leftArm);
  const rightArm = new THREE.Mesh(mobGeos.limbBiped, shirtMat); rightArm.position.set(0.32, 0.94, 0); grp.add(rightArm);
  const heldIcon = new THREE.Mesh(handIconGeo, new THREE.MeshBasicMaterial({ map: handIconTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
  heldIcon.position.set(0, -0.30, -0.18); heldIcon.rotation.y = Math.PI / 2; heldIcon.visible = false; rightArm.add(heldIcon);
  const leftLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat); leftLeg.position.set(-0.12, 0.31, 0); grp.add(leftLeg);
  const rightLeg = new THREE.Mesh(mobGeos.limbBiped, pantsMat); rightLeg.position.set(0.12, 0.31, 0); grp.add(rightLeg);

  grp.userData = { head, torso, leftArm, rightArm, leftLeg, rightLeg, heldIcon };
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
  visibleChunksCount = vis;
  culledChunksCount = culled;

  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    if (!m.root) continue;
    const mdx = m.x - player.x, mdz = m.z - player.z;
    m.root.visible = (mdx * mdx + mdz * mdz <= 64) || viewFrustum.containsPoint(m.root.position);
  }
}

function updatePlayerPhysics(dt) {
  if (player.portalCooldown > 0) player.portalCooldown = Math.max(0, player.portalCooldown - dt);

  const forwardX = -Math.sin(player.yaw), forwardZ = -Math.cos(player.yaw);
  const rightX   =  Math.cos(player.yaw), rightZ   = -Math.sin(player.yaw);

  let inputFwd = 0, inputRight = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    inputFwd += 1;
  if (keys['KeyS'] || keys['ArrowDown'])  inputFwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) inputRight += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  inputRight -= 1;
  inputFwd += joyY; inputRight += joyX;

  let moveX = forwardX * inputFwd + rightX * inputRight;
  let moveZ = forwardZ * inputFwd + rightZ * inputRight;

  const len = Math.hypot(moveX, moveZ);
  const moveMag = Math.min(1.0, len);
  if (len > 0) {
    moveX = (moveX / len) * moveMag;
    moveZ = (moveZ / len) * moveMag;
  }

  const inWater = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y + 0.6), Math.floor(player.z)) === BLOCK.WATER;
  const wantJump = keys['Space'] || touchJump;
  const wantDown = keys['ShiftLeft'] || keys['ShiftRight'] || touchDown;
  const sprint   = keys['ShiftLeft'] || keys['ShiftRight'] || joySprint;

  const groundBlock = getVoxelGlobal(Math.floor(player.x), Math.floor(player.y - 0.15), Math.floor(player.z));
  const onIce = !player.flying && !inWater && (
    groundBlock === BLOCK.ICE ||
    getVoxelGlobal(Math.floor(player.x), Math.floor(player.y - 0.55), Math.floor(player.z)) === BLOCK.ICE
  );

  const baseSpeed = player.flying
    ? (sprint ? 22 : 12)
    : (inWater ? 3.8 : (sprint ? 7.2 : 4.7));
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
          player.vy = 12.8; sfx.play('boing');
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
        const landBlock = getVoxelGlobal(Math.floor(player.x), Math.floor(nextY - 0.08), Math.floor(player.z));
        if (landBlock === BLOCK.SLIME) {
          player.maxFallVel = 0;
          if (player.vy < -3.0 && !wantDown) {
            player.vy = Math.min(16.5, Math.max(9.2, -player.vy * 0.86));
            player.onGround = false;
            sfx.play('boing');
          } else {
            player.vy = 0; player.onGround = true;
          }
        } else {
          if (player.maxFallVel < -16.5) {
            damagePlayer(Math.max(1, Math.floor((-player.maxFallVel - 15.0) * 0.45)));
          }
          player.maxFallVel = 0; player.onGround = true; player.vy = 0;
        }
      } else {
        player.vy = 0;
      }
    }

    if (player.onGround && moveMag > 0.15) {
      player.stepAccum += dt * speed * moveMag;
      if (player.stepAccum > 2.2) {
        player.stepAccum = 0;
        sfx.play(groundBlock === BLOCK.AMETHYST ? 'chime' : 'step');
      }
    }
  }

  // Passive health regeneration
  if (player.health < player.maxHealth) {
    player.regenTimer += dt;
    if (player.regenTimer > 4.0) { player.regenTimer = 0; player.health++; renderHeartsUI(); }
  }

  // 1st-person hand bobbing, shield block pose & 3D arm+item attack/swing animation
  if (moveMag > 0.1 && (player.onGround || player.flying)) player.bobTime += dt * speed * moveMag * 1.6;
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
  const av = playerAvatar.userData, limbSwing = moveMag > 0.08 ? Math.sin(player.bobTime * 1.2) * 0.65 : 0;
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
  document.getElementById('water-overlay').style.display = headBlock === BLOCK.WATER ? 'block' : 'none';
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
  const duration = Math.max(0.05, def.hardness / speedMult);

  mineProgress += dt / duration;
  player.swingTime = (player.swingTime > 0.05) ? player.swingTime : 1.0;

  mineHitTimer += dt;
  if (mineHitTimer > 0.16) {
    mineHitTimer = 0; sfx.play('hit');
    spawnBlockParticles(currentHit.x, currentHit.y, currentHit.z, currentHit.block, 3);
  }

  if (mineProgress >= 1.0) {
    const brokenId = currentHit.block;
    if (setVoxelGlobal(currentHit.x, currentHit.y, currentHit.z, BLOCK.AIR)) {
      sfx.play(brokenId === BLOCK.AMETHYST ? 'chime' : 'break');
      spawnBlockParticles(currentHit.x, currentHit.y, currentHit.z, brokenId, 18);
      spawnItemDrop(currentHit.x, currentHit.y, currentHit.z, brokenId, 1);
    }
    mineProgress = 0; mineTargetKey = '';
    crackBox.visible = false; mineBarWrap.style.display = 'none';
  } else {
    const stage = Math.min(7, Math.floor(mineProgress * 8));
    crackMat.map = crackTextures[stage]; crackMat.needsUpdate = true;
    crackBox.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
    crackBox.visible = def.shape === 'cube';
    mineBarWrap.style.display = 'block';
    mineBarEl.style.width = `${Math.min(100, mineProgress * 100)}%`;
  }
}

// ============================================================================
// 11. STREAMING CHUNK MANAGER
// ============================================================================
let lastPlayerChunkX = null, lastPlayerChunkZ = null;

function updateChunkStreaming() {
  const pcx = Math.floor(player.x / CHUNK_SIZE), pcz = Math.floor(player.z / CHUNK_SIZE);

  if (pcx !== lastPlayerChunkX || pcz !== lastPlayerChunkZ || buildQueue.length === 0) {
    lastPlayerChunkX = pcx; lastPlayerChunkZ = pcz;
    const maxDistSq = (renderDistance + 0.5) * (renderDistance + 0.5);

    for (let i = buildQueue.length - 1; i >= 0; i--) {
      const qCh = buildQueue[i], qdx = qCh.cx - pcx, qdz = qCh.cz - pcz;
      if (qdx * qdx + qdz * qdz > maxDistSq) { qCh.queued = false; buildQueue.splice(i, 1); }
    }

    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        if (dx * dx + dz * dz > maxDistSq) continue;
        const ch = getChunkData(pcx + dx, pcz + dz);
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
        if (ch.solidMesh) { scene.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
        if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
        chunks.delete(key);
      }
    }
  }

  const budgetStart = performance.now();
  while (buildQueue.length > 0 && (performance.now() - budgetStart) < 4.5) {
    const nextCh = buildQueue[0];
    if (!chunks.has(chunkKey(nextCh.cx, nextCh.cz))) { buildQueue.shift(); continue; }
    const dx = nextCh.cx - pcx, dz = nextCh.cz - pcz;
    if (meshWorker && (dx * dx + dz * dz) > 2) {
      if (workerJobsInFlight >= 8) break;
      buildQueue.shift(); requestChunkMeshWorker(nextCh.cx, nextCh.cz);
    } else {
      buildQueue.shift(); rebuildChunkImmediate(nextCh.cx, nextCh.cz);
    }
  }
}
