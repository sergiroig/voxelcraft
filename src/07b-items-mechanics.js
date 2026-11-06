// VoxelCraft HTML5 — 07b-items-mechanics.js (10C. COMPLETE MINECRAFT ITEM MECHANICS: SHEARS, FISHING, BED RESPAWN, ENCHANTING, ANVIL, CAKE, FLINT & HARVEST TIERS)
'use strict';

let isShieldBlocking = false;
const armorSlots = [0, 0, 0, 0]; // [Helmet, Chestplate, Leggings, Boots]
const enchantedItems = {}; // { [itemId]: level (1..3) }
const cakeSlicesMap = {};  // { "x,y,z": slicesLeft (1..6) }

function getItemEnchantLevel(itemId) {
  return (itemId && enchantedItems[itemId]) ? enchantedItems[itemId] : 0;
}

function getArmorDefenseRatio() {
  let def = 0;
  for (let i = 0; i < 4; i++) {
    const id = armorSlots[i];
    if (id >= BLOCK.ARMOR_DIAMOND_HELMET && id <= BLOCK.ARMOR_DIAMOND_BOOTS) def += 0.18 + getItemEnchantLevel(id) * 0.025;
    else if (id >= BLOCK.ARMOR_IRON_HELMET && id <= BLOCK.ARMOR_IRON_BOOTS) def += 0.12 + getItemEnchantLevel(id) * 0.025;
  }
  return Math.min(0.85, def);
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

// 1. SHEARS: Live Sheep Shearing (1-3 Wool without killing) & Regrowth
function shearSheep(mob) {
  if (!mob || mob.type !== 'sheep' || mob.sheared) return false;
  mob.sheared = true;
  mob.regrowTimer = 25.0;
  if (mob.root && mob.root.children[0]) mob.root.children[0].scale.set(0.82, 0.80, 0.90);
  for (const entry of mob.mats) entry.baseHex = 0xd6c7b2;
  spawnBlockParticles(mob.x, mob.y + 0.55, mob.z, BLOCK.WOOL, 16);
  addInventoryItem(BLOCK.WOOL, 2);
  sfx.play('hit');
  player.swingTime = 1.0;
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '✂ ¡Oveja esquilada sin daño! +2× Lana Blanca';
  return true;
}

// 2. BONE MEAL: Instant Crop & Tree Growth
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

// 3. FISHING ROD: 3D Bobber, Water Detection & Minecraft Fishing Loot Table
const FISHING_LOOT_TABLE = [
  { id: BLOCK.ITEM_RAW_FISH,       weight: 0.72, name: '1× Pescado Crudo (+2🍗)' },
  { id: BLOCK.ITEM_BONE,           weight: 0.07, name: '1× Hueso Antiguo' },
  { id: BLOCK.ITEM_IRON_INGOT,     weight: 0.06, name: '1× Lingote de Hierro Hundido' },
  { id: BLOCK.ITEM_GOLD_INGOT,     weight: 0.05, name: '1× Lingote de Oro del Fondo' },
  { id: BLOCK.ITEM_EMERALD,        weight: 0.04, name: '1× Esmeralda Marina (Tesoro)' },
  { id: BLOCK.TOOL_BOW,            weight: 0.03, name: '1× Arco de Cazador (Tesoro)' },
  { id: BLOCK.ARMOR_IRON_BOOTS,    weight: 0.03, name: '1× Botas de Hierro (Tesoro)' }
];

const fishingBobber = (() => {
  const grp = new THREE.Group();
  const topM = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  const botM = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  topM.position.y = 0.06; botM.position.y = -0.06;
  grp.add(topM, botM); grp.visible = false; scene.add(grp);
  return { mesh: grp, active: false, x: 0, y: 0, z: 0 };
})();

function findWaterForFishing(wx, wy, wz) {
  if (wx !== undefined && wy !== undefined && wz !== undefined) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (getVoxelGlobal(Math.floor(wx) + dx, Math.floor(wy) + dy, Math.floor(wz) + dz) === BLOCK.WATER) {
            return { x: Math.floor(wx) + dx, y: Math.floor(wy) + dy, z: Math.floor(wz) + dz };
          }
        }
      }
    }
  }
  const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  for (let d = 1.0; d <= 9.0; d += 0.45) {
    const bx = Math.floor(ox + dir.x * d), by = Math.floor(oy + dir.y * d), bz = Math.floor(oz + dir.z * d);
    const v = getVoxelGlobal(bx, by, bz);
    if (v === BLOCK.WATER) return { x: bx, y: by, z: bz };
    if (BLOCK_DEFS[v] && BLOCK_DEFS[v].solid && getVoxelGlobal(bx, by + 1, bz) !== BLOCK.WATER) break;
  }
  return null;
}

