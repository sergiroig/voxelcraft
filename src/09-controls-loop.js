// VoxelCraft HTML5 — 09-controls-loop.js (12B. PC & MOBILE MULTI-TOUCH INPUTS, 13. MAIN LOOP, TELEMETRY & TEST API)
'use strict';

window.addEventListener('mousemove', (e) => {
  if (!isLocked || Math.abs(e.movementX) > 350 || Math.abs(e.movementY) > 350) return;
  player.yaw -= e.movementX * 0.0022; player.pitch -= e.movementY * 0.0022;
  const maxPitch = Math.PI / 2 - 0.02;
  if (player.pitch > maxPitch) player.pitch = maxPitch;
  if (player.pitch < -maxPitch) player.pitch = -maxPitch;
});

window.addEventListener('keydown', (e) => {
  const isInputFocused = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (e.code === 'KeyP' && (!isInputFocused || e.target !== recipeSearchEl)) { e.preventDefault(); togglePauseMenu(); return; }
  if (isInputFocused) { if (e.code === 'Enter' && menuOpen) { e.preventDefault(); if (e.target === seedInputEl) applyWorldSeed(parseInt(seedInputEl.value, 10) || 0); togglePauseMenu(false); } return; }
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); }
  if (e.code === 'Enter' && menuOpen) { e.preventDefault(); togglePauseMenu(false); return; }
  if (menuOpen) return;
  keys[e.code] = true;
  if (e.code === 'KeyE') { if (chestOpen) closeChestModal(); else if (isGameActive() || invOpen) toggleInventory(); return; }
  if (e.code === 'Escape') return;
  if (e.code === 'F2' || e.code === 'KeyK') { e.preventDefault(); takeGameScreenshot(); return; }
  if (e.code.startsWith('Digit')) {
    const num = parseInt(e.code.slice(5), 10);
    if (num >= 1 && num <= hotbarSlots.length) updateHotbarSelection(selectedSlot === num - 1 ? -1 : num - 1);
  } else if (e.code === 'KeyF') toggleFlyingMode();
  else if (e.code === 'KeyG') toggleGameMode();
  else if (e.code === 'KeyC') toggleCameraMode();
  else if (e.code === 'KeyZ') toggleZoom();
  else if (e.code === 'KeyR') toggleRideMinecart();
  else if (e.code === 'KeyB') addWaypoint();
  else if (e.code === 'KeyT') toggleDayNight();
  else if (e.code === 'KeyV') toggleWeather();
  else if (e.code === 'KeyM') toggleMusic();
  else if (e.code === 'KeyH') { hudVisible = !hudVisible; userSettings.showHud = hudVisible; applyUserSettingsToUI(); document.getElementById('hud-stats').style.display = hudVisible ? 'block' : 'none'; saveUserSettings(); }
});

window.addEventListener('keyup', (e) => { if (e.code === 'Space') e.preventDefault(); keys[e.code] = false; });
let lastWheelStepTime = -1000, lastWheelEventTime = -1000, lastWheelDir = 0, wheelDeltaAccum = 0;
function handleHotbarWheel(deltaY, nowMs = performance.now(), deltaMode = 0) {
  if (!deltaY) return selectedSlot;
  const dir = deltaY > 0 ? 1 : -1, dtEvent = nowMs - lastWheelEventTime, dtStep = nowMs - lastWheelStepTime;
  lastWheelEventTime = nowMs;
  if (dir === lastWheelDir && dtStep < 110) { wheelDeltaAccum = 0; return selectedSlot; }
  const normDelta = deltaMode === 1 ? deltaY * 33 : (deltaMode === 2 ? deltaY * 100 : deltaY);
  if (dir !== lastWheelDir || dtEvent > 65 || Math.abs(wheelDeltaAccum += normDelta) >= 120) {
    wheelDeltaAccum = 0; lastWheelStepTime = nowMs; lastWheelDir = dir;
    return updateHotbarSelection(selectedSlot < 0 ? (dir > 0 ? 0 : hotbarSlots.length - 1) : selectedSlot + dir);
  }
  return selectedSlot;
}
window.addEventListener('wheel', (e) => { if (isLocked) handleHotbarWheel(e.deltaY, performance.now(), e.deltaMode); });
window.addEventListener('contextmenu', (e) => e.preventDefault());

let currentHit = null;

function triggerPrimaryAttackOrMine() {
  player.swingTime = 1.0; handArmMesh.visible = true;
  const heldId = getActiveHeldItem(), dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  if (heldId === BLOCK.TOOL_BOW) { shootArrow(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z); isMiningHeld = false; return; }
  if (heldId === BLOCK.TOOL_GRAPPLING_HOOK) { shootGrappleHook(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z); isMiningHeld = false; return; }
  const hitMob = raycastMob(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 4.3);
  if (hitMob) {
    if (heldId === BLOCK.TOOL_SHEARS && hitMob.type === 'sheep' && !hitMob.sheared) { shearSheep(hitMob); isMiningHeld = false; return; }
    if (heldId === BLOCK.TOOL_FLINT_AND_STEEL) { igniteMobWithFire(hitMob); isMiningHeld = false; return; }
    const baseDmg = heldId === BLOCK.TOOL_SWORD ? 5 : (isSwordItem(heldId) || heldId === BLOCK.TOOL_AXE ? 4 : (isPickaxeItem(heldId) ? 3 : 1));
    damageMob(hitMob, baseDmg + getItemEnchantLevel(heldId), dir.x, dir.z); isMiningHeld = false; return;
  }
  if (!currentHit) sfx.play('step');
  isMiningHeld = true;
}

window.addEventListener('mousedown', (e) => {
  if (!isLocked) {
    if (!menuOpen && !invOpen && !chestOpen && !isTouchMode && e.target === canvasEl && canvasEl.requestPointerLock) {
      try { const p = canvasEl.requestPointerLock(); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (_) {}
    }
    return;
  }
  if (e.button === 0) triggerPrimaryAttackOrMine();
  else if (e.button === 2) { if (isSwordItem(getActiveHeldItem()) && !currentHit) toggleShieldBlock(true); else { player.swingTime = 1.0; handArmMesh.visible = true; placeBlockAtCurrentTarget(); } }
  else if (e.button === 1 && currentHit) {
    const idx = hotbarSlots.indexOf(currentHit.block);
    if (idx !== -1) updateHotbarSelection(idx);
    else { if (selectedSlot < 0) selectedSlot = 0; hotbarSlots[selectedSlot] = currentHit.block; buildHotbarUI(); }
  }
});

window.addEventListener('mouseup', (e) => { if (e.button === 0) isMiningHeld = false; if (e.button === 2 && isShieldBlocking) toggleShieldBlock(false); });

// ============================================================================
// 12B. MOBILE MULTI-TOUCH CONTROLLER (JOYSTICK + CAMERA DRAG + ACTION BUTTONS)
// ============================================================================
const joyZoneEl = document.getElementById('joy-zone'), joyStickEl = document.getElementById('joy-stick');
let joyTouchId = null, lookTouchId = null, lastLookX = 0, lastLookY = 0;

function updateJoystickFromTouch(touch) {
  const rect = joyZoneEl.getBoundingClientRect();
  const cx = rect.width > 0 ? rect.left + rect.width / 2 : 90, cy = rect.height > 0 ? rect.top + rect.height / 2 : 400;
  const maxR = Math.max(28, rect.width * 0.42);
  let dx = touch.clientX - cx, dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
  joyStickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joyX = dx / maxR; joyY = -dy / maxR; joySprint = (dist / maxR) > 0.82;
}

function resetJoystick() {
  joyTouchId = null; joyX = 0; joyY = 0; joySprint = false;
  joyStickEl.style.transform = 'translate(-50%, -50%)';
}

joyZoneEl.addEventListener('touchstart', (e) => {
  e.preventDefault(); e.stopPropagation();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (joyTouchId === null) { joyTouchId = t.identifier; updateJoystickFromTouch(t); break; }
  }
}, { passive: false });

