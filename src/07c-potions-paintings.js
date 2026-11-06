// VoxelCraft HTML5 — 07c-potions-paintings.js (PHASES 1, 4, 5, 6, 8, 9 & 10: ENVIRONMENT, HUD, COLORMAPS, WEAPONS, POTIONS, PAINTINGS, PARTICLES & DIMENSIONS)
'use strict';

// ============================================================================
// 1. FASE 1: ENVIRONMENT, DESTROY STAGES, HUD SPRITES, MAP, OVERLAYS & COLORMAPS
// ============================================================================
const MOON_PHASE_FILES = [
  'environment/celestial/moon/full_moon.png',
  'environment/celestial/moon/waning_gibbous.png',
  'environment/celestial/moon/third_quarter.png',
  'environment/celestial/moon/waning_crescent.png',
  'environment/celestial/moon/new_moon.png',
  'environment/celestial/moon/waxing_crescent.png',
  'environment/celestial/moon/first_quarter.png',
  'environment/celestial/moon/waxing_gibbous.png'
];
let moonPhaseIndex = 0;
function getMoonPhaseIndex() { return moonPhaseIndex; }
function setMoonPhaseIndex(idx) {
  moonPhaseIndex = ((idx % 8) + 8) % 8;
  return MOON_PHASE_FILES[moonPhaseIndex];
}

const BIOME_CLIMATE_TH = {
  'Llanura':         [0.80, 0.40],
  'Bosque':          [0.70, 0.80],
  'Desierto':        [1.00, 0.00],
  'Taiga Nevada':    [0.05, 0.80],
  'Jungla':          [0.95, 0.90],
  'Pantano':         [0.80, 0.90],
  'Sabana':          [1.00, 0.00],
  'Meseta':          [1.00, 0.00],
  'Cumbres Heladas': [0.00, 0.50]
};

const mcColormaps = { grass: null, foliage: null };
const mcHudAssets = new Map();
const mcPaintingTextures = new Map();
const mcParticleSprites = new Map();
const mcParticleAtlasCanvas = document.createElement('canvas');
mcParticleAtlasCanvas.width = 128; mcParticleAtlasCanvas.height = 16;

function sampleBiomeColormap(biomeName = 'Llanura', kind = 'grass') {
  const [temp, hum] = BIOME_CLIMATE_TH[biomeName] || [0.8, 0.4];
  const t = Math.max(0, Math.min(1, temp));
  const h = Math.max(0, Math.min(1, hum)) * t;
  const x = Math.min(255, Math.max(0, Math.floor((1.0 - t) * 255)));
  const y = Math.min(255, Math.max(0, Math.floor((1.0 - h) * 255)));
  const cmap = kind === 'foliage' ? mcColormaps.foliage : mcColormaps.grass;
  if (cmap) {
    const d = cmap.getImageData(x, y, 1, 1).data;
    if (d[3] > 0) return [d[0], d[1], d[2]];
  }
  return kind === 'foliage' ? [72, 181, 24] : [121, 192, 90];
}

const PAINTING_MOTIFS = [
  'kebab', 'aztec', 'wanderer', 'fighters', 'skeleton',
  'skull_and_roses', 'donkey_kong', 'pigscene', 'burning_skull'
];
const PARTICLE_SPRITE_LIST = [
  'heart.png', 'critical_hit.png', 'flame.png', 'big_smoke_0.png',
  'bubble.png', 'sga_a.png', 'note.png', 'explosion_0.png'
];

