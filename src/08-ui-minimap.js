// VoxelCraft HTML5 — 08-ui-minimap.js (12. UI, HOTBAR, INVENTORY/CRAFTING MODAL, SEED/BIOME TELEPORT & 2D MINIMAP)
'use strict';

// ============================================================================
// 12. UI, HOTBAR, INVENTORY MODAL & INPUTS
// ============================================================================
const hotbarEl = document.getElementById('hotbar');
const blockLabelEl = document.getElementById('block-label');
const invModalEl = document.getElementById('inventory-modal');
const invGridEl = document.getElementById('inv-grid');
const craftGridEl = document.getElementById('craft-grid');
const btnModeToggleEl = document.getElementById('btn-mode-toggle');
const tbtnModeEl = document.getElementById('tbtn-mode');

function drawItemIcon(canvas, itemId) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  if (itemId === BLOCK.TOOL_PICKAXE) {
    // Draw pixel-art Diamond Pickaxe icon
    ctx.fillStyle = '#7a542e';
    for (let i = 2; i <= 12; i++) ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#5decf5';
    ctx.fillRect(8, 2, 6, 2);
    ctx.fillRect(12, 4, 2, 4);
    ctx.fillRect(7, 3, 2, 2);
  } else if (itemId === BLOCK.TOOL_SWORD) {
    // Draw pixel-art Diamond Sword icon
    ctx.fillStyle = '#7a542e';
    ctx.fillRect(2, 12, 3, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(4, 9, 4, 2);
    ctx.fillStyle = '#38bdf8';
    for (let i = 5; i <= 13; i++) ctx.fillRect(i, 15 - i, 2, 2);
  } else if (itemId === BLOCK.TOOL_BOW) {
    // Draw pixel-art Bow & Arrow icon
    ctx.fillStyle = '#cbd5e1';
    for (let y = 3; y <= 13; y++) ctx.fillRect(4, y, 1, 1);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(5, 2, 4, 2);
    ctx.fillRect(9, 4, 2, 8);
    ctx.fillRect(5, 12, 4, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(3, 7, 10, 2);
  } else if (itemId === BLOCK.ITEM_APPLE) {
    // Draw pixel-art Healing Apple icon
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(8, 2, 3, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(4, 4, 8, 9);
    ctx.fillRect(3, 5, 10, 7);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(5, 5, 2, 2);
  } else if (itemId === BLOCK.ITEM_BREAD) {
    // Draw pixel-art Baked Bread Loaf icon (+5 Hearts)
    ctx.fillStyle = '#92400e';
    ctx.fillRect(2, 6, 12, 6);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(4, 6, 8, 3);
  } else {
    const def = BLOCK_DEFS[itemId];
    const tileIndex = def.tiles[2];
    ctx.drawImage(atlasCanvas, tileIndex * TILE_PX, 0, TILE_PX, TILE_PX, 0, 0, 16, 16);
  }
}

function formatItemCountBadge(itemId) {
  if (
    itemId === BLOCK.TOOL_PICKAXE ||
    itemId === BLOCK.TOOL_SWORD ||
    itemId === BLOCK.TOOL_BOW ||
    gameMode === 'creative'
  ) {
    return '∞';
  }
  return `${inventoryCounts[itemId] || 0}`;
}

function canCraftRecipe(recipeIdx) {
  const rec = CRAFTING_RECIPES[recipeIdx];
  if (!rec) return false;
  if (gameMode === 'creative') return true;
  for (const ing of rec.ingredients) {
    if ((inventoryCounts[ing.id] || 0) < ing.count) return false;
  }
  return true;
}

function craftRecipe(recipeIdx) {
  const rec = CRAFTING_RECIPES[recipeIdx];
  if (!rec || !canCraftRecipe(recipeIdx)) return false;
  if (gameMode === 'survival') {
    for (const ing of rec.ingredients) {
      inventoryCounts[ing.id] -= ing.count;
    }
  }
  inventoryCounts[rec.outId] = (inventoryCounts[rec.outId] || 0) + rec.outCount;
  sfx.play('craft');
  refreshInventoryCountsUI();
  return true;
}

function buildCraftingUI() {
  if (!craftGridEl) return;
  craftGridEl.innerHTML = '';
  CRAFTING_RECIPES.forEach((rec, idx) => {
    const craftable = canCraftRecipe(idx);
    const card = document.createElement('div');
    card.className = 'craft-item ' + (craftable ? 'craftable' : 'locked');

    const icon = document.createElement('canvas');
    icon.width = 16;
    icon.height = 16;
    drawItemIcon(icon, rec.outId);

    const info = document.createElement('div');
    info.className = 'craft-info';
    const costStr = rec.ingredients
      .map(ing => `${ing.count}× ${BLOCK_DEFS[ing.id].name} (tienes ${gameMode === 'creative' ? '∞' : (inventoryCounts[ing.id] || 0)})`)
      .join(' + ');
    info.innerHTML = `
      <div class="craft-title">${rec.name}</div>
      <div class="craft-cost">Requiere: ${costStr}</div>
    `;

    card.appendChild(icon);
    card.appendChild(info);

    const onCraft = (e) => {
      e.preventDefault();
      e.stopPropagation();
      craftRecipe(idx);
    };
    card.addEventListener('click', onCraft);
    card.addEventListener('touchend', onCraft, { passive: false });
    craftGridEl.appendChild(card);
  });
}

function buildHotbarUI() {
  hotbarEl.innerHTML = '';
  hotbarSlots.forEach((bId, idx) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (idx === selectedSlot ? ' active' : '');
    slot.innerHTML = `<span class="key">${idx + 1}</span><span class="count">${formatItemCountBadge(bId)}</span>`;

    const icon = document.createElement('canvas');
    icon.width = 16;
    icon.height = 16;
    drawItemIcon(icon, bId);

    slot.appendChild(icon);
    slot.addEventListener('click', () => updateHotbarSelection(idx));
    slot.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateHotbarSelection(idx);
    }, { passive: false });
    hotbarEl.appendChild(slot);
  });
  updateHotbarSelection(selectedSlot);
}

