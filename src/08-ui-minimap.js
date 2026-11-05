// VoxelCraft HTML5 — 08-ui-minimap.js (12. UI, HOTBAR, INVENTORY/CRAFTING, SCREENSHOTS, SEED/BIOME TELEPORT & 2D MINIMAP)
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
  if (!itemId || itemId === BLOCK.AIR) return;
  if (itemId === BLOCK.TOOL_PICKAXE) {
    ctx.fillStyle = '#7a542e'; for (let i = 2; i <= 12; i++) ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#5decf5'; ctx.fillRect(8, 2, 6, 2); ctx.fillRect(12, 4, 2, 4); ctx.fillRect(7, 3, 2, 2);
  } else if (itemId === BLOCK.TOOL_SWORD) {
    ctx.fillStyle = '#7a542e'; ctx.fillRect(2, 12, 3, 3);
    ctx.fillStyle = '#facc15'; ctx.fillRect(4, 9, 4, 2);
    ctx.fillStyle = '#38bdf8'; for (let i = 5; i <= 13; i++) ctx.fillRect(i, 15 - i, 2, 2);
  } else if (itemId === BLOCK.TOOL_BOW) {
    ctx.fillStyle = '#cbd5e1'; for (let y = 3; y <= 13; y++) ctx.fillRect(4, y, 1, 1);
    ctx.fillStyle = '#92400e'; ctx.fillRect(5, 2, 4, 2); ctx.fillRect(9, 4, 2, 8); ctx.fillRect(5, 12, 4, 2);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(3, 7, 10, 2);
  } else if (itemId === BLOCK.ITEM_APPLE) {
    ctx.fillStyle = '#22c55e'; ctx.fillRect(8, 2, 3, 2);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(4, 4, 8, 9); ctx.fillRect(3, 5, 10, 7);
    ctx.fillStyle = '#fca5a5'; ctx.fillRect(5, 5, 2, 2);
  } else if (itemId === BLOCK.ITEM_BREAD) {
    ctx.fillStyle = '#92400e'; ctx.fillRect(2, 6, 12, 6);
    ctx.fillStyle = '#d97706'; ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, 6, 8, 3);
  } else if (itemId === BLOCK.ITEM_MINECART) {
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(2, 5, 12, 6);
    ctx.fillStyle = '#475569'; ctx.fillRect(4, 6, 8, 3);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(3, 11, 3, 3); ctx.fillRect(10, 11, 3, 3);
  } else if (itemId === BLOCK.ITEM_BOAT) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(1, 8, 14, 5);
    ctx.fillStyle = '#d97706'; ctx.fillRect(3, 7, 10, 4);
    ctx.fillStyle = '#fcd34d'; ctx.fillRect(6, 3, 2, 6); ctx.fillRect(9, 3, 2, 6);
  } else if (itemId === BLOCK.TOOL_GRAPPLING_HOOK) {
    ctx.fillStyle = '#cbd5e1'; for (let i = 2; i <= 11; i++) ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#c084fc'; ctx.fillRect(9, 2, 5, 2); ctx.fillRect(12, 4, 2, 4); ctx.fillRect(7, 4, 3, 2);
  } else {
    const def = BLOCK_DEFS[itemId];
    const tileIndex = def.tiles[2];
    ctx.drawImage(atlasCanvas, tileIndex * TILE_PX, 0, TILE_PX, TILE_PX, 0, 0, 16, 16);
  }
}