joyZoneEl.addEventListener('touchmove', (e) => {
  e.preventDefault(); e.stopPropagation();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === joyTouchId) { updateJoystickFromTouch(t); break; }
  }
}, { passive: false });

const endJoyHandler = (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === joyTouchId) { resetJoystick(); break; }
};
joyZoneEl.addEventListener('touchend', endJoyHandler);
joyZoneEl.addEventListener('touchcancel', endJoyHandler);

canvasEl.addEventListener('touchstart', (e) => {
  if (!touchPlaying || invOpen) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (lookTouchId === null && t.identifier !== joyTouchId) { lookTouchId = t.identifier; lastLookX = t.clientX; lastLookY = t.clientY; break; }
  }
}, { passive: false });

canvasEl.addEventListener('touchmove', (e) => {
  if (!touchPlaying || invOpen) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === lookTouchId) {
      const dx = t.clientX - lastLookX, dy = t.clientY - lastLookY;
      lastLookX = t.clientX; lastLookY = t.clientY;
      player.yaw -= dx * 0.0048; player.pitch -= dy * 0.0048;
      const maxPitch = Math.PI / 2 - 0.02;
      if (player.pitch >  maxPitch) player.pitch =  maxPitch;
      if (player.pitch < -maxPitch) player.pitch = -maxPitch;
      break;
    }
  }
}, { passive: false });

const endLookHandler = (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === lookTouchId) { lookTouchId = null; break; }
};
canvasEl.addEventListener('touchend', endLookHandler);
canvasEl.addEventListener('touchcancel', endLookHandler);

function bindHoldButton(btnId, onDown, onUp) {
  const el = document.getElementById(btnId);
  if (!el) return;
  el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('pressed'); onDown(); }, { passive: false });
  const release = (e) => { e.preventDefault(); el.classList.remove('pressed'); onUp(); };
  el.addEventListener('touchend', release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
}

bindHoldButton('tbtn-mine',  () => { triggerPrimaryAttackOrMine(); }, () => { isMiningHeld = false; });
bindHoldButton('tbtn-place', () => { placeBlockAtCurrentTarget(); }, () => {});
bindHoldButton('tbtn-jump',  () => { touchJump = true; }, () => { touchJump = false; });
bindHoldButton('tbtn-down',  () => { touchDown = true; }, () => { touchDown = false; });

const bindTap = (id, fn) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('click', fn);
};

bindTap('tbtn-inv',     () => toggleInventory());
bindTap('tbtn-mode',    () => toggleGameMode());
bindTap('tbtn-fly',     () => toggleFlyingMode());
bindTap('tbtn-cam',     () => toggleCameraMode());
bindTap('tbtn-zoom',    () => toggleZoom());
bindTap('tbtn-cart',    () => toggleRideMinecart());
bindTap('tbtn-wp',      () => addWaypoint());
bindTap('tbtn-photo',   () => takeGameScreenshot());
bindTap('tbtn-time',    () => toggleDayNight());
bindTap('tbtn-weather', () => toggleWeather());
bindTap('tbtn-music',   () => toggleMusic());
bindTap('tbtn-hud',     () => { hudVisible = !hudVisible; userSettings.showHud = hudVisible; applyUserSettingsToUI(); document.getElementById('hud-stats').style.display = hudVisible ? 'block' : 'none'; saveUserSettings(); });
bindTap('tbtn-menu',    () => togglePauseMenu(true));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 13. MAIN LOOP & TELEMETRY
// ============================================================================
player.y = findSpawnHeight(player.x, player.z);

const elFps = document.getElementById('stat-fps'), elDraws = document.getElementById('stat-draws');
const elTris = document.getElementById('stat-tris'), elChunks = document.getElementById('stat-chunks');
const elPos = document.getElementById('stat-pos'), elLight = document.getElementById('stat-light'), elMode = document.getElementById('stat-mode');
let lastTime = performance.now(), frames = 0, fpsAccum = 0, frameDurationSum = 0;
const rayDir = new THREE.Vector3();

function animate(now) {
  requestAnimationFrame(animate);
  const frameStart = performance.now(), realDt = Math.max(0.0001, (now - lastTime) / 1000);
  const dt = Math.min(0.05, realDt);
  lastTime = now;

  if (!menuOpen) {
    if (isGameActive()) {
      updateMinecarts(dt); updateBoats(dt); updatePlayerPhysics(dt);
      updateVoxelSimulation(dt); updateMobs(dt);
    }
    updateDynamicSky(dt); updateGPUShaders(dt); updateAmbientAudio(dt);
    rayDir.set(0, 0, -1).applyEuler(camera.rotation);
    currentHit = raycastVoxel(player.x, player.y + player.eyeHeight, player.z, rayDir.x, rayDir.y, rayDir.z, 6.5);
    if (currentHit) { highlightBox.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5); highlightBox.visible = true; }
    else highlightBox.visible = false;
    updateMining(dt, currentHit); updateParticles(dt); updateItemDrops(dt);
    updateArrows(dt); updateWeather(dt); updateMinimap(dt);
  }
  updateChunkStreaming(); updateFrustumCulling();
  updateShadowMapPass();
  renderer.render(scene, camera);

  const frameMs = performance.now() - frameStart;
  frames++; fpsAccum += realDt; frameDurationSum += frameMs;

  if (fpsAccum >= 0.35) {
    const fps = Math.round(frames / fpsAccum);
    updateDynamicResolution(fps);
    const avgMsNum = frameDurationSum / frames, avgMs = avgMsNum.toFixed(2);
    const fpsCost60 = ((avgMsNum / 16.667) * 60).toFixed(2);
    const biome = generator.getBiomeAt(player.x, player.z);
    const pLight = getLightGlobal(Math.floor(player.x), Math.floor(player.y + 1), Math.floor(player.z));

    elFps.textContent = `${fps} FPS (${avgMs} ms | usa ${fpsCost60}/60 FPS)`;
    elDraws.textContent = renderer.info.render.calls;
    elTris.textContent = renderer.info.render.triangles.toLocaleString();
    elChunks.textContent = `${visibleChunksCount}/${chunks.size} | Mobs: ${mobs.length}`;
    elPos.textContent = `${player.x.toFixed(0)}, ${player.y.toFixed(0)}, ${player.z.toFixed(0)} (${biome})`;
    elLight.textContent = `Sol ${pLight >> 4} | Bloque ${pLight & 15}`;
    elMode.textContent = `${gameMode === 'creative' ? 'Creativo' : 'Supervivencia'}${player.flying ? ' (Vuelo)' : ''} | ${isNight ? 'Noche' : 'Día'}`;
    frames = 0; fpsAccum = 0; frameDurationSum = 0;
  }
}

