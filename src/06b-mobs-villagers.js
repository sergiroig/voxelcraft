// VoxelCraft HTML5 — 06b-mobs-villagers.js (PHASE 7 & 10: 34 EXTRA CREATURES, VILLAGER TRADING, HORSES, SNOW GOLEM & BOSS BAR HUD)
'use strict';

// ============================================================================
// 1. 34 EXTRA MOB TILE CROPS (Tiles 35..68 in mobAtlasCanvas)
// ============================================================================
const MC_EXTRA_MOB_TILE_CROPS = [
  ['entity/villager/villager.png', 8, 8, 8, 8, 0, 0],
  ['entity/wandering_trader/wandering_trader.png', 8, 8, 8, 8, 0, 0],
  ['entity/horse/horse_brown.png', 8, 17, 8, 8, 0, 0],
  ['entity/bee/bee.png', 10, 7, 8, 8, 0, 0],
  ['entity/fox/fox.png', 8, 8, 8, 8, 0, 0],
  ['entity/bear/polarbear.png', 8, 6, 8, 8, 0, 0],
  ['entity/rabbit/rabbit_brown.png', 12, 0, 8, 8, 0, 0],
  ['entity/snow_golem/snow_golem.png', 8, 8, 8, 8, 0, 0],
  ['entity/panda/panda.png', 10, 12, 8, 8, 0, 0],
  ['entity/parrot/parrot_red_blue.png', 4, 4, 8, 8, 0, 0],
  ['entity/cat/ocelot.png', 5, 2, 8, 8, 0, 0],
  ['entity/frog/frog_temperate.png', 19, 5, 8, 8, 0, 0],
  ['entity/axolotl/axolotl_lucy.png', 10, 8, 8, 8, 0, 0],
  ['entity/squid/squid.png', 12, 12, 8, 8, 0, 0],
  ['entity/fish/cod.png', 10, 3, 8, 8, 0, 0],
  ['entity/fish/salmon.png', 12, 4, 8, 8, 0, 0],
  ['entity/dolphin/dolphin.png', 9, 5, 8, 8, 0, 0],
  ['entity/turtle/turtle.png', 12, 0, 8, 8, 0, 0],
  ['entity/camel/camel.png', 7, 23, 8, 8, 0, 0],
  ['entity/witch/witch.png', 8, 8, 8, 8, 0, 0],
  ['entity/illager/pillager.png', 8, 8, 8, 8, 0, 0],
  ['entity/zombie/drowned.png', 8, 8, 8, 8, 0, 0],
  ['entity/zombie/husk.png', 8, 8, 8, 8, 0, 0],
  ['entity/skeleton/stray.png', 8, 8, 8, 8, 0, 0],
  ['entity/blaze/blaze.png', 8, 8, 8, 8, 0, 0],
  ['entity/ghast/ghast.png', 4, 0, 8, 8, 0, 0],
  ['entity/piglin/piglin.png', 8, 8, 8, 8, 0, 0],
  ['entity/slime/magmacube.png', 8, 8, 8, 8, 0, 0],
  ['entity/warden/warden.png', 16, 16, 8, 8, 0, 0],
  ['entity/wither/wither.png', 8, 8, 8, 8, 0, 0],
  ['entity/enderdragon/dragon.png', 16, 0, 8, 8, 0, 0],
  ['entity/shulker/shulker.png', 16, 16, 8, 8, 0, 0],
  ['entity/skeleton/wither_skeleton.png', 8, 8, 8, 8, 0, 0],
  ['entity/strider/strider.png', 16, 16, 8, 8, 0, 0]
];