function useFishingRod(wx, wy, wz, opts = {}) {
  const waterPos = findWaterForFishing(wx, wy, wz);
  if (opts.requireWater && !waterPos) {
    const lbl = document.getElementById('block-label');
    if (lbl) lbl.textContent = '🎣 Caña de Pescar: Apunta hacia el Agua para lanzar el anzuelo';
    return null;
  }
  const tx = waterPos ? waterPos.x : (wx !== undefined ? wx : Math.floor(player.x - Math.sin(player.yaw) * 2.5));
  const ty = waterPos ? waterPos.y : (wy !== undefined ? wy : Math.floor(player.y));
  const tz = waterPos ? waterPos.z : (wz !== undefined ? wz : Math.floor(player.z - Math.cos(player.yaw) * 2.5));

  fishingBobber.active = true; fishingBobber.x = tx + 0.5; fishingBobber.y = ty + 0.88; fishingBobber.z = tz + 0.5;
  fishingBobber.mesh.position.set(fishingBobber.x, fishingBobber.y, fishingBobber.z);
  fishingBobber.mesh.visible = true;

  spawnBlockParticles(tx, ty + 0.5, tz, BLOCK.WATER, 16);
  sfx.play('splash'); player.swingTime = 1.0;

  let caughtEntry = FISHING_LOOT_TABLE[0];
  if (typeof opts.roll === 'number') {
    let acc = 0;
    for (const entry of FISHING_LOOT_TABLE) {
      acc += entry.weight;
      if (opts.roll <= acc) { caughtEntry = entry; break; }
    }
  }
  addInventoryItem(caughtEntry.id, 1);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🎣 ¡Has pescado ${caughtEntry.name}!`;
  return caughtEntry.id;
}

// 4. BED: Respawn Point, Night/Storm Sleeping Rule & Bed Respawn on Death
function sleepInBed(wx, wy, wz, opts = {}) {
  if (wx !== undefined && wy !== undefined && wz !== undefined) {
    player.spawnX = Math.floor(wx) + 0.5;
    player.spawnY = Math.floor(wy) + 1.05;
    player.spawnZ = Math.floor(wz) + 0.5;
    player.hasBedSpawn = true;
  }
  const stormActive = typeof getWeatherState === 'function' && getWeatherState().weatherMode === 'storm';
  const canSleepNow = isNight || sunFactor < 0.55 || stormActive || !!opts.forceSleep || wx === undefined;
  const lbl = document.getElementById('block-label');
  if (!canSleepNow) {
    sfx.play('waypoint');
    if (wx !== undefined) spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.BED, 8);
    if (lbl) lbl.textContent = `🛏 Punto de reaparición fijado en (${Math.floor(wx)}, ${Math.floor(wy)}, ${Math.floor(wz)}) • Solo se duerme de noche o en tormenta`;
    return 'spawn_only';
  }
  if (typeof setTimeOfDay === 'function') setTimeOfDay(0.25);
  if (typeof toggleWeather === 'function' && typeof getWeatherState === 'function' && getWeatherState().weatherMode !== 'clear') {
    toggleWeather('clear');
  }
  player.health = Math.min(player.maxHealth, player.health + 4);
  renderHeartsUI(); sfx.play('chime');
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.5, wz, BLOCK.BED, 12);
  if (lbl) lbl.textContent = '🛏 ¡Has descansado en la Cama! Amanece, despeja el clima y recuperas +4❤';
  return true;
}

function respawnPlayerAtBed() {
  const sx = player.hasBedSpawn && player.spawnX !== undefined ? player.spawnX : 8.5;
  const sz = player.hasBedSpawn && player.spawnZ !== undefined ? player.spawnZ : 8.5;
  const sy = player.hasBedSpawn && player.spawnY !== undefined ? player.spawnY : findSpawnHeight(sx, sz);
  player.x = sx; player.y = sy; player.z = sz;
  player.vx = 0; player.vy = 0; player.vz = 0; player.maxFallVel = 0;
  player.health = player.maxHealth; player.hunger = player.maxHunger || 10; player.saturation = 5.0; player.air = player.maxAir || 10;
  renderHeartsUI(); sfx.play('portal');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = player.hasBedSpawn ? `🛏 ¡Has reaparecido en tu Cama (${Math.floor(sx)}, ${Math.floor(sy)}, ${Math.floor(sz)})!` : '🧭 Has reaparecido en el Origen';
  return { x: sx, y: sy, z: sz };
}

// 5. ANVIL: Tool & Armor Tier Upgrades + Forge Tempering
function useAnvilAt(wx, wy, wz) {
  const held = getActiveHeldItem();
  const upMap = {
    [BLOCK.TOOL_WOOD_PICKAXE]: BLOCK.TOOL_STONE_PICKAXE,
    [BLOCK.TOOL_STONE_PICKAXE]: BLOCK.TOOL_IRON_PICKAXE,
    [BLOCK.TOOL_IRON_PICKAXE]: BLOCK.TOOL_PICKAXE,
    [BLOCK.TOOL_WOOD_SWORD]: BLOCK.TOOL_STONE_SWORD,
    [BLOCK.TOOL_STONE_SWORD]: BLOCK.TOOL_IRON_SWORD,
    [BLOCK.TOOL_IRON_SWORD]: BLOCK.TOOL_SWORD,
    [BLOCK.ARMOR_IRON_HELMET]: BLOCK.ARMOR_DIAMOND_HELMET,
    [BLOCK.ARMOR_IRON_CHESTPLATE]: BLOCK.ARMOR_DIAMOND_CHESTPLATE,
    [BLOCK.ARMOR_IRON_LEGGINGS]: BLOCK.ARMOR_DIAMOND_LEGGINGS,
    [BLOCK.ARMOR_IRON_BOOTS]: BLOCK.ARMOR_DIAMOND_BOOTS
  };
  const upgraded = upMap[held] || BLOCK.ITEM_DIAMOND;
  if (upMap[held] && selectedSlot >= 0) {
    hotbarSlots[selectedSlot] = upgraded;
    inventoryCounts[upgraded] = (inventoryCounts[upgraded] || 0) + 1;
  } else if (isPickaxeItem(held) || isSwordItem(held) || isArmorItem(held) || held === BLOCK.TOOL_AXE || held === BLOCK.TOOL_BOW) {
    enchantedItems[held] = Math.min(3, (enchantedItems[held] || 0) + 1);
  } else {
    addInventoryItem(BLOCK.ITEM_IRON_INGOT, 1);
  }
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.6, wz, BLOCK.IRON_BLOCK, 14);
  sfx.play('shield');
  if (typeof updateHeldItemVisual === 'function') updateHeldItemVisual();
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  return upgraded;
}

// 6. ENCHANTING TABLE + BOOKSHELVES: Bookshelf Power Scaling (Levels I-III)
function countNearbyBookshelves(wx, wy, wz) {
  if (wx === undefined || wy === undefined || wz === undefined) return 0;
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  let count = 0;
  for (let dy = 0; dy <= 1; dy++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dz === 0) continue;
        if (getVoxelGlobal(bx + dx, by + dy, bz + dz) === BLOCK.BOOKSHELF) count++;
      }
    }
  }
  return Math.min(15, count);
}

function useEnchantingTableAt(wx, wy, wz) {
  const shelves = countNearbyBookshelves(wx, wy, wz);
  const level = shelves >= 6 ? 3 : (shelves >= 3 ? 2 : 1);
  const held = getActiveHeldItem();
  if (held && (isPickaxeItem(held) || isSwordItem(held) || isArmorItem(held) || held === BLOCK.TOOL_AXE || held === BLOCK.TOOL_SHOVEL || held === BLOCK.TOOL_BOW || held === BLOCK.TOOL_SHEARS)) {
    enchantedItems[held] = Math.max(enchantedItems[held] || 0, level);
  }
  for (let i = 0; i < 4; i++) {
    if (armorSlots[i] > 0) enchantedItems[armorSlots[i]] = Math.max(enchantedItems[armorSlots[i]] || 0, level);
  }
  player.health = player.maxHealth; renderHeartsUI();
  addInventoryItem(BLOCK.ITEM_ENDER_PEARL, 1);
  if (wx !== undefined) spawnBlockParticles(wx, wy + 0.8, wz, BLOCK.AMETHYST, 18);
  sfx.play('chime');
  if (typeof updateHeldItemVisual === 'function') updateHeldItemVisual();
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  const rom = level === 3 ? 'III' : (level === 2 ? 'II' : 'I');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `✨ ¡Encantamiento Nivel ${rom} (${shelves} Estanterías)! Equipo encantado + Salud al máximo + 1× Perla de Ender`;
  return BLOCK.ITEM_ENDER_PEARL;
}

// 7. CAKE BY SLICES: 6 Portions (+1🍗 each = +6🍗 total)
function getCakeSlicesAt(wx, wy, wz) {
  const key = `${Math.floor(wx)},${Math.floor(wy)},${Math.floor(wz)}`;
  return cakeSlicesMap[key] !== undefined ? cakeSlicesMap[key] : 6;
}

function eatCakeSliceAt(wx, wy, wz, slicesToEat = 1) {
  const bx = Math.floor(wx), by = Math.floor(wy), bz = Math.floor(wz);
  if (getVoxelGlobal(bx, by, bz) !== BLOCK.CAKE) return false;
  if (gameMode === 'survival' && (player.hunger ?? 10) >= (player.maxHunger || 10)) return false;
  const key = `${bx},${by},${bz}`;
  const currentSlices = cakeSlicesMap[key] !== undefined ? cakeSlicesMap[key] : 6;
  const eaten = Math.min(currentSlices, Math.max(1, slicesToEat));
  const remaining = currentSlices - eaten;

  player.hunger = Math.min(player.maxHunger || 10, (player.hunger ?? 10) + eaten);
  player.saturation = Math.min(player.hunger, (player.saturation || 0) + eaten * 0.6);
  player.exhaustion = 0; player.starveTimer = 0;
  if (remaining <= 0) {
    delete cakeSlicesMap[key];
    setVoxelGlobal(bx, by, bz, BLOCK.AIR);
  } else {
    cakeSlicesMap[key] = remaining;
  }
  spawnBlockParticles(bx, by + 0.4, bz, BLOCK.CAKE, 8);
  renderHeartsUI(); sfx.play('eat'); player.swingTime = 1.0;
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = remaining > 0 ? `🎂 ¡Porción de Tarta (+${eaten}🍗)! Quedan ${remaining}/6 porciones` : '🎂 ¡Última porción de Tarta consumida!';
  return true;
}

// 8. FLINT AND STEEL: Ignite Mobs on Fire & Light Netherrack/Blocks
function igniteMobWithFire(mob) {
  if (!mob) return false;
  mob.onFireTimer = 5.0; mob.fireTick = 0;
  spawnBlockParticles(mob.x, mob.y + 0.5, mob.z, BLOCK.LAVA, 16);
  sfx.play('hiss');
  damageMob(mob, 2, 0, 0);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🔥 ¡Criatura incendiada con Mechero de Pedernal!`;
  return true;
}

