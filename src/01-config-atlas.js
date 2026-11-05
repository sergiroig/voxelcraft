// VoxelCraft HTML5 — 01-config-atlas.js (1. CONSTANTS, BLOCKS, RECIPES & 2. PROCEDURAL TEXTURE ATLAS)
'use strict';

// ============================================================================
// 1. CONSTANTS, BLOCKS, ORES, FLORA & TOOLS
// ============================================================================
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 64;
const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE; // 16,384 bytes
const SEA_LEVEL = 20;

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WOOD: 5,
  LEAVES: 6,
  PLANKS: 7,
  COBBLE: 8,
  BRICK: 9,
  GLASS: 10,
  WATER: 11,
  SNOW: 12,
  GLOWSTONE: 13,
  BEDROCK: 14,
  COAL_ORE: 15,
  IRON_ORE: 16,
  GOLD_ORE: 17,
  DIAMOND_ORE: 18,
  TORCH: 19,
  TALL_GRASS: 20,
  FLOWER_RED: 21,
  FLOWER_YELLOW: 22,
  CACTUS: 23,
  TNT: 24,
  LAVA: 25,
  OBSIDIAN: 26,
  LEVER_OFF: 27,
  LEVER_ON: 28,
  REDSTONE_LAMP_OFF: 29,
  REDSTONE_LAMP_ON: 30,
  SAPLING: 31,
  WHEAT_1: 32,
  WHEAT_2: 33,
  WHEAT_3: 34,
  AMETHYST: 35,
  GLOW_MUSHROOM: 36,
  SLIME: 37,
  DOOR_CLOSED: 38,
  DOOR_OPEN: 39,
  LADDER: 40,
  TRAPDOOR_CLOSED: 41,
  TRAPDOOR_OPEN: 42,
  RAIL: 43,
  CHEST: 44,
  LILY_PAD: 45,
  PISTON: 46,
  PORTAL: 47,
  ICE: 48,
  // Special Tool & Consumable IDs (not placed as blocks)
  TOOL_PICKAXE: 100,
  TOOL_SWORD: 101,
  TOOL_BOW: 102,
  ITEM_APPLE: 103,
  ITEM_BREAD: 104,
  ITEM_MINECART: 105,
  ITEM_BOAT: 106,
  TOOL_GRAPPLING_HOOK: 107
};

// Atlas has 51 tiles (columns) of 16x16 pixels
const ATLAS_COLS = 51;
const TILE_PX = 16;