function formatItemCountBadge(itemId) {
  if (!itemId || itemId === BLOCK.AIR) return '';
  if (gameMode === 'creative') return '∞';
  const count = inventoryCounts[itemId] || 0;
  if ((itemId >= 100 && itemId <= 102) || itemId === BLOCK.TOOL_GRAPPLING_HOOK) return count > 0 ? '∞' : '0';
  return `${count}`;
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
  autoEquipToHotbar(rec.outId);
  saveWorldData();
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
    icon.width = 16; icon.height = 16;
    drawItemIcon(icon, rec.outId);

    const info = document.createElement('div');
    info.className = 'craft-info';
    const costStr = rec.ingredients
      .map(ing => `${ing.count}× ${BLOCK_DEFS[ing.id].name} (tienes ${gameMode === 'creative' ? '∞' : (inventoryCounts[ing.id] || 0)})`)
      .join(' + ');
    info.innerHTML = `<div class="craft-title">${rec.name}</div><div class="craft-cost">Requiere: ${costStr}</div>`;

    card.appendChild(icon);
    card.appendChild(info);

    const onCraft = (e) => { e.preventDefault(); e.stopPropagation(); craftRecipe(idx); };
    card.addEventListener('click', onCraft);
    card.addEventListener('touchend', onCraft, { passive: false });
    craftGridEl.appendChild(card);
  });
}

function buildHotbarUI() {
  hotbarEl.innerHTML = '';
  hotbarSlots.forEach((rawId, idx) => {
    const bId = (gameMode === 'survival' && (inventoryCounts[rawId] || 0) <= 0) ? BLOCK.AIR : (rawId || BLOCK.AIR);
    const slot = document.createElement('div');
    slot.className = 'slot' + (idx === selectedSlot ? ' active' : '');
    slot.innerHTML = `<span class="key">${idx + 1}</span><span class="count">${formatItemCountBadge(bId)}</span>`;

    const icon = document.createElement('canvas');
    icon.width = 16; icon.height = 16;
    drawItemIcon(icon, bId);

    slot.appendChild(icon);
    slot.addEventListener('click', () => updateHotbarSelection(selectedSlot === idx ? -1 : idx));
    slot.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      updateHotbarSelection(selectedSlot === idx ? -1 : idx);
    }, { passive: false });
    hotbarEl.appendChild(slot);
  });
  updateHotbarSelection(selectedSlot);
}

const WAYPOINT_COLORS = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#38bdf8', '#ec4899'];
const waypointGridEl = document.getElementById('waypoint-grid');
const btnAddWaypointEl = document.getElementById('btn-add-waypoint');

function addWaypoint(customName) {
  const biome = generator.getBiomeAt(player.x, player.z);
  const wp = {
    name: customName || `Baliza #${waypoints.length + 1} (${biome})`,
    x: Math.round(player.x),
    y: Math.round(player.y),
    z: Math.round(player.z),
    color: WAYPOINT_COLORS[waypoints.length % WAYPOINT_COLORS.length]
  };
  waypoints.push(wp);
  sfx.play('waypoint');
  saveWorldData();
  buildWaypointsUI();
  updateMinimap(0, true);
  if (blockLabelEl) blockLabelEl.textContent = `📍 ${wp.name} guardada en (${wp.x}, ${wp.y}, ${wp.z})`;
  return wp;
}

function removeWaypoint(idx) {
  if (idx < 0 || idx >= waypoints.length) return false;
  waypoints.splice(idx, 1);
  saveWorldData();
  buildWaypointsUI();
  updateMinimap(0, true);
  return true;
}

function teleportToWaypoint(idx) {
  const wp = waypoints[idx];
  if (!wp) return null;
  if (ridingCart) toggleRideMinecart();
  if (ridingBoat) toggleRideBoat();
  const cx = Math.floor(wp.x / CHUNK_SIZE), cz = Math.floor(wp.z / CHUNK_SIZE);
  getChunkData(cx, cz);
  rebuildChunkImmediate(cx, cz);
  player.x = wp.x + 0.5;
  player.z = wp.z + 0.5;
  player.y = Math.max(wp.y, findSpawnHeight(player.x, player.z));
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  lastPlayerChunkX = null;
  sfx.play('waypoint');
  updateMinimap(0, true);
  if (invOpen) toggleInventory(false);
  return wp;
}

