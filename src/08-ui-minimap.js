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

const invSlots = Array.from({ length: 27 }, () => ({ id: 0, count: 0 }));
const hotbarCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const craftGridSlots = Array.from({ length: 9 }, () => ({ id: 0, count: 0 }));
const craftOutputSlot = { id: 0, count: 0, recipeIdx: -1 };
const cursorItem = { id: 0, count: 0 };
let craftingTableMode = false;
let quickMoveMode = false;

function formatItemCountBadge(itemId, customCount) {
  if (!itemId || itemId === BLOCK.AIR) return '';
  if (gameMode === 'creative' && customCount === undefined) return '∞';
  const count = customCount !== undefined ? customCount : (inventoryCounts[itemId] || 0);
  if (isNonStackTool(itemId)) return count > 0 ? '∞' : '0';
  return count > 0 ? `${count}` : '0';
}

function canCraftRecipe(recipeIdx, enforceGridSize = false) {
  const rec = CRAFTING_RECIPES[recipeIdx];
  if (!rec) return false;
  if (enforceGridSize && gameMode === 'survival' && !craftingTableMode && (rec.gridSize || 2) > 2) return false;
  if (gameMode === 'creative') return true;
  for (const ing of rec.ingredients) {
    if (getAvailIngredientCount(ing.id) < ing.count) return false;
  }
  return true;
}

function craftRecipe(recipeIdx, enforceGridSize = false) {
  const rec = CRAFTING_RECIPES[recipeIdx];
  if (!rec || !canCraftRecipe(recipeIdx, enforceGridSize)) return false;
  if (gameMode === 'survival') {
    for (const ing of rec.ingredients) consumeInventoryIngredient(ing.id, ing.count);
  }
  inventoryCounts[rec.outId] = (inventoryCounts[rec.outId] || 0) + rec.outCount;
  autoEquipToHotbar(rec.outId);
  if (typeof reconcileSlotsFromInventoryCounts === 'function') reconcileSlotsFromInventoryCounts();
  saveWorldData();
  sfx.play('craft');
  refreshInventoryCountsUI();
  return true;
}

function setRecipeBookFilter(opts = {}) {
  if (opts.category !== undefined) recipeBookState.category = opts.category;
  if (opts.search !== undefined) recipeBookState.search = String(opts.search).trim().toLowerCase();
  if (opts.craftableOnly !== undefined) recipeBookState.craftableOnly = !!opts.craftableOnly;
  const tabsEl = document.getElementById('mc-recipe-tabs');
  if (tabsEl) tabsEl.querySelectorAll('.mc-recipe-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === recipeBookState.category));
  const craftBtn = document.getElementById('mc-recipe-craftable-only');
  if (craftBtn) {
    craftBtn.textContent = `✅ Fabricables: ${recipeBookState.craftableOnly ? 'ON' : 'OFF'}`;
    craftBtn.classList.toggle('toggled', recipeBookState.craftableOnly);
  }
  buildCraftingUI();
  return recipeBookState;
}

function buildCraftingUI() {
  if (!craftGridEl) return;
  craftGridEl.innerHTML = '';
  const q = recipeBookState.search, cat = recipeBookState.category;

  if (cat !== 'smelt') {
    CRAFTING_RECIPES.forEach((rec, idx) => {
      if (cat !== 'all' && getRecipeCategory(rec) !== cat) return;
      const needsTable = gameMode === 'survival' && !craftingTableMode && (rec.gridSize || 2) > 2;
      const craftable = !needsTable && canCraftRecipe(idx);
      if (recipeBookState.craftableOnly && !craftable) return;
      const costStr = rec.ingredients.map(ing => `${ing.count}× ${BLOCK_DEFS[ing.id].name} (${gameMode === 'creative' ? '∞' : getAvailIngredientCount(ing.id)})`).join(' + ');
      if (q && !rec.name.toLowerCase().includes(q) && !costStr.toLowerCase().includes(q)) return;

      const card = document.createElement('div');
      card.className = 'craft-item ' + (craftable ? 'craftable' : 'locked');
      const icon = document.createElement('canvas'); icon.width = 16; icon.height = 16; drawItemIcon(icon, rec.outId);
      const patWrap = document.createElement('div'); patWrap.innerHTML = buildMiniPatternHTML(rec);
      const info = document.createElement('div'); info.className = 'craft-info';
      const gridTag = (rec.gridSize || 2) === 3 ? (needsTable ? '🔒 Requiere Mesa 3×3 • ' : '⚒ 3×3 • ') : '✋ 2×2 • ';
      info.innerHTML = `<div class="craft-title">${rec.name}</div><div class="craft-cost">${gridTag}${costStr}</div>`;
      card.appendChild(icon); card.appendChild(patWrap.firstElementChild); card.appendChild(info);

      const onCraft = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (needsTable) {
          const hint = document.getElementById('mc-craft-hint');
          if (hint) hint.textContent = '⚠ Esta receta es 3×3: fabrica y coloca una Mesa de Crafteo (4× Madera) y haz clic derecho en ella.';
          return;
        }
        if (typeof fillOrCraftRecipeInGrid === 'function') fillOrCraftRecipeInGrid(idx);
        else craftRecipe(idx, true);
      };
      card.addEventListener('click', onCraft); card.addEventListener('touchend', onCraft, { passive: false });
      craftGridEl.appendChild(card);
    });
  }

  if (cat === 'smelt' || cat === 'all') {
    SMELT_RECIPES.forEach((sRec) => {
      const canSmelt = gameMode === 'creative' || (inventoryCounts[sRec.inId] || 0) > 0;
      if (recipeBookState.craftableOnly && !canSmelt) return;
      const titleStr = `🔥 ${sRec.count}× ${BLOCK_DEFS[sRec.outId].name}`;
      const costStr = `Horno: 1× ${BLOCK_DEFS[sRec.inId].name} (${gameMode === 'creative' ? '∞' : (inventoryCounts[sRec.inId] || 0)})`;
      if (q && !titleStr.toLowerCase().includes(q) && !costStr.toLowerCase().includes(q)) return;

      const card = document.createElement('div');
      card.className = 'craft-item smelt-recipe-card ' + (canSmelt ? 'craftable' : 'locked');
      const icon = document.createElement('canvas'); icon.width = 16; icon.height = 16; drawItemIcon(icon, sRec.outId);
      const info = document.createElement('div'); info.className = 'craft-info';
      info.innerHTML = `<div class="craft-title">${titleStr}</div><div class="craft-cost">${costStr}</div>`;
      card.appendChild(icon); card.appendChild(info);
      const onSmelt = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!canSmelt) return;
        if (selectedSlot < 0) selectedSlot = 0;
        hotbarSlots[selectedSlot] = sRec.inId;
        smeltInFurnace(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z));
      };
      card.addEventListener('click', onSmelt); card.addEventListener('touchend', onSmelt, { passive: false });
      craftGridEl.appendChild(card);
    });
  }
}