// ============================================================================
// 13B. MINECRAFT-STYLE INVENTORY (2×2), CRAFTING TABLE (3×3) & 27-SLOT CHESTS
// ============================================================================
const chestModalEl = document.getElementById('chest-modal'), chestItemsGridEl = document.getElementById('chest-items-grid');
const chestPlayerGridEl = document.getElementById('chest-player-grid'), chestHotbarGridEl = document.getElementById('chest-hotbar-grid');
const chestStatusBannerEl = document.getElementById('chest-status-banner'), chestModalTitleEl = document.getElementById('chest-modal-title');
const btnChestCloseEl = document.getElementById('btn-chest-close'), btnChestTakeAllEl = document.getElementById('btn-chest-take-all');
const btnChestDepositAllEl = document.getElementById('btn-chest-deposit-all'), btnChestQuickEl = document.getElementById('btn-chest-quick');
const mcCursorEl = document.getElementById('mc-cursor-item'), mcCursorCanvas = document.getElementById('mc-cursor-canvas'), mcCursorCountEl = document.getElementById('mc-cursor-count');

function updateCursorItemDOM(clientX, clientY) {
  if (!mcCursorEl) return;
  if (!cursorItem.id || cursorItem.count <= 0 || (!invOpen && !chestOpen)) { mcCursorEl.classList.add('hidden'); return; }
  mcCursorEl.classList.remove('hidden');
  if (typeof clientX === 'number' && typeof clientY === 'number') { mcCursorEl.style.left = `${clientX}px`; mcCursorEl.style.top = `${clientY}px`; }
  if (mcCursorCanvas) drawItemIcon(mcCursorCanvas, cursorItem.id);
  if (mcCursorCountEl) mcCursorCountEl.textContent = cursorItem.count > 1 ? `${cursorItem.count}` : '';
}

window.addEventListener('mousemove', (e) => { if (invOpen || chestOpen) updateCursorItemDOM(e.clientX, e.clientY); });

function recomputeInventoryCountsFromSlots() {
  for (const bId of ALL_INVENTORY_ITEMS) inventoryCounts[bId] = 0;
  for (let i = 0; i < 9; i++) {
    const id = hotbarSlots[i] || 0, c = hotbarCounts[i] || 0;
    if (id > 0 && c > 0) inventoryCounts[id] = (inventoryCounts[id] || 0) + c;
    else if (gameMode === 'survival') { hotbarSlots[i] = 0; hotbarCounts[i] = 0; }
    if (craftGridSlots[i].id > 0 && craftGridSlots[i].count > 0) inventoryCounts[craftGridSlots[i].id] = (inventoryCounts[craftGridSlots[i].id] || 0) + craftGridSlots[i].count;
  }
  for (let i = 0; i < 27; i++) {
    const s = invSlots[i];
    if (s.id > 0 && s.count > 0) inventoryCounts[s.id] = (inventoryCounts[s.id] || 0) + s.count;
    else { s.id = 0; s.count = 0; }
  }
  if (cursorItem.id > 0 && cursorItem.count > 0) inventoryCounts[cursorItem.id] = (inventoryCounts[cursorItem.id] || 0) + cursorItem.count;
}

function reconcileSlotsFromInventoryCounts() {
  for (let i = 0; i < 9; i++) {
    const hId = hotbarSlots[i] || 0;
    if (hId === 0 || (gameMode === 'survival' && (inventoryCounts[hId] || 0) <= 0)) {
      if (gameMode === 'survival') hotbarSlots[i] = 0;
      hotbarCounts[i] = 0;
    } else if (hotbarCounts[i] <= 0) {
      const fromInv = invSlots.find(s => s.id === hId && s.count > 0);
      if (fromInv) { hotbarCounts[i] = fromInv.count; fromInv.id = 0; fromInv.count = 0; }
      else hotbarCounts[i] = Math.max(1, inventoryCounts[hId] || 1);
    }
  }
  for (const bId of ALL_INVENTORY_ITEMS) {
    let sum = (cursorItem.id === bId ? cursorItem.count : 0);
    for (let i = 0; i < 9; i++) { if (hotbarSlots[i] === bId) sum += hotbarCounts[i]; if (craftGridSlots[i].id === bId) sum += craftGridSlots[i].count; }
    for (let i = 0; i < 27; i++) if (invSlots[i].id === bId) sum += invSlots[i].count;
    const diff = Math.max(0, inventoryCounts[bId] || 0) - sum;
    if (diff > 0) {
      const hIdx = hotbarSlots.indexOf(bId), exSlot = invSlots.find(s => s.id === bId && s.count > 0);
      if (hIdx !== -1) { hotbarCounts[hIdx] += diff; continue; }
      if (exSlot) { exSlot.count += diff; continue; }
      const empH = hotbarSlots.indexOf(0), empI = invSlots.find(s => s.id === 0 || s.count <= 0);
      if (empH !== -1) { hotbarSlots[empH] = bId; hotbarCounts[empH] = diff; continue; }
      if (empI) { empI.id = bId; empI.count = diff; }
    } else if (diff < 0) {
      let rem = -diff;
      for (let i = 26; i >= 0 && rem > 0; i--) if (invSlots[i].id === bId) {
        const take = Math.min(rem, invSlots[i].count); invSlots[i].count -= take; rem -= take;
        if (invSlots[i].count <= 0) { invSlots[i].id = 0; invSlots[i].count = 0; }
      }
      for (let i = 8; i >= 0 && rem > 0; i--) if (hotbarSlots[i] === bId) {
        const take = Math.min(rem, hotbarCounts[i]); hotbarCounts[i] -= take; rem -= take;
        if (hotbarCounts[i] <= 0 && gameMode === 'survival') hotbarSlots[i] = 0;
      }
    }
  }
}

function putStackIntoPlayerSlots(itemId, count, preferHotbar = true) {
  if (!itemId || count <= 0) return false;
  if (preferHotbar) { const hMatch = hotbarSlots.indexOf(itemId); if (hMatch !== -1) { hotbarCounts[hMatch] += count; return true; } }
  const iMatch = invSlots.find(s => s.id === itemId && s.count > 0);
  if (iMatch) { iMatch.count += count; return true; }
  if (preferHotbar) { const hEmpty = hotbarSlots.indexOf(0); if (hEmpty !== -1) { hotbarSlots[hEmpty] = itemId; hotbarCounts[hEmpty] = count; return true; } }
  const iEmpty = invSlots.find(s => s.id === 0 || s.count <= 0);
  if (iEmpty) { iEmpty.id = itemId; iEmpty.count = count; return true; }
  const hEmpty2 = hotbarSlots.indexOf(0);
  if (hEmpty2 !== -1) { hotbarSlots[hEmpty2] = itemId; hotbarCounts[hEmpty2] = count; return true; }
  return false;
}