// Block Definitions:
// shape: 'cube' (default) or 'cross' (2 diagonal X-planes)
// light: 0..15 emitted block light
// hardness: seconds to break by hand (pickaxe mines stone/ores 3.2x faster)
const BLOCK_DEFS = {
  [BLOCK.AIR]:                 { name: 'Aire',                     solid: false, opaque: false, shape: 'air',   light: 0,  hardness: 0,    stoneLike: false, color: 0xf1c27d, tiles: [0,0,0,0,0,0] },
  [BLOCK.GRASS]:               { name: 'Césped',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.42, stoneLike: false, color: 0x58a83a, tiles: [0, 2, 1, 1, 1, 1] },
  [BLOCK.DIRT]:                { name: 'Tierra',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.38, stoneLike: false, color: 0x866043, tiles: [2, 2, 2, 2, 2, 2] },
  [BLOCK.STONE]:               { name: 'Piedra',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.05, stoneLike: true,  color: 0x7d8084, tiles: [3, 3, 3, 3, 3, 3] },
  [BLOCK.SAND]:                { name: 'Arena',                    solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: false, color: 0xe0ce94, tiles: [4, 4, 4, 4, 4, 4] },
  [BLOCK.WOOD]:                { name: 'Tronco de Roble',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.65, stoneLike: false, color: 0x6b4e2e, tiles: [6, 6, 5, 5, 5, 5] },
  [BLOCK.LEAVES]:              { name: 'Hojas',                    solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.18, stoneLike: false, color: 0x34802a, tiles: [7, 7, 7, 7, 7, 7] },
  [BLOCK.PLANKS]:              { name: 'Madera',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.60, stoneLike: false, color: 0xb08852, tiles: [8, 8, 8, 8, 8, 8] },
  [BLOCK.COBBLE]:              { name: 'Adoquín',                  solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.10, stoneLike: true,  color: 0x73767a, tiles: [9, 9, 9, 9, 9, 9] },
  [BLOCK.BRICK]:               { name: 'Ladrillos',                solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.15, stoneLike: true,  color: 0xa8483a, tiles: [10,10,10,10,10,10] },
  [BLOCK.GLASS]:               { name: 'Cristal',                  solid: true,  opaque: false, shape: 'cube',  light: 0,  hardness: 0.25, stoneLike: false, color: 0xdaf0ff, tiles: [11,11,11,11,11,11] },
  [BLOCK.WATER]:               { name: 'Agua',                     solid: false, opaque: false, shape: 'water', light: 0,  hardness: 0,    stoneLike: false, color: 0x1c76d8, tiles: [12,12,12,12,12,12] },
  [BLOCK.SNOW]:                { name: 'Nieve',                    solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: false, color: 0xf0f8ff, tiles: [13, 2,14,14,14,14] },
  [BLOCK.GLOWSTONE]:           { name: 'Piedra Luminosa',          solid: true,  opaque: true,  shape: 'cube',  light: 15, hardness: 0.40, stoneLike: false, color: 0xffeba8, tiles: [15,15,15,15,15,15] },
  [BLOCK.BEDROCK]:             { name: 'Roca Madre',               solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 999,  stoneLike: true,  color: 0x2d2d32, tiles: [16,16,16,16,16,16] },
  [BLOCK.COAL_ORE]:            { name: 'Mena de Carbón',           solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.25, stoneLike: true,  color: 0x3b3d40, tiles: [17,17,17,17,17,17] },
  [BLOCK.IRON_ORE]:            { name: 'Mena de Hierro',           solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.35, stoneLike: true,  color: 0xd8af93, tiles: [18,18,18,18,18,18] },
  [BLOCK.GOLD_ORE]:            { name: 'Mena de Oro',              solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.45, stoneLike: true,  color: 0xfcee4b, tiles: [19,19,19,19,19,19] },
  [BLOCK.DIAMOND_ORE]:         { name: 'Mena de Diamante',         solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.65, stoneLike: true,  color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TORCH]:               { name: 'Antorcha (Luz)',           solid: false, opaque: false, shape: 'cross', light: 15, hardness: 0.05, stoneLike: false, color: 0xffd066, tiles: [21,21,21,21,21,21] },
  [BLOCK.TALL_GRASS]:          { name: 'Hierba Alta',              solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.04, stoneLike: false, color: 0x52a238, tiles: [22,22,22,22,22,22] },
  [BLOCK.FLOWER_RED]:          { name: 'Rosa Roja',                solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.04, stoneLike: false, color: 0xe83b3b, tiles: [23,23,23,23,23,23] },
  [BLOCK.FLOWER_YELLOW]:       { name: 'Diente de León',           solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.04, stoneLike: false, color: 0xfacc15, tiles: [24,24,24,24,24,24] },
  [BLOCK.CACTUS]:              { name: 'Cactus',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: false, color: 0x2d8a3e, tiles: [25,25,25,25,25,25] },
  [BLOCK.TNT]:                 { name: 'TNT (Explosivo)',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.12, stoneLike: false, color: 0xdc2626, tiles: [27,27,26,26,26,26] },
  [BLOCK.LAVA]:                { name: 'Lava Ardiente',            solid: false, opaque: true,  shape: 'cube',  light: 15, hardness: 0.25, stoneLike: false, color: 0xff5a1f, tiles: [28,28,28,28,28,28] },
  [BLOCK.OBSIDIAN]:            { name: 'Obsidiana',                solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 2.20, stoneLike: true,  color: 0x2e1a47, tiles: [29,29,29,29,29,29] },
  [BLOCK.LEVER_OFF]:           { name: 'Palanca Redstone',         solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.08, stoneLike: false, color: 0x94a3b8, tiles: [30,30,30,30,30,30] },
  [BLOCK.LEVER_ON]:            { name: 'Palanca Redstone (ON)',    solid: false, opaque: false, shape: 'cross', light: 7,  hardness: 0.08, stoneLike: false, color: 0xef4444, tiles: [31,31,31,31,31,31] },
  [BLOCK.REDSTONE_LAMP_OFF]:   { name: 'Lámpara Redstone',         solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: false, color: 0x6b3e26, tiles: [32,32,32,32,32,32] },
  [BLOCK.REDSTONE_LAMP_ON]:    { name: 'Lámpara Redstone (ON)',    solid: true,  opaque: true,  shape: 'cube',  light: 15, hardness: 0.35, stoneLike: false, color: 0xffd166, tiles: [33,33,33,33,33,33] },
  [BLOCK.SAPLING]:             { name: 'Brote de Árbol',           solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.05, stoneLike: false, color: 0x4ade80, tiles: [34,34,34,34,34,34] },
  [BLOCK.WHEAT_1]:             { name: 'Semillas de Trigo',        solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.04, stoneLike: false, color: 0x84cc16, tiles: [35,35,35,35,35,35] },
  [BLOCK.WHEAT_2]:             { name: 'Trigo en Crecimiento',     solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.04, stoneLike: false, color: 0xa3e635, tiles: [36,36,36,36,36,36] },
  [BLOCK.WHEAT_3]:             { name: 'Trigo Maduro',             solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.05, stoneLike: false, color: 0xeab308, tiles: [37,37,37,37,37,37] },
  [BLOCK.AMETHYST]:            { name: 'Cristal de Amatista',      solid: true,  opaque: true,  shape: 'cube',  light: 5,  hardness: 1.30, stoneLike: true,  color: 0xa855f7, tiles: [38,38,38,38,38,38] },
  [BLOCK.GLOW_MUSHROOM]:       { name: 'Seta Bioluminiscente',     solid: false, opaque: false, shape: 'cross', light: 12, hardness: 0.06, stoneLike: false, color: 0x22d3ee, tiles: [39,39,39,39,39,39] },
  [BLOCK.SLIME]:               { name: 'Bloque de Slime (Rebote)', solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.25, stoneLike: false, color: 0x4ade80, tiles: [40,40,40,40,40,40] },
  [BLOCK.DOOR_CLOSED]:         { name: 'Compuerta Mecánica',       solid: true,  opaque: false, shape: 'cube',  light: 0,  hardness: 0.55, stoneLike: false, color: 0x92400e, tiles: [41,41,41,41,41,41] },
  [BLOCK.DOOR_OPEN]:           { name: 'Compuerta (Abierta)',      solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.55, stoneLike: false, color: 0xb45309, tiles: [41,41,41,41,41,41] },
  [BLOCK.LADDER]:              { name: 'Escalera de Mano',         solid: false, opaque: false, climbable: true, shape: 'cube', light: 0, hardness: 0.30, stoneLike: false, color: 0xc28e4c, tiles: [42,42,42,42,42,42] },
  [BLOCK.TRAPDOOR_CLOSED]:     { name: 'Trampilla Mecánica',       solid: true,  opaque: false, shape: 'cube',  light: 0,  hardness: 0.45, stoneLike: false, color: 0x854d0e, tiles: [43,43,43,43,43,43] },
  [BLOCK.TRAPDOOR_OPEN]:       { name: 'Trampilla (Abierta)',      solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.45, stoneLike: false, color: 0xa16207, tiles: [43,43,43,43,43,43] },
  [BLOCK.RAIL]:                { name: 'Vía de Ferrocarril',       solid: false, opaque: false, shape: 'cross', light: 0,  hardness: 0.25, stoneLike: true,  color: 0x94a3b8, tiles: [44,44,44,44,44,44] },
  [BLOCK.CHEST]:               { name: 'Cofre de Tesoro',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.60, stoneLike: false, color: 0xd97706, tiles: [45,45,46,46,46,46] },
  [BLOCK.LILY_PAD]:            { name: 'Nenúfar Acuático',         solid: true,  opaque: false, shape: 'cross', light: 0,  hardness: 0.06, stoneLike: false, color: 0x22c55e, tiles: [47,47,47,47,47,47] },
  [BLOCK.PISTON]:              { name: 'Pistón Mecánico Redstone', solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.85, stoneLike: true,  color: 0x94a3b8, tiles: [48, 9,48,48,48,48] },
  [BLOCK.PORTAL]:              { name: 'Portal de Obsidiana',      solid: false, opaque: false, shape: 'cube',  light: 12, hardness: 0.50, stoneLike: false, color: 0xc084fc, tiles: [49,49,49,49,49,49] },
  [BLOCK.ICE]:                 { name: 'Hielo Resbaladizo',        solid: true,  opaque: false, shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: true,  color: 0x7dd3fc, tiles: [50,50,50,50,50,50] },
  [BLOCK.TOOL_PICKAXE]:        { name: 'Pico de Diamante',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_SWORD]:          { name: 'Espada de Diamante',       solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x38bdf8, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_BOW]:            { name: 'Arco y Flechas',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xd97706, tiles: [5,5,5,5,5,5] },
  [BLOCK.ITEM_APPLE]:          { name: 'Manzana Curativa (+4❤)',   solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xef4444, tiles: [23,23,23,23,23,23] },
  [BLOCK.ITEM_BREAD]:          { name: 'Pan Crujiente (+5❤)',      solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xf59e0b, tiles: [37,37,37,37,37,37] },
  [BLOCK.ITEM_MINECART]:       { name: 'Vagoneta de Tren (R)',     solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x94a3b8, tiles: [44,44,44,44,44,44] },
  [BLOCK.ITEM_BOAT]:           { name: 'Barca Navegable (R)',      solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xb45309, tiles: [8,8,8,8,8,8] },
  [BLOCK.TOOL_GRAPPLING_HOOK]: { name: 'Gancho de Agarre',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xa855f7, tiles: [38,38,38,38,38,38] }
};