function buildHotbarUI() {
  hotbarEl.innerHTML = '';
  hotbarSlots.forEach((rawId, idx) => {
    const bId = (gameMode === 'survival' && (inventoryCounts[rawId] || 0) <= 0) ? BLOCK.AIR : (rawId || BLOCK.AIR);
    const slot = document.createElement('div');
    slot.className = 'slot' + (idx === selectedSlot ? ' active' : '');
    slot.innerHTML = `<span class="key">${idx + 1}</span><span class="count">${formatItemCountBadge(bId)}</span>`;
    const icon = document.createElement('canvas'); icon.width = 16; icon.height = 16; drawItemIcon(icon, bId);
    slot.appendChild(icon);
    slot.addEventListener('click', () => updateHotbarSelection(selectedSlot === idx ? -1 : idx));
    slot.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); updateHotbarSelection(selectedSlot === idx ? -1 : idx); }, { passive: false });
    hotbarEl.appendChild(slot);
  });
  updateHotbarSelection(selectedSlot);
}

const WAYPOINT_COLORS = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#38bdf8', '#ec4899'];
const waypointGridEl = document.getElementById('waypoint-grid');
const waypointSectionTitleEl = document.getElementById('waypoint-section-title');
const btnAddWaypointEl = document.getElementById('btn-add-waypoint');
const invModalTitleEl = document.getElementById('inv-modal-title');

function addWaypoint(customName) {
  if (gameMode === 'survival') return null;
  const biome = generator.getBiomeAt(player.x, player.z);
  const wp = { name: customName || `Baliza #${waypoints.length + 1} (${biome})`, x: Math.round(player.x), y: Math.round(player.y), z: Math.round(player.z), color: WAYPOINT_COLORS[waypoints.length % WAYPOINT_COLORS.length] };
  waypoints.push(wp);
  sfx.play('waypoint'); saveWorldData(); buildWaypointsUI(); updateMinimap(0, true);
  if (blockLabelEl) blockLabelEl.textContent = `📍 ${wp.name} guardada en (${wp.x}, ${wp.y}, ${wp.z})`;
  return wp;
}

function removeWaypoint(idx) {
  if (idx < 0 || idx >= waypoints.length) return false;
  waypoints.splice(idx, 1);
  saveWorldData(); buildWaypointsUI(); updateMinimap(0, true);
  return true;
}

function teleportToWaypoint(idx) {
  if (gameMode === 'survival') return null;
  const wp = waypoints[idx];
  if (!wp) return null;
  if (ridingCart) toggleRideMinecart();
  if (ridingBoat) toggleRideBoat();
  const cx = Math.floor(wp.x / CHUNK_SIZE), cz = Math.floor(wp.z / CHUNK_SIZE);
  getChunkData(cx, cz); rebuildChunkImmediate(cx, cz);
  player.x = wp.x + 0.5; player.z = wp.z + 0.5;
  player.y = Math.max(wp.y, findSpawnHeight(player.x, player.z));
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  lastPlayerChunkX = null;
  sfx.play('waypoint'); updateMinimap(0, true);
  if (invOpen) toggleInventory(false);
  return wp;
}

function buildWaypointsUI() {
  const isCreative = gameMode === 'creative';
  if (btnAddWaypointEl) btnAddWaypointEl.style.display = isCreative ? '' : 'none';
  if (waypointSectionTitleEl) waypointSectionTitleEl.style.display = isCreative ? '' : 'none';
  const catTitle = document.getElementById('creative-catalog-title');
  if (catTitle) catTitle.style.display = isCreative ? '' : 'none';
  if (invGridEl) invGridEl.style.display = isCreative ? '' : 'none';
  if (invModalTitleEl) {
    invModalTitleEl.textContent = craftingTableMode
      ? '⚒ Mesa de Crafteo (3×3)'
      : (isCreative ? '📦 Inventario, Crafteo (2×2) y Creativo' : '📦 Inventario (Crafteo 2×2)');
  }
  const tbtnWp = document.getElementById('tbtn-wp');
  if (tbtnWp) tbtnWp.style.display = isCreative ? '' : 'none';
  if (!waypointGridEl) return;
  waypointGridEl.style.display = isCreative ? '' : 'none';
  waypointGridEl.innerHTML = '';
  if (!isCreative) return;
  waypoints.forEach((wp, idx) => {
    const dist = Math.round(Math.hypot(wp.x - player.x, wp.z - player.z));
    const card = document.createElement('div');
    card.className = 'craft-item craftable';
    card.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:${wp.color};border:2px solid #fff;flex-shrink:0;"></div><div class="craft-info" style="flex:1;"><div class="craft-title">${wp.name}</div><div class="craft-cost">Coords: (${wp.x}, ${wp.y}, ${wp.z}) • Distancia: ${dist}m — Clic para Teletransportar</div></div>`;
    const onTp = (e) => { e.preventDefault(); e.stopPropagation(); teleportToWaypoint(idx); };
    card.addEventListener('click', onTp);
    card.addEventListener('touchend', onTp, { passive: false });
    waypointGridEl.appendChild(card);
  });
}

if (btnAddWaypointEl) btnAddWaypointEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addWaypoint(); });

function buildInventoryModal() {
  if (typeof reconcileSlotsFromInventoryCounts === 'function') reconcileSlotsFromInventoryCounts();
  invGridEl.innerHTML = '';
  ALL_INVENTORY_ITEMS.forEach((bId) => {
    const def = BLOCK_DEFS[bId], hasItem = gameMode === 'creative' || (inventoryCounts[bId] || 0) > 0;
    const card = document.createElement('div'); card.className = 'inv-item'; card.title = def.name;
    if (!hasItem) card.style.opacity = '0.42';
    const badge = document.createElement('div'); badge.className = 'count'; badge.textContent = formatItemCountBadge(bId);
    const icon = document.createElement('canvas'); icon.width = 16; icon.height = 16; drawItemIcon(icon, bId);
    const lbl = document.createElement('span'); lbl.textContent = def.name;
    card.appendChild(badge); card.appendChild(icon); card.appendChild(lbl);
    const selectItem = (e) => {
      e.preventDefault();
      if (gameMode === 'creative' && typeof giveCreativeStackToSlot === 'function') { giveCreativeStackToSlot(bId); return; }
      if (selectedSlot < 0) selectedSlot = 0;
      hotbarSlots[selectedSlot] = (hasItem && hotbarSlots[selectedSlot] !== bId) ? bId : BLOCK.AIR;
      saveWorldData(); buildHotbarUI(); toggleInventory(false);
    };
    card.addEventListener('click', selectItem); card.addEventListener('touchend', selectItem, { passive: false });
    invGridEl.appendChild(card);
  });
  buildWaypointsUI(); buildCraftingUI();
  if (typeof renderMinecraftInventoryDOM === 'function') renderMinecraftInventoryDOM();
}