function returnCraftAndCursorItemsToInventory() {
  for (let i = 0; i < 9; i++) if (craftGridSlots[i].id > 0 && craftGridSlots[i].count > 0) {
    putStackIntoPlayerSlots(craftGridSlots[i].id, craftGridSlots[i].count, true); craftGridSlots[i].id = 0; craftGridSlots[i].count = 0;
  }
  if (cursorItem.id > 0 && cursorItem.count > 0) { putStackIntoPlayerSlots(cursorItem.id, cursorItem.count, true); cursorItem.id = 0; cursorItem.count = 0; }
  craftOutputSlot.id = 0; craftOutputSlot.count = 0; craftOutputSlot.recipeIdx = -1;
  recomputeInventoryCountsFromSlots(); updateCursorItemDOM();
}

function getPatternTrimSignature(ids, size) {
  let minR = size, maxR = -1, minC = size, maxC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (ids[r * size + c] > 0) {
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (c < minC) minC = c; if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return '';
  const out = [];
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) out.push(normalizeCraftingId(ids[r * size + c]));
  return `${maxC - minC + 1}x${maxR - minR + 1}:${out.join(',')}`;
}

function evaluateCraftingGrid() {
  const maxGrid = craftingTableMode ? 3 : 2, cellCount = maxGrid * maxGrid;
  const activeIds = [], gridCounts = {};
  let nonEmptyCells = 0;
  for (let i = 0; i < cellCount; i++) {
    const s = craftGridSlots[i], id = (s && s.count > 0) ? s.id : 0, normId = normalizeCraftingId(id);
    activeIds.push(id);
    if (normId > 0) { nonEmptyCells++; gridCounts[normId] = (gridCounts[normId] || 0) + s.count; }
  }
  if (nonEmptyCells === 0) { craftOutputSlot.id = 0; craftOutputSlot.count = 0; craftOutputSlot.recipeIdx = -1; return null; }
  const inputSig = getPatternTrimSignature(activeIds, maxGrid), distinctTypes = Object.keys(gridCounts).map(Number);

  // Pass 1: Exact 2D shape pattern match
  for (let idx = 0; idx < CRAFTING_RECIPES.length; idx++) {
    const rec = CRAFTING_RECIPES[idx], rSize = rec.gridSize || 2;
    if (rSize <= maxGrid && rec.pattern && getPatternTrimSignature(rec.pattern, rSize) === inputSig) {
      craftOutputSlot.id = rec.outId; craftOutputSlot.count = rec.outCount; craftOutputSlot.recipeIdx = idx;
      return craftOutputSlot;
    }
  }

  // Pass 2: Flexible ingredient match within allowed grid size (2x2 vs 3x3)
  for (let idx = 0; idx < CRAFTING_RECIPES.length; idx++) {
    const rec = CRAFTING_RECIPES[idx];
    if ((rec.gridSize || 2) > maxGrid || rec.ingredients.length !== distinctTypes.length) continue;
    let ok = true;
    for (const ing of rec.ingredients) if ((gridCounts[normalizeCraftingId(ing.id)] || 0) < ing.count) { ok = false; break; }
    if (ok) {
      craftOutputSlot.id = rec.outId; craftOutputSlot.count = rec.outCount; craftOutputSlot.recipeIdx = idx;
      return craftOutputSlot;
    }
  }
  craftOutputSlot.id = 0; craftOutputSlot.count = 0; craftOutputSlot.recipeIdx = -1;
  return null;
}

function craftFromOutputSlot() {
  evaluateCraftingGrid();
  if (craftOutputSlot.id <= 0 || craftOutputSlot.recipeIdx < 0) return false;
  const rec = CRAFTING_RECIPES[craftOutputSlot.recipeIdx];
  if (!rec) return false;
  const maxGrid = craftingTableMode ? 3 : 2, cellCount = maxGrid * maxGrid;

  if (gameMode === 'survival') {
    for (const ing of rec.ingredients) {
      let rem = ing.count;
      while (rem > 0) {
        let progressed = false;
        for (let i = 0; i < cellCount && rem > 0; i++) {
          if (areCraftingItemsEquivalent(craftGridSlots[i].id, ing.id) && craftGridSlots[i].count > 0) {
            craftGridSlots[i].count--; rem--; progressed = true;
            if (craftGridSlots[i].count <= 0) { craftGridSlots[i].id = 0; craftGridSlots[i].count = 0; }
          }
        }
        if (!progressed) break;
      }
    }
  } else {
    for (let i = 0; i < cellCount; i++) { craftGridSlots[i].id = 0; craftGridSlots[i].count = 0; }
  }
  putStackIntoPlayerSlots(rec.outId, rec.outCount, true);
  autoEquipToHotbar(rec.outId);
  recomputeInventoryCountsFromSlots(); evaluateCraftingGrid();
  sfx.play('craft'); saveWorldData(); refreshInventoryCountsUI();
  return true;
}

function fillOrCraftRecipeInGrid(recipeIdx) {
  const rec = CRAFTING_RECIPES[recipeIdx];
  if (!rec) return false;
  const maxGrid = craftingTableMode ? 3 : 2;
  if (gameMode === 'survival' && (rec.gridSize || 2) > maxGrid) return false;
  evaluateCraftingGrid();
  if (craftOutputSlot.recipeIdx === recipeIdx) return craftFromOutputSlot();
  returnCraftAndCursorItemsToInventory();
  if (!canCraftRecipe(recipeIdx, true)) return false;

  const pat = rec.pattern || [], patSize = rec.gridSize || 2, placedCounts = {};
  for (let r = 0; r < patSize; r++) {
    for (let c = 0; c < patSize; c++) {
      const bId = pat[r * patSize + c] || 0;
      if (bId) {
        const norm = normalizeCraftingId(bId);
        const actualId = (norm === BLOCK.DIAMOND_ORE && (inventoryCounts[BLOCK.ITEM_DIAMOND] || 0) > 0) ? BLOCK.ITEM_DIAMOND : ((norm === BLOCK.COAL_ORE && (inventoryCounts[BLOCK.ITEM_COAL] || 0) > 0) ? BLOCK.ITEM_COAL : bId);
        const dstIdx = r * maxGrid + c;
        craftGridSlots[dstIdx].id = actualId; craftGridSlots[dstIdx].count = 1;
        placedCounts[norm] = (placedCounts[norm] || 0) + 1;
      }
    }
  }
  for (const ing of rec.ingredients) {
    const norm = normalizeCraftingId(ing.id), extra = Math.max(0, ing.count - (placedCounts[norm] || 0));
    if (extra > 0) { const slot = craftGridSlots.find(s => areCraftingItemsEquivalent(s.id, ing.id)); if (slot) slot.count += extra; }
    if (gameMode === 'survival') {
      let rem = ing.count;
      for (let i = 26; i >= 0 && rem > 0; i--) {
        if (areCraftingItemsEquivalent(invSlots[i].id, ing.id)) {
          const take = Math.min(rem, invSlots[i].count);
          invSlots[i].count -= take; rem -= take;
          if (invSlots[i].count <= 0) { invSlots[i].id = 0; invSlots[i].count = 0; }
        }
      }
      for (let i = 8; i >= 0 && rem > 0; i--) {
        if (areCraftingItemsEquivalent(hotbarSlots[i], ing.id)) {
          const take = Math.min(rem, hotbarCounts[i]);
          hotbarCounts[i] -= take; rem -= take;
          if (hotbarCounts[i] <= 0) hotbarSlots[i] = 0;
        }
      }
    }
  }
  recomputeInventoryCountsFromSlots(); evaluateCraftingGrid();
  sfx.play('step'); renderMinecraftInventoryDOM();
  return true;
}