const EXTRA_MOB_SPECS = [
  ['villager',         35, 10, BLOCK.ITEM_EMERALD,          'geoVillager',         0.50, 0.78, 0.34, false],
  ['wandering_trader', 36, 10, BLOCK.ITEM_EMERALD,          'geoWanderingTrader',  0.50, 0.78, 0.34, false],
  ['horse',            37, 12, BLOCK.ITEM_SADDLE,           'geoHorse',            0.74, 0.68, 1.32, false],
  ['bee',              38,  4, BLOCK.ITEM_SUGAR,            'geoBee',              0.44, 0.42, 0.52, false],
  ['fox',              39,  5, BLOCK.ITEM_SWEET_BERRIES,    'geoFox',              0.46, 0.44, 0.84, false],
  ['polarbear',        40, 14, BLOCK.ITEM_RAW_FISH,         'geoPolarbear',        0.92, 0.78, 1.38, false],
  ['rabbit',           41,  3, BLOCK.ITEM_CARROT,           'geoRabbit',           0.36, 0.36, 0.48, false],
  ['snow_golem',       42,  8, BLOCK.SNOW,                  'geoSnowGolem',        0.54, 0.80, 0.54, false],
  ['panda',            43, 12, BLOCK.BAMBOO,                'geoPanda',            0.88, 0.74, 1.24, false],
  ['parrot',           44,  3, BLOCK.ITEM_COOKIE,           'geoParrot',           0.30, 0.48, 0.30, false],
  ['ocelot',           45,  5, BLOCK.ITEM_RAW_FISH,         'geoOcelot',           0.40, 0.42, 0.86, false],
  ['frog',             46,  4, BLOCK.SLIME,                 'geoFrog',             0.46, 0.38, 0.50, false],
  ['axolotl',          47,  6, BLOCK.LILY_PAD,              'geoAxolotl',          0.46, 0.34, 0.78, false],
  ['squid',            48,  6, BLOCK.ITEM_RAW_FISH,         'geoSquid',            0.58, 0.82, 0.58, false],
  ['cod',              49,  3, BLOCK.ITEM_RAW_FISH,         'geoCod',              0.30, 0.32, 0.58, false],
  ['salmon',           50,  3, BLOCK.ITEM_RAW_FISH,         'geoSalmon',           0.34, 0.36, 0.68, false],
  ['dolphin',          51,  8, BLOCK.ITEM_RAW_FISH,         'geoDolphin',          0.58, 0.52, 1.12, false],
  ['turtle',           52, 10, BLOCK.ARMOR_TURTLE_HELMET,   'geoTurtle',           0.78, 0.40, 0.90, false],
  ['camel',            53, 14, BLOCK.CACTUS,                'geoCamel',            0.84, 0.78, 1.48, false],
  ['witch',            54, 10, BLOCK.ITEM_POTION_REGEN,     'geoWitch',            0.50, 0.78, 0.34, true],
  ['pillager',         55, 10, BLOCK.TOOL_CROSSBOW,         'geoPillager',         0.50, 0.78, 0.34, true],
  ['drowned',          56,  8, BLOCK.TOOL_TRIDENT,          'geoDrowned',          0.50, 0.75, 0.28, true],
  ['husk',             57,  8, BLOCK.SAND,                  'geoHusk',             0.52, 0.78, 0.28, true],
  ['stray',            58,  7, BLOCK.ITEM_BONE,             'geoStray',            0.50, 0.75, 0.26, true],
  ['blaze',            59, 10, BLOCK.ITEM_BLAZE_POWDER,     'geoBlaze',            0.52, 0.82, 0.52, true],
  ['ghast',            60, 12, BLOCK.ITEM_GHAST_TEAR,       'geoGhast',            2.20, 2.20, 2.20, true],
  ['piglin',           61,  9, BLOCK.ITEM_GOLD_INGOT,       'geoPiglin',           0.52, 0.75, 0.30, true],
  ['magmacube',        62,  8, BLOCK.ITEM_MAGMA_CREAM,      'geoMagmacube',        1.04, 1.04, 1.04, true],
  ['warden',           63, 40, BLOCK.DEEPSLATE,             'geoWarden',           0.96, 1.24, 0.56, true],
  ['wither',           64, 50, BLOCK.ITEM_TOTEM_OF_UNDYING, 'geoWither',           1.40, 1.65, 0.70, true],
  ['enderdragon',      65, 60, BLOCK.ITEM_ELYTRA,           'geoEnderdragon',      2.40, 1.35, 2.80, true],
  ['shulker',          66, 12, BLOCK.PURPUR_BLOCK,          'geoShulker',          0.96, 0.96, 0.96, true],
  ['wither_skeleton',  67, 10, BLOCK.ITEM_COAL,             'geoWitherSkeleton',   0.56, 0.92, 0.28, true],
  ['strider',          68, 10, BLOCK.CRIMSON_STEM,          'geoStrider',          0.84, 0.84, 0.84, false]
];