function useFlintAndSteelAt(wx, wy, wz, nx = 0, ny = 1, nz = 0) {
  const b = getVoxelGlobal(wx, wy, wz);
  if (b === BLOCK.TNT) { igniteTNT(wx, wy, wz, 2.6); player.swingTime = 1.0; return true; }
  if (b === BLOCK.OBSIDIAN) { activateObsidianPortal(wx, wy + 1, wz); player.swingTime = 1.0; return true; }
  const tx = wx + nx, ty = wy + ny, tz = wz + nz;
  if (getVoxelGlobal(tx, ty, tz) === BLOCK.AIR) {
    setVoxelGlobal(tx, ty, tz, BLOCK.TORCH);
    spawnBlockParticles(tx, ty + 0.3, tz, BLOCK.LAVA, 12);
    sfx.play('fuse'); player.swingTime = 1.0;
    const lbl = document.getElementById('block-label');
    if (lbl) lbl.textContent = b === BLOCK.NETHERRACK ? '🔥 ¡Llama eterna encendida sobre Netherrack!' : '🔥 ¡Fuego encendido con Mechero de Pedernal!';
    return true;
  }
  return false;
}

// 9. PICKAXE HARVEST TIERS: Wood/Gold (1) -> Stone (2) -> Iron (3) -> Diamond (4)
function getPickaxeTier(itemId) {
  if (itemId === BLOCK.TOOL_PICKAXE) return 4;
  if (itemId === BLOCK.TOOL_IRON_PICKAXE) return 3;
  if (itemId === BLOCK.TOOL_STONE_PICKAXE) return 2;
  if (itemId === BLOCK.TOOL_WOOD_PICKAXE || itemId === BLOCK.TOOL_GOLD_PICKAXE) return 1;
  return 0;
}