function giveCreativeStackToSlot(bId) {
  putStackIntoPlayerSlots(bId, isNonStackTool(bId) ? 1 : 16, true);
  recomputeInventoryCountsFromSlots(); sfx.play('pickup'); saveWorldData(); refreshInventoryCountsUI();
}

function getSlotRef(container, idx) {
  if (container === 'armor') return { get id() { return armorSlots[idx] || 0; }, set id(v) { armorSlots[idx] = v; }, get count() { return armorSlots[idx] > 0 ? 1 : 0; }, set count(v) { if (v <= 0) armorSlots[idx] = 0; } };
  if (container === 'hotbar') return { get id() { return hotbarSlots[idx] || 0; }, set id(v) { hotbarSlots[idx] = v; }, get count() { return hotbarCounts[idx] || 0; }, set count(v) { hotbarCounts[idx] = v; } };
  if (container === 'inv') return invSlots[idx];
  if (container === 'craft') return craftGridSlots[idx];
  if (container === 'chest' && activeChestKey && chestLootMap[activeChestKey]) return ensureChestSlots(chestLootMap[activeChestKey])[idx];
  return null;
}

function syncActiveChestLegacyFields() {
  if (!activeChestKey || !chestLootMap[activeChestKey]) return;
  const record = chestLootMap[activeChestKey], slots = ensureChestSlots(record);
  record.storedId = 0; record.storedCount = 0; record.items = [];
  for (let i = 0; i < 27; i++) {
    if (slots[i].id > 0 && slots[i].count > 0) {
      if (record.storedId === 0) { record.storedId = slots[i].id; record.storedCount = slots[i].count; }
      else record.items.push({ id: slots[i].id, count: slots[i].count });
    }
  }
}

function clickSlot(container, idx, button = 0, shiftKey = false) {
  if (container === 'output') return craftFromOutputSlot();
  const slot = getSlotRef(container, idx);
  if (!slot) return false;
  if (container === 'armor' && cursorItem.id > 0 && getArmorSlotForItem(cursorItem.id) !== idx) return false;
  const isShift = shiftKey || quickMoveMode;

  if (isShift && slot.id > 0 && slot.count > 0) {
    if (!chestOpen && (container === 'inv' || container === 'hotbar') && isArmorItem(slot.id)) {
      const aIdx = getArmorSlotForItem(slot.id);
      if (armorSlots[aIdx] === 0) { armorSlots[aIdx] = slot.id; slot.count--; if (slot.count <= 0) slot.id = 0; }
    } else if (container === 'armor' || container === 'chest' || container === 'craft') {
      putStackIntoPlayerSlots(slot.id, slot.count, true); slot.id = 0; slot.count = 0;
    } else if (chestOpen && (container === 'inv' || container === 'hotbar')) {
      const cSlots = ensureChestSlots(chestLootMap[activeChestKey]);
      const match = cSlots.find(s => s.id === slot.id && s.count > 0) || cSlots.find(s => s.id === 0 || s.count <= 0);
      if (match) {
        if (match.id === slot.id) match.count += slot.count; else { match.id = slot.id; match.count = slot.count; }
        slot.id = 0; slot.count = 0;
      }
    } else if (container === 'inv') {
      const hMatch = hotbarSlots.indexOf(slot.id), hEmp = hotbarSlots.indexOf(0);
      if (hMatch !== -1) { hotbarCounts[hMatch] += slot.count; slot.id = 0; slot.count = 0; }
      else if (hEmp !== -1) { hotbarSlots[hEmp] = slot.id; hotbarCounts[hEmp] = slot.count; slot.id = 0; slot.count = 0; }
    } else if (container === 'hotbar') {
      const iMatch = invSlots.find(s => s.id === slot.id && s.count > 0) || invSlots.find(s => s.id === 0 || s.count <= 0);
      if (iMatch) {
        if (iMatch.id === slot.id) iMatch.count += slot.count; else { iMatch.id = slot.id; iMatch.count = slot.count; }
        slot.id = 0; slot.count = 0;
      }
    }
  } else if (button === 2) {
    if (cursorItem.id === 0) {
      if (slot.id > 0 && slot.count > 0) {
        const half = Math.ceil(slot.count / 2);
        cursorItem.id = slot.id; cursorItem.count = half; slot.count -= half;
        if (slot.count <= 0) { slot.id = 0; slot.count = 0; }
      }
    } else {
      if (slot.id === 0 || slot.count <= 0) { slot.id = cursorItem.id; slot.count = 1; cursorItem.count--; }
      else if (slot.id === cursorItem.id) { slot.count++; cursorItem.count--; }
      if (cursorItem.count <= 0) { cursorItem.id = 0; cursorItem.count = 0; }
    }
  } else {
    if (cursorItem.id === 0) {
      if (slot.id > 0 && slot.count > 0) { cursorItem.id = slot.id; cursorItem.count = slot.count; slot.id = 0; slot.count = 0; }
    } else {
      if (slot.id === 0 || slot.count <= 0) { slot.id = cursorItem.id; slot.count = cursorItem.count; cursorItem.id = 0; cursorItem.count = 0; }
      else if (slot.id === cursorItem.id && container !== 'armor') { slot.count += cursorItem.count; cursorItem.id = 0; cursorItem.count = 0; }
      else { const tmpId = slot.id, tmpCnt = slot.count; slot.id = cursorItem.id; slot.count = cursorItem.count; cursorItem.id = tmpId; cursorItem.count = tmpCnt; }
    }
  }

  recomputeInventoryCountsFromSlots();
  if (chestOpen) syncActiveChestLegacyFields();
  evaluateCraftingGrid(); sfx.play('step'); saveWorldData(); buildHotbarUI();
  if (invOpen) renderMinecraftInventoryDOM();
  if (chestOpen) buildChestModalUI();
  updateCursorItemDOM();
  return true;
}