async function loadExtendedMcAssets() {
  const paths = [
    ...Array.from({ length: 8 }, (_, i) => `block/destroy_stage_${i}.png`),
    'environment/celestial/sun.png', ...MOON_PHASE_FILES, 'environment/rain.png', 'environment/snow.png', 'environment/end_sky.png',
    'gui/sprites/hud/heart/container.png', 'gui/sprites/hud/heart/full.png', 'gui/sprites/hud/heart/half.png',
    'gui/sprites/hud/food_empty.png', 'gui/sprites/hud/food_full.png', 'gui/sprites/hud/food_half.png',
    'gui/sprites/hud/air.png', 'gui/sprites/hud/air_bursting.png', 'gui/sprites/hud/armor_empty.png', 'gui/sprites/hud/armor_full.png',
    'gui/sprites/hud/hotbar.png', 'gui/sprites/hud/hotbar_selection.png', 'gui/sprites/hud/crosshair.png', 'gui/sprites/hud/effect_background.png',
    'gui/sprites/boss_bar/pink_background.png', 'gui/sprites/boss_bar/pink_progress.png',
    'map/map_background.png', 'map/decorations/player.png', 'map/decorations/plains_village.png',
    'map/decorations/desert_pyramid.png', 'map/decorations/jungle_temple.png', 'map/decorations/target_x.png',
    'misc/spyglass_scope.png', 'misc/underwater.png', 'misc/enchanted_glint_item.png',
    'colormap/grass.png', 'colormap/foliage.png',
    'painting/back.png', ...PAINTING_MOTIFS.map(m => `painting/${m}.png`),
    ...PARTICLE_SPRITE_LIST.map(p => `particle/${p}`),
    'mob_effect/speed.png', 'mob_effect/strength.png', 'mob_effect/regeneration.png', 'mob_effect/fire_resistance.png',
    'mob_effect/night_vision.png', 'mob_effect/jump_boost.png', 'mob_effect/slow_falling.png', 'mob_effect/water_breathing.png',
    'mob_effect/poison.png', 'mob_effect/absorption.png'
  ];

  await Promise.all(paths.map(rel => new Promise(resolve => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    const remoteUrl = `https://raw.githubusercontent.com/misode/mcmeta/assets-tiny/assets/minecraft/textures/${rel}`;
    img.onload = () => { mcHudAssets.set(rel, img); resolve(); };
    img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = '1'; img.src = remoteUrl; } else resolve(); };
    img.src = (typeof location !== 'undefined' && location.hostname.endsWith('github.io')) ? remoteUrl : `./mc-reference/assets/minecraft/textures/${rel}`;
  })));

  // 1) Cumulative official destroy_stage_0..7.png onto crackTextures[]
  if (typeof crackTextures !== 'undefined' && crackTextures.length === 8) {
    for (let s = 0; s < 8; s++) {
      const c = crackTextures[s].image;
      const ctx = c.getContext('2d');
      for (let w = 0; w <= s; w++) {
        const dImg = mcHudAssets.get(`block/destroy_stage_${w}.png`);
        if (dImg && typeof CRACK_STAGE_PIXELS !== 'undefined') ctx.drawImage(dImg, 0, 0, 0, 0, 0, 0, 0, 0);
      }
      crackTextures[s].needsUpdate = true;
    }
  }

  // 2) Colormaps grass.png & foliage.png
  for (const k of ['grass', 'foliage']) {
    const img = mcHudAssets.get(`colormap/${k}.png`);
    if (img) {
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      mcColormaps[k] = ctx;
    }
  }

  // 3) Particle Atlas (8 sprites x 16x16)
  const pCtx = mcParticleAtlasCanvas.getContext('2d');
  PARTICLE_SPRITE_LIST.forEach((pName, idx) => {
    const img = mcHudAssets.get(`particle/${pName}`);
    if (img) {
      pCtx.drawImage(img, 0, 0, 16, 16, idx * 16, 0, 16, 16);
      mcParticleSprites.set(pName.replace('.png', ''), idx);
    }
  });
  return true;
}
const mcExtendedReady = loadExtendedMcAssets();

// ============================================================================
// 2. FASE 4, 5 & 6: FOODS, SPECIAL WEAPONS, UTILITIES & ADVANCED REDSTONE
// ============================================================================
if (typeof FOOD_HUNGER_MAP !== 'undefined' && typeof FOOD_SATURATION_MAP !== 'undefined') {
  Object.assign(FOOD_HUNGER_MAP, {
    [BLOCK.ITEM_CARROT]: 3, [BLOCK.ITEM_GOLDEN_CARROT]: 6, [BLOCK.ITEM_POTATO]: 1, [BLOCK.ITEM_BAKED_POTATO]: 5,
    [BLOCK.ITEM_BEETROOT]: 1, [BLOCK.ITEM_BEETROOT_SOUP]: 6, [BLOCK.ITEM_MELON_SLICE]: 2, [BLOCK.ITEM_PUMPKIN_PIE]: 8,
    [BLOCK.ITEM_COOKIE]: 2, [BLOCK.ITEM_SWEET_BERRIES]: 2, [BLOCK.ITEM_MUSHROOM_STEW]: 6
  });
  Object.assign(FOOD_SATURATION_MAP, {
    [BLOCK.ITEM_CARROT]: 3.6, [BLOCK.ITEM_GOLDEN_CARROT]: 14.4, [BLOCK.ITEM_POTATO]: 0.6, [BLOCK.ITEM_BAKED_POTATO]: 6.0,
    [BLOCK.ITEM_BEETROOT]: 1.2, [BLOCK.ITEM_BEETROOT_SOUP]: 7.2, [BLOCK.ITEM_MELON_SLICE]: 1.2, [BLOCK.ITEM_PUMPKIN_PIE]: 4.8,
    [BLOCK.ITEM_COOKIE]: 0.4, [BLOCK.ITEM_SWEET_BERRIES]: 0.6, [BLOCK.ITEM_MUSHROOM_STEW]: 7.2
  });
}