function buildWaypointsUI() {
  if (!waypointGridEl) return;
  waypointGridEl.innerHTML = '';
  waypoints.forEach((wp, idx) => {
    const dist = Math.round(Math.hypot(wp.x - player.x, wp.z - player.z));
    const card = document.createElement('div');
    card.className = 'craft-item craftable';
    card.innerHTML = `
      <div style="width:18px;height:18px;border-radius:50%;background:${wp.color};border:2px solid #fff;flex-shrink:0;"></div>
      <div class="craft-info" style="flex:1;">
        <div class="craft-title">${wp.name}</div>
        <div class="craft-cost">Coords: (${wp.x}, ${wp.y}, ${wp.z}) • Distancia: ${dist}m — Clic para Teletransportar</div>
      </div>
    `;
    const onTp = (e) => { e.preventDefault(); e.stopPropagation(); teleportToWaypoint(idx); };
    card.addEventListener('click', onTp);
    card.addEventListener('touchend', onTp, { passive: false });
    waypointGridEl.appendChild(card);
  });
}

if (btnAddWaypointEl) {
  btnAddWaypointEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addWaypoint(); });
}

function buildInventoryModal() {
  invGridEl.innerHTML = '';
  ALL_INVENTORY_ITEMS.forEach((bId) => {
    const def = BLOCK_DEFS[bId];
    const hasItem = gameMode === 'creative' || (inventoryCounts[bId] || 0) > 0;
    const card = document.createElement('div');
    card.className = 'inv-item';
    if (!hasItem) card.style.opacity = '0.42';
    const badge = document.createElement('div');
    badge.className = 'count';
    badge.textContent = formatItemCountBadge(bId);

    const icon = document.createElement('canvas');
    icon.width = 16; icon.height = 16;
    drawItemIcon(icon, bId);
    const lbl = document.createElement('span');
    lbl.textContent = def.name;
    card.appendChild(badge);
    card.appendChild(icon);
    card.appendChild(lbl);

    const selectItem = (e) => {
      e.preventDefault();
      if (selectedSlot < 0) selectedSlot = 0;
      hotbarSlots[selectedSlot] = (hasItem && hotbarSlots[selectedSlot] !== bId) ? bId : BLOCK.AIR;
      saveWorldData();
      buildHotbarUI();
      toggleInventory(false);
    };
    card.addEventListener('click', selectItem);
    card.addEventListener('touchend', selectItem, { passive: false });
    invGridEl.appendChild(card);
  });
  buildWaypointsUI();
  buildCraftingUI();
}

function refreshInventoryCountsUI() {
  buildHotbarUI();
  if (invOpen) buildInventoryModal();
  const isCreative = gameMode === 'creative';
  if (btnModeToggleEl) btnModeToggleEl.textContent = `Modo: ${isCreative ? 'Creativo (∞)' : 'Supervivencia'} (G)`;
  if (tbtnModeEl) {
    tbtnModeEl.textContent = isCreative ? '⚒ Creat.' : '⚒ Superv.';
    tbtnModeEl.classList.toggle('toggled', isCreative);
  }
}

function toggleGameMode(forceMode) {
  if (forceMode === 'survival' || forceMode === 'creative') gameMode = forceMode;
  else gameMode = gameMode === 'survival' ? 'creative' : 'survival';
  refreshInventoryCountsUI();
}

if (btnModeToggleEl) {
  btnModeToggleEl.addEventListener('click', (e) => { e.preventDefault(); toggleGameMode(); });
}

// ============================================================================
// 12A-0. SCREENSHOT / PHOTO MODE (F2 / KeyK / 📷)
// ============================================================================
let screenshotsTakenCount = 0;
let lastScreenshotDataUrl = '';