function createMcSlotEl(itemId, count, container, idx, extraClass = '', keyLabel = '') {
  const el = document.createElement('div');
  el.className = 'mc-slot' + (extraClass ? ' ' + extraClass : '');
  if (itemId > 0 && count > 0) {
    el.title = `${BLOCK_DEFS[itemId]?.name || 'Objeto'} (${count})`;
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
    drawItemIcon(cv, itemId); el.appendChild(cv);
    const badge = document.createElement('span'); badge.className = 'count'; badge.textContent = count > 1 ? `${count}` : '';
    el.appendChild(badge);
  }
  if (keyLabel) { const k = document.createElement('span'); k.className = 'key'; k.textContent = keyLabel; el.appendChild(k); }
  el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); clickSlot(container, idx, e.button, e.shiftKey); updateCursorItemDOM(e.clientX, e.clientY); });
  el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); clickSlot(container, idx, 0, quickMoveMode); }, { passive: false });
  return el;
}

const ARMOR_SLOT_ICONS = ['🪖', '🦺', '👖', '🥾'];
function drawPlayerAvatar2D() {
  const cv = document.getElementById('mc-avatar-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#5c3a21'; ctx.fillRect(16, 4, 16, 5);
  ctx.fillStyle = '#f1c27d'; ctx.fillRect(16, 9, 16, 12);
  if (armorSlots[0] > 0) { ctx.fillStyle = armorSlots[0] >= BLOCK.ARMOR_DIAMOND_HELMET ? '#38bdf8' : '#e2e8f0'; ctx.fillRect(15, 3, 18, 7); }
  ctx.fillStyle = '#1e293b'; ctx.fillRect(19, 13, 3, 3); ctx.fillRect(26, 13, 3, 3);
  ctx.fillStyle = '#b45309'; ctx.fillRect(22, 17, 4, 2);
  ctx.fillStyle = armorSlots[1] > 0 ? (armorSlots[1] >= BLOCK.ARMOR_DIAMOND_HELMET ? '#38bdf8' : '#e2e8f0') : '#0284c7';
  ctx.fillRect(14, 21, 20, 22);
  ctx.fillStyle = '#f1c27d'; ctx.fillRect(8, 21, 6, 20); ctx.fillRect(34, 21, 6, 20);
  ctx.fillStyle = armorSlots[2] > 0 ? (armorSlots[2] >= BLOCK.ARMOR_DIAMOND_HELMET ? '#0284c7' : '#94a3b8') : '#334155';
  ctx.fillRect(15, 43, 9, 21); ctx.fillRect(24, 43, 9, 21);
  if (armorSlots[3] > 0) { ctx.fillStyle = armorSlots[3] >= BLOCK.ARMOR_DIAMOND_HELMET ? '#38bdf8' : '#e2e8f0'; ctx.fillRect(15, 57, 9, 7); ctx.fillRect(24, 57, 9, 7); }
}

function renderMinecraftInventoryDOM() {
  const craftSlotsEl = document.getElementById('mc-craft-slots'), craftOutEl = document.getElementById('mc-craft-output');
  const invSlotsEl = document.getElementById('mc-inv-slots'), hbSlotsEl = document.getElementById('mc-hotbar-slots');
  const playerPreviewEl = document.getElementById('mc-player-preview-box'), craftLabelEl = document.getElementById('mc-craft-label');
  if (!craftSlotsEl || !invSlotsEl || !hbSlotsEl) return;

  if (playerPreviewEl) {
    playerPreviewEl.style.display = craftingTableMode ? 'none' : 'flex';
    const domArmor = playerPreviewEl.querySelectorAll('.mc-armor-slot');
    domArmor.forEach((el, aIdx) => {
      el.innerHTML = '';
      if (armorSlots[aIdx] > 0) {
        el.title = BLOCK_DEFS[armorSlots[aIdx]]?.name || '';
        const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
        drawItemIcon(cv, armorSlots[aIdx]); el.appendChild(cv);
      } else el.textContent = ARMOR_SLOT_ICONS[aIdx];
      el.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); clickSlot('armor', aIdx, e.button, e.shiftKey); updateCursorItemDOM(e.clientX, e.clientY); };
      el.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); clickSlot('armor', aIdx, 0, true); };
    });
  }
  if (!craftingTableMode) drawPlayerAvatar2D();
  if (craftLabelEl) craftLabelEl.textContent = craftingTableMode ? '⚒ Mesa de Crafteo (Cuadrícula 3×3)' : 'Fabricación Manual (2×2)';

  const maxGrid = craftingTableMode ? 3 : 2;
  craftSlotsEl.className = craftingTableMode ? 'mc-grid-3x3' : 'mc-grid-2x2';
  craftSlotsEl.innerHTML = '';
  for (let i = 0; i < maxGrid * maxGrid; i++) craftSlotsEl.appendChild(createMcSlotEl(craftGridSlots[i].id, craftGridSlots[i].count, 'craft', i));

  evaluateCraftingGrid();
  if (craftOutEl) {
    craftOutEl.innerHTML = '';
    craftOutEl.classList.toggle('ready', craftOutputSlot.id > 0);
    if (craftOutputSlot.id > 0) {
      craftOutEl.title = `Fabricar ${craftOutputSlot.count}× ${BLOCK_DEFS[craftOutputSlot.id]?.name || ''}`;
      const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      drawItemIcon(cv, craftOutputSlot.id); craftOutEl.appendChild(cv);
      const b = document.createElement('span'); b.className = 'count'; b.textContent = craftOutputSlot.count > 1 ? `${craftOutputSlot.count}` : '';
      craftOutEl.appendChild(b);
    } else craftOutEl.title = 'Resultado de fabricación';
    craftOutEl.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); craftFromOutputSlot(); };
    craftOutEl.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); craftFromOutputSlot(); };
  }

  invSlotsEl.innerHTML = '';
  for (let i = 0; i < 27; i++) invSlotsEl.appendChild(createMcSlotEl(invSlots[i].id, invSlots[i].count, 'inv', i));
  hbSlotsEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const hId = hotbarSlots[i] || 0, hCnt = gameMode === 'creative' && hId > 0 ? 1 : (hotbarCounts[i] || 0);
    hbSlotsEl.appendChild(createMcSlotEl(hId, hCnt, 'hotbar', i, i === selectedSlot ? 'active-hotbar' : '', `${i + 1}`));
  }
}

function buildChestModalUI() {
  if (!chestModalEl || !activeChestKey) return;
  const record = chestLootMap[activeChestKey];
  if (!record) return;
  reconcileSlotsFromInventoryCounts();
  const cSlots = ensureChestSlots(record);
  if (record.storedCount > 0 && record.storedId > 0 && !cSlots.some(s => s.id === record.storedId && s.count > 0)) {
    cSlots[0] = { id: record.storedId, count: record.storedCount };
  }
  chestItemsGridEl.innerHTML = '';
  for (let i = 0; i < 27; i++) chestItemsGridEl.appendChild(createMcSlotEl(cSlots[i].id, cSlots[i].count, 'chest', i));
  chestPlayerGridEl.innerHTML = '';
  for (let i = 0; i < 27; i++) chestPlayerGridEl.appendChild(createMcSlotEl(invSlots[i].id, invSlots[i].count, 'inv', i));
  if (chestHotbarGridEl) {
    chestHotbarGridEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const hId = hotbarSlots[i] || 0, hCnt = gameMode === 'creative' && hId > 0 ? 1 : (hotbarCounts[i] || 0);
      chestHotbarGridEl.appendChild(createMcSlotEl(hId, hCnt, 'hotbar', i, i === selectedSlot ? 'active-hotbar' : '', `${i + 1}`));
    }
  }
}