function buildInventoryModal() {
  invGridEl.innerHTML = '';
  ALL_INVENTORY_ITEMS.forEach((bId) => {
    const def = BLOCK_DEFS[bId];
    const card = document.createElement('div');
    card.className = 'inv-item';
    const badge = document.createElement('div');
    badge.className = 'count';
    badge.textContent = formatItemCountBadge(bId);

    const icon = document.createElement('canvas');
    icon.width = 16;
    icon.height = 16;
    drawItemIcon(icon, bId);
    const lbl = document.createElement('span');
    lbl.textContent = def.name;
    card.appendChild(badge);
    card.appendChild(icon);
    card.appendChild(lbl);

    const selectItem = (e) => {
      e.preventDefault();
      hotbarSlots[selectedSlot] = bId;
      buildHotbarUI();
      toggleInventory(false);
    };
    card.addEventListener('click', selectItem);
    card.addEventListener('touchend', selectItem, { passive: false });
    invGridEl.appendChild(card);
  });
  buildCraftingUI();
}

function refreshInventoryCountsUI() {
  buildHotbarUI();
  if (invOpen) {
    buildInventoryModal();
  }
  const isCreative = gameMode === 'creative';
  if (btnModeToggleEl) {
    btnModeToggleEl.textContent = `Modo: ${isCreative ? 'Creativo (∞)' : 'Supervivencia'} (G)`;
  }
  if (tbtnModeEl) {
    tbtnModeEl.textContent = isCreative ? '⚒ Creat.' : '⚒ Superv.';
    tbtnModeEl.classList.toggle('toggled', isCreative);
  }
}

function toggleGameMode(forceMode) {
  if (forceMode === 'survival' || forceMode === 'creative') {
    gameMode = forceMode;
  } else {
    gameMode = gameMode === 'survival' ? 'creative' : 'survival';
  }
  refreshInventoryCountsUI();
}

if (btnModeToggleEl) {
  btnModeToggleEl.addEventListener('click', (e) => {
    e.preventDefault();
    toggleGameMode();
  });
}

const touchControlsEl = document.getElementById('touch-controls');

window.addEventListener('touchstart', () => {
  if (!isTouchMode) {
    isTouchMode = true;
    btnPlay.textContent = 'Jugar (Controles Táctiles)';
  }
}, { once: true, passive: true });