function takeGameScreenshot(skipDownload = false) {
  renderer.render(scene, camera);
  try {
    lastScreenshotDataUrl = canvasEl.toDataURL('image/png');
  } catch (_) {
    lastScreenshotDataUrl = 'data:image/png;base64,';
  }
  screenshotsTakenCount++;
  sfx.play('shutter');
  if (blockLabelEl) {
    blockLabelEl.textContent = `📷 ¡Captura #${screenshotsTakenCount} guardada! (${canvasEl.width}×${canvasEl.height}px)`;
  }
  if (!skipDownload && lastScreenshotDataUrl.length > 32) {
    const a = document.createElement('a');
    a.href = lastScreenshotDataUrl;
    a.download = `voxelcraft_foto_${worldSeed}_${screenshotsTakenCount}.png`;
    a.click();
  }
  return lastScreenshotDataUrl;
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
  chestOpen = false;
  menuOpen = false;
  invModalEl.classList.add('hidden');
  const cm = document.getElementById('chest-modal');
  if (cm) cm.classList.add('hidden');
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
    chestOpen = false;
    invModalEl.classList.add('hidden');
    const cm = document.getElementById('chest-modal');
    if (cm) cm.classList.add('hidden');
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
  if (invOpen) {
    chestOpen = false;
    const cm = document.getElementById('chest-modal');
    if (cm) cm.classList.add('hidden');
  }
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
  setTimeOfDay(isNight ? Math.PI : 0.25);
}

function toggleFlyingMode() {
  player.flying = !player.flying;
  player.vy = 0;
  document.getElementById('tbtn-fly').classList.toggle('toggled', player.flying);
}