function openChestModalUI(wx, wy, wz, bannerMsg) {
  if (!chestModalEl) return;
  activeChestKey = `${wx},${wy},${wz}`; chestOpen = true; invOpen = false; craftingTableMode = false;
  invModalEl.classList.add('hidden'); isMiningHeld = false;
  if (chestModalTitleEl) chestModalTitleEl.textContent = `🎁 Cofre (${wx}, ${wy}, ${wz})`;
  if (chestStatusBannerEl && bannerMsg) chestStatusBannerEl.textContent = bannerMsg;
  buildChestModalUI(); chestModalEl.classList.remove('hidden');
  if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (_) {} }
}

function closeChestModal() {
  if (cursorItem.id > 0 && cursorItem.count > 0) {
    putStackIntoPlayerSlots(cursorItem.id, cursorItem.count, true);
    cursorItem.id = 0; cursorItem.count = 0; recomputeInventoryCountsFromSlots(); updateCursorItemDOM();
  }
  chestOpen = false; activeChestKey = null;
  if (chestModalEl) chestModalEl.classList.add('hidden');
  startGameplay();
}

const btnInvCloseEl = document.getElementById('btn-inv-close'), btnRecipeBookEl = document.getElementById('btn-recipe-book'), btnRecipeCloseEl = document.getElementById('btn-recipe-close');
const btnInvQuickEl = document.getElementById('btn-inv-quick-move'), recipeDrawerEl = document.getElementById('mc-recipe-drawer');
const recipeTabsEl = document.getElementById('mc-recipe-tabs'), recipeSearchEl = document.getElementById('mc-recipe-search');
const recipeCraftOnlyEl = document.getElementById('mc-recipe-craftable-only');

if (btnInvCloseEl) btnInvCloseEl.addEventListener('click', (e) => { e.preventDefault(); toggleInventory(false); });
if (invModalEl) invModalEl.addEventListener('click', (e) => { if (e.target === invModalEl && invOpen) toggleInventory(false); });
if (chestModalEl) chestModalEl.addEventListener('click', (e) => { if (e.target === chestModalEl && chestOpen) closeChestModal(); });
if (btnRecipeBookEl && recipeDrawerEl) btnRecipeBookEl.addEventListener('click', (e) => { e.preventDefault(); recipeDrawerEl.classList.toggle('hidden'); btnRecipeBookEl.classList.toggle('toggled', !recipeDrawerEl.classList.contains('hidden')); });
if (btnRecipeCloseEl && recipeDrawerEl) btnRecipeCloseEl.addEventListener('click', (e) => { e.preventDefault(); recipeDrawerEl.classList.add('hidden'); if (btnRecipeBookEl) btnRecipeBookEl.classList.remove('toggled'); });
if (recipeTabsEl) recipeTabsEl.querySelectorAll('.mc-recipe-tab').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); setRecipeBookFilter({ category: btn.dataset.cat }); }));
if (recipeSearchEl) { recipeSearchEl.addEventListener('input', () => setRecipeBookFilter({ search: recipeSearchEl.value })); recipeSearchEl.addEventListener('keydown', (e) => e.stopPropagation()); }
if (recipeCraftOnlyEl) recipeCraftOnlyEl.addEventListener('click', (e) => { e.preventDefault(); setRecipeBookFilter({ craftableOnly: !recipeBookState.craftableOnly }); });

const toggleQuickMoveBtn = (e) => {
  e.preventDefault(); quickMoveMode = !quickMoveMode;
  for (const b of [btnInvQuickEl, btnChestQuickEl]) if (b) { b.textContent = `⚡ Mover Rápido: ${quickMoveMode ? 'ON' : 'OFF'}`; b.classList.toggle('toggled', quickMoveMode); }
};
if (btnInvQuickEl) btnInvQuickEl.addEventListener('click', toggleQuickMoveBtn);
if (btnChestQuickEl) btnChestQuickEl.addEventListener('click', toggleQuickMoveBtn);
if (btnChestCloseEl) btnChestCloseEl.addEventListener('click', (e) => { e.preventDefault(); closeChestModal(); });

if (btnChestTakeAllEl) {
  btnChestTakeAllEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (!activeChestKey || !chestLootMap[activeChestKey]) return;
    const record = chestLootMap[activeChestKey], cSlots = ensureChestSlots(record);
    for (let i = 0; i < 27; i++) if (cSlots[i].id > 0 && cSlots[i].count > 0) { putStackIntoPlayerSlots(cSlots[i].id, cSlots[i].count, true); cSlots[i].id = 0; cSlots[i].count = 0; }
    record.storedId = 0; record.storedCount = 0; record.items = []; record.lastLoot = null;
    recomputeInventoryCountsFromSlots(); sfx.play('chest'); refreshInventoryCountsUI(); saveWorldData(); buildChestModalUI();
  });
}

if (btnChestDepositAllEl) {
  btnChestDepositAllEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (!activeChestKey || !chestLootMap[activeChestKey]) return;
    const record = chestLootMap[activeChestKey], cSlots = ensureChestSlots(record);
    for (let i = 0; i < 27; i++) {
      if (invSlots[i].id > 0 && invSlots[i].count > 0) {
        const dst = cSlots.find(s => s.id === invSlots[i].id && s.count > 0) || cSlots.find(s => s.id === 0 || s.count <= 0);
        if (dst) { if (dst.id === invSlots[i].id) dst.count += invSlots[i].count; else { dst.id = invSlots[i].id; dst.count = invSlots[i].count; } invSlots[i].id = 0; invSlots[i].count = 0; }
      }
    }
    syncActiveChestLegacyFields(); recomputeInventoryCountsFromSlots(); sfx.play('place'); refreshInventoryCountsUI(); saveWorldData(); buildChestModalUI();
  });
}

reconcileSlotsFromInventoryCounts();
renderMinecraftInventoryDOM();
requestAnimationFrame(animate);