function startGameplay() {
  sfx.init();
  invOpen = false;
  menuOpen = false;
  invModalEl.classList.add('hidden');
  overlayEl.classList.add('hidden');
  if (isTouchMode || !canvasEl.requestPointerLock) {
    touchPlaying = true;
    touchControlsEl.classList.add('active');
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    try {
      const lockPromise = canvasEl.requestPointerLock();
      if (lockPromise && typeof lockPromise.catch === 'function') lockPromise.catch(() => {});
    } catch (_) {}
  }
}

function togglePauseMenu(forceOpen) {
  const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !menuOpen;
  if (nextOpen) {
    menuOpen = true;
    isMiningHeld = false;
    invOpen = false;
    invModalEl.classList.add('hidden');
    overlayEl.classList.remove('hidden');
    if (touchPlaying) {
      touchPlaying = false;
      resetJoystick();
    }
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (_) {}
    }
  } else {
    startGameplay();
  }
  return menuOpen;
}

function toggleInventory(force) {
  invOpen = typeof force === 'boolean' ? force : !invOpen;
  invModalEl.classList.toggle('hidden', !invOpen);
  if (invOpen) {
    isMiningHeld = false;
    buildInventoryModal();
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    startGameplay();
  }
}

function toggleDayNight() {
  isNight = !isNight;
  sunFactor = isNight ? 0.16 : 1.0;
  const target = isNight ? skyColorNight : skyColorDay;
  scene.background.copy(target);
  scene.fog.color.copy(target);
  markAllChunksDirtyForRelight();
}

function toggleFlyingMode() {
  player.flying = !player.flying;
  player.vy = 0;
  document.getElementById('tbtn-fly').classList.toggle('toggled', player.flying);
}

function placeBlockAtCurrentTarget() {
  const bId = hotbarSlots[selectedSlot];

  // Consumable Apple, Bread, or Bow can be used even without pointing at a nearby block
  if (bId === BLOCK.ITEM_APPLE || bId === BLOCK.ITEM_BREAD) {
    return eatHeldApple(bId);
  }
  if (bId === BLOCK.TOOL_BOW) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    shootArrow(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z);
    player.swingTime = 1.0;
    return true;
  }

  if (!currentHit) return false;

  // Interacting with a placed Redstone Lever flips its state!
  if (currentHit.block === BLOCK.LEVER_OFF || currentHit.block === BLOCK.LEVER_ON) {
    toggleVoxelLever(currentHit.x, currentHit.y, currentHit.z);
    player.swingTime = 1.0;
    return true;
  }

  // Interacting with a Mechanical Door opens or closes it!
  if (currentHit.block === BLOCK.DOOR_CLOSED || currentHit.block === BLOCK.DOOR_OPEN) {
    toggleVoxelDoor(currentHit.x, currentHit.y, currentHit.z);
    player.swingTime = 1.0;
    return true;
  }

  if (bId === BLOCK.TOOL_PICKAXE || bId === BLOCK.TOOL_SWORD) return false;
  if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;

  const isReplaceable = currentHit.block === BLOCK.TALL_GRASS;
  const px = isReplaceable ? currentHit.x : currentHit.x + currentHit.nx;
  const py = isReplaceable ? currentHit.y : currentHit.y + currentHit.ny;
  const pz = isReplaceable ? currentHit.z : currentHit.z + currentHit.nz;

  const placeDef = BLOCK_DEFS[bId];
  const minX = player.x - player.radius;
  const maxX = player.x + player.radius;
  const minY = player.y;
  const maxY = player.y + player.height;
  const minZ = player.z - player.radius;
  const maxZ = player.z + player.radius;

  const overlapsPlayer = placeDef.solid && (
    px + 1 > minX && px < maxX &&
    py + 1 > minY && py < maxY &&
    pz + 1 > minZ && pz < maxZ
  );

  if (!overlapsPlayer) {
    let actualPlaceId = bId;
    if (bId === BLOCK.REDSTONE_LAMP_OFF || bId === BLOCK.DOOR_CLOSED) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 4 && getVoxelGlobal(px + dx, py + dy, pz + dz) === BLOCK.LEVER_ON) {
              actualPlaceId = (bId === BLOCK.REDSTONE_LAMP_OFF) ? BLOCK.REDSTONE_LAMP_ON : BLOCK.DOOR_OPEN;
            }
          }
        }
      }
    }
    if (setVoxelGlobal(px, py, pz, actualPlaceId)) {
      if (gameMode === 'survival') {
        inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
        refreshInventoryCountsUI();
      }
      player.swingTime = 1.0;
      sfx.play('place');
      return true;
    }
  }
  return false;
}

