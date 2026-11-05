// VoxelCraft HTML5 — 09-controls-loop.js (12B. PC & MOBILE MULTI-TOUCH INPUTS, 13. MAIN LOOP, TELEMETRY & TEST API)
'use strict';


window.addEventListener('mousemove', (e) => {
  if (!isLocked) return;
  const sensitivity = 0.0022;
  player.yaw   -= e.movementX * sensitivity;
  player.pitch -= e.movementY * sensitivity;
  const maxPitch = Math.PI / 2 - 0.02;
  if (player.pitch >  maxPitch) player.pitch =  maxPitch;
  if (player.pitch < -maxPitch) player.pitch = -maxPitch;
});

window.addEventListener('keydown', (e) => {
  const isInputFocused = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (isInputFocused) {
    if (e.code === 'Enter' && menuOpen) {
      e.preventDefault();
      if (e.target === seedInputEl) {
        applyWorldSeed(parseInt(seedInputEl.value, 10) || 0);
      }
      togglePauseMenu(false);
    }
    return;
  }

  keys[e.code] = true;
  if (e.code === 'KeyP') {
    e.preventDefault();
    togglePauseMenu();
    return;
  }
  if (e.code === 'Enter' && menuOpen) {
    e.preventDefault();
    togglePauseMenu(false);
    return;
  }
  if (e.code === 'KeyE') {
    if (isGameActive() || invOpen) {
      toggleInventory();
    }
    return;
  }
  if (e.code === 'Escape') {
    if (invOpen) {
      toggleInventory(false);
      return;
    }
    if (menuOpen && (performance.now() - lastPointerLockExitTime) < 120) {
      return;
    }
    togglePauseMenu();
    return;
  }
  if (e.code.startsWith('Digit')) {
    const num = parseInt(e.code.slice(5), 10);
    if (num >= 1 && num <= hotbarSlots.length) {
      updateHotbarSelection(num - 1);
    }
  } else if (e.code === 'KeyF') {
    toggleFlyingMode();
  } else if (e.code === 'KeyG') {
    toggleGameMode();
  } else if (e.code === 'KeyC') {
    toggleCameraMode();
  } else if (e.code === 'KeyZ') {
    toggleZoom();
  } else if (e.code === 'KeyT') {
    toggleDayNight();
  } else if (e.code === 'KeyV') {
    toggleWeather();
  } else if (e.code === 'KeyM') {
    toggleMusic();
  } else if (e.code === 'KeyH') {
    hudVisible = !hudVisible;
    document.getElementById('hud-stats').style.display = hudVisible ? 'block' : 'none';
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('wheel', (e) => {
  if (!isLocked) return;
  updateHotbarSelection(selectedSlot + (e.deltaY > 0 ? 1 : -1));
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

let currentHit = null;

function triggerPrimaryAttackOrMine() {
  player.swingTime = 1.0;
  const heldId = hotbarSlots[selectedSlot];
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

  if (heldId === BLOCK.TOOL_BOW) {
    shootArrow(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z);
    isMiningHeld = false;
    return;
  }

  const hitMob = raycastMob(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 4.3);
  if (hitMob) {
    const dmg = heldId === BLOCK.TOOL_SWORD ? 5 : (heldId === BLOCK.TOOL_PICKAXE ? 3 : 1);
    damageMob(hitMob, dmg, dir.x, dir.z);
    isMiningHeld = false;
    return;
  }
  isMiningHeld = true;
}

window.addEventListener('mousedown', (e) => {
  if (!isLocked) {
    if (!menuOpen && !invOpen && !isTouchMode && e.target === canvasEl && canvasEl.requestPointerLock) {
      try {
        const p = canvasEl.requestPointerLock();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }
    return;
  }

  if (e.button === 0) {
    triggerPrimaryAttackOrMine();
  } else if (e.button === 2) {
    placeBlockAtCurrentTarget();
  } else if (e.button === 1 && currentHit) {
    let idx = hotbarSlots.indexOf(currentHit.block);
    if (idx !== -1) {
      updateHotbarSelection(idx);
    } else {
      hotbarSlots[selectedSlot] = currentHit.block;
      buildHotbarUI();
    }
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) isMiningHeld = false;
});

// ============================================================================
// 12B. MOBILE MULTI-TOUCH CONTROLLER (JOYSTICK + CAMERA DRAG + ACTION BUTTONS)
// ============================================================================
const joyZoneEl  = document.getElementById('joy-zone');
const joyStickEl = document.getElementById('joy-stick');
let joyTouchId  = null;
let lookTouchId = null;
let lastLookX   = 0;
let lastLookY   = 0;

function updateJoystickFromTouch(touch) {
  const rect = joyZoneEl.getBoundingClientRect();
  const cx = rect.width > 0 ? rect.left + rect.width / 2 : 90;
  const cy = rect.height > 0 ? rect.top + rect.height / 2 : 400;
  const maxR = Math.max(28, rect.width * 0.42);

  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);

  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }

  joyStickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joyX = dx / maxR;
  joyY = -dy / maxR; // Up on screen is forward (+1)
  joySprint = (dist / maxR) > 0.82;
}

function resetJoystick() {
  joyTouchId = null;
  joyX = 0;
  joyY = 0;
  joySprint = false;
  joyStickEl.style.transform = 'translate(-50%, -50%)';
}

joyZoneEl.addEventListener('touchstart', (e) => {
  e.preventDefault();
  e.stopPropagation();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (joyTouchId === null) {
      joyTouchId = t.identifier;
      updateJoystickFromTouch(t);
      break;
    }
  }
}, { passive: false });

joyZoneEl.addEventListener('touchmove', (e) => {
  e.preventDefault();
  e.stopPropagation();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === joyTouchId) {
      updateJoystickFromTouch(t);
      break;
    }
  }
}, { passive: false });

const endJoyHandler = (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joyTouchId) {
      resetJoystick();
      break;
    }
  }
};
joyZoneEl.addEventListener('touchend', endJoyHandler);
joyZoneEl.addEventListener('touchcancel', endJoyHandler);