const EXTRA_MOB_MAP = {};
const HUMANOID_EXTRA = new Set(['villager', 'wandering_trader', 'witch', 'pillager', 'drowned', 'husk', 'stray', 'piglin', 'snow_golem', 'blaze', 'wither_skeleton', 'warden']);
const QUADRUPED_EXTRA = new Set(['horse', 'camel', 'polarbear', 'panda', 'fox', 'ocelot', 'rabbit', 'turtle']);
for (const [mType, tile, hp, loot, geoName, w, h, d, hostile] of EXTRA_MOB_SPECS) {
  MOB_HP_MAP[mType] = hp;
  MOB_LOOT_MAP[mType] = loot;
  mobGeos[geoName] = makeMobBox(w, h, d, tile, tile, tile, tile);
  const isHum = HUMANOID_EXTRA.has(mType), isQuad = QUADRUPED_EXTRA.has(mType);
  const legH = mType === 'camel' ? 1.02 : (mType === 'horse' ? 0.82 : (mType === 'warden' ? 0.96 : (mType === 'wither_skeleton' ? 0.90 : (isHum ? 0.75 : (mType === 'polarbear' ? 0.68 : (mType === 'panda' || mType === 'strider' ? 0.58 : 0.34))))));
  const legW = (mType === 'warden' || mType === 'polarbear' || mType === 'panda') ? 0.28 : (isHum || mType === 'horse' || mType === 'camel' ? 0.24 : 0.16);
  const legGeo = makeMobBox(legW, legH, legW, tile, tile, tile, tile, null, true);
  const headS = mType === 'warden' ? 0.68 : (mType === 'wither_skeleton' ? 0.56 : (isHum || mType === 'horse' || mType === 'camel' || mType === 'polarbear' || mType === 'panda' ? 0.50 : Math.max(0.28, w * 0.75)));
  const headGeo = makeMobBox(headS, headS, headS, tile, tile, tile, tile);
  EXTRA_MOB_MAP[mType] = { tile, hp, loot, geoName, legGeo, headGeo, legH, headS, isHum, isQuad, w, h, d, hostile };
}

const _origCreateMobMesh = createMobMesh;
createMobMesh = function(type) {
  const spec = EXTRA_MOB_MAP[type];
  if (!spec) return _origCreateMobMesh(type);
  const root = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: mobAtlasTexture, vertexColors: true, color: 0xffffff });
  const mats = [{ mat, baseHex: 0xffffff }];
  const addP = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };
  if (spec.isHum) {
    addP(mobGeos[spec.geoName], 0, spec.legH + spec.h * 0.5, 0);
    const head = addP(spec.headGeo, 0, spec.legH + spec.h + spec.headS * 0.5, 0);
    const armL = addP(spec.legGeo, -(spec.w * 0.5 + 0.12), spec.legH + spec.h * 0.90, 0.10), armR = addP(spec.legGeo, spec.w * 0.5 + 0.12, spec.legH + spec.h * 0.90, 0.10);
    const l1 = addP(spec.legGeo, -spec.w * 0.25, spec.legH, 0), l2 = addP(spec.legGeo, spec.w * 0.25, spec.legH, 0);
    return { root, head, legs: [l1, l2, armL, armR], mats, height: spec.legH + spec.h + spec.headS, radius: Math.max(0.38, spec.w * 0.55) };
  }
  if (spec.isQuad) {
    addP(mobGeos[spec.geoName], 0, spec.legH + spec.h * 0.5, 0);
    const head = addP(spec.headGeo, 0, spec.legH + spec.h * 0.85, spec.d * 0.54);
    const lx = spec.w * 0.30, ly = spec.legH, lz = spec.d * 0.36;
    const legs = [[-lx, ly, lz], [lx, ly, lz], [-lx, ly, -lz], [lx, ly, -lz]].map(([px, py, pz]) => addP(spec.legGeo, px, py, pz));
    return { root, head, legs, mats, height: spec.legH + spec.h + spec.headS * 0.6, radius: Math.max(0.42, spec.w * 0.55) };
  }
  const head = addP(mobGeos[spec.geoName], 0, spec.legH + spec.h * 0.5, 0);
  const l1 = addP(spec.legGeo, -spec.w * 0.25, spec.legH, 0), l2 = addP(spec.legGeo, spec.w * 0.25, spec.legH, 0);
  return { root, head, legs: [l1, l2], mats, height: spec.legH + spec.h, radius: Math.max(0.35, spec.w * 0.5) };
};