let isSpyglassScoped = false;
let isElytraGliding = false;

function shootCrossbow() {
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const a1 = shootArrow(camera.position.x, camera.position.y - 0.1, camera.position.z, dir.x, dir.y + 0.04, dir.z);
  if (a1) { a1.vx *= 1.35; a1.vy *= 1.35; a1.vz *= 1.35; }
  player.swingTime = 1.0;
  return a1;
}

function throwTrident() {
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const tr = shootArrow(camera.position.x, camera.position.y - 0.1, camera.position.z, dir.x, dir.y + 0.05, dir.z);
  if (tr) { tr.isTrident = true; tr.vx *= 1.25; tr.vz *= 1.25; }
  sfx.play('swing'); player.swingTime = 1.0;
  return tr;
}

function toggleSpyglassScope(force) {
  isSpyglassScoped = typeof force === 'boolean' ? force : !isSpyglassScoped;
  if (typeof toggleZoom === 'function' && isZoomed !== isSpyglassScoped) toggleZoom();
  let scopeEl = document.getElementById('mc-spyglass-overlay');
  if (!scopeEl) {
    scopeEl = document.createElement('div');
    scopeEl.id = 'mc-spyglass-overlay';
    scopeEl.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:18;display:none;background:url('./mc-reference/assets/minecraft/textures/misc/spyglass_scope.png') no-repeat center/contain;image-rendering:pixelated;";
    document.body.appendChild(scopeEl);
  }
  scopeEl.style.display = isSpyglassScoped ? 'block' : 'none';
  return isSpyglassScoped;
}

function toggleElytraGlide(force) {
  isElytraGliding = typeof force === 'boolean' ? force : !isElytraGliding;
  if (isElytraGliding && player.vy < -1.8) player.vy = -1.8;
  return isElytraGliding;
}

function boostWithFireworkRocket() {
  const yaw = player.yaw || 0;
  player.vx -= Math.sin(yaw) * 12.0;
  player.vz -= Math.cos(yaw) * 12.0;
  player.vy = Math.max(player.vy, 7.5);
  spawnBlockParticles(player.x, player.y, player.z, BLOCK.TNT, 18);
  sfx.play('fuse');
  return true;
}

function tryTriggerTotemOfUndying() {
  const hasTotem = getActiveHeldItem() === BLOCK.ITEM_TOTEM_OF_UNDYING || (inventoryCounts[BLOCK.ITEM_TOTEM_OF_UNDYING] || 0) > 0;
  if (!hasTotem && gameMode === 'survival') return false;
  if (gameMode === 'survival' && (inventoryCounts[BLOCK.ITEM_TOTEM_OF_UNDYING] || 0) > 0) {
    inventoryCounts[BLOCK.ITEM_TOTEM_OF_UNDYING]--;
  }
  player.health = Math.max(6, player.maxHealth);
  addStatusEffect('regeneration', 20);
  addStatusEffect('absorption', 25);
  addStatusEffect('fire_resistance', 30);
  spawnBlockParticles(player.x, player.y + 0.8, player.z, BLOCK.GOLD_BLOCK, 24);
  renderHeartsUI(); sfx.play('chime');
  return true;
}

function triggerStickyPiston(px, py, pz, lx, ly, lz, retract = false, affectedChunks = new Set()) {
  if (!retract) return triggerVoxelPiston(px, py, pz, lx, ly, lz, affectedChunks);
  let dx = Math.sign(px - lx), dy = Math.sign(py - ly), dz = Math.sign(pz - lz);
  if (dx === 0 && dy === 0 && dz === 0) dx = 1;
  if (dx !== 0) { dy = 0; dz = 0; } else if (dz !== 0) { dy = 0; }
  const pullX = px + dx * 2, pullY = py + dy * 2, pullZ = pz + dz * 2;
  const destX = px + dx, destY = py + dy, destZ = pz + dz;
  const pulledId = getVoxelGlobal(pullX, pullY, pullZ);
  if (pulledId !== BLOCK.AIR && pulledId !== BLOCK.BEDROCK && getVoxelGlobal(destX, destY, destZ) === BLOCK.AIR) {
    setVoxelRawNoRebuild(destX, destY, destZ, pulledId, affectedChunks);
    setVoxelRawNoRebuild(pullX, pullY, pullZ, BLOCK.AIR, affectedChunks);
    rebuildAffectedChunksSet(affectedChunks);
    return true;
  }
  return false;
}