// Camera Look Drag on Canvas (Right thumb or anywhere outside controls)
canvasEl.addEventListener('touchstart', (e) => {
  if (!touchPlaying || invOpen) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (lookTouchId === null && t.identifier !== joyTouchId) {
      lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
      break;
    }
  }
}, { passive: false });

canvasEl.addEventListener('touchmove', (e) => {
  if (!touchPlaying || invOpen) return;
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === lookTouchId) {
      const dx = t.clientX - lastLookX;
      const dy = t.clientY - lastLookY;
      lastLookX = t.clientX;
      lastLookY = t.clientY;

      const touchSens = 0.0048;
      player.yaw   -= dx * touchSens;
      player.pitch -= dy * touchSens;
      const maxPitch = Math.PI / 2 - 0.02;
      if (player.pitch >  maxPitch) player.pitch =  maxPitch;
      if (player.pitch < -maxPitch) player.pitch = -maxPitch;
      break;
    }
  }
}, { passive: false });

const endLookHandler = (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === lookTouchId) {
      lookTouchId = null;
      break;
    }
  }
};
canvasEl.addEventListener('touchend', endLookHandler);
canvasEl.addEventListener('touchcancel', endLookHandler);

// Mobile Action Buttons binding
function bindHoldButton(btnId, onDown, onUp) {
  const el = document.getElementById(btnId);
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('pressed');
    onDown();
  }, { passive: false });
  const release = (e) => {
    e.preventDefault();
    el.classList.remove('pressed');
    onUp();
  };
  el.addEventListener('touchend', release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
}