function updateHotbarSelection(idx) {
  selectedSlot = (idx + hotbarSlots.length) % hotbarSlots.length;
  const slots = hotbarEl.querySelectorAll('.slot');
  slots.forEach((s, i) => s.classList.toggle('active', i === selectedSlot));
  const bId = hotbarSlots[selectedSlot];
  const badge = formatItemCountBadge(bId);
  blockLabelEl.textContent = `${selectedSlot + 1}. ${BLOCK_DEFS[bId].name} (${badge})`;
  updateHeldItemVisual();
}

buildHotbarUI();
buildInventoryModal();

const overlayEl = document.getElementById('overlay');
const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset-world');
const btnExport = document.getElementById('btn-export');
const rngDist = document.getElementById('rng-dist');
const lblDist = document.getElementById('lbl-dist');
const rngFov = document.getElementById('rng-fov');
const lblFov = document.getElementById('lbl-fov');

if (isTouchMode) {
  btnPlay.textContent = 'Jugar (Controles Táctiles)';
}

btnPlay.addEventListener('click', startGameplay);

document.addEventListener('pointerlockchange', () => {
  const wasLocked = isLocked;
  isLocked = document.pointerLockElement === canvasEl;
  if (!isLocked) {
    isMiningHeld = false;
    if (wasLocked && !invOpen && !touchPlaying) {
      menuOpen = true;
      lastPointerLockExitTime = performance.now();
      overlayEl.classList.remove('hidden');
    }
  } else {
    menuOpen = false;
    overlayEl.classList.add('hidden');
  }
});

rngDist.addEventListener('input', (e) => {
  renderDistance = parseInt(e.target.value, 10);
  lblDist.textContent = `${renderDistance} chunks`;
  lastPlayerChunkX = null;
  scene.fog.density = 0.055 / renderDistance;
});

rngFov.addEventListener('input', (e) => {
  baseFov = parseInt(e.target.value, 10);
  lblFov.textContent = `${baseFov}°`;
  if (!isZoomed) {
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }
});

function markAllChunksDirtyForRelight() {
  for (const ch of chunks.values()) {
    ch.dirty = true;
    ch.queued = false;
    ch.meshVersion = (ch.meshVersion || 0) + 1;
  }
  buildQueue.length = 0;
  lastPlayerChunkX = null;
}