function triggerDispenserAt(wx, wy, wz) {
  const arrow = shootArrow(wx + 0.5, wy + 0.5, wz + 0.5, 0, 0.15, -1);
  spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.REDSTONE_DUST, 10);
  return arrow;
}

function hitTargetBlockAt(wx, wy, wz) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (getVoxelGlobal(wx + dx, wy, wz + dz) === BLOCK.REDSTONE_LAMP_OFF) {
        setVoxelGlobal(wx + dx, wy, wz + dz, BLOCK.REDSTONE_LAMP_ON);
      }
    }
  }
  spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.REDSTONE_DUST, 14);
  sfx.play('chime');
  return true;
}

// ============================================================================
// 3. FASE 8: ALCHEMY, BREWING STAND & STATUS EFFECTS HUD (mob_effect/*.png)
// ============================================================================
const BREWING_RECIPES = {
  [BLOCK.ITEM_SUGAR]:            { potionId: BLOCK.ITEM_POTION_SPEED,           effect: 'speed',           duration: 45 },
  [BLOCK.ITEM_BLAZE_POWDER]:     { potionId: BLOCK.ITEM_POTION_STRENGTH,        effect: 'strength',        duration: 45 },
  [BLOCK.ITEM_GHAST_TEAR]:       { potionId: BLOCK.ITEM_POTION_REGEN,           effect: 'regeneration',    duration: 35 },
  [BLOCK.ITEM_MAGMA_CREAM]:      { potionId: BLOCK.ITEM_POTION_FIRE_RES,        effect: 'fire_resistance', duration: 60 },
  [BLOCK.ITEM_GOLDEN_CARROT]:    { potionId: BLOCK.ITEM_POTION_NIGHT_VISION,    effect: 'night_vision',    duration: 60 },
  [BLOCK.ITEM_PHANTOM_MEMBRANE]: { potionId: BLOCK.ITEM_POTION_SLOW_FALLING,    effect: 'slow_falling',    duration: 45 },
  [BLOCK.ITEM_PUFFERFISH]:       { potionId: BLOCK.ITEM_POTION_WATER_BREATHING, effect: 'water_breathing', duration: 60 },
  [BLOCK.ITEM_SPIDER_EYE]:       { potionId: BLOCK.ITEM_POTION_POISON,          effect: 'poison',          duration: 20 }
};

const POTION_EFFECT_BY_ITEM = {};
for (const [, rec] of Object.entries(BREWING_RECIPES)) POTION_EFFECT_BY_ITEM[rec.potionId] = rec;

const activeStatusEffects = {}; // { [effectName]: remainingSeconds }

function addStatusEffect(effectName, durationSec = 30) {
  activeStatusEffects[effectName] = Math.max(activeStatusEffects[effectName] || 0, durationSec);
  renderStatusEffectsHUD();
  return activeStatusEffects[effectName];
}

function brewPotionAt(wx, wy, wz, ingredientId = getActiveHeldItem()) {
  const rec = BREWING_RECIPES[ingredientId] || BREWING_RECIPES[BLOCK.ITEM_SUGAR];
  addInventoryItem(rec.potionId, 1);
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.7, wz, BLOCK.BREWING_STAND, 14);
  sfx.play('chime');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `⚗ ¡Alquimia completada: +1× ${BLOCK_DEFS[rec.potionId].name}!`;
  return rec.potionId;
}