function getRequiredPickaxeTier(blockId) {
  if (blockId === BLOCK.OBSIDIAN) return 4;
  if (blockId === BLOCK.DIAMOND_ORE || blockId === BLOCK.DIAMOND_BLOCK || blockId === BLOCK.GOLD_ORE || blockId === BLOCK.GOLD_BLOCK || blockId === BLOCK.EMERALD_BLOCK || blockId === BLOCK.AMETHYST) return 3;
  if (blockId === BLOCK.IRON_ORE || blockId === BLOCK.IRON_BLOCK || blockId === BLOCK.ANVIL) return 2;
  if (blockId === BLOCK.COAL_ORE || blockId === BLOCK.FURNACE || blockId === BLOCK.NETHERRACK || blockId === BLOCK.END_STONE) return 1;
  return 0;
}

function canHarvestBlockWithTool(blockId, toolId = getActiveHeldItem()) {
  const req = getRequiredPickaxeTier(blockId);
  if (req <= 0) return true;
  return getPickaxeTier(toolId) >= req;
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

// 10. CRAFTABLE CARTOGRAPHY MAP: Empty Map -> Active Map, Fog of War Exploration & Zoom Scales (1x / 2x / 4x)
const exploredMapCells = new Set();
const mapState = { initialized: false, centerX: 8, centerZ: 8, zoomScale: 1 };

function isMapCellExplored(wx, wz) {
  return exploredMapCells.has(`${wx >> 1},${wz >> 1}`);
}

function revealMapAroundPlayer(wx = player.x, wz = player.z, radius = 18) {
  const px = Math.floor(wx), pz = Math.floor(wz), rSq = radius * radius;
  let added = 0;
  for (let dz = -radius; dz <= radius; dz += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) {
      if (dx * dx + dz * dz > rSq) continue;
      const key = `${(px + dx) >> 1},${(pz + dz) >> 1}`;
      if (!exploredMapCells.has(key)) { exploredMapCells.add(key); added++; }
    }
  }
  return added;
}

function useEmptyMap() {
  if (gameMode === 'survival' && (inventoryCounts[BLOCK.ITEM_EMPTY_MAP] || 0) <= 0) return false;
  if (gameMode === 'survival') {
    if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_EMPTY_MAP && hotbarCounts[selectedSlot] > 0) {
      hotbarCounts[selectedSlot]--;
      if (hotbarCounts[selectedSlot] <= 0) hotbarSlots[selectedSlot] = BLOCK.AIR;
    } else {
      const invSlot = invSlots.find(s => s.id === BLOCK.ITEM_EMPTY_MAP && s.count > 0);
      if (invSlot) { invSlot.count--; if (invSlot.count <= 0) invSlot.id = 0; }
    }
    inventoryCounts[BLOCK.ITEM_EMPTY_MAP] = Math.max(0, (inventoryCounts[BLOCK.ITEM_EMPTY_MAP] || 1) - 1);
  }
  inventoryCounts[BLOCK.ITEM_MAP] = (inventoryCounts[BLOCK.ITEM_MAP] || 0) + 1;
  const slotIdx = selectedSlot >= 0 ? selectedSlot : 0;
  if (hotbarSlots[slotIdx] === BLOCK.AIR || hotbarSlots[slotIdx] === BLOCK.ITEM_EMPTY_MAP) {
    hotbarSlots[slotIdx] = BLOCK.ITEM_MAP;
    hotbarCounts[slotIdx] = Math.max(1, hotbarCounts[slotIdx] || 1);
  } else if (typeof putStackIntoPlayerSlots === 'function') {
    putStackIntoPlayerSlots(BLOCK.ITEM_MAP, 1, true);
  }
  mapState.initialized = true;
  mapState.centerX = Math.floor(player.x);
  mapState.centerZ = Math.floor(player.z);
  mapState.zoomScale = 1;
  revealMapAroundPlayer(player.x, player.z, 20);
  player.swingTime = 1.0;
  sfx.play('place');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '🗺 Mapa Cartográfico creado (Escala 1:1): camina con él para descubrir el terreno';
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  if (typeof updateMinimap === 'function') updateMinimap(0, true);
  if (typeof saveWorldData === 'function') saveWorldData();
  return true;
}