function applyWorldSeed(newSeed) {
  const parsed = Number(newSeed);
  worldSeed = (!Number.isNaN(parsed) && parsed > 0) ? Math.floor(parsed) : Math.floor(Math.random() * 999999);
  worldDeltas = {};
  saveWorldData();
  generator = createWorldGenerator(worldSeed);

  for (const ch of chunks.values()) {
    if (ch.solidMesh) { scene.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
    if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
  }
  chunks.clear();
  buildQueue.length = 0;
  simQueue.clear();
  while (mobs.length > 0) removeMobAt(0);
  for (const t of activeTNTs) scene.remove(t.mesh);
  activeTNTs.length = 0;
  lastPlayerChunkX = null;

  player.x = 8.5;
  player.z = 8.5;
  player.y = findSpawnHeight(player.x, player.z);
  player.health = player.maxHealth;
  renderHeartsUI();
  const seedInputEl = document.getElementById('seed-input');
  if (seedInputEl) seedInputEl.value = `${worldSeed}`;
  return worldSeed;
}

function teleportToBiome(targetBiome) {
  // Spiral search outward in steps of 16 blocks until matching biome is found
  for (let radius = 0; radius <= 180; radius++) {
    for (let step = 0; step < Math.max(1, radius * 8); step++) {
      const angle = (step / Math.max(1, radius * 8)) * Math.PI * 2;
      const wx = Math.floor(8 + Math.cos(angle) * radius * 16);
      const wz = Math.floor(8 + Math.sin(angle) * radius * 16);
      if (generator.getBiomeAt(wx, wz) === targetBiome) {
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        getChunkData(cx, cz);
        rebuildChunkImmediate(cx, cz);
        player.x = wx + 0.5;
        player.z = wz + 0.5;
        player.y = findSpawnHeight(player.x, player.z);
        player.vx = 0; player.vy = 0; player.vz = 0;
        lastPlayerChunkX = null;
        updateMinimap(0, true);
        return { x: player.x, y: player.y, z: player.z, biome: targetBiome };
      }
    }
  }
  return null;
}

// ============================================================================
// 12A-2. REAL-TIME 2D TOPOGRAPHIC RADAR MINIMAP (10 Hz, ZERO GC)
// ============================================================================
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d', { willReadFrequently: true });
const MAP_SIZE = 68;
const minimapImgData = minimapCtx.createImageData(MAP_SIZE, MAP_SIZE);
const minimapPixels32 = new Uint32Array(minimapImgData.data.buffer);
const EMPTY_MAP_PIXEL = (255 << 24) | (42 << 16) | (23 << 8) | 15;
let minimapAccum = 0;
let minimapUpdatesCount = 0;

function updateMinimap(dt, forceRender = false) {
  minimapAccum += dt;
  if (!forceRender && minimapAccum < 0.10) return false;
  minimapAccum = 0;
  minimapUpdatesCount++;

  const px = Math.floor(player.x);
  const pz = Math.floor(player.z);
  const half = MAP_SIZE >> 1;

  for (let mz = 0; mz < MAP_SIZE; mz++) {
    const wz = pz + (mz - half);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const lz = wz - cz * CHUNK_SIZE;
    const rowOff = mz * MAP_SIZE;
    let cachedCx = 999999;
    let cachedColors = null;

    for (let mx = 0; mx < MAP_SIZE; mx++) {
      const wx = px + (mx - half);
      const cx = Math.floor(wx / CHUNK_SIZE);
      if (cx !== cachedCx) {
        cachedCx = cx;
        const ch = chunks.get(`${cx},${cz}`);
        if (ch && !ch.mapColors) computeChunkLighting(ch, getChunkIfLoaded);
        cachedColors = ch ? ch.mapColors : null;
      }
      const lx = wx - cx * CHUNK_SIZE;
      minimapPixels32[rowOff + mx] = cachedColors ? cachedColors[lz * CHUNK_SIZE + lx] : EMPTY_MAP_PIXEL;
    }
  }

  minimapCtx.putImageData(minimapImgData, 0, 0);

  // Draw nearby Mobs on Radar (Red = Zombie, White = Sheep/Pig)
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    const rx = Math.round(half + (m.x - player.x));
    const rz = Math.round(half + (m.z - player.z));
    if (rx >= 1 && rx < MAP_SIZE - 1 && rz >= 1 && rz < MAP_SIZE - 1) {
      minimapCtx.fillStyle = m.type === 'zombie' ? '#ef4444' : '#f8fafc';
      minimapCtx.fillRect(rx - 1, rz - 1, 3, 3);
    }
  }

  // Draw Player center marker & look direction line
  minimapCtx.strokeStyle = '#38bdf8';
  minimapCtx.lineWidth = 1.5;
  minimapCtx.beginPath();
  minimapCtx.moveTo(half, half);
  minimapCtx.lineTo(half - Math.sin(player.yaw) * 8, half - Math.cos(player.yaw) * 8);
  minimapCtx.stroke();

  minimapCtx.fillStyle = '#facc15';
  minimapCtx.fillRect(half - 1, half - 1, 3, 3);
  return true;
}

btnReset.addEventListener('click', () => {
  applyWorldSeed(Math.floor(Math.random() * 999999));
  startGameplay();
});

const btnApplySeed = document.getElementById('btn-apply-seed');
const seedInputEl = document.getElementById('seed-input');
if (seedInputEl) seedInputEl.value = `${worldSeed}`;
if (btnApplySeed) {
  btnApplySeed.addEventListener('click', () => {
    const val = seedInputEl ? parseInt(seedInputEl.value, 10) : 0;
    applyWorldSeed(val);
    startGameplay();
  });
}
const btnTpDesert = document.getElementById('btn-tp-desert');
if (btnTpDesert) {
  btnTpDesert.addEventListener('click', () => {
    teleportToBiome('Desierto');
    startGameplay();
  });
}
const btnTpSnow = document.getElementById('btn-tp-snow');
if (btnTpSnow) {
  btnTpSnow.addEventListener('click', () => {
    teleportToBiome('Taiga Nevada');
    startGameplay();
  });
}

btnExport.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ seed: worldSeed, deltas: worldDeltas }, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voxelcraft_world_${worldSeed}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