const _origSpawnMob = spawnMob;
spawnMob = function(type, x, y, z) {
  const m = _origSpawnMob(type, x, y, z);
  if (type === 'snow_golem') m.allied = true;
  if (EXTRA_MOB_MAP[type] && EXTRA_MOB_MAP[type].hostile) m.isExtraHostile = true;
  if (type === 'wither' || type === 'enderdragon' || type === 'warden') {
    m.maxHp = MOB_HP_MAP[type];
    updateBossBarHUD(m);
  }
  return m;
};

// ============================================================================
// 2. VILLAGER & WANDERING TRADER TRADING SYSTEM (Fase 7.1)
// ============================================================================
const VILLAGER_TRADES = [
  { giveId: BLOCK.WHEAT_3,      giveCount: 4, outId: BLOCK.ITEM_EMERALD,          outCount: 2, name: '4× Trigo → 2× Esmeraldas' },
  { giveId: BLOCK.ITEM_EMERALD, giveCount: 1, outId: BLOCK.ITEM_BREAD,            outCount: 3, name: '1× Esmeralda → 3× Pan' },
  { giveId: BLOCK.ITEM_EMERALD, giveCount: 2, outId: BLOCK.ITEM_GOLDEN_APPLE,     outCount: 1, name: '2× Esmeraldas → 1× Manzana Dorada' },
  { giveId: BLOCK.ITEM_EMERALD, giveCount: 3, outId: BLOCK.TOOL_PICKAXE,          outCount: 1, name: '3× Esmeraldas → 1× Pico de Diamante Encantado' },
  { giveId: BLOCK.ITEM_EMERALD, giveCount: 2, outId: BLOCK.ITEM_SADDLE,           outCount: 1, name: '2× Esmeraldas → 1× Montura de Caballo' },
  { giveId: BLOCK.ITEM_EMERALD, giveCount: 4, outId: BLOCK.ITEM_TOTEM_OF_UNDYING, outCount: 1, name: '4× Esmeraldas → 1× Tótem de la Inmortalidad' }
];

let villagerTradeCursor = 0;

function tradeWithVillager(mob, tradeIdx) {
  if (!mob || (mob.type !== 'villager' && mob.type !== 'wandering_trader')) return null;
  const idx = typeof tradeIdx === 'number' ? (tradeIdx % VILLAGER_TRADES.length) : (villagerTradeCursor++ % VILLAGER_TRADES.length);
  const trade = VILLAGER_TRADES[idx];
  if (gameMode === 'survival' && (inventoryCounts[trade.giveId] || 0) >= trade.giveCount) {
    inventoryCounts[trade.giveId] -= trade.giveCount;
  }
  addInventoryItem(trade.outId, trade.outCount);
  if (trade.outId === BLOCK.TOOL_PICKAXE && typeof enchantedItems !== 'undefined') enchantedItems[BLOCK.TOOL_PICKAXE] = 2;
  spawnBlockParticles(mob.x, mob.y + 1.1, mob.z, BLOCK.EMERALD_BLOCK, 16);
  sfx.play('chime');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = `🤝 Comercio Aldeano: ¡${trade.name}!`;
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  return trade;
}

// ============================================================================
// 3. HORSE / CAMEL RIDING WITH SADDLE & SNOW GOLEM SUMMONING (Fase 7.2)
// ============================================================================
let ridingMount = null;