function refreshInventoryCountsUI() {
  if (typeof reconcileSlotsFromInventoryCounts === 'function') reconcileSlotsFromInventoryCounts();
  buildHotbarUI(); buildWaypointsUI();
  if (invOpen) buildInventoryModal();
  if (chestOpen && typeof buildChestModalUI === 'function') buildChestModalUI();
  const isCreative = gameMode === 'creative';
  if (btnModeToggleEl) btnModeToggleEl.textContent = `Modo: ${isCreative ? 'Creativo (∞)' : 'Supervivencia'} (G)`;
  if (tbtnModeEl) { tbtnModeEl.textContent = isCreative ? '⚒ Creat.' : '⚒ Superv.'; tbtnModeEl.classList.toggle('toggled', isCreative); }
}

function toggleGameMode(forceMode) {
  if (forceMode === 'survival' || forceMode === 'creative') gameMode = forceMode;
  else gameMode = gameMode === 'survival' ? 'creative' : 'survival';
  refreshInventoryCountsUI();
}
if (btnModeToggleEl) btnModeToggleEl.addEventListener('click', (e) => { e.preventDefault(); toggleGameMode(); });

// ============================================================================
// 12A-0. SCREENSHOT / PHOTO MODE (F2 / KeyK / 📷)
// ============================================================================
let screenshotsTakenCount = 0, lastScreenshotDataUrl = '';

function takeGameScreenshot(skipDownload = false) {
  renderer.render(scene, camera);
  try { lastScreenshotDataUrl = canvasEl.toDataURL('image/png'); } catch (_) { lastScreenshotDataUrl = 'data:image/png;base64,'; }
  screenshotsTakenCount++; sfx.play('shutter');
  if (blockLabelEl) blockLabelEl.textContent = `📷 ¡Captura #${screenshotsTakenCount} guardada! (${canvasEl.width}×${canvasEl.height}px)`;
  if (!skipDownload && lastScreenshotDataUrl.length > 32) {
    const a = document.createElement('a'); a.href = lastScreenshotDataUrl; a.download = `voxelcraft_foto_${worldSeed}_${screenshotsTakenCount}.png`; a.click();
  }
  return lastScreenshotDataUrl;
}

const touchControlsEl = document.getElementById('touch-controls');
window.addEventListener('touchstart', () => {
  if (!isTouchMode) { isTouchMode = true; btnPlay.textContent = 'Jugar (Controles Táctiles)'; }
}, { once: true, passive: true });

function startGameplay() {
  sfx.init(); invOpen = false; chestOpen = false; menuOpen = false;
  if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
  invModalEl.classList.add('hidden');
  const cm = document.getElementById('chest-modal'); if (cm) cm.classList.add('hidden');
  overlayEl.classList.add('hidden');
  if (isTouchMode || !canvasEl.requestPointerLock) {
    touchPlaying = true; touchControlsEl.classList.add('active');
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  } else {
    try { const p = canvasEl.requestPointerLock(); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (_) {}
  }
}

function togglePauseMenu(forceOpen) {
  const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !menuOpen;
  if (nextOpen) {
    menuOpen = true; isLocked = false; isMiningHeld = false; invOpen = false; chestOpen = false; player.vx = 0; player.vz = 0;
    if (sfx.ctx && sfx.windGain) sfx.windGain.gain.setTargetAtTime(0, sfx.ctx.currentTime, 0.05);
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    for (const k in keys) keys[k] = false;
    invModalEl.classList.add('hidden');
    const cm = document.getElementById('chest-modal'); if (cm) cm.classList.add('hidden');
    overlayEl.classList.remove('hidden');
    if (touchPlaying) { touchPlaying = false; resetJoystick(); }
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (_) {} }
  } else startGameplay();
  return menuOpen;
}

function toggleInventory(force, asCraftingTable = false) {
  const nextOpen = typeof force === 'boolean' ? force : !invOpen;
  if (!nextOpen && invOpen && typeof returnCraftAndCursorItemsToInventory === 'function') returnCraftAndCursorItemsToInventory();
  invOpen = nextOpen; craftingTableMode = invOpen ? !!asCraftingTable : false;
  if (invOpen) { chestOpen = false; const cm = document.getElementById('chest-modal'); if (cm) cm.classList.add('hidden'); }
  invModalEl.classList.toggle('hidden', !invOpen);
  if (invOpen) { isMiningHeld = false; buildInventoryModal(); if (document.pointerLockElement) document.exitPointerLock(); }
  else startGameplay();
}

function openCraftingTable(wx, wy, wz) { sfx.play('wood'); toggleInventory(true, true); return true; }

function smeltInFurnace(wx, wy, wz) {
  const heldId = getActiveHeldItem();
  let rec = SMELT_RECIPES.find(r => r.inId === heldId && (gameMode === 'creative' || (inventoryCounts[r.inId] || 0) > 0));
  if (!rec) rec = SMELT_RECIPES.find(r => gameMode === 'creative' || (inventoryCounts[r.inId] || 0) > 0);
  if (!rec) {
    if (blockLabelEl) blockLabelEl.textContent = '🔥 Horno: Equipa Mena de Hierro/Oro, Arena o Adoquín para fundir';
    return null;
  }
  if (gameMode === 'survival') inventoryCounts[rec.inId] = Math.max(0, (inventoryCounts[rec.inId] || 1) - 1);
  inventoryCounts[rec.outId] = (inventoryCounts[rec.outId] || 0) + rec.count;
  autoEquipToHotbar(rec.outId);
  if (typeof reconcileSlotsFromInventoryCounts === 'function') reconcileSlotsFromInventoryCounts();
  sfx.play('craft'); spawnBlockParticles(wx, wy, wz, BLOCK.LAVA, 12);
  saveWorldData(); refreshInventoryCountsUI();
  if (blockLabelEl) blockLabelEl.textContent = `🔥 Horno: 1× ${BLOCK_DEFS[rec.inId].name} ➔ ${rec.count}× ${BLOCK_DEFS[rec.outId].name}`;
  return { inId: rec.inId, outId: rec.outId, count: rec.count };
}