function useCartographyMap() {
  mapState.initialized = true;
  mapState.zoomScale = mapState.zoomScale === 1 ? 2 : (mapState.zoomScale === 2 ? 4 : 1);
  revealMapAroundPlayer(player.x, player.z, 20 * mapState.zoomScale);
  player.swingTime = 1.0;
  sfx.play('step');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🗺 Mapa Cartográfico — Zoom 1:${mapState.zoomScale} (${exploredMapCells.size} zonas cartografiadas)`;
  if (typeof updateMinimap === 'function') updateMinimap(0, true);
  if (typeof updateHeldItemVisual === 'function') updateHeldItemVisual();
  return mapState.zoomScale;
}

function drawPaperOrMapIcon(ctx, itemId) {
  if (itemId === BLOCK.ITEM_PAPER) {
    ctx.fillStyle = '#64748b'; ctx.fillRect(2, 1, 12, 14);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(3, 2, 9, 11);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(4, 4, 7, 1); ctx.fillRect(4, 7, 6, 1); ctx.fillRect(4, 10, 5, 1);
    return;
  }
  if (itemId === BLOCK.ITEM_EMPTY_MAP) {
    ctx.fillStyle = '#451a03'; ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#92400e'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#e6d2a8'; ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#c4a472'; ctx.fillRect(4, 5, 8, 1); ctx.fillRect(4, 8, 8, 1); ctx.fillRect(4, 11, 6, 1);
    ctx.fillStyle = '#b45309'; ctx.fillRect(7, 6, 2, 4); ctx.fillRect(6, 7, 4, 2);
    return;
  }
  ctx.fillStyle = '#451a03'; ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#e6d2a8'; ctx.fillRect(2, 2, 12, 12);
  const px = typeof player !== 'undefined' ? Math.floor(player.x) : 8;
  const pz = typeof player !== 'undefined' ? Math.floor(player.z) : 8;
  const step = 4 * (mapState.zoomScale || 1);
  for (let my = 0; my < 12; my++) {
    for (let mx = 0; mx < 12; mx++) {
      const wx = px + (mx - 6) * step, wz = pz + (my - 6) * step;
      if (!isMapCellExplored(wx, wz)) {
        if ((mx + my) % 3 === 0) { ctx.fillStyle = '#d8c194'; ctx.fillRect(2 + mx, 2 + my, 1, 1); }
        continue;
      }
      const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
      const ch = typeof chunks !== 'undefined' ? chunks.get(`${cx},${cz}`) : null;
      if (ch && ch.mapColors) {
        const col32 = ch.mapColors[(wz - cz * CHUNK_SIZE) * CHUNK_SIZE + (wx - cx * CHUNK_SIZE)];
        ctx.fillStyle = `rgb(${col32 & 255},${(col32 >> 8) & 255},${(col32 >> 16) & 255})`;
      } else {
        ctx.fillStyle = '#4ade80';
      }
      ctx.fillRect(2 + mx, 2 + my, 1, 1);
    }
  }
  ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 7, 2, 2);
}

// ============================================================================
// 11M. MINECRAFT DEFAULT PACK 16x16 ITEM SPRITE RENDERER (ALL 52 ITEMS 100..151)
// ============================================================================
const PICKAXE_COLORS = { [BLOCK.TOOL_PICKAXE]: '#5decf5', [BLOCK.TOOL_WOOD_PICKAXE]: '#a16207', [BLOCK.TOOL_STONE_PICKAXE]: '#94a3b8', [BLOCK.TOOL_IRON_PICKAXE]: '#e2e8f0', [BLOCK.TOOL_GOLD_PICKAXE]: '#facc15' };
const SWORD_COLORS = { [BLOCK.TOOL_SWORD]: '#38bdf8', [BLOCK.TOOL_WOOD_SWORD]: '#a16207', [BLOCK.TOOL_STONE_SWORD]: '#94a3b8', [BLOCK.TOOL_IRON_SWORD]: '#e2e8f0', [BLOCK.TOOL_GOLD_SWORD]: '#facc15' };
const TIER_PALETTE = {
  '#5decf5': { dark: '#0369a1', base: '#5decf5', hi: '#e0f2fe' },
  '#38bdf8': { dark: '#0369a1', base: '#38bdf8', hi: '#e0f2fe' },
  '#a16207': { dark: '#5c3a18', base: '#a16207', hi: '#d97706' },
  '#94a3b8': { dark: '#475569', base: '#94a3b8', hi: '#cbd5e1' },
  '#e2e8f0': { dark: '#64748b', base: '#e2e8f0', hi: '#ffffff' },
  '#facc15': { dark: '#b45309', base: '#facc15', hi: '#fef08a' }
};

function drawDiagonalHandle(ctx, iStart, iEnd) {
  for (let i = iStart; i <= iEnd; i++) {
    ctx.fillStyle = '#7a542e'; ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#9a6b3b'; ctx.fillRect(i, 15 - i, 1, 1);
    ctx.fillStyle = '#45270d'; ctx.fillRect(i + 1, 16 - i, 1, 1);
  }
}

function drawItemIcon(canvas, itemId) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  if (!itemId || itemId === BLOCK.AIR) return;
  if (PICKAXE_COLORS[itemId]) {
    const pal = TIER_PALETTE[PICKAXE_COLORS[itemId]];
    drawDiagonalHandle(ctx, 2, 12);
    ctx.fillStyle = pal.dark; ctx.fillRect(7, 1, 7, 2); ctx.fillRect(13, 2, 2, 6); ctx.fillRect(6, 3, 2, 2);
    ctx.fillStyle = pal.base; ctx.fillRect(8, 2, 6, 2); ctx.fillRect(12, 4, 2, 4); ctx.fillRect(7, 3, 2, 2);
    ctx.fillStyle = pal.hi; ctx.fillRect(8, 2, 3, 1); ctx.fillRect(7, 3, 1, 1);
  } else if (SWORD_COLORS[itemId]) {
    const pal = TIER_PALETTE[SWORD_COLORS[itemId]];
    ctx.fillStyle = pal.dark; ctx.fillRect(1, 13, 2, 2);
    ctx.fillStyle = '#7a542e'; ctx.fillRect(2, 12, 3, 3);
    ctx.fillStyle = '#b45309'; ctx.fillRect(3, 8, 2, 2); ctx.fillRect(6, 11, 2, 2);
    ctx.fillStyle = '#facc15'; ctx.fillRect(4, 9, 4, 2);
    for (let i = 5; i <= 13; i++) {
      ctx.fillStyle = pal.dark; ctx.fillRect(i + 1, 15 - i, 2, 2);
      ctx.fillStyle = pal.base; ctx.fillRect(i, 15 - i, 2, 2);
      ctx.fillStyle = pal.hi; ctx.fillRect(i, 15 - i, 1, 1);
    }
  } else if (itemId === BLOCK.TOOL_AXE) {
    drawDiagonalHandle(ctx, 2, 12);
    ctx.fillStyle = '#0369a1'; ctx.fillRect(7, 1, 6, 6); ctx.fillRect(6, 3, 4, 6);
    ctx.fillStyle = '#5decf5'; ctx.fillRect(8, 2, 5, 5); ctx.fillRect(7, 4, 3, 4);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(8, 2, 3, 2); ctx.fillRect(7, 4, 2, 2);
  } else if (itemId === BLOCK.TOOL_SHOVEL) {
    drawDiagonalHandle(ctx, 2, 10);
    ctx.fillStyle = '#0369a1'; ctx.fillRect(9, 1, 6, 6);
    ctx.fillStyle = '#5decf5'; ctx.fillRect(10, 2, 4, 4); ctx.fillRect(11, 1, 3, 2);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(11, 2, 2, 2);
  } else if (itemId === BLOCK.TOOL_HOE) {
    drawDiagonalHandle(ctx, 2, 12);
    ctx.fillStyle = '#0369a1'; ctx.fillRect(7, 1, 7, 3); ctx.fillRect(6, 3, 3, 2);
    ctx.fillStyle = '#5decf5'; ctx.fillRect(8, 2, 6, 2); ctx.fillRect(7, 3, 2, 2);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(8, 2, 3, 1);
  } else if (itemId === BLOCK.TOOL_SHEARS) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(1, 11, 4, 4); ctx.fillRect(4, 12, 4, 4);
    ctx.fillStyle = '#b45309'; ctx.fillRect(2, 11, 3, 3); ctx.fillRect(5, 12, 3, 3);
    ctx.fillStyle = '#64748b'; ctx.fillRect(5, 5, 8, 3); ctx.fillRect(7, 2, 3, 8);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(5, 6, 7, 2); ctx.fillRect(8, 3, 2, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(6, 6, 4, 1); ctx.fillRect(8, 3, 1, 4);
  } else if (itemId === BLOCK.TOOL_FLINT_AND_STEEL) {
    ctx.fillStyle = '#64748b'; ctx.fillRect(2, 3, 7, 3); ctx.fillRect(2, 5, 3, 7); ctx.fillRect(2, 10, 6, 3);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(3, 4, 5, 2); ctx.fillRect(3, 6, 2, 5); ctx.fillRect(3, 10, 5, 2);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(8, 6, 6, 7);
    ctx.fillStyle = '#334155'; ctx.fillRect(9, 7, 4, 5); ctx.fillStyle = '#64748b'; ctx.fillRect(10, 8, 2, 2);
    ctx.fillStyle = '#f97316'; ctx.fillRect(7, 2, 3, 3); ctx.fillStyle = '#fef08a'; ctx.fillRect(8, 2, 1, 2);
  } else if (itemId === BLOCK.ITEM_STICK) {
    drawDiagonalHandle(ctx, 3, 12);
  } else if (itemId === BLOCK.ITEM_COAL) {
    ctx.fillStyle = '#090d16'; ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = '#334155'; ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = '#64748b'; ctx.fillRect(5, 5, 3, 3);
  } else if (itemId === BLOCK.ITEM_IRON_INGOT || itemId === BLOCK.ITEM_GOLD_INGOT) {
    const isGold = itemId === BLOCK.ITEM_GOLD_INGOT;
    ctx.fillStyle = isGold ? '#78350f' : '#334155'; ctx.fillRect(2, 5, 12, 7);
    ctx.fillStyle = isGold ? '#b45309' : '#64748b'; ctx.fillRect(2, 6, 12, 6);
    ctx.fillStyle = isGold ? '#facc15' : '#e2e8f0'; ctx.fillRect(3, 5, 10, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 6, 4, 2);
  } else if (itemId === BLOCK.ITEM_DIAMOND) {
    ctx.fillStyle = '#0369a1'; ctx.fillRect(4, 2, 8, 12); ctx.fillRect(2, 5, 12, 6);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(4, 3, 8, 10); ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = '#5decf5'; ctx.fillRect(5, 4, 6, 8);
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(6, 5, 3, 3);
  } else if (itemId === BLOCK.ITEM_BUCKET || itemId === BLOCK.ITEM_WATER_BUCKET || itemId === BLOCK.ITEM_LAVA_BUCKET) {
    ctx.fillStyle = '#334155'; ctx.fillRect(2, 4, 12, 8); ctx.fillRect(3, 12, 10, 3);
    ctx.fillStyle = '#64748b'; ctx.fillRect(3, 4, 10, 8); ctx.fillRect(4, 12, 8, 2);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(4, 5, 8, 7);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(5, 6, 2, 5);
    if (itemId === BLOCK.ITEM_BUCKET) {
      ctx.fillStyle = '#475569'; ctx.fillRect(5, 4, 6, 2);
    } else {
      ctx.fillStyle = itemId === BLOCK.ITEM_WATER_BUCKET ? '#2563eb' : '#f97316'; ctx.fillRect(4, 4, 8, 4);
      ctx.fillStyle = itemId === BLOCK.ITEM_WATER_BUCKET ? '#93c5fd' : '#fef08a'; ctx.fillRect(5, 4, 4, 2);
    }
  } else if (itemId === BLOCK.TOOL_BOW) {
    ctx.fillStyle = '#cbd5e1'; for (let y = 3; y <= 13; y++) ctx.fillRect(4, y, 1, 1);
    ctx.fillStyle = '#451a03'; ctx.fillRect(5, 1, 5, 2); ctx.fillRect(10, 4, 2, 8); ctx.fillRect(5, 13, 5, 2);
    ctx.fillStyle = '#92400e'; ctx.fillRect(5, 2, 4, 2); ctx.fillRect(9, 4, 2, 8); ctx.fillRect(5, 12, 4, 2);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(3, 7, 10, 2); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(12, 7, 2, 2);
  } else if (isArmorItem(itemId)) {
    const isDia = itemId >= BLOCK.ARMOR_DIAMOND_HELMET, sIdx = getArmorSlotForItem(itemId);
    const darkC = isDia ? '#0369a1' : '#334155', midC = isDia ? '#0284c7' : '#64748b', hiC = isDia ? '#5decf5' : '#e2e8f0', glintC = isDia ? '#e0f2fe' : '#ffffff';
    ctx.fillStyle = darkC;
    if (sIdx === 0) {
      ctx.fillRect(1, 2, 14, 11); ctx.fillStyle = midC; ctx.fillRect(2, 3, 12, 9);
      ctx.fillStyle = hiC; ctx.fillRect(3, 4, 10, 4); ctx.fillRect(3, 8, 3, 3); ctx.fillRect(10, 8, 3, 3);
      ctx.fillStyle = glintC; ctx.fillRect(4, 4, 4, 2);
    } else if (sIdx === 1) {
      ctx.fillRect(1, 1, 14, 14); ctx.fillStyle = midC; ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = hiC; ctx.fillRect(3, 3, 3, 4); ctx.fillRect(10, 3, 3, 4); ctx.fillRect(4, 6, 8, 7);
      ctx.fillStyle = glintC; ctx.fillRect(5, 6, 3, 3);
    } else if (sIdx === 2) {
      ctx.fillRect(2, 1, 12, 14); ctx.fillStyle = midC; ctx.fillRect(3, 2, 10, 12);
      ctx.fillStyle = hiC; ctx.fillRect(4, 3, 8, 3); ctx.fillRect(4, 6, 3, 7); ctx.fillRect(9, 6, 3, 7);
      ctx.fillStyle = glintC; ctx.fillRect(5, 3, 3, 2);
    } else {
      ctx.fillRect(1, 5, 7, 10); ctx.fillRect(8, 5, 7, 10); ctx.fillStyle = midC; ctx.fillRect(2, 6, 5, 8); ctx.fillRect(9, 6, 5, 8);
      ctx.fillStyle = hiC; ctx.fillRect(3, 7, 3, 6); ctx.fillRect(10, 7, 3, 6);
      ctx.fillStyle = glintC; ctx.fillRect(3, 7, 2, 2); ctx.fillRect(10, 7, 2, 2);
    }
  } else if (itemId === BLOCK.TOOL_FISHING_ROD) {
    drawDiagonalHandle(ctx, 2, 12);
    ctx.fillStyle = '#475569'; ctx.fillRect(4, 11, 2, 2);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(13, 4, 1, 7);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(12, 11, 3, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(12, 11, 3, 1);
  } else if (itemId === BLOCK.ITEM_BONE) {
    ctx.fillStyle = '#94a3b8'; for (let i = 4; i <= 11; i++) ctx.fillRect(i + 1, 15 - i, 2, 2);
    ctx.fillStyle = '#cbd5e1'; for (let i = 4; i <= 11; i++) ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 11, 4, 3); ctx.fillRect(10, 2, 4, 3);
  } else if (itemId === BLOCK.ITEM_BONE_MEAL) {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(2, 8, 12, 6);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(3, 7, 10, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(5, 5, 6, 6); ctx.fillRect(4, 8, 8, 4);
  } else if (itemId === BLOCK.ITEM_RAW_PORKCHOP || itemId === BLOCK.ITEM_COOKED_PORKCHOP) {
    const isCooked = itemId === BLOCK.ITEM_COOKED_PORKCHOP;
    ctx.fillStyle = isCooked ? '#451a03' : '#881337'; ctx.fillRect(2, 3, 12, 10);
    ctx.fillStyle = isCooked ? '#92400e' : '#be123c'; ctx.fillRect(3, 4, 10, 8);
    ctx.fillStyle = isCooked ? '#f59e0b' : '#fda4af'; ctx.fillRect(4, 5, 8, 6);
    ctx.fillStyle = '#fef2f2'; ctx.fillRect(9, 6, 2, 2);
  } else if (itemId === BLOCK.ITEM_RAW_FISH || itemId === BLOCK.ITEM_COOKED_FISH) {
    const isCooked = itemId === BLOCK.ITEM_COOKED_FISH;
    ctx.fillStyle = isCooked ? '#78350f' : '#0369a1'; ctx.fillRect(2, 4, 10, 8);
    ctx.fillStyle = isCooked ? '#b45309' : '#0284c7'; ctx.fillRect(3, 5, 9, 6); ctx.fillRect(11, 4, 3, 8);
    ctx.fillStyle = isCooked ? '#fbbf24' : '#7dd3fc'; ctx.fillRect(4, 6, 7, 4);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 6, 2, 2);
  } else if (itemId === BLOCK.ITEM_APPLE || itemId === BLOCK.ITEM_GOLDEN_APPLE) {
    const isGold = itemId === BLOCK.ITEM_GOLDEN_APPLE;
    ctx.fillStyle = '#78350f'; ctx.fillRect(7, 1, 1, 3);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(8, 2, 3, 2);
    ctx.fillStyle = isGold ? '#a16207' : '#991b1b'; ctx.fillRect(3, 3, 10, 11);
    ctx.fillStyle = isGold ? '#eab308' : '#ef4444'; ctx.fillRect(4, 4, 8, 9); ctx.fillRect(3, 5, 10, 7);
    ctx.fillStyle = isGold ? '#fef08a' : '#fca5a5'; ctx.fillRect(5, 5, 2, 2);
  } else if (itemId === BLOCK.ITEM_BREAD) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(1, 5, 14, 8);
    ctx.fillStyle = '#92400e'; ctx.fillRect(2, 6, 12, 6);
    ctx.fillStyle = '#d97706'; ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, 6, 8, 3);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(5, 6, 1, 2); ctx.fillRect(8, 6, 1, 2);
  } else if (itemId === BLOCK.ITEM_MINECART) {
    ctx.fillStyle = '#64748b'; ctx.fillRect(1, 4, 14, 8);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(2, 5, 12, 6);
    ctx.fillStyle = '#475569'; ctx.fillRect(4, 6, 8, 3);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(3, 11, 3, 3); ctx.fillRect(10, 11, 3, 3);
  } else if (itemId === BLOCK.ITEM_BOAT) {
    ctx.fillStyle = '#451a03'; ctx.fillRect(1, 7, 14, 7);
    ctx.fillStyle = '#78350f'; ctx.fillRect(1, 8, 14, 5);
    ctx.fillStyle = '#d97706'; ctx.fillRect(3, 7, 10, 4);
    ctx.fillStyle = '#fcd34d'; ctx.fillRect(6, 3, 2, 6); ctx.fillRect(9, 3, 2, 6);
  } else if (itemId === BLOCK.TOOL_GRAPPLING_HOOK) {
    ctx.fillStyle = '#475569'; for (let i = 2; i <= 11; i++) ctx.fillRect(i + 1, 15 - i, 2, 2);
    ctx.fillStyle = '#cbd5e1'; for (let i = 2; i <= 11; i++) ctx.fillRect(i, 15 - i, 2, 2);
    ctx.fillStyle = '#7e22ce'; ctx.fillRect(8, 1, 6, 3); ctx.fillRect(12, 4, 3, 5);
    ctx.fillStyle = '#c084fc'; ctx.fillRect(9, 2, 5, 2); ctx.fillRect(12, 4, 2, 4); ctx.fillRect(7, 4, 3, 2);
    ctx.fillStyle = '#f3e8ff'; ctx.fillRect(10, 2, 2, 1);
  } else if (itemId === BLOCK.ITEM_EMERALD) {
    ctx.fillStyle = '#064e3b'; ctx.fillRect(3, 1, 10, 14);
    ctx.fillStyle = '#047857'; ctx.fillRect(4, 2, 8, 12); ctx.fillRect(3, 4, 10, 8);
    ctx.fillStyle = '#10b981'; ctx.fillRect(5, 3, 6, 10); ctx.fillStyle = '#a7f3d0'; ctx.fillRect(6, 4, 2, 3);
  } else if (itemId === BLOCK.ITEM_ENDER_PEARL) {
    ctx.fillStyle = '#042f2e'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#115e59'; ctx.fillRect(3, 3, 10, 10); ctx.fillStyle = '#0d9488'; ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = '#5eead4'; ctx.fillRect(5, 5, 3, 3);
  } else if (itemId === BLOCK.ITEM_COMPASS) {
    ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#475569'; ctx.fillRect(2, 3, 12, 10); ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(4, 4, 8, 8);
    const tx = (typeof player !== 'undefined' && player.hasBedSpawn) ? player.spawnX : 0, tz = (typeof player !== 'undefined' && player.hasBedSpawn) ? player.spawnZ : 0;
    const rel = (typeof player !== 'undefined') ? (Math.atan2(tx - player.x, -(tz - player.z)) - player.yaw) : 0;
    const nx = Math.round(Math.sin(rel) * 2.6), ny = -Math.round(Math.cos(rel) * 2.6);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(7 - nx, 7 - ny, 2, 2); ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 7, 2, 2); ctx.fillRect(7 + nx, 7 + ny, 2, 2);
  } else if (itemId === BLOCK.ITEM_CLOCK) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#b45309'; ctx.fillRect(2, 3, 12, 10); ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#facc15'; ctx.fillRect(3, 3, 10, 10);
    const night = typeof isNight !== 'undefined' && isNight, ang = typeof celestialAngle !== 'undefined' ? celestialAngle : 0;
    ctx.fillStyle = night ? '#0f172a' : '#1d4ed8'; ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = night ? '#e2e8f0' : '#fef08a'; ctx.fillRect(7 + Math.round(Math.sin(ang) * 1.6), 6, 2, 2);
  } else if (itemId >= BLOCK.ITEM_PAPER && itemId <= BLOCK.ITEM_MAP) {
    drawPaperOrMapIcon(ctx, itemId);
  } else {
    const def = BLOCK_DEFS[itemId];
    ctx.drawImage(atlasCanvas, def.tiles[2] * TILE_PX, 0, TILE_PX, TILE_PX, 0, 0, 16, 16);
  }
  if (typeof getItemEnchantLevel === 'function' && getItemEnchantLevel(itemId) > 0) {
    ctx.fillStyle = '#e879f9'; ctx.fillRect(11, 2, 2, 2); ctx.fillRect(3, 11, 2, 2); ctx.fillStyle = '#c084fc'; ctx.fillRect(12, 4, 1, 2);
  }
}