bindHoldButton(
  'tbtn-mine',
  () => { triggerPrimaryAttackOrMine(); },
  () => { isMiningHeld = false; }
);
bindHoldButton(
  'tbtn-place',
  () => { placeBlockAtCurrentTarget(); },
  () => {}
);
bindHoldButton(
  'tbtn-jump',
  () => { touchJump = true; },
  () => { touchJump = false; }
);
bindHoldButton(
  'tbtn-down',
  () => { touchDown = true; },
  () => { touchDown = false; }
);

// Mobile Top Bar utility buttons
const bindTap = (id, fn) => {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }, { passive: false });
  el.addEventListener('click', fn);
};

bindTap('tbtn-inv',     () => toggleInventory());
bindTap('tbtn-mode',    () => toggleGameMode());
bindTap('tbtn-fly',     () => toggleFlyingMode());
bindTap('tbtn-cam',     () => toggleCameraMode());
bindTap('tbtn-zoom',    () => toggleZoom());
bindTap('tbtn-time',    () => toggleDayNight());
bindTap('tbtn-weather', () => toggleWeather());
bindTap('tbtn-music',   () => toggleMusic());
bindTap('tbtn-hud',   () => {
  hudVisible = !hudVisible;
  document.getElementById('hud-stats').style.display = hudVisible ? 'block' : 'none';
});
bindTap('tbtn-menu', () => {
  togglePauseMenu(true);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 13. MAIN LOOP & TELEMETRY
// ============================================================================
player.y = findSpawnHeight(player.x, player.z);

const elFps    = document.getElementById('stat-fps');
const elDraws  = document.getElementById('stat-draws');
const elTris   = document.getElementById('stat-tris');
const elChunks = document.getElementById('stat-chunks');
const elPos    = document.getElementById('stat-pos');
const elLight  = document.getElementById('stat-light');
const elMode   = document.getElementById('stat-mode');

let lastTime = performance.now();
let frames = 0;
let fpsAccum = 0;
let frameDurationSum = 0;
const rayDir = new THREE.Vector3();

function animate(now) {
  requestAnimationFrame(animate);

  const frameStart = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (isGameActive()) {
    updatePlayerPhysics(dt);
    updateVoxelSimulation(dt);
    updateMobs(dt);
  }

  updateDynamicSky(dt);
  updateGPUShaders(dt);
  updateAmbientAudio(dt);
  updateChunkStreaming();

  rayDir.set(0, 0, -1).applyEuler(camera.rotation);
  currentHit = raycastVoxel(
    player.x,
    player.y + player.eyeHeight,
    player.z,
    rayDir.x,
    rayDir.y,
    rayDir.z,
    6.5
  );

  if (currentHit) {
    highlightBox.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
    highlightBox.visible = true;
  } else {
    highlightBox.visible = false;
  }

  updateMining(dt, currentHit);
  updateParticles(dt);
  updateItemDrops(dt);
  updateArrows(dt);
  updateWeather(dt);
  updateMinimap(dt);
  updateFrustumCulling();

  renderer.render(scene, camera);

  const frameMs = performance.now() - frameStart;
  frames++;
  fpsAccum += dt;
  frameDurationSum += frameMs;

  if (fpsAccum >= 0.35) {
    const fps = Math.round(frames / fpsAccum);
    updateDynamicResolution(fps);
    const avgMsNum = frameDurationSum / frames;
    const avgMs = avgMsNum.toFixed(2);
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

    frames = 0;
    fpsAccum = 0;
    frameDurationSum = 0;
  }
}

// Expose zero-overhead testing & introspection hook for automated test suites
window.__VOXELCRAFT__ = {
  BLOCK,
  BLOCK_DEFS,
  ALL_INVENTORY_ITEMS,
  CRAFTING_RECIPES,
  hotbarSlots,
  inventoryCounts,
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  CHUNK_VOLUME,
  SEA_LEVEL,
  ATLAS_COLS,
  atlasCanvas,
  atlasTexture,
  crackTextures,
  scene,
  camera,
  renderer,
  player,
  playerAvatar,
  toggleCameraMode,
  toggleZoom,
  getCameraState: () => ({
    thirdPersonMode,
    isZoomed,
    baseFov,
    fov: camera.fov
  }),
  updateFrustumCulling,
  getCullingStats: () => ({
    visibleChunksCount,
    culledChunksCount
  }),
  chunks,
  buildQueue,
  simQueue,
  mobs,
  activeTNTs,
  particles,
  particleInstanced,
  itemDrops,
  dropInstanced,
  arrows,
  arrowInstanced,
  shootArrow,
  updateArrows,
  eatHeldApple,
  growTreeAt,
  toggleVoxelDoor,
  weatherInstanced,
  toggleWeather,
  triggerLightningFlash,
  updateWeather,
  getWeatherState: () => ({
    weatherMode,
    isSnowing,
    lightningFlash,
    lightningCount
  }),
  toggleVoxelLever,
  propagateRedstoneSignal,
  minimapCanvas,
  minimapImgData,
  updateMinimap,
  getMinimapUpdatesCount: () => minimapUpdatesCount,
  applyWorldSeed,
  teleportToBiome,
  skyGroup,
  sunMesh,
  moonMesh,
  starField,
  cloudMesh,
  solidMaterial,
  waterMaterial,
  gpuShaderUniforms,
  updateGPUShaders,
  getShaders: () => ({
    solidShaderRef,
    waterShaderRef,
    isCameraUnderwater
  }),
  getChunkData,
  getVoxelGlobal,
  setVoxelGlobal,
  getLightGlobal,
  computeChunkLighting,
  buildChunkMeshArrays,
  applyArraysToMesh,
  rebuildChunkImmediate,
  packChunkPaddedBuffers,
  requestChunkMeshWorker,
  updateDynamicResolution,
  getWorkerState: () => ({
    hasWorker: meshWorker !== null,
    workerJobsInFlight,
    workerJobsCompleted,
    lastWorkerMainThreadMs,
    currentPixelRatio,
    minPixelRatio,
    maxPixelRatio
  }),
  raycastVoxel,
  raycastMob,
  igniteTNT,
  explodeAt,
  updateVoxelSimulation,
  spawnMob,
  damageMob,
  removeMobAt,
  updateMobs,
  updatePlayerPhysics,
  checkAABBCollision,
  damagePlayer,
  updateMining,
  updateParticles,
  spawnItemDrop,
  updateItemDrops,
  getDropItemForBlock,
  addInventoryItem,
  canCraftRecipe,
  craftRecipe,
  toggleGameMode,
  refreshInventoryCountsUI,
  sfx,
  C418_SCALE_HZ,
  C418_CHORDS,
  toggleMusic,
  updateAmbientAudio,
  updateDynamicSky,
  getGenerator: () => generator,
  updateChunkStreaming,
  toggleDayNight,
  toggleFlyingMode,
  toggleInventory,
  togglePauseMenu,
  updateHotbarSelection,
  placeBlockAtCurrentTarget,
  triggerPrimaryAttackOrMine,
  startGameplay,
  isGameActive,
  getState: () => ({
    worldSeed,
    worldDeltas,
    selectedSlot,
    renderDistance,
    isNight,
    sunFactor,
    invOpen,
    menuOpen,
    isLocked,
    touchPlaying,
    isMiningHeld,
    mineProgress,
    currentHit,
    joyX,
    joyY,
    joySprint,
    gameMode
  }),
  setMiningHeld: (v) => { isMiningHeld = v; },
  setCurrentHit: (h) => { currentHit = h; },
  setTouchPlaying: (v) => {
    touchPlaying = v;
    menuOpen = !v;
    overlayEl.classList.toggle('hidden', !!v);
    touchControlsEl.classList.toggle('active', !!v);
  }
};