function toggleDayNight() { isNight = !isNight; setTimeOfDay(isNight ? Math.PI : 0.25); }
function toggleFlyingMode() { player.flying = !player.flying; player.vy = 0; document.getElementById('tbtn-fly').classList.toggle('toggled', player.flying); }

function placeBlockAtCurrentTarget() {
  const bId = getActiveHeldItem();

  // 1. Prioritize interacting with targeted interactive world blocks (Chest, Crafting Table, Lever, Door, Trapdoor, Portal, Bed, Anvil, Enchanting Table)
  if (currentHit) {
    if (currentHit.block === BLOCK.PORTAL) { useVoxelPortal(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.OBSIDIAN && (bId === BLOCK.AMETHYST || bId === BLOCK.TORCH || bId === BLOCK.TOOL_FLINT_AND_STEEL)) { activateObsidianPortal(currentHit.x, currentHit.y + 1, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.TNT && bId === BLOCK.TOOL_FLINT_AND_STEEL) { igniteTNT(currentHit.x, currentHit.y, currentHit.z, 2.6); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.LEVER_OFF || currentHit.block === BLOCK.LEVER_ON) { toggleVoxelLever(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.DOOR_CLOSED || currentHit.block === BLOCK.DOOR_OPEN) { toggleVoxelDoor(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.TRAPDOOR_CLOSED || currentHit.block === BLOCK.TRAPDOOR_OPEN) { toggleVoxelTrapdoor(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.CRAFTING_TABLE) { openCraftingTable(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.FURNACE) { smeltInFurnace(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.CHEST) { openVoxelChest(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.BED) { sleepInBed(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.ANVIL) { useAnvilAt(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.ENCHANTING_TABLE) { useEnchantingTableAt(currentHit.x, currentHit.y, currentHit.z); player.swingTime = 1.0; return true; }
    if (currentHit.block === BLOCK.CAKE) return eatCakeSliceAt(currentHit.x, currentHit.y, currentHit.z, 1);
    if (bId === BLOCK.ITEM_BONE_MEAL && applyBoneMealAt(currentHit.x, currentHit.y, currentHit.z)) return true;
  }

  // 2. Consumables, Shears, Flint & Steel, Armor, Fishing Rod, Ender Pearl, Bone, Compass, Clock, Bow, Grappling Hook or Sword Shield
  if (bId === BLOCK.TOOL_SHEARS) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const hitMob = raycastMob(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 5.2);
    const sheep = (hitMob && hitMob.type === 'sheep' && !hitMob.sheared) ? hitMob : mobs.find(m => m.type === 'sheep' && !m.sheared && Math.hypot(m.x - player.x, m.y - player.y, m.z - player.z) < 4.8);
    if (sheep && shearSheep(sheep)) return true;
  }
  if (bId === BLOCK.TOOL_FLINT_AND_STEEL) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const hitMob = raycastMob(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 4.8);
    if (hitMob && igniteMobWithFire(hitMob)) { player.swingTime = 1.0; return true; }
    if (currentHit && useFlintAndSteelAt(currentHit.x, currentHit.y, currentHit.z, currentHit.nx, currentHit.ny, currentHit.nz)) return true;
  }
  if (bId === BLOCK.ITEM_BONE) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const hitMob = raycastMob(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 5.2);
    const wolf = (hitMob && hitMob.type === 'wolf' && !hitMob.allied) ? hitMob : mobs.find(m => m.type === 'wolf' && !m.allied && Math.hypot(m.x - player.x, m.y - player.y, m.z - player.z) < 4.8);
    if (wolf && tameWolf(wolf, true)) { player.swingTime = 1.0; return true; }
  }
  if (isFoodItem(bId)) return eatHeldApple(bId);
  if (isArmorItem(bId)) return equipArmorItem(bId);
  if (bId === BLOCK.TOOL_FISHING_ROD) return !!useFishingRod(currentHit ? currentHit.x : undefined, currentHit ? currentHit.y : undefined, currentHit ? currentHit.z : undefined, { requireWater: true });
  if (bId === BLOCK.ITEM_ENDER_PEARL) return throwEnderPearl();
  if (bId === BLOCK.ITEM_COMPASS) {
    const bedTxt = player.hasBedSpawn ? `Cama (${Math.floor(player.spawnX)}, ${Math.floor(player.spawnZ)}) a ${Math.round(Math.hypot(player.x - player.spawnX, player.z - player.spawnZ))}m • ` : '';
    if (blockLabelEl) blockLabelEl.textContent = `🧭 Brújula: ${bedTxt}Origen (0, 0) a ${Math.round(Math.hypot(player.x, player.z))}m • Pos: (${Math.round(player.x)}, ${Math.round(player.y)}, ${Math.round(player.z)})`;
    sfx.play('waypoint'); return true;
  }
  if (bId === BLOCK.ITEM_CLOCK) { toggleDayNight(); if (typeof updateHeldItemVisual === 'function') updateHeldItemVisual(); sfx.play('chime'); return true; }
  if (bId === BLOCK.ITEM_EMPTY_MAP) return useEmptyMap();
  if (bId === BLOCK.ITEM_MAP) { useCartographyMap(); return true; }
  if (bId === BLOCK.TOOL_BOW) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    shootArrow(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z); player.swingTime = 1.0; return true;
  }
  if (bId === BLOCK.TOOL_GRAPPLING_HOOK) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    shootGrappleHook(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z); player.swingTime = 1.0; return true;
  }
  if (isSwordItem(bId)) { toggleShieldBlock(); return true; }
  if (!currentHit) return false;

  if (bId === BLOCK.TOOL_HOE && (currentHit.block === BLOCK.GRASS || currentHit.block === BLOCK.DIRT) && getVoxelGlobal(currentHit.x, currentHit.y + 1, currentHit.z) === BLOCK.AIR) {
    setVoxelGlobal(currentHit.x, currentHit.y + 1, currentHit.z, BLOCK.WHEAT_1); sfx.play('place'); player.swingTime = 1.0; return true;
  }
  if (bId === BLOCK.ITEM_BUCKET) {
    const adjX = currentHit.x + currentHit.nx, adjY = currentHit.y + currentHit.ny, adjZ = currentHit.z + currentHit.nz;
    const liq = getVoxelGlobal(adjX, adjY, adjZ), curB = getVoxelGlobal(currentHit.x, currentHit.y, currentHit.z);
    if (liq === BLOCK.WATER || liq === BLOCK.LAVA || curB === BLOCK.WATER || curB === BLOCK.LAVA) {
      const useAdj = (liq === BLOCK.WATER || liq === BLOCK.LAVA);
      const tx = useAdj ? adjX : currentHit.x, ty = useAdj ? adjY : currentHit.y, tz = useAdj ? adjZ : currentHit.z;
      const filledId = getVoxelGlobal(tx, ty, tz) === BLOCK.WATER ? BLOCK.ITEM_WATER_BUCKET : BLOCK.ITEM_LAVA_BUCKET;
      setVoxelGlobal(tx, ty, tz, BLOCK.AIR);
      if (gameMode === 'survival') inventoryCounts[BLOCK.ITEM_BUCKET] = Math.max(0, (inventoryCounts[BLOCK.ITEM_BUCKET] || 1) - 1);
      inventoryCounts[filledId] = (inventoryCounts[filledId] || 0) + 1;
      if (selectedSlot >= 0) hotbarSlots[selectedSlot] = filledId;
      sfx.play('splash'); saveWorldData(); refreshInventoryCountsUI(); return true;
    }
    return false;
  }
  if (bId === BLOCK.ITEM_WATER_BUCKET || bId === BLOCK.ITEM_LAVA_BUCKET) {
    const lx = currentHit.x + currentHit.nx, ly = currentHit.y + currentHit.ny, lz = currentHit.z + currentHit.nz;
    setVoxelGlobal(lx, ly, lz, bId === BLOCK.ITEM_WATER_BUCKET ? BLOCK.WATER : BLOCK.LAVA);
    if (gameMode === 'survival') {
      inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
      inventoryCounts[BLOCK.ITEM_BUCKET] = (inventoryCounts[BLOCK.ITEM_BUCKET] || 0) + 1;
      if (selectedSlot >= 0) hotbarSlots[selectedSlot] = BLOCK.ITEM_BUCKET;
    }
    sfx.play('splash'); saveWorldData(); refreshInventoryCountsUI(); return true;
  }

  if (bId === BLOCK.ITEM_MINECART) {
    if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;
    const ry = currentHit.block === BLOCK.RAIL ? currentHit.y : currentHit.y + currentHit.ny;
    const rx = currentHit.block === BLOCK.RAIL ? currentHit.x : currentHit.x + currentHit.nx;
    const rz = currentHit.block === BLOCK.RAIL ? currentHit.z : currentHit.z + currentHit.nz;
    const cart = spawnMinecart(rx, ry, rz);
    if (gameMode === 'survival') { inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1); refreshInventoryCountsUI(); }
    toggleRideMinecart(cart); player.swingTime = 1.0; return true;
  }

  if (bId === BLOCK.ITEM_BOAT) {
    if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;
    const boat = spawnBoat(currentHit.x + currentHit.nx, currentHit.y + currentHit.ny, currentHit.z + currentHit.nz);
    if (gameMode === 'survival') { inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1); refreshInventoryCountsUI(); }
    toggleRideBoat(boat); player.swingTime = 1.0; return true;
  }

  if (currentHit.block === BLOCK.RAIL && bId !== BLOCK.RAIL) {
    toggleRideMinecart(spawnMinecart(currentHit.x, currentHit.y, currentHit.z));
    player.swingTime = 1.0; return true;
  }

  if (bId === BLOCK.AIR || isNonStackTool(bId) || bId >= 256) return false;
  if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return false;

  const isReplaceable = currentHit.block === BLOCK.TALL_GRASS;
  const px = isReplaceable ? currentHit.x : currentHit.x + currentHit.nx;
  const py = isReplaceable ? currentHit.y : currentHit.y + currentHit.ny;
  const pz = isReplaceable ? currentHit.z : currentHit.z + currentHit.nz;

  const placeDef = BLOCK_DEFS[bId];
  const overlapsPlayer = placeDef.solid && (
    px + 1 > player.x - player.radius && px < player.x + player.radius &&
    py + 1 > player.y && py < player.y + player.height &&
    pz + 1 > player.z - player.radius && pz < player.z + player.radius
  );

  if (!overlapsPlayer) {
    let actualPlaceId = bId;
    if (bId === BLOCK.REDSTONE_LAMP_OFF || bId === BLOCK.DOOR_CLOSED || bId === BLOCK.TRAPDOOR_CLOSED) {
      for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 4 && getVoxelGlobal(px + dx, py + dy, pz + dz) === BLOCK.LEVER_ON) {
          actualPlaceId = (bId === BLOCK.REDSTONE_LAMP_OFF) ? BLOCK.REDSTONE_LAMP_ON : (bId === BLOCK.DOOR_CLOSED ? BLOCK.DOOR_OPEN : BLOCK.TRAPDOOR_OPEN);
        }
      }
    }
    if (setVoxelGlobal(px, py, pz, actualPlaceId)) {
      if (gameMode === 'survival') {
        if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === bId && hotbarCounts[selectedSlot] > 0) hotbarCounts[selectedSlot]--;
        inventoryCounts[bId] = Math.max(0, (inventoryCounts[bId] || 1) - 1);
        if ((inventoryCounts[bId] <= 0 || hotbarCounts[selectedSlot] <= 0) && selectedSlot >= 0 && hotbarSlots[selectedSlot] === bId && inventoryCounts[bId] <= 0) hotbarSlots[selectedSlot] = BLOCK.AIR;
        saveWorldData(); refreshInventoryCountsUI();
      }
      if (actualPlaceId === BLOCK.GLOWSTONE) trySummonIronGolem(px, py, pz);
      if (actualPlaceId === BLOCK.PORTAL) registerPortalAt(px, py, pz);
      player.swingTime = 1.0; sfx.play('place'); return true;
    }
  }
  return false;
}