const ALL_INVENTORY_ITEMS = [
  BLOCK.TOOL_PICKAXE,
  BLOCK.TOOL_SWORD,
  BLOCK.TOOL_BOW,
  BLOCK.TOOL_GRAPPLING_HOOK,
  BLOCK.ITEM_APPLE,
  BLOCK.ITEM_BREAD,
  BLOCK.ITEM_MINECART,
  BLOCK.ITEM_BOAT,
  BLOCK.RAIL,
  BLOCK.LILY_PAD,
  BLOCK.PISTON,
  BLOCK.PORTAL,
  BLOCK.ICE,
  BLOCK.LADDER,
  BLOCK.TRAPDOOR_CLOSED,
  BLOCK.CHEST,
  BLOCK.TORCH,
  BLOCK.TNT,
  BLOCK.SLIME,
  BLOCK.DOOR_CLOSED,
  BLOCK.LEVER_OFF,
  BLOCK.REDSTONE_LAMP_OFF,
  BLOCK.SAPLING,
  BLOCK.WHEAT_1,
  BLOCK.WHEAT_3,
  BLOCK.AMETHYST,
  BLOCK.GLOW_MUSHROOM,
  BLOCK.LAVA,
  BLOCK.OBSIDIAN,
  BLOCK.GRASS,
  BLOCK.DIRT,
  BLOCK.STONE,
  BLOCK.COBBLE,
  BLOCK.WOOD,
  BLOCK.PLANKS,
  BLOCK.BRICK,
  BLOCK.SAND,
  BLOCK.GLASS,
  BLOCK.GLOWSTONE,
  BLOCK.SNOW,
  BLOCK.LEAVES,
  BLOCK.COAL_ORE,
  BLOCK.IRON_ORE,
  BLOCK.GOLD_ORE,
  BLOCK.DIAMOND_ORE,
  BLOCK.FLOWER_RED,
  BLOCK.FLOWER_YELLOW,
  BLOCK.TALL_GRASS,
  BLOCK.CACTUS
];

const hotbarSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// Fast Crafting Recipes (1-click / 1-tap in Inventory Modal E)
const CRAFTING_RECIPES = [
  { name: '4× Madera (Tablones)',       outId: BLOCK.PLANKS,              outCount: 4, ingredients: [{ id: BLOCK.WOOD, count: 1 }] },
  { name: '4× Antorchas',               outId: BLOCK.TORCH,               outCount: 4, ingredients: [{ id: BLOCK.COAL_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '2× Ladrillos',               outId: BLOCK.BRICK,               outCount: 2, ingredients: [{ id: BLOCK.DIRT, count: 2 }, { id: BLOCK.SAND, count: 1 }] },
  { name: '2× Cristal',                 outId: BLOCK.GLASS,               outCount: 2, ingredients: [{ id: BLOCK.SAND, count: 2 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '2× Piedra Luminosa',         outId: BLOCK.GLOWSTONE,           outCount: 2, ingredients: [{ id: BLOCK.TORCH, count: 1 }, { id: BLOCK.GOLD_ORE, count: 1 }] },
  { name: '2× TNT (Explosivo)',         outId: BLOCK.TNT,                 outCount: 2, ingredients: [{ id: BLOCK.SAND, count: 2 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '2× Piedra Lisa',             outId: BLOCK.STONE,               outCount: 2, ingredients: [{ id: BLOCK.COBBLE, count: 2 }] },
  { name: '1× Pico de Diamante',        outId: BLOCK.TOOL_PICKAXE,        outCount: 1, ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 2 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Espada de Diamante',      outId: BLOCK.TOOL_SWORD,          outCount: 1, ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Arco y Flechas',          outId: BLOCK.TOOL_BOW,            outCount: 1, ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.TALL_GRASS, count: 1 }] },
  { name: '2× Manzana Curativa (+4❤)',  outId: BLOCK.ITEM_APPLE,          outCount: 2, ingredients: [{ id: BLOCK.FLOWER_RED, count: 1 }, { id: BLOCK.GOLD_ORE, count: 1 }] },
  { name: '2× Palanca Redstone',        outId: BLOCK.LEVER_OFF,           outCount: 2, ingredients: [{ id: BLOCK.COBBLE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '2× Lámpara Redstone',        outId: BLOCK.REDSTONE_LAMP_OFF,   outCount: 2, ingredients: [{ id: BLOCK.GLOWSTONE, count: 1 }, { id: BLOCK.IRON_ORE, count: 1 }] },
  { name: '1× Pan Crujiente (+5❤)',     outId: BLOCK.ITEM_BREAD,          outCount: 1, ingredients: [{ id: BLOCK.WHEAT_3, count: 2 }] },
  { name: '2× Bloque de Slime (Rebote)',outId: BLOCK.SLIME,               outCount: 2, ingredients: [{ id: BLOCK.TALL_GRASS, count: 2 }, { id: BLOCK.GLOW_MUSHROOM, count: 1 }] },
  { name: '2× Compuerta Mecánica',      outId: BLOCK.DOOR_CLOSED,         outCount: 2, ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.COBBLE, count: 1 }] },
  { name: '4× Escalera de Mano',        outId: BLOCK.LADDER,              outCount: 4, ingredients: [{ id: BLOCK.PLANKS, count: 2 }] },
  { name: '2× Trampilla Mecánica',      outId: BLOCK.TRAPDOOR_CLOSED,     outCount: 2, ingredients: [{ id: BLOCK.PLANKS, count: 2 }] },
  { name: '6× Vía de Ferrocarril',      outId: BLOCK.RAIL,                outCount: 6, ingredients: [{ id: BLOCK.IRON_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Vagoneta de Tren (R)',    outId: BLOCK.ITEM_MINECART,       outCount: 1, ingredients: [{ id: BLOCK.IRON_ORE, count: 2 }] },
  { name: '1× Cofre de Tesoro',         outId: BLOCK.CHEST,               outCount: 1, ingredients: [{ id: BLOCK.PLANKS, count: 4 }] },
  { name: '1× Barca Navegable (R)',     outId: BLOCK.ITEM_BOAT,           outCount: 1, ingredients: [{ id: BLOCK.PLANKS, count: 3 }] },
  { name: '4× Nenúfar Acuático',        outId: BLOCK.LILY_PAD,            outCount: 4, ingredients: [{ id: BLOCK.TALL_GRASS, count: 2 }] },
  { name: '2× Pistón Mecánico Redstone',outId: BLOCK.PISTON,              outCount: 2, ingredients: [{ id: BLOCK.COBBLE, count: 2 }, { id: BLOCK.PLANKS, count: 1 }, { id: BLOCK.IRON_ORE, count: 1 }] },
  { name: '1× Gancho de Agarre',        outId: BLOCK.TOOL_GRAPPLING_HOOK, outCount: 1, ingredients: [{ id: BLOCK.IRON_ORE, count: 1 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '2× Portal de Obsidiana',     outId: BLOCK.PORTAL,              outCount: 2, ingredients: [{ id: BLOCK.OBSIDIAN, count: 2 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '2× Hielo Resbaladizo',       outId: BLOCK.ICE,                 outCount: 2, ingredients: [{ id: BLOCK.SNOW, count: 2 }] }
];

function createInitialInventoryCounts() {
  const counts = {};
  for (const bId of ALL_INVENTORY_ITEMS) counts[bId] = 0;
  return counts;
}

let gameMode = 'survival'; // 'survival' or 'creative'
let inventoryCounts = createInitialInventoryCounts();

function getActiveHeldItem() {
  if (selectedSlot < 0 || selectedSlot >= hotbarSlots.length) return BLOCK.AIR;
  const bId = hotbarSlots[selectedSlot] || BLOCK.AIR;
  if (bId === BLOCK.AIR) return BLOCK.AIR;
  if (gameMode === 'survival' && (inventoryCounts[bId] || 0) <= 0) return BLOCK.AIR;
  return bId;
}

function autoEquipToHotbar(itemId) {
  if (!itemId || itemId === BLOCK.AIR || hotbarSlots.includes(itemId)) return;
  const emptyIdx = hotbarSlots.indexOf(BLOCK.AIR);
  if (emptyIdx !== -1) hotbarSlots[emptyIdx] = itemId;
}

function getDropItemForBlock(blockId) {
  if (blockId === BLOCK.STONE) return BLOCK.COBBLE;
  if (blockId === BLOCK.LEVER_ON) return BLOCK.LEVER_OFF;
  if (blockId === BLOCK.REDSTONE_LAMP_ON) return BLOCK.REDSTONE_LAMP_OFF;
  if (blockId === BLOCK.DOOR_OPEN) return BLOCK.DOOR_CLOSED;
  if (blockId === BLOCK.TRAPDOOR_OPEN) return BLOCK.TRAPDOOR_CLOSED;
  if (blockId === BLOCK.WHEAT_2) return BLOCK.WHEAT_1;
  if (blockId === BLOCK.LEAVES) {
    const r = Math.random();
    if (r < 0.25) return BLOCK.ITEM_APPLE;
    if (r < 0.55) return BLOCK.SAPLING;
  }
  return blockId;
}

// ============================================================================
// 2. PROCEDURAL PIXEL-ART TEXTURE ATLAS + CRACK TEXTURES
// ============================================================================
function createProceduralAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let tSeed = 1337;
  const rand = () => {
    tSeed = (tSeed * 1664525 + 1013904223) >>> 0;
    return (tSeed & 0xffff) / 0x10000;
  };

  const drawTile = (tileIdx, pixelFn) => {
    const ox = tileIdx * TILE_PX;
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const c = pixelFn(x, y, rand());
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, y, 1, 1);
      }
    }
  };

  const shade = (r, g, b, f) =>
    `rgb(${Math.min(255, Math.max(0, (r * f) | 0))},${Math.min(255, Math.max(0, (g * f) | 0))},${Math.min(255, Math.max(0, (b * f) | 0))})`;

  // 0: Grass Top
  drawTile(0, (x, y, r) => shade(88, 168, 58, 0.88 + r * 0.24));
  // 1: Grass Side
  drawTile(1, (x, y, r) => {
    const grassDepth = 3 + ((Math.sin(x * 1.3) * 1.5 + 1.5) | 0);
    if (y < grassDepth) return shade(88, 168, 58, 0.85 + r * 0.25);
    if (y === grassDepth) return shade(62, 125, 42, 0.9);
    return shade(134, 96, 67, 0.86 + r * 0.26);
  });
  // 2: Dirt
  drawTile(2, (x, y, r) => shade(134, 96, 67, 0.85 + r * 0.28));
  // 3: Stone
  drawTile(3, (x, y, r) => {
    const streak = ((x + y * 3) % 7 === 0) ? 0.88 : 1.0;
    return shade(125, 128, 132, (0.88 + r * 0.22) * streak);
  });
  // 4: Sand
  drawTile(4, (x, y, r) => shade(224, 206, 148, 0.92 + Math.sin((x + y) * 0.6) * 0.05 + r * 0.14));
  // 5: Wood Side
  drawTile(5, (x, y, r) => shade(107, 78, 46, (0.88 + r * 0.2) * (x % 4 === 0 ? 0.78 : 1.0)));
  // 6: Wood Top
  drawTile(6, (x, y, r) => {
    const dist = Math.hypot(x - 7.5, y - 7.5);
    if (dist > 6.8) return shade(107, 78, 46, 0.85 + r * 0.2);
    return shade(168, 132, 84, (Math.sin(dist * 2.2) > 0.3 ? 0.9 : 1.04) * (0.95 + r * 0.1));
  });
  // 7: Leaves
  drawTile(7, (x, y, r) => shade(52, 128, 42, 0.76 + r * 0.4));
  // 8: Planks
  drawTile(8, (x, y, r) => {
    const border = (y % 4 === 0) || ((x + (y >> 2) * 7) % 16 === 0);
    return shade(176, 136, 82, (border ? 0.78 : 0.96) + r * 0.1);
  });
  // 9: Cobblestone
  drawTile(9, (x, y, r) => {
    const cell = ((x * 3 + y * 5) ^ (x * y)) & 7;
    return shade(115, 118, 122, cell === 0 ? 0.68 : (0.85 + r * 0.28));
  });
  // 10: Bricks
  drawTile(10, (x, y, r) => {
    const row = y >> 2;
    if ((y % 4 === 0) || ((x + (row % 2) * 4) % 8 === 0)) return shade(190, 185, 178, 0.9 + r * 0.1);
    return shade(168, 72, 58, 0.88 + r * 0.22);
  });
  // 11: Glass
  drawTile(11, (x, y) => {
    const edge = x === 0 || x === 15 || y === 0 || y === 15;
    const streak = (x + y === 5) || (x + y === 6) || (x + y === 19);
    if (edge) return 'rgba(215, 242, 255, 0.95)';
    if (streak) return 'rgba(255, 255, 255, 0.8)';
    return null;
  });
  // 12: Water
  drawTile(12, (x, y, r) => {
    const wave = Math.sin(x * 0.5 + y * 0.3) * 12;
    return `rgba(28, ${118 + (wave | 0)}, 216, ${0.74 + r * 0.08})`;
  });
  // 13: Snow Top
  drawTile(13, (x, y, r) => shade(240, 248, 255, 0.94 + r * 0.08));
  // 14: Snow Side
  drawTile(14, (x, y, r) => {
    const snowDepth = 3 + ((Math.cos(x * 1.2) * 1.5 + 1.5) | 0);
    if (y <= snowDepth) return shade(240, 248, 255, 0.94 + r * 0.08);
    return shade(134, 96, 67, 0.86 + r * 0.26);
  });
  // 15: Glowstone
  drawTile(15, (x, y, r) => {
    if (r > 0.72) return shade(255, 250, 185, 1.0);
    if (r > 0.35) return shade(238, 190, 76, 0.95);
    return shade(155, 102, 36, 0.9);
  });
  // 16: Bedrock
  drawTile(16, (x, y, r) => shade(45, 45, 50, 0.55 + r * 0.7));

  // Helper for Ore tiles (17: Coal, 18: Iron, 19: Gold, 20: Diamond)
  const drawOre = (tileIdx, oreR, oreG, oreB) => {
    drawTile(tileIdx, (x, y, r) => {
      const isSpeck =
        ((x >= 3 && x <= 5 && y >= 4 && y <= 5) ||
         (x >= 10 && x <= 12 && y >= 3 && y <= 5) ||
         (x >= 5 && x <= 7 && y >= 10 && y <= 12) ||
         (x >= 11 && x <= 13 && y >= 11 && y <= 12)) && r > 0.22;
      if (isSpeck) return shade(oreR, oreG, oreB, 0.9 + r * 0.2);
      const streak = ((x + y * 3) % 7 === 0) ? 0.88 : 1.0;
      return shade(125, 128, 132, (0.88 + r * 0.22) * streak);
    });
  };
  drawOre(17, 32, 34, 38);     // Coal Ore
  drawOre(18, 218, 175, 145);  // Iron Ore
  drawOre(19, 255, 232, 68);   // Gold Ore
  drawOre(20, 90, 242, 255);   // Diamond Ore

  // 21: Torch (Cross sprite)
  drawTile(21, (x, y, r) => {
    if (x < 7 || x > 8 || y < 5) return null;
    if (y === 5 || y === 6) return shade(255, 245, 160, 1.0);
    if (y === 7 || y === 8) return shade(255, 165, 36, 0.95 + r * 0.1);
    return shade(122, 88, 48, 0.88 + r * 0.2);
  });

  // 22: Tall Grass (Cross sprite)
  drawTile(22, (x, y, r) => {
    const bladeH = 4 + (((x * 7) % 5) * 2);
    if (y < bladeH || (x % 2 === 0 && y < 11)) return null;
    return shade(76, 158, 48, 0.82 + r * 0.28);
  });

  // 23: Red Rose (Cross sprite)
  drawTile(23, (x, y, r) => {
    if (x >= 6 && x <= 9 && y >= 5 && y <= 8) return shade(232, 45, 45, 0.9 + r * 0.2);
    if ((x === 7 || x === 8) && y >= 9) return shade(62, 142, 44, 0.9);
    return null;
  });

  // 24: Yellow Dandelion (Cross sprite)
  drawTile(24, (x, y, r) => {
    if (x >= 6 && x <= 9 && y >= 5 && y <= 8) return shade(250, 208, 24, 0.92 + r * 0.15);
    if ((x === 7 || x === 8) && y >= 9) return shade(62, 142, 44, 0.9);
    return null;
  });

  // 25: Cactus
  drawTile(25, (x, y, r) => {
    const rib = (x % 4 === 0);
    const spine = rib && (y % 5 === 2);
    if (spine) return '#e2e8f0';
    return shade(44, 138, 60, (rib ? 0.78 : 0.96) + r * 0.14);
  });

  // 26: TNT Side
  drawTile(26, (x, y, r) => {
    if (y >= 5 && y <= 10) {
      const inText = (y >= 6 && y <= 9) && (
        (x >= 2 && x <= 4 && (y === 6 || x === 3)) ||
        (x >= 6 && x <= 9 && (x === 6 || x === 9 || x - 6 === y - 6)) ||
        (x >= 11 && x <= 13 && (y === 6 || x === 12))
      );
      return inText ? '#1e293b' : shade(245, 245, 245, 0.94 + r * 0.08);
    }
    const stickGap = (x % 4 === 0);
    return shade(215, 38, 38, (stickGap ? 0.75 : 0.96) + r * 0.12);
  });

  // 27: TNT Top
  drawTile(27, (x, y, r) => {
    if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return '#f8fafc';
    if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return '#334155';
    return shade(200, 35, 35, 0.85 + r * 0.2);
  });

  // 28: Lava (Glowing molten magma)
  drawTile(28, (x, y, r) => {
    const swirl = Math.sin(x * 0.55 + y * 0.45) + Math.cos(x * 0.35 - y * 0.6);
    if (swirl > 0.85) return shade(255, 238, 95, 0.95 + r * 0.1);
    if (swirl > -0.2) return shade(255, 115, 24, 0.9 + r * 0.15);
    return shade(198, 42, 12, 0.88 + r * 0.15);
  });

  // 29: Obsidian (Dark volcanic purple-black glass)
  drawTile(29, (x, y, r) => {
    const crystal = ((x * 5 + y * 3) % 11 === 0);
    if (crystal) return shade(98, 58, 152, 0.9 + r * 0.2);
    return shade(32, 20, 52, 0.78 + r * 0.35);
  });

  // 30: Redstone Lever OFF (Cross sprite)
  drawTile(30, (x, y, r) => {
    if (y >= 12 && x >= 5 && x <= 10) return shade(110, 114, 120, 0.9 + r * 0.15);
    if (y >= 6 && y < 12 && x >= 7 && x <= 8) return shade(142, 102, 58, 0.9 + r * 0.15);
    if (y >= 4 && y <= 6 && x >= 6 && x <= 9) return shade(120, 36, 36, 0.9);
    return null;
  });

  // 31: Redstone Lever ON (Cross sprite, glowing red tip)
  drawTile(31, (x, y, r) => {
    if (y >= 12 && x >= 5 && x <= 10) return shade(160, 50, 50, 0.95);
    if (y >= 6 && y < 12 && x >= 7 && x <= 8) return shade(168, 122, 68, 0.95);
    if (y >= 4 && y <= 6 && x >= 6 && x <= 9) return shade(255, 58, 58, 1.0);
    return null;
  });

  // 32: Redstone Lamp OFF
  drawTile(32, (x, y, r) => {
    const frame = x === 0 || x === 15 || y === 0 || y === 15 || x === y || (x + y === 15);
    if (frame) return shade(62, 38, 24, 0.9);
    return shade(118, 72, 42, 0.85 + r * 0.2);
  });

  // 33: Redstone Lamp ON (Warm golden lantern)
  drawTile(33, (x, y, r) => {
    const frame = x === 0 || x === 15 || y === 0 || y === 15;
    if (frame) return shade(92, 54, 30, 0.95);
    const core = Math.hypot(x - 7.5, y - 7.5) < 5.2;
    if (core) return shade(255, 248, 185, 0.96 + r * 0.08);
    return shade(248, 192, 72, 0.92 + r * 0.12);
  });

  // 34: Sapling (Oak tree sprout cross sprite)
  drawTile(34, (x, y, r) => {
    if ((x === 7 || x === 8) && y >= 9) return shade(115, 78, 42, 0.92);
    if (Math.hypot(x - 7.5, y - 6.5) < 4.2) return shade(68, 185, 58, 0.85 + r * 0.25);
    return null;
  });

  // 35: Wheat Stage 1 (Young green sprouts)
  drawTile(35, (x, y, r) => {
    if (y < 10 || (x % 3 !== 1)) return null;
    return shade(112, 198, 42, 0.88 + r * 0.2);
  });

  // 36: Wheat Stage 2 (Medium green-gold stalks)
  drawTile(36, (x, y, r) => {
    if (y < 6 || (x % 3 === 0)) return null;
    return y < 9 ? shade(198, 212, 52, 0.92 + r * 0.15) : shade(124, 188, 46, 0.88 + r * 0.18);
  });

  // 37: Wheat Stage 3 (Mature golden harvest wheat)
  drawTile(37, (x, y, r) => {
    if (y < 3 || (x % 2 === 0 && y < 7)) return null;
    return y < 8 ? shade(245, 194, 28, 0.94 + r * 0.14) : shade(212, 162, 34, 0.88 + r * 0.18);
  });

  // 38: Amethyst Crystal Block (Bioluminescent cave geode)
  drawTile(38, (x, y, r) => {
    const facet = ((x * 3 + y * 5) % 9 === 0) || (x + y === 15);
    if (facet) return shade(232, 175, 255, 0.96 + r * 0.1);
    return shade(148, 62, 224, 0.82 + r * 0.28);
  });

  // 39: Bioluminescent Cave Mushroom (Glowing cyan-violet cap)
  drawTile(39, (x, y, r) => {
    if ((x === 7 || x === 8) && y >= 9) return shade(185, 235, 245, 0.92);
    const cap = y >= 4 && y <= 8 && Math.abs(x - 7.5) <= (8 - Math.abs(y - 7) * 1.3);
    if (cap) return ((x + y) % 3 === 0) ? '#a5f3fc' : shade(34, 211, 238, 0.9 + r * 0.18);
    return null;
  });

  // 40: Slime Bounce Block (Translucent gelatinous green)
  drawTile(40, (x, y, r) => {
    const border = x <= 1 || x >= 14 || y <= 1 || y >= 14;
    const core = x >= 4 && x <= 11 && y >= 4 && y <= 11;
    if (border) return shade(58, 198, 86, 0.95);
    if (core) return shade(38, 148, 62, 0.92 + r * 0.12);
    return shade(82, 228, 108, 0.9 + r * 0.15);
  });

  // 41: Mechanical Door (Reinforced oak & iron lattice)
  drawTile(41, (x, y, r) => {
    const frame = x <= 1 || x >= 14 || y <= 1 || y >= 14 || y === 7 || y === 8;
    if (frame) return shade(102, 66, 36, 0.92 + r * 0.12);
    if (y < 7 && (x === 5 || x === 10)) return shade(148, 163, 184, 0.92);
    if (y < 7) return null;
    return shade(156, 108, 62, 0.88 + r * 0.16);
  });

  // 42: Ladder (Vertical rails + horizontal wooden rungs)
  drawTile(42, (x, y, r) => {
    const rail = (x >= 2 && x <= 3) || (x >= 12 && x <= 13);
    const rung = (x >= 2 && x <= 13) && (y === 2 || y === 6 || y === 10 || y === 14);
    if (rail) return shade(162, 114, 62, 0.9 + r * 0.15);
    if (rung) return shade(194, 142, 76, 0.92 + r * 0.14);
    return null;
  });

  // 43: Trapdoor (Oak hatch with 4 square cutouts & iron hinges)
  drawTile(43, (x, y, r) => {
    const frame = x <= 2 || x >= 13 || y <= 2 || y >= 13 || x === 7 || x === 8 || y === 7 || y === 8;
    if ((x === 1 || x === 14) && (y === 3 || y === 12)) return shade(148, 163, 184, 0.95);
    if (frame) return shade(146, 96, 48, 0.9 + r * 0.14);
    return null;
  });

  // 44: Railroad Track (Wooden sleepers + metallic steel rails)
  drawTile(44, (x, y, r) => {
    const rail = (x === 3 || x === 4 || x === 11 || x === 12);
    const tie = (x >= 1 && x <= 14) && (y % 4 === 1 || y % 4 === 2);
    if (rail) return shade(203, 213, 225, 0.92 + r * 0.12);
    if (tie) return shade(132, 88, 46, 0.88 + r * 0.14);
    return null;
  });

  // 45: Treasure Chest Top/Bottom (Oak lid with dark iron trim)
  drawTile(45, (x, y, r) => {
    const rim = x === 0 || x === 15 || y === 0 || y === 15;
    if (rim) return shade(45, 32, 20, 0.95);
    return shade(184, 118, 42, 0.88 + r * 0.16);
  });

  // 46: Treasure Chest Side (Oak planks + black seam + golden latch)
  drawTile(46, (x, y, r) => {
    if (x >= 7 && x <= 8 && y >= 4 && y <= 7) return shade(250, 204, 21, 0.98);
    if (y === 5) return shade(28, 22, 16, 0.98);
    const rim = x === 0 || x === 15 || y === 0 || y === 15;
    if (rim) return shade(62, 40, 22, 0.94);
    return shade(176, 112, 38, 0.88 + r * 0.16);
  });

  // 47: Water Lily Pad (Floating green leaf with pink lotus blossom)
  drawTile(47, (x, y, r) => {
    const dist = Math.hypot(x - 7.5, y - 9.5);
    if (x >= 6 && x <= 9 && y >= 7 && y <= 10) return shade(244, 114, 182, 0.95 + r * 0.1);
    if (dist <= 6.2 && !(x > 8 && y < 8)) return shade(34, 197, 94, 0.86 + r * 0.22);
    return null;
  });

  // 48: Mechanical Redstone Piston (Oak push head + iron shaft + cobblestone housing)
  drawTile(48, (x, y, r) => {
    if (y <= 3) return shade(184, 134, 72, 0.92 + r * 0.12);
    if (y === 4) return shade(203, 213, 225, 0.95);
    if (x >= 6 && x <= 9 && y <= 10) return shade(148, 163, 184, 0.94);
    return shade(105, 110, 118, 0.84 + r * 0.22);
  });

  // 49: Dimensional Obsidian Portal (Glowing violet-magenta vortex)
  drawTile(49, (x, y, r) => {
    const swirl = Math.sin(x * 0.65 + y * 0.65) + Math.cos((x - 7.5) * 0.5 - (y - 7.5) * 0.5);
    if (swirl > 0.7) return shade(240, 171, 252, 0.98);
    return shade(168, 85, 247, 0.85 + r * 0.2);
  });

  // 50: Slippery Glacial Ice (Translucent frost blue with white crystal streaks)
  drawTile(50, (x, y, r) => {
    const streak = ((x + y) === 7) || ((x + y) === 8) || ((x + y) === 18);
    if (streak) return shade(240, 249, 255, 0.98);
    return shade(125, 211, 252, 0.88 + r * 0.14);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return { texture, canvas };
}

// Create 8-stage Crack Overlay Atlas for progressive block mining
function createCrackTextures() {
  const stages = [];
  for (let s = 0; s < 8; s++) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(15, 15, 15, 0.82)';
    ctx.lineWidth = 1.3;
    const branches = (s + 1) * 2;
    for (let b = 0; b < branches; b++) {
      ctx.beginPath();
      ctx.moveTo(8, 8);
      const angle = (b / branches) * Math.PI * 2 + b * 0.4;
      const len = 2 + (s + 1) * 1.15;
      ctx.lineTo(8 + Math.cos(angle) * len, 8 + Math.sin(angle) * len);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    stages.push(tex);
  }
  return stages;
}