function drinkPotion(potionItemId = getActiveHeldItem()) {
  const rec = POTION_EFFECT_BY_ITEM[potionItemId];
  if (!rec) return false;
  if (gameMode === 'survival' && (inventoryCounts[potionItemId] || 0) > 0) {
    inventoryCounts[potionItemId]--;
    addInventoryItem(BLOCK.ITEM_GLASS_BOTTLE, 1);
  }
  addStatusEffect(rec.effect, rec.duration);
  if (rec.effect === 'regeneration') player.health = Math.min(player.maxHealth, player.health + 4);
  if (rec.effect === 'water_breathing') player.air = player.maxAir || 10;
  renderHeartsUI(); sfx.play('eat');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🧪 ¡Has bebido ${BLOCK_DEFS[potionItemId].name} (${rec.duration}s)!`;
  return rec.effect;
}

function renderStatusEffectsHUD() {
  let container = document.getElementById('mc-status-effects-hud');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mc-status-effects-hud';
    container.style.cssText = 'position:fixed;top:52px;right:14px;display:flex;gap:6px;z-index:22;pointer-events:none;';
    document.body.appendChild(container);
  }
  const entries = Object.entries(activeStatusEffects).filter(([, t]) => t > 0);
  container.innerHTML = entries.map(([eff, secs]) => `
    <div class="mc-effect-badge" data-effect="${eff}" style="width:32px;height:32px;position:relative;background:url('./mc-reference/assets/minecraft/textures/gui/sprites/hud/effect_background.png') no-repeat center/100% 100%;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;">
      <img src="./mc-reference/assets/minecraft/textures/mob_effect/${eff}.png" style="width:18px;height:18px;image-rendering:pixelated;" alt="${eff}">
      <span style="position:absolute;bottom:1px;right:3px;font-size:9px;color:#fff;font-family:monospace;text-shadow:1px 1px 0 #000;">${Math.ceil(secs)}s</span>
    </div>`).join('');
  return entries.length;
}

// ============================================================================
// 4. FASE 9: DECORATIVE WALL PAINTINGS (painting/*.png + painting/back.png)
// ============================================================================
const placedPaintings = [];
let paintingMotifCursor = 0;

function placePaintingAt(wx, wy, wz, nx = 0, ny = 0, nz = 1, motifName) {
  const motif = motifName || PAINTING_MOTIFS[paintingMotifCursor++ % PAINTING_MOTIFS.length];
  let tex = mcPaintingTextures.get(motif);
  if (!tex) {
    const img = mcHudAssets.get(`painting/${motif}.png`);
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const ctx = cv.getContext('2d');
    if (img) ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 32, 32);
    else { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 32, 32); }
    tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    mcPaintingTextures.set(motif, tex);
  }
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.92, 0.06),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  const px = Math.floor(wx) + 0.5 + nx * 0.54;
  const py = Math.floor(wy) + 0.5;
  const pz = Math.floor(wz) + 0.5 + nz * 0.54;
  mesh.position.set(px, py, pz);
  if (nx !== 0) mesh.rotation.y = Math.PI * 0.5;
  scene.add(mesh);
  const record = { motif, x: Math.floor(wx), y: Math.floor(wy), z: Math.floor(wz), nx, nz, mesh };
  placedPaintings.push(record);
  sfx.play('place');
  return record;
}

// ============================================================================
// 5. FASE 10: NETHER & END COMPLETE DIMENSIONS (switchDimension)
// ============================================================================
let currentDimension = 'overworld'; // 'overworld' | 'nether' | 'end'
function getCurrentDimension() { return currentDimension; }

function switchDimension(targetDim) {
  const nextDim = targetDim || (currentDimension === 'overworld' ? 'nether' : (currentDimension === 'nether' ? 'end' : 'overworld'));
  currentDimension = nextDim;
  const bx = Math.floor(player.x), by = Math.max(12, Math.min(48, Math.floor(player.y))), bz = Math.floor(player.z);
  const affected = new Set();
  if (nextDim === 'nether') {
    scene.background.setHex(0x3b0a0a);
    if (scene.fog) scene.fog.color.setHex(0x3b0a0a);
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        const bId = (dx === -3 || dx === 3) ? BLOCK.NETHER_BRICKS : ((dx + dz) & 1 ? BLOCK.CRIMSON_NYLIUM : BLOCK.NETHERRACK);
        setVoxelRawNoRebuild(bx + dx, by - 1, bz + dz, bId, affected);
      }
    }
    setVoxelRawNoRebuild(bx + 2, by, bz + 2, BLOCK.SHROOMLIGHT, affected);
    setVoxelRawNoRebuild(bx - 2, by, bz - 2, BLOCK.SOUL_SAND, affected);
    rebuildAffectedChunksSet(affected);
  } else if (nextDim === 'end') {
    scene.background.setHex(0x0b0716);
    if (scene.fog) scene.fog.color.setHex(0x0b0716);
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        setVoxelRawNoRebuild(bx + dx, by - 1, bz + dz, (dx + dz) & 1 ? BLOCK.END_STONE_BRICKS : BLOCK.END_STONE, affected);
      }
    }
    setVoxelRawNoRebuild(bx + 2, by, bz + 2, BLOCK.PURPUR_PILLAR, affected);
    setVoxelRawNoRebuild(bx - 2, by, bz + 2, BLOCK.CHORUS_FLOWER, affected);
    rebuildAffectedChunksSet(affected);
  } else {
    updateDynamicSky(0.016);
  }
  sfx.play('portal');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🌀 Dimensión activa: ${nextDim.toUpperCase()}`;
  return currentDimension;
}