function updateHotbarSelection(idx) {
  if (idx === null || idx === -1) selectedSlot = -1;
  else selectedSlot = ((idx % hotbarSlots.length) + hotbarSlots.length) % hotbarSlots.length;
  const slots = hotbarEl.querySelectorAll('.slot');
  slots.forEach((s, i) => {
    s.classList.toggle('active', i === selectedSlot);
    const slotItem = (gameMode === 'survival' && (inventoryCounts[hotbarSlots[i]] || 0) <= 0) ? BLOCK.AIR : (hotbarSlots[i] || BLOCK.AIR);
    const cntEl = s.querySelector('.count');
    if (cntEl) cntEl.textContent = formatItemCountBadge(slotItem, hotbarCounts[i] > 0 ? hotbarCounts[i] : undefined);
    const cv = s.querySelector('canvas');
    if (cv) drawItemIcon(cv, slotItem);
  });
  const bId = getActiveHeldItem();
  const badge = formatItemCountBadge(bId);
  blockLabelEl.textContent = bId === BLOCK.AIR ? 'Mano' : `${selectedSlot + 1}. ${BLOCK_DEFS[bId].name} (${badge})`;
  updateHeldItemVisual();
}

buildHotbarUI(); buildInventoryModal();

const overlayEl = document.getElementById('overlay'), btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset-world'), btnExport = document.getElementById('btn-export');
const rngDist = document.getElementById('rng-dist'), lblDist = document.getElementById('lbl-dist');
const rngFov = document.getElementById('rng-fov'), lblFov = document.getElementById('lbl-fov');
const rngMusicVol = document.getElementById('rng-music-vol'), lblMusicVol = document.getElementById('lbl-music-vol');
const rngSfxVol = document.getElementById('rng-sfx-vol'), lblSfxVol = document.getElementById('lbl-sfx-vol');
const lightingSelectEl = document.getElementById('lighting-select'), mainMenuViewEl = document.getElementById('main-menu-view'), settingsMenuViewEl = document.getElementById('settings-menu-view');
const btnOpenSettingsEl = document.getElementById('btn-open-settings'), btnCloseSettingsEl = document.getElementById('btn-close-settings');
const btnCfgMusicEl = document.getElementById('btn-cfg-music'), btnCfgSfxEl = document.getElementById('btn-cfg-sfx');
const btnCfgHudEl = document.getElementById('btn-cfg-hud'), btnCfgMapEl = document.getElementById('btn-cfg-map');
const SETTINGS_STORAGE_KEY = 'voxelcraft_settings_v1';
const userSettings = { renderDistance: 5, fov: 75, lightingMode, showHud: true, showMinimap: true, musicEnabled: true, sfxEnabled: true, musicVolume: 80, sfxVolume: 80 };