window.__VOXELCRAFT__ = {
  BLOCK, BLOCK_DEFS, BIOME_LIST, ALL_INVENTORY_ITEMS, CRAFTING_RECIPES, SMELT_RECIPES, recipeBookState, setRecipeBookFilter, getRecipeCategory, buildMiniPatternHTML, normalizeCraftingId, areCraftingItemsEquivalent, getAvailIngredientCount, hotbarSlots, hotbarCounts, invSlots, craftGridSlots, craftOutputSlot, cursorItem, armorSlots,
  isCraftingTableMode: () => craftingTableMode, openCraftingTable, smeltInFurnace, isPickaxeItem, isSwordItem, isArmorItem, getArmorSlotForItem, isFoodItem, isNonStackTool,
  getArmorDefenseRatio, equipArmorItem, shearSheep, applyBoneMealAt, fishingBobber, FISHING_LOOT_TABLE, findWaterForFishing, useFishingRod, sleepInBed, respawnPlayerAtBed, useAnvilAt, enchantedItems, getItemEnchantLevel, countNearbyBookshelves, useEnchantingTableAt, cakeSlicesMap, getCakeSlicesAt, eatCakeSliceAt, igniteMobWithFire, useFlintAndSteelAt, getPickaxeTier, getRequiredPickaxeTier, canHarvestBlockWithTool, throwEnderPearl, exploredMapCells, mapState, isMapCellExplored, revealMapAroundPlayer, useEmptyMap, useCartographyMap, reconcileSlotsFromInventoryCounts, recomputeInventoryCountsFromSlots,
  evaluateCraftingGrid, craftFromOutputSlot, fillOrCraftRecipeInGrid, clickSlot, inventoryCounts, createInitialInventoryCounts, getActiveHeldItem, autoEquipToHotbar,
  CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_VOLUME, SEA_LEVEL, ATLAS_COLS, atlasCanvas, atlasTexture, crackTextures, scene, camera, renderer,
  handGroup, handMesh, handMat, handArmMesh, handSleeveMesh, handIconCanvas, handIconTex, updateHeldItemVisual, drawItemIcon, mcTexturesReady, mcExtendedReady, MC_BLOCK_TILE_FILES, MC_ITEM_SPRITE_FILES, MC_MOB_TILE_CROPS, MC_CUTOUT_TILES, MC_BIOME_TINTS, MOB_ATLAS_TILES,
  MOON_PHASE_FILES, getMoonPhaseIndex, setMoonPhaseIndex, sampleBiomeColormap, mcColormaps, mcHudAssets, shootCrossbow, throwTrident, toggleSpyglassScope, toggleElytraGlide, boostWithFireworkRocket, tryTriggerTotemOfUndying, triggerStickyPiston, triggerDispenserAt, hitTargetBlockAt,
  BREWING_RECIPES, activeStatusEffects, addStatusEffect, brewPotionAt, drinkPotion, renderStatusEffectsHUD, placedPaintings, placePaintingAt, mcParticleAtlasCanvas, mcParticleSprites, getCurrentDimension, switchDimension,
  VILLAGER_TRADES, tradeWithVillager, tameAndRideHorse, trySummonSnowGolem, updateBossBarHUD, isItem, isAxeItem, isShovelItem, isHoeItem, isPotionItem,
  player, playerAvatar, toggleCameraMode, toggleZoom, getCameraState: () => ({ thirdPersonMode, isZoomed, baseFov, fov: camera.fov }),
  updateFrustumCulling, getCullingStats: () => ({ visibleChunksCount, culledChunksCount }),
  chunks, buildQueue, simQueue, leafDecayQueue, hasNearbyWood, enqueueLeafDecayAround, mobs, mobAtlasCanvas, mobAtlasTexture, mobGeos, activeTNTs,
  particles, particleInstanced, itemDrops, dropInstanced, arrows, arrowInstanced, shootArrow, shootGrappleHook, grapplePullPlayerTo, updateArrows,
  eatHeldApple, FOOD_HUNGER_MAP, FOOD_SATURATION_MAP, growTreeAt, toggleVoxelDoor, toggleVoxelTrapdoor, triggerVoxelPiston, portals, registerPortalAt, activateObsidianPortal, useVoxelPortal,
  chestLootMap, openVoxelChest, openChestModalUI, closeChestModal, isChestOpen: () => chestOpen,
  minecarts, getRidingCart: () => ridingCart, spawnMinecart, toggleRideMinecart, updateMinecarts,
  boats, getRidingBoat: () => ridingBoat, spawnBoat, toggleRideBoat, updateBoats, toggleShieldBlock, isShieldBlocking: () => isShieldBlocking,
  takeGameScreenshot, getScreenshotState: () => ({ screenshotsTakenCount, lastScreenshotDataUrl }),
  trySummonIronGolem, waypoints, addWaypoint, removeWaypoint, teleportToWaypoint, buildWaypointsUI,
  weatherInstanced, toggleWeather, triggerLightningFlash, updateWeather, getWeatherState: () => ({ weatherMode, isSnowing, isSandstorm, lightningFlash, lightningCount }),
  toggleVoxelLever, propagateRedstoneSignal, minimapCanvas, minimapImgData, updateMinimap, getMinimapUpdatesCount: () => minimapUpdatesCount,
  applyWorldSeed, teleportToBiome, skyGroup, skyDomeMesh, celestialOrbit, sunMesh, moonMesh, sunGlow, moonGlow, starField, cloudMesh, setTimeOfDay,
  getCelestialAngle: () => celestialAngle, getMoonAngle: () => moonAngle, solidMaterial, waterMaterial, gpuShaderUniforms, updateGPUShaders,
  detectDefaultLightingMode, setLightingMode, getLightingMode: () => lightingMode, userSettings, saveUserSettings, loadUserSettings, openSettingsMenu, updateShadowMapPass, shadowMapTarget, shadowCamera, shadowMatrix, getShadowPassCount: () => shadowPassCount,
  getShaders: () => ({ solidShaderRef, waterShaderRef, isCameraUnderwater }), getChunkData, getVoxelGlobal, setVoxelGlobal, getLightGlobal,
  computeChunkLighting, buildChunkMeshArrays, applyArraysToMesh, rebuildChunkImmediate, packChunkPaddedBuffers, requestChunkMeshWorker, updateDynamicResolution,
  getWorkerState: () => ({ hasWorker: meshWorker !== null, workerJobsInFlight, workerJobsCompleted, lastWorkerMainThreadMs, currentPixelRatio, minPixelRatio, maxPixelRatio }),
  raycastVoxel, raycastMob, igniteTNT, explodeAt, updateVoxelSimulation, spawnMob, damageMob, removeMobAt, updateMobs, tameWolf, teleportEnderman, isHostileMob, MOB_HP_MAP, MOB_LOOT_MAP,
  updatePlayerPhysics, checkAABBCollision, damagePlayer, renderHeartsUI, addHungerExhaustion, updateMining, updateParticles, spawnItemDrop, updateItemDrops, getDropItemForBlock, addInventoryItem,
  canCraftRecipe, craftRecipe, toggleGameMode, refreshInventoryCountsUI, sfx, C418_SCALE_HZ, C418_CHORDS, toggleMusic, toggleSfx, updateAmbientAudio, updateDynamicSky,
  getGenerator: () => generator, farHorizonMesh, updateFarHorizon, updateChunkStreaming, toggleDayNight, toggleFlyingMode, toggleInventory, togglePauseMenu,
  updateHotbarSelection, placeBlockAtCurrentTarget, triggerPrimaryAttackOrMine, startGameplay, isGameActive, keys,
  getState: () => ({ worldSeed, worldDeltas, selectedSlot, renderDistance, isNight, sunFactor, invOpen, menuOpen, isLocked, touchPlaying, isMiningHeld, mineProgress, currentHit, joyX, joyY, joySprint, gameMode }),
  setMiningHeld: (v) => { isMiningHeld = v; }, setCurrentHit: (h) => { currentHit = h; },
  setTouchPlaying: (v) => { touchPlaying = v; menuOpen = !v; overlayEl.classList.toggle('hidden', !!v); touchControlsEl.classList.toggle('active', !!v); }
};