function tameAndRideHorse(mob) {
  if (!mob || (mob.type !== 'horse' && mob.type !== 'camel')) return false;
  mob.tamed = true;
  mob.allied = true;
  ridingMount = ridingMount === mob ? null : mob;
  if (ridingMount) {
    player.x = mob.x; player.y = mob.y + 0.85; player.z = mob.z;
    spawnBlockParticles(mob.x, mob.y + 0.8, mob.z, BLOCK.GOLD_BLOCK, 14);
  }
  sfx.play('step');
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = ridingMount ? `🐎 ¡Montando ${mob.type === 'camel' ? 'Camello' : 'Caballo'}! Velocidad de galope activada` : '🐎 Has desmontado';
  return !!ridingMount;
}

function trySummonSnowGolem(wx, wy, wz) {
  const top = getVoxelGlobal(wx, wy, wz);
  if (top !== BLOCK.CARVED_PUMPKIN && top !== BLOCK.JACK_O_LANTERN && top !== BLOCK.PUMPKIN) return null;
  if (getVoxelGlobal(wx, wy - 1, wz) !== BLOCK.SNOW || getVoxelGlobal(wx, wy - 2, wz) !== BLOCK.SNOW) return null;
  setVoxelGlobal(wx, wy, wz, BLOCK.AIR);
  setVoxelGlobal(wx, wy - 1, wz, BLOCK.AIR);
  setVoxelGlobal(wx, wy - 2, wz, BLOCK.AIR);
  spawnBlockParticles(wx, wy - 1, wz, BLOCK.SNOW, 20);
  sfx.play('golem');
  const sg = spawnMob('snow_golem', wx + 0.5, wy - 2, wz + 0.5);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '⛄ ¡Gólem de Nieve Aliado Invocado!';
  return sg;
}

// ============================================================================
// 4. BOSS BAR HUD (gui/sprites/boss_bar/pink_background.png & pink_progress.png)
// ============================================================================
function ensureBossBarDOM() {
  let bar = document.getElementById('mc-boss-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mc-boss-bar';
    bar.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);width:270px;z-index:25;display:none;text-align:center;pointer-events:none;font-family:monospace;';
    bar.innerHTML = `<div id="mc-boss-title" style="color:#f472b6;font-weight:700;font-size:13px;text-shadow:1px 1px 0 #000;margin-bottom:3px;">Dragón del End</div>
      <div style="position:relative;width:270px;height:10px;background:url('./mc-reference/assets/minecraft/textures/gui/sprites/boss_bar/pink_background.png') no-repeat center/100% 100%;image-rendering:pixelated;border-radius:2px;overflow:hidden;">
        <div id="mc-boss-fill" style="width:100%;height:100%;background:url('./mc-reference/assets/minecraft/textures/gui/sprites/boss_bar/pink_progress.png') no-repeat left/270px 100%;image-rendering:pixelated;"></div>
      </div>`;
    document.body.appendChild(bar);
  }
  return bar;
}

function updateBossBarHUD(forceBoss = null) {
  const bar = ensureBossBarDOM();
  const boss = forceBoss || mobs.find(m => m.hp > 0 && (m.type === 'enderdragon' || m.type === 'wither' || m.type === 'warden'));
  if (!boss || boss.hp <= 0) {
    bar.style.display = 'none';
    return false;
  }
  bar.style.display = 'block';
  const titleEl = document.getElementById('mc-boss-title');
  const fillEl = document.getElementById('mc-boss-fill');
  const names = { enderdragon: '🐉 Dragón del End', wither: '💀 Wither Destructor', warden: '👁 Warden de las Profundidades' };
  const maxHp = boss.maxHp || MOB_HP_MAP[boss.type] || 50;
  const pct = Math.max(0, Math.min(100, (boss.hp / maxHp) * 100));
  if (titleEl) titleEl.textContent = `${names[boss.type] || boss.type} (${Math.ceil(boss.hp)}/${maxHp} HP)`;
  if (fillEl) fillEl.style.width = `${pct}%`;
  return true;
}