function openSettingsMenu(show = true) {
  if (mainMenuViewEl) mainMenuViewEl.classList.toggle('hidden', !!show);
  if (settingsMenuViewEl) settingsMenuViewEl.classList.toggle('hidden', !show);
  return !!show;
}

function applyUserSettingsToUI() {
  renderDistance = userSettings.renderDistance;
  if (rngDist) rngDist.value = `${renderDistance}`;
  if (lblDist) lblDist.textContent = `${renderDistance} chunks`;
  scene.fog.density = 0.042 / (renderDistance + 1.8);
  camera.far = Math.max(850, (renderDistance + 8) * CHUNK_SIZE * 2.1);
  baseFov = userSettings.fov;
  if (rngFov) rngFov.value = `${baseFov}`;
  if (lblFov) lblFov.textContent = `${baseFov}°`;
  if (!isZoomed) camera.fov = baseFov;
  camera.updateProjectionMatrix();
  setLightingMode(userSettings.lightingMode);
  if (lightingSelectEl) lightingSelectEl.value = lightingMode;
  sfx.musicEnabled = !!userSettings.musicEnabled;
  sfx.sfxEnabled = !!userSettings.sfxEnabled;
  sfx.musicVolume = Math.max(0, Math.min(100, userSettings.musicVolume)) / 100;
  sfx.sfxVolume = Math.max(0, Math.min(100, userSettings.sfxVolume)) / 100;
  sfx.applyVolumes();
  if (rngMusicVol) rngMusicVol.value = `${userSettings.musicVolume}`;
  if (lblMusicVol) lblMusicVol.textContent = `${userSettings.musicVolume}%`;
  if (rngSfxVol) rngSfxVol.value = `${userSettings.sfxVolume}`;
  if (lblSfxVol) lblSfxVol.textContent = `${userSettings.sfxVolume}%`;
  const hudEl = document.getElementById('hud-stats'), mapEl = document.getElementById('minimap-wrap'), tbtnMus = document.getElementById('tbtn-music');
  if (hudEl) hudEl.classList.toggle('hidden', !userSettings.showHud);
  if (mapEl) mapEl.classList.toggle('hidden', !userSettings.showMinimap);
  if (tbtnMus) tbtnMus.classList.toggle('toggled', userSettings.musicEnabled);
  if (btnCfgMusicEl) { btnCfgMusicEl.textContent = `🎵 Música: ${userSettings.musicEnabled ? 'ON' : 'OFF'}`; btnCfgMusicEl.classList.toggle('toggled', userSettings.musicEnabled); }
  if (btnCfgSfxEl) { btnCfgSfxEl.textContent = `🔊 Efectos (SFX): ${userSettings.sfxEnabled ? 'ON' : 'OFF'}`; btnCfgSfxEl.classList.toggle('toggled', userSettings.sfxEnabled); }
  if (btnCfgHudEl) { btnCfgHudEl.textContent = `📊 Panel FPS/Datos: ${userSettings.showHud ? 'ON' : 'OFF'}`; btnCfgHudEl.classList.toggle('toggled', userSettings.showHud); }
  if (btnCfgMapEl) { btnCfgMapEl.textContent = `🗺 Minimapa Radar: ${userSettings.showMinimap ? 'ON' : 'OFF'}`; btnCfgMapEl.classList.toggle('toggled', userSettings.showMinimap); }
}

function saveUserSettings() {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings)); } catch (_) {}
}

function loadUserSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.renderDistance === 'number' && p.renderDistance >= 2 && p.renderDistance <= 24) userSettings.renderDistance = p.renderDistance;
      if (typeof p.fov === 'number' && p.fov >= 60 && p.fov <= 105) userSettings.fov = p.fov;
      if (p.lightingMode === 'shader' || p.lightingMode === 'shadowmap') userSettings.lightingMode = p.lightingMode;
      if (typeof p.showHud === 'boolean') userSettings.showHud = p.showHud;
      if (typeof p.showMinimap === 'boolean') userSettings.showMinimap = p.showMinimap;
      if (typeof p.musicEnabled === 'boolean') userSettings.musicEnabled = p.musicEnabled;
      if (typeof p.sfxEnabled === 'boolean') userSettings.sfxEnabled = p.sfxEnabled;
      if (typeof p.musicVolume === 'number' && p.musicVolume >= 0 && p.musicVolume <= 100) userSettings.musicVolume = p.musicVolume;
      if (typeof p.sfxVolume === 'number' && p.sfxVolume >= 0 && p.sfxVolume <= 100) userSettings.sfxVolume = p.sfxVolume;
    }
  } catch (_) {}
  applyUserSettingsToUI();
  return userSettings;
}