function placeBlockAtCurrentTarget() {
  const bId = getActiveHeldItem();

  // 1. Always prioritize interacting with targeted interactive world blocks (Chest, Lever, Door, Trapdoor, Portal, Obsidian)
  if (currentHit) {
    if (currentHit.block === BLOCK.PORTAL) {
      useVoxelPortal(currentHit.x, currentHit.y, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
    if (currentHit.block === BLOCK.OBSIDIAN && (bId === BLOCK.AMETHYST || bId === BLOCK.TORCH)) {
      activateObsidianPortal(currentHit.x, currentHit.y + 1, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
    if (currentHit.block === BLOCK.LEVER_OFF || currentHit.block === BLOCK.LEVER_ON) {
      toggleVoxelLever(currentHit.x, currentHit.y, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
    if (currentHit.block === BLOCK.DOOR_CLOSED || currentHit.block === BLOCK.DOOR_OPEN) {
      toggleVoxelDoor(currentHit.x, currentHit.y, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
    if (currentHit.block === BLOCK.TRAPDOOR_CLOSED || currentHit.block === BLOCK.TRAPDOOR_OPEN) {
      toggleVoxelTrapdoor(currentHit.x, currentHit.y, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
    if (currentHit.block === BLOCK.CHEST) {
      openVoxelChest(currentHit.x, currentHit.y, currentHit.z);
      player.swingTime = 1.0;
      return true;
    }
  }

  // 2. Consumable Apple, Bread, Bow, Grappling Hook or Sword Shield can be used without pointing at a nearby block
  if (bId === BLOCK.ITEM_APPLE || bId === BLOCK.ITEM_BREAD) {
    return eatHeldApple(bId);
  }
  if (bId === BLOCK.TOOL_BOW) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    shootArrow(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z);
    player.swingTime = 1.0;
    return true;
  }
  if (bId === BLOCK.TOOL_GRAPPLING_HOOK) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    shootGrappleHook(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z);
    player.swingTime = 1.0;
    return true;
  }
  if (bId === BLOCK.TOOL_SWORD) {
    toggleShieldBlock();
    return true;
  }

  if (!currentHit) return false;

  // Placing or mounting a Minecart
  if (bId === BLOCK.ITEM_MINECART) {
    if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;
    const ry = currentHit.block === BLOCK.RAIL ? currentHit.y : currentHit.y + currentHit.ny;
    const rx = currentHit.block === BLOCK.RAIL ? currentHit.x : currentHit.x + currentHit.nx;
    const rz = currentHit.block === BLOCK.RAIL ? currentHit.z : currentHit.z + currentHit.nz;
    const cart = spawnMinecart(rx, ry, rz);
    if (gameMode === 'survival') {
      inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
      refreshInventoryCountsUI();
    }
    toggleRideMinecart(cart);
    player.swingTime = 1.0;
    return true;
  }

  // Placing or mounting a Wooden Boat (Punto 21)
  if (bId === BLOCK.ITEM_BOAT) {
    if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;
    const bx = currentHit.x + currentHit.nx;
    const by = currentHit.y + currentHit.ny;
    const bz = currentHit.z + currentHit.nz;
    const boat = spawnBoat(bx, by, bz);
    if (gameMode === 'survival') {
      inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
      refreshInventoryCountsUI();
    }
    toggleRideBoat(boat);
    player.swingTime = 1.0;
    return true;
  }

  if (currentHit.block === BLOCK.RAIL && bId !== BLOCK.RAIL) {
    const cart = spawnMinecart(currentHit.x, currentHit.y, currentHit.z);
    toggleRideMinecart(cart);
    player.swingTime = 1.0;
    return true;
  }

  if (bId === BLOCK.AIR || bId === BLOCK.TOOL_PICKAXE) return false;
  if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;

  const isReplaceable = currentHit.block === BLOCK.TALL_GRASS;
  const px = isReplaceable ? currentHit.x : currentHit.x + currentHit.nx;
  const py = isReplaceable ? currentHit.y : currentHit.y + currentHit.ny;
  const pz = isReplaceable ? currentHit.z : currentHit.z + currentHit.nz;

  const placeDef = BLOCK_DEFS[bId];
  const minX = player.x - player.radius, maxX = player.x + player.radius;
  const minY = player.y, maxY = player.y + player.height;
  const minZ = player.z - player.radius, maxZ = player.z + player.radius;

  const overlapsPlayer = placeDef.solid && (
    px + 1 > minX && px < maxX &&
    py + 1 > minY && py < maxY &&
    pz + 1 > minZ && pz < maxZ
  );

  if (!overlapsPlayer) {
    let actualPlaceId = bId;
    if (bId === BLOCK.REDSTONE_LAMP_OFF || bId === BLOCK.DOOR_CLOSED || bId === BLOCK.TRAPDOOR_CLOSED) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 4 && getVoxelGlobal(px + dx, py + dy, pz + dz) === BLOCK.LEVER_ON) {
              actualPlaceId = (bId === BLOCK.REDSTONE_LAMP_OFF)
                ? BLOCK.REDSTONE_LAMP_ON
                : (bId === BLOCK.DOOR_CLOSED ? BLOCK.DOOR_OPEN : BLOCK.TRAPDOOR_OPEN);
            }
          }
        }
      }
    }
    if (setVoxelGlobal(px, py, pz, actualPlaceId)) {
      if (gameMode === 'survival') {
        inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
        if (inventoryCounts[bId] <= 0 && selectedSlot >= 0 && hotbarSlots[selectedSlot] === bId) hotbarSlots[selectedSlot] = BLOCK.AIR;
        saveWorldData();
        refreshInventoryCountsUI();
      }
      if (actualPlaceId === BLOCK.GLOWSTONE) trySummonIronGolem(px, py, pz);
      if (actualPlaceId === BLOCK.PORTAL) registerPortalAt(px, py, pz);
      player.swingTime = 1.0;
      sfx.play('place');
      return true;
    }
  }
  return false;
}

function updateHotbarSelection(idx) {
  if (idx === null || idx === -1) {
    selectedSlot = -1;
  } else {
    selectedSlot = ((idx % hotbarSlots.length) + hotbarSlots.length) % hotbarSlots.length;
  }
  const slots = hotbarEl.querySelectorAll('.slot');
  slots.forEach((s, i) => {
    s.classList.toggle('active', i === selectedSlot);
    const slotItem = (gameMode === 'survival' && (inventoryCounts[hotbarSlots[i]] || 0) <= 0) ? BLOCK.AIR : (hotbarSlots[i] || BLOCK.AIR);
    const cntEl = s.querySelector('.count');
    if (cntEl) cntEl.textContent = formatItemCountBadge(slotItem);
    const cv = s.querySelector('canvas');
    if (cv) drawItemIcon(cv, slotItem);
  });
  const bId = getActiveHeldItem();
  const badge = formatItemCountBadge(bId);
  blockLabelEl.textContent = bId === BLOCK.AIR ? 'Mano' : `${selectedSlot + 1}. ${BLOCK_DEFS[bId].name} (${badge})`;
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

if (isTouchMode) btnPlay.textContent = 'Jugar (Controles Táctiles)';
btnPlay.addEventListener('click', startGameplay);
overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) startGameplay(); });

document.addEventListener('pointerlockchange', () => {
  const wasLocked = isLocked;
  isLocked = document.pointerLockElement === canvasEl;
  if (!isLocked) {
    isMiningHeld = false;
    if (typeof isShieldBlocking !== 'undefined' && isShieldBlocking) toggleShieldBlock(false);
    if (false && wasLocked && !invOpen && !chestOpen && !touchPlaying) {
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
  chestLootMap = {};
  for (const bId of ALL_INVENTORY_ITEMS) inventoryCounts[bId] = 0;
  hotbarSlots.fill(BLOCK.AIR);
  refreshInventoryCountsUI();
  saveWorldData();
  generator = createWorldGenerator(worldSeed);

  for (const ch of chunks.values()) {
    if (ch.solidMesh) { scene.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
    if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
  }
  chunks.clear();
  buildQueue.length = 0;
  simQueue.clear();
  if (typeof leafDecayQueue !== 'undefined') leafDecayQueue.length = 0;
  while (mobs.length > 0) removeMobAt(0);
  for (const t of activeTNTs) scene.remove(t.mesh);
  activeTNTs.length = 0;
  lastPlayerChunkX = null;

  player.x = 8.5; player.z = 8.5;
  player.y = findSpawnHeight(player.x, player.z);
  player.health = player.maxHealth;
  renderHeartsUI();
  const seedInputEl = document.getElementById('seed-input');
  if (seedInputEl) seedInputEl.value = `${worldSeed}`;
  return worldSeed;
}

function teleportToBiome(targetBiome) {
  for (let radius = 0; radius <= 180; radius++) {
    for (let step = 0; step < Math.max(1, radius * 8); step++) {
      const angle = (step / Math.max(1, radius * 8)) * Math.PI * 2;
      const wx = Math.floor(8 + Math.cos(angle) * radius * 16);
      const wz = Math.floor(8 + Math.sin(angle) * radius * 16);
      if (generator.getBiomeAt(wx, wz) === targetBiome) {
        const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
        getChunkData(cx, cz);
        rebuildChunkImmediate(cx, cz);
        player.x = wx + 0.5; player.z = wz + 0.5;
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

  const px = Math.floor(player.x), pz = Math.floor(player.z), half = MAP_SIZE >> 1;

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

  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    const rx = Math.round(half + (m.x - player.x));
    const rz = Math.round(half + (m.z - player.z));
    if (rx >= 1 && rx < MAP_SIZE - 1 && rz >= 1 && rz < MAP_SIZE - 1) {
      minimapCtx.fillStyle = m.type === 'zombie'
        ? '#ef4444'
        : (m.type === 'creeper' ? '#22c55e' : (m.type === 'skeleton' ? '#fde047' : (m.type === 'golem' ? '#38bdf8' : '#f8fafc')));
      minimapCtx.fillRect(rx - 1, rz - 1, 3, 3);
    }
  }

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const rx = Math.max(2, Math.min(MAP_SIZE - 3, Math.round(half + (wp.x - player.x))));
    const rz = Math.max(2, Math.min(MAP_SIZE - 3, Math.round(half + (wp.z - player.z))));
    minimapCtx.fillStyle = '#0f172a';
    minimapCtx.fillRect(rx - 2, rz - 2, 5, 5);
    minimapCtx.fillStyle = wp.color || '#f43f5e';
    minimapCtx.fillRect(rx - 1, rz - 1, 3, 3);
  }

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
  btnTpDesert.addEventListener('click', () => { teleportToBiome('Desierto'); startGameplay(); });
}
const btnTpSnow = document.getElementById('btn-tp-snow');
if (btnTpSnow) {
  btnTpSnow.addEventListener('click', () => { teleportToBiome('Taiga Nevada'); startGameplay(); });
}

btnExport.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ seed: worldSeed, deltas: worldDeltas }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voxelcraft_world_${worldSeed}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