if (isTouchMode) btnPlay.textContent = '▶ Jugar (Controles Táctiles)';
btnPlay.addEventListener('click', startGameplay);
overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) startGameplay(); });
if (btnOpenSettingsEl) btnOpenSettingsEl.addEventListener('click', (e) => { e.preventDefault(); openSettingsMenu(true); });
if (btnCloseSettingsEl) btnCloseSettingsEl.addEventListener('click', (e) => { e.preventDefault(); openSettingsMenu(false); });
if (btnCfgMusicEl) btnCfgMusicEl.addEventListener('click', (e) => { e.preventDefault(); toggleMusic(!userSettings.musicEnabled); });
if (btnCfgSfxEl) btnCfgSfxEl.addEventListener('click', (e) => { e.preventDefault(); toggleSfx(!userSettings.sfxEnabled); if (userSettings.sfxEnabled) { sfx.init(); sfx.play('step'); } });
if (btnCfgHudEl) btnCfgHudEl.addEventListener('click', (e) => { e.preventDefault(); userSettings.showHud = !userSettings.showHud; applyUserSettingsToUI(); saveUserSettings(); });
if (btnCfgMapEl) btnCfgMapEl.addEventListener('click', (e) => { e.preventDefault(); userSettings.showMinimap = !userSettings.showMinimap; applyUserSettingsToUI(); saveUserSettings(); });
if (rngMusicVol) rngMusicVol.addEventListener('input', (e) => { userSettings.musicVolume = parseInt(e.target.value, 10); userSettings.musicEnabled = userSettings.musicVolume > 0; applyUserSettingsToUI(); saveUserSettings(); });
if (rngSfxVol) rngSfxVol.addEventListener('input', (e) => { userSettings.sfxVolume = parseInt(e.target.value, 10); userSettings.sfxEnabled = userSettings.sfxVolume > 0; applyUserSettingsToUI(); saveUserSettings(); });

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === canvasEl;
  if (!isLocked) {
    isMiningHeld = false;
    for (const k in keys) keys[k] = false;
    player.vx = 0; player.vz = 0;
    if (typeof isShieldBlocking !== 'undefined' && isShieldBlocking) toggleShieldBlock(false);
  } else { menuOpen = false; overlayEl.classList.add('hidden'); }
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; player.vx = 0; player.vz = 0; isMiningHeld = false; });

rngDist.addEventListener('input', (e) => {
  userSettings.renderDistance = parseInt(e.target.value, 10); lastPlayerChunkX = null;
  applyUserSettingsToUI(); saveUserSettings();
  if (typeof updateFarHorizon === 'function') updateFarHorizon(true);
});

rngFov.addEventListener('input', (e) => {
  userSettings.fov = parseInt(e.target.value, 10);
  applyUserSettingsToUI(); saveUserSettings();
});
if (lightingSelectEl) {
  lightingSelectEl.addEventListener('change', (e) => { userSettings.lightingMode = e.target.value; applyUserSettingsToUI(); saveUserSettings(); });
}
loadUserSettings();

function markAllChunksDirtyForRelight() {
  for (const ch of chunks.values()) { ch.dirty = true; ch.queued = false; ch.meshVersion = (ch.meshVersion || 0) + 1; }
  buildQueue.length = 0; lastPlayerChunkX = null;
}

function applyWorldSeed(newSeed) {
  const parsed = Number(newSeed);
  worldSeed = (!Number.isNaN(parsed) && parsed > 0) ? Math.floor(parsed) : Math.floor(Math.random() * 999999);
  worldDeltas = {}; chestLootMap = {};
  for (const bId of ALL_INVENTORY_ITEMS) inventoryCounts[bId] = 0;
  hotbarSlots.fill(BLOCK.AIR); hotbarCounts.fill(0);
  for (const s of invSlots) { s.id = 0; s.count = 0; }
  for (const s of craftGridSlots) { s.id = 0; s.count = 0; }
  cursorItem.id = 0; cursorItem.count = 0;
  refreshInventoryCountsUI(); saveWorldData();
  generator = createWorldGenerator(worldSeed);

  for (const ch of chunks.values()) {
    if (ch.solidMesh) { chunkSolidGroup.remove(ch.solidMesh); ch.solidMesh.geometry.dispose(); }
    if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); }
  }
  chunks.clear(); buildQueue.length = 0; simQueue.clear();
  if (typeof leafDecayQueue !== 'undefined') leafDecayQueue.length = 0;
  while (mobs.length > 0) removeMobAt(0);
  for (const t of activeTNTs) scene.remove(t.mesh);
  activeTNTs.length = 0; lastPlayerChunkX = null;
  if (typeof ridingCart !== 'undefined') ridingCart = null;
  if (typeof ridingBoat !== 'undefined') ridingBoat = null;

  player.x = 8.5; player.z = 8.5; player.y = findSpawnHeight(player.x, player.z);
  if (typeof updateFarHorizon === 'function') updateFarHorizon(true);
  player.health = player.maxHealth; player.hunger = player.maxHunger || 10; player.exhaustion = 0; renderHeartsUI();
  const seedInputEl = document.getElementById('seed-input');
  if (seedInputEl) seedInputEl.value = `${worldSeed}`;
  return worldSeed;
}

function teleportToBiome(targetBiome) {
  for (let radius = 0; radius <= 180; radius++) {
    for (let step = 0; step < Math.max(1, radius * 8); step++) {
      const angle = (step / Math.max(1, radius * 8)) * Math.PI * 2;
      const wx = Math.floor(8 + Math.cos(angle) * radius * 16), wz = Math.floor(8 + Math.sin(angle) * radius * 16);
      if (generator.getBiomeAt(wx + 0.5, wz + 0.5) === targetBiome && generator.getBiomeAt(wx, wz) === targetBiome) {
        const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
        getChunkData(cx, cz); rebuildChunkImmediate(cx, cz);
        if (typeof ridingCart !== 'undefined') ridingCart = null;
        if (typeof ridingBoat !== 'undefined') ridingBoat = null;
        player.x = wx + 0.5; player.z = wz + 0.5; player.y = findSpawnHeight(player.x, player.z);
        player.vx = 0; player.vy = 0; player.vz = 0; lastPlayerChunkX = null; updateMinimap(0, true);
        if (typeof updateFarHorizon === 'function') updateFarHorizon(true);
        return { x: player.x, y: player.y, z: player.z, biome: targetBiome };
      }
    }
  }
  return null;
}

// ============================================================================
// 12A-2. REAL-TIME 2D TOPOGRAPHIC RADAR MINIMAP (10 Hz, ZERO GC)
// ============================================================================
const minimapCanvas = document.getElementById('minimap-canvas'), minimapCtx = minimapCanvas.getContext('2d', { willReadFrequently: true });
const MAP_SIZE = 68, minimapImgData = minimapCtx.createImageData(MAP_SIZE, MAP_SIZE), minimapPixels32 = new Uint32Array(minimapImgData.data.buffer);
const EMPTY_MAP_PIXEL = (255 << 24) | (42 << 16) | (23 << 8) | 15, PARCHMENT_MAP_PIXEL = (255 << 24) | (168 << 16) | (210 << 8) | 230;
let minimapAccum = 0, minimapUpdatesCount = 0;

function updateMinimap(dt, forceRender = false) {
  minimapAccum += dt; if (!forceRender && minimapAccum < 0.10) return false;
  minimapAccum = 0; minimapUpdatesCount++;
  const heldMap = getActiveHeldItem() === BLOCK.ITEM_MAP;
  const scale = heldMap && typeof mapState !== 'undefined' ? (mapState.zoomScale || 1) : 1;
  if ((heldMap || (typeof mapState !== 'undefined' && mapState.initialized)) && typeof revealMapAroundPlayer === 'function') {
    revealMapAroundPlayer(player.x, player.z, 18 * scale);
  }
  const mapLblEl = document.getElementById('minimap-label');
  if (mapLblEl) mapLblEl.textContent = heldMap ? `🗺 MAPA 1:${scale}` : 'RADAR 2D';
  const px = Math.floor(player.x), pz = Math.floor(player.z), half = MAP_SIZE >> 1;
  for (let mz = 0; mz < MAP_SIZE; mz++) {
    const wz = pz + (mz - half) * scale, cz = Math.floor(wz / CHUNK_SIZE), lz = wz - cz * CHUNK_SIZE, rowOff = mz * MAP_SIZE;
    let cachedCx = 999999, cachedColors = null;
    for (let mx = 0; mx < MAP_SIZE; mx++) {
      const wx = px + (mx - half) * scale;
      if (heldMap && gameMode === 'survival' && typeof isMapCellExplored === 'function' && !isMapCellExplored(wx, wz)) {
        minimapPixels32[rowOff + mx] = PARCHMENT_MAP_PIXEL; continue;
      }
      const cx = Math.floor(wx / CHUNK_SIZE);
      if (cx !== cachedCx) {
        cachedCx = cx; const ch = chunks.get(`${cx},${cz}`);
        if (ch && !ch.mapColors) computeChunkLighting(ch, getChunkIfLoaded);
        cachedColors = ch ? ch.mapColors : null;
      }
      minimapPixels32[rowOff + mx] = cachedColors ? cachedColors[lz * CHUNK_SIZE + (wx - cx * CHUNK_SIZE)] : (heldMap ? PARCHMENT_MAP_PIXEL : EMPTY_MAP_PIXEL);
    }
  }
  minimapCtx.putImageData(minimapImgData, 0, 0);
  if (heldMap && typeof handIconCanvas !== 'undefined') { drawItemIcon(handIconCanvas, BLOCK.ITEM_MAP); handIconTex.needsUpdate = true; }
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i], rx = Math.round(half + (m.x - player.x) / scale), rz = Math.round(half + (m.z - player.z) / scale);
    if (rx >= 1 && rx < MAP_SIZE - 1 && rz >= 1 && rz < MAP_SIZE - 1) {
      minimapCtx.fillStyle = m.allied ? '#38bdf8' : (m.type === 'creeper' ? '#22c55e' : (m.type === 'skeleton' ? '#fde047' : (m.type === 'enderman' ? '#c084fc' : (isHostileMob(m) ? '#ef4444' : '#f8fafc'))));
      minimapCtx.fillRect(rx - 1, rz - 1, 3, 3);
    }
  }
  if (gameMode === 'creative') {
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i], rx = Math.max(2, Math.min(MAP_SIZE - 3, Math.round(half + (wp.x - player.x) / scale))), rz = Math.max(2, Math.min(MAP_SIZE - 3, Math.round(half + (wp.z - player.z) / scale)));
      minimapCtx.fillStyle = '#0f172a'; minimapCtx.fillRect(rx - 2, rz - 2, 5, 5); minimapCtx.fillStyle = wp.color || '#f43f5e'; minimapCtx.fillRect(rx - 1, rz - 1, 3, 3);
    }
  }
  minimapCtx.strokeStyle = '#38bdf8'; minimapCtx.lineWidth = 1.5; minimapCtx.beginPath(); minimapCtx.moveTo(half, half); minimapCtx.lineTo(half - Math.sin(player.yaw) * 8, half - Math.cos(player.yaw) * 8); minimapCtx.stroke();
  minimapCtx.fillStyle = '#facc15'; minimapCtx.fillRect(half - 1, half - 1, 3, 3);
  return true;
}

btnReset.addEventListener('click', () => { applyWorldSeed(Math.floor(Math.random() * 999999)); startGameplay(); });
const btnApplySeed = document.getElementById('btn-apply-seed'), seedInputEl = document.getElementById('seed-input');
if (seedInputEl) seedInputEl.value = `${worldSeed}`;
if (btnApplySeed) btnApplySeed.addEventListener('click', () => { applyWorldSeed(seedInputEl ? parseInt(seedInputEl.value, 10) : 0); startGameplay(); });
const btnTpDesert = document.getElementById('btn-tp-desert'), btnTpSnow = document.getElementById('btn-tp-snow'), btnTpBiome = document.getElementById('btn-tp-biome'), biomeSelectEl = document.getElementById('biome-select');
if (btnTpDesert) btnTpDesert.addEventListener('click', () => { teleportToBiome('Desierto'); startGameplay(); });
if (btnTpSnow) btnTpSnow.addEventListener('click', () => { teleportToBiome('Taiga Nevada'); startGameplay(); });
if (btnTpBiome && biomeSelectEl) btnTpBiome.addEventListener('click', () => { teleportToBiome(biomeSelectEl.value || 'Llanura'); startGameplay(); });
btnExport.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ seed: worldSeed, deltas: worldDeltas }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `voxelcraft_world_${worldSeed}.json`; a.click(); URL.revokeObjectURL(url);
});
