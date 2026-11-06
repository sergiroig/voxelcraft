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
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WOOD: 5, LEAVES: 6, PLANKS: 7, COBBLE: 8, BRICK: 9,
  GLASS: 10, WATER: 11, SNOW: 12, GLOWSTONE: 13, BEDROCK: 14, COAL_ORE: 15, IRON_ORE: 16, GOLD_ORE: 17, DIAMOND_ORE: 18, TORCH: 19,
  TALL_GRASS: 20, FLOWER_RED: 21, FLOWER_YELLOW: 22, CACTUS: 23, TNT: 24, LAVA: 25, OBSIDIAN: 26, LEVER_OFF: 27, LEVER_ON: 28,
  REDSTONE_LAMP_OFF: 29, REDSTONE_LAMP_ON: 30, SAPLING: 31, WHEAT_1: 32, WHEAT_2: 33, WHEAT_3: 34, AMETHYST: 35, GLOW_MUSHROOM: 36,
  SLIME: 37, DOOR_CLOSED: 38, DOOR_OPEN: 39, LADDER: 40, TRAPDOOR_CLOSED: 41, TRAPDOOR_OPEN: 42, RAIL: 43, CHEST: 44,
  LILY_PAD: 45, PISTON: 46, PORTAL: 47, ICE: 48, CRAFTING_TABLE: 49, FURNACE: 50, IRON_BLOCK: 51, GOLD_BLOCK: 52, DIAMOND_BLOCK: 53, BOOKSHELF: 54, CAKE: 55,
  BED: 56, ANVIL: 57, ENCHANTING_TABLE: 58, GRAVEL: 59, CLAY: 60, WOOL: 61, NETHERRACK: 62, END_STONE: 63, EMERALD_BLOCK: 64,
  // Special Tool, Material, Armor & Consumable IDs (>= 256, never placed in Uint8Array chunk data)
  TOOL_PICKAXE: 256, TOOL_SWORD: 257, TOOL_BOW: 258, ITEM_APPLE: 259, ITEM_BREAD: 260, ITEM_MINECART: 261, ITEM_BOAT: 262, TOOL_GRAPPLING_HOOK: 263,
  ITEM_STICK: 264, ITEM_COAL: 265, ITEM_IRON_INGOT: 266, ITEM_GOLD_INGOT: 267, ITEM_DIAMOND: 268,
  TOOL_WOOD_PICKAXE: 269, TOOL_STONE_PICKAXE: 270, TOOL_IRON_PICKAXE: 271, TOOL_GOLD_PICKAXE: 272,
  TOOL_WOOD_SWORD: 273, TOOL_STONE_SWORD: 274, TOOL_IRON_SWORD: 275, TOOL_GOLD_SWORD: 276,
  TOOL_AXE: 277, TOOL_SHOVEL: 278, TOOL_HOE: 279, TOOL_SHEARS: 280, TOOL_FLINT_AND_STEEL: 281,
  ITEM_BUCKET: 282, ITEM_WATER_BUCKET: 283, ITEM_LAVA_BUCKET: 284,
  ARMOR_IRON_HELMET: 285, ARMOR_IRON_CHESTPLATE: 286, ARMOR_IRON_LEGGINGS: 287, ARMOR_IRON_BOOTS: 288,
  ARMOR_DIAMOND_HELMET: 289, ARMOR_DIAMOND_CHESTPLATE: 290, ARMOR_DIAMOND_LEGGINGS: 291, ARMOR_DIAMOND_BOOTS: 292,
  TOOL_FISHING_ROD: 293, ITEM_BONE: 294, ITEM_BONE_MEAL: 295,
  ITEM_RAW_PORKCHOP: 296, ITEM_COOKED_PORKCHOP: 297, ITEM_RAW_FISH: 298, ITEM_COOKED_FISH: 299, ITEM_GOLDEN_APPLE: 300,
  ITEM_EMERALD: 301, ITEM_ENDER_PEARL: 302, ITEM_COMPASS: 303, ITEM_CLOCK: 304,
  ITEM_PAPER: 305, ITEM_EMPTY_MAP: 306, ITEM_MAP: 307
};

function isItem(id) { return id >= 256; }

// Atlas columns of 16x16 pixels covering all distinct Minecraft block faces (extended by 01b-blocks-extra.js)
let ATLAS_COLS = 82;
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
  [BLOCK.CACTUS]:              { name: 'Cactus',                   solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: false, color: 0x2d8a3e, tiles: [72,73,25,25,25,25] },
  [BLOCK.TNT]:                 { name: 'TNT (Explosivo)',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.12, stoneLike: false, color: 0xdc2626, tiles: [27,74,26,26,26,26] },
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
  [BLOCK.CHEST]:               { name: 'Cofre de Tesoro',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.60, stoneLike: false, color: 0xd97706, tiles: [45,45,46,75,75,75] },
  [BLOCK.LILY_PAD]:            { name: 'Nenúfar Acuático',         solid: true,  opaque: false, shape: 'cross', light: 0,  hardness: 0.06, stoneLike: false, color: 0x22c55e, tiles: [47,47,47,47,47,47] },
  [BLOCK.PISTON]:              { name: 'Pistón Mecánico Redstone', solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.85, stoneLike: true,  color: 0x94a3b8, tiles: [78,79,48,48,48,48] },
  [BLOCK.PORTAL]:              { name: 'Portal de Obsidiana',      solid: false, opaque: false, shape: 'cube',  light: 12, hardness: 0.50, stoneLike: false, color: 0xc084fc, tiles: [49,49,49,49,49,49] },
  [BLOCK.ICE]:                 { name: 'Hielo Resbaladizo',        solid: true,  opaque: false, shape: 'cube',  light: 0,  hardness: 0.35, stoneLike: true,  color: 0x7dd3fc, tiles: [50,50,50,50,50,50] },
  [BLOCK.CRAFTING_TABLE]:      { name: 'Mesa de Crafteo',          solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.65, stoneLike: false, color: 0xa16207, tiles: [51, 8,52,76,52,76] },
  [BLOCK.FURNACE]:             { name: 'Horno de Fundición',       solid: true,  opaque: true,  shape: 'cube',  light: 10, hardness: 1.20, stoneLike: true,  color: 0x64748b, tiles: [53,53,54,77,77,77] },
  [BLOCK.IRON_BLOCK]:          { name: 'Bloque de Hierro',         solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.50, stoneLike: true,  color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.GOLD_BLOCK]:          { name: 'Bloque de Oro',            solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.45, stoneLike: true,  color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.DIAMOND_BLOCK]:       { name: 'Bloque de Diamante',       solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.75, stoneLike: true,  color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.BOOKSHELF]:           { name: 'Estantería de Libros',     solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.65, stoneLike: false, color: 0xb45309, tiles: [ 8, 8,58,58,58,58] },
  [BLOCK.CAKE]:                { name: 'Tarta Dulce (+6🍗)',        solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.25, stoneLike: false, color: 0xf43f5e, tiles: [59,80,60,60,60,60] },
  [BLOCK.BED]:                 { name: 'Cama Roja (Dormir)',       solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.45, stoneLike: false, color: 0xdc2626, tiles: [61, 8,62,62,62,62] },
  [BLOCK.ANVIL]:               { name: 'Yunque de Hierro',         solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.85, stoneLike: true,  color: 0x475569, tiles: [81,63,63,63,63,63] },
  [BLOCK.ENCHANTING_TABLE]:    { name: 'Mesa de Encantamientos',   solid: true,  opaque: true,  shape: 'cube',  light: 9,  hardness: 1.80, stoneLike: true,  color: 0x38bdf8, tiles: [64,29,65,65,65,65] },
  [BLOCK.GRAVEL]:              { name: 'Grava',                    solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.40, stoneLike: false, color: 0x94a3b8, tiles: [66,66,66,66,66,66] },
  [BLOCK.CLAY]:                { name: 'Arcilla',                  solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.42, stoneLike: false, color: 0x9ca3af, tiles: [67,67,67,67,67,67] },
  [BLOCK.WOOL]:                { name: 'Lana Blanca',              solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.30, stoneLike: false, color: 0xf8fafc, tiles: [68,68,68,68,68,68] },
  [BLOCK.NETHERRACK]:          { name: 'Netherrack',               solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 0.55, stoneLike: true,  color: 0x991b1b, tiles: [69,69,69,69,69,69] },
  [BLOCK.END_STONE]:           { name: 'Piedra del End',           solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.40, stoneLike: true,  color: 0xfef08a, tiles: [70,70,70,70,70,70] },
  [BLOCK.EMERALD_BLOCK]:       { name: 'Bloque de Esmeralda',      solid: true,  opaque: true,  shape: 'cube',  light: 0,  hardness: 1.65, stoneLike: true,  color: 0x10b981, tiles: [71,71,71,71,71,71] },
  [BLOCK.TOOL_PICKAXE]:        { name: 'Pico de Diamante',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_SWORD]:          { name: 'Espada de Diamante',       solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x38bdf8, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_BOW]:            { name: 'Arco y Flechas',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xd97706, tiles: [5,5,5,5,5,5] },
  [BLOCK.ITEM_APPLE]:          { name: 'Manzana Roja (+4🍗)',       solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xef4444, tiles: [23,23,23,23,23,23] },
  [BLOCK.ITEM_BREAD]:          { name: 'Pan Crujiente (+5🍗)',      solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xf59e0b, tiles: [37,37,37,37,37,37] },
  [BLOCK.ITEM_MINECART]:       { name: 'Vagoneta de Tren (R)',     solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x94a3b8, tiles: [44,44,44,44,44,44] },
  [BLOCK.ITEM_BOAT]:           { name: 'Barca Navegable (R)',      solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xb45309, tiles: [8,8,8,8,8,8] },
  [BLOCK.TOOL_GRAPPLING_HOOK]: { name: 'Gancho de Agarre',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xa855f7, tiles: [38,38,38,38,38,38] },
  [BLOCK.ITEM_STICK]:          { name: 'Palo de Madera',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xa16207, tiles: [8,8,8,8,8,8] },
  [BLOCK.ITEM_COAL]:           { name: 'Carbón Mineral',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x334155, tiles: [17,17,17,17,17,17] },
  [BLOCK.ITEM_IRON_INGOT]:     { name: 'Lingote de Hierro',        solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.ITEM_GOLD_INGOT]:     { name: 'Lingote de Oro',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.ITEM_DIAMOND]:        { name: 'Gema de Diamante',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.TOOL_WOOD_PICKAXE]:   { name: 'Pico de Madera',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xa16207, tiles: [8,8,8,8,8,8] },
  [BLOCK.TOOL_STONE_PICKAXE]:  { name: 'Pico de Piedra',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x94a3b8, tiles: [9,9,9,9,9,9] },
  [BLOCK.TOOL_IRON_PICKAXE]:   { name: 'Pico de Hierro',           solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.TOOL_GOLD_PICKAXE]:   { name: 'Pico de Oro',              solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.TOOL_WOOD_SWORD]:     { name: 'Espada de Madera',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xa16207, tiles: [8,8,8,8,8,8] },
  [BLOCK.TOOL_STONE_SWORD]:    { name: 'Espada de Piedra',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x94a3b8, tiles: [9,9,9,9,9,9] },
  [BLOCK.TOOL_IRON_SWORD]:     { name: 'Espada de Hierro',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.TOOL_GOLD_SWORD]:     { name: 'Espada de Oro',            solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.TOOL_AXE]:            { name: 'Hacha de Diamante',        solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_SHOVEL]:         { name: 'Pala de Diamante',         solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_HOE]:            { name: 'Azada de Diamante',        solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x5decf5, tiles: [20,20,20,20,20,20] },
  [BLOCK.TOOL_SHEARS]:         { name: 'Tijeras de Esquila',       solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.TOOL_FLINT_AND_STEEL]:{ name: 'Mechero de Pedernal',      solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xf97316, tiles: [28,28,28,28,28,28] },
  [BLOCK.ITEM_BUCKET]:         { name: 'Cubo Vacío',               solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xcbd5e1, tiles: [55,55,55,55,55,55] },
  [BLOCK.ITEM_WATER_BUCKET]:   { name: 'Cubo con Agua',            solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0x3b82f6, tiles: [12,12,12,12,12,12] },
  [BLOCK.ITEM_LAVA_BUCKET]:    { name: 'Cubo con Lava',            solid: false, opaque: false, shape: 'tool',  light: 0,  hardness: 0,    stoneLike: false, color: 0xf97316, tiles: [28,28,28,28,28,28] },
  [BLOCK.ARMOR_IRON_HELMET]:       { name: 'Casco de Hierro',            solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.ARMOR_IRON_CHESTPLATE]:   { name: 'Peto de Hierro',             solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.ARMOR_IRON_LEGGINGS]:     { name: 'Grebas de Hierro',           solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.ARMOR_IRON_BOOTS]:        { name: 'Botas de Hierro',            solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xe2e8f0, tiles: [55,55,55,55,55,55] },
  [BLOCK.ARMOR_DIAMOND_HELMET]:    { name: 'Casco de Diamante',          solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.ARMOR_DIAMOND_CHESTPLATE]:{ name: 'Peto de Diamante',           solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.ARMOR_DIAMOND_LEGGINGS]:  { name: 'Grebas de Diamante',         solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.ARMOR_DIAMOND_BOOTS]:     { name: 'Botas de Diamante',          solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x38bdf8, tiles: [57,57,57,57,57,57] },
  [BLOCK.TOOL_FISHING_ROD]:        { name: 'Caña de Pescar',             solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xa16207, tiles: [8,8,8,8,8,8] },
  [BLOCK.ITEM_BONE]:               { name: 'Hueso de Esqueleto',         solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xf8fafc, tiles: [13,13,13,13,13,13] },
  [BLOCK.ITEM_BONE_MEAL]:          { name: 'Polvo de Hueso',             solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xffffff, tiles: [13,13,13,13,13,13] },
  [BLOCK.ITEM_RAW_PORKCHOP]:       { name: 'Chuleta Cruda (+3🍗)',        solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xfda4af, tiles: [23,23,23,23,23,23] },
  [BLOCK.ITEM_COOKED_PORKCHOP]:    { name: 'Chuleta Asada (+8🍗)',        solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xd97706, tiles: [37,37,37,37,37,37] },
  [BLOCK.ITEM_RAW_FISH]:           { name: 'Pescado Crudo (+2🍗)',        solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x38bdf8, tiles: [12,12,12,12,12,12] },
  [BLOCK.ITEM_COOKED_FISH]:        { name: 'Pescado Asado (+6🍗)',        solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xf59e0b, tiles: [37,37,37,37,37,37] },
  [BLOCK.ITEM_GOLDEN_APPLE]:       { name: 'Manzana Dorada (+10❤ +4🍗)',  solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.ITEM_EMERALD]:            { name: 'Gema de Esmeralda',          solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x10b981, tiles: [71,71,71,71,71,71] },
  [BLOCK.ITEM_ENDER_PEARL]:        { name: 'Perla de Ender',             solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0x0d9488, tiles: [49,49,49,49,49,49] },
  [BLOCK.ITEM_COMPASS]:            { name: 'Brújula Magnética',          solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xef4444, tiles: [55,55,55,55,55,55] },
  [BLOCK.ITEM_CLOCK]:              { name: 'Reloj Solar',                solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xfacc15, tiles: [56,56,56,56,56,56] },
  [BLOCK.ITEM_PAPER]:              { name: 'Papel de Caña',              solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xf8fafc, tiles: [68,68,68,68,68,68] },
  [BLOCK.ITEM_EMPTY_MAP]:          { name: 'Mapa en Blanco (Usar)',      solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xe6d2a8, tiles: [4,4,4,4,4,4] },
  [BLOCK.ITEM_MAP]:                { name: 'Mapa Cartográfico',          solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color: 0xd97706, tiles: [4,4,4,4,4,4] }
};

const ALL_INVENTORY_ITEMS = [
  BLOCK.TOOL_PICKAXE, BLOCK.TOOL_IRON_PICKAXE, BLOCK.TOOL_STONE_PICKAXE, BLOCK.TOOL_WOOD_PICKAXE, BLOCK.TOOL_GOLD_PICKAXE,
  BLOCK.TOOL_SWORD, BLOCK.TOOL_IRON_SWORD, BLOCK.TOOL_STONE_SWORD, BLOCK.TOOL_WOOD_SWORD, BLOCK.TOOL_GOLD_SWORD,
  BLOCK.TOOL_AXE, BLOCK.TOOL_SHOVEL, BLOCK.TOOL_HOE, BLOCK.TOOL_SHEARS, BLOCK.TOOL_FLINT_AND_STEEL, BLOCK.TOOL_FISHING_ROD,
  BLOCK.TOOL_BOW, BLOCK.TOOL_GRAPPLING_HOOK, BLOCK.ITEM_COMPASS, BLOCK.ITEM_CLOCK, BLOCK.ITEM_MAP, BLOCK.ITEM_EMPTY_MAP, BLOCK.ITEM_PAPER, BLOCK.ITEM_ENDER_PEARL,
  BLOCK.ARMOR_DIAMOND_HELMET, BLOCK.ARMOR_DIAMOND_CHESTPLATE, BLOCK.ARMOR_DIAMOND_LEGGINGS, BLOCK.ARMOR_DIAMOND_BOOTS,
  BLOCK.ARMOR_IRON_HELMET, BLOCK.ARMOR_IRON_CHESTPLATE, BLOCK.ARMOR_IRON_LEGGINGS, BLOCK.ARMOR_IRON_BOOTS,
  BLOCK.ITEM_BUCKET, BLOCK.ITEM_WATER_BUCKET, BLOCK.ITEM_LAVA_BUCKET,
  BLOCK.ITEM_STICK, BLOCK.ITEM_COAL, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_DIAMOND, BLOCK.ITEM_EMERALD, BLOCK.ITEM_BONE, BLOCK.ITEM_BONE_MEAL,
  BLOCK.ITEM_APPLE, BLOCK.ITEM_GOLDEN_APPLE, BLOCK.ITEM_BREAD, BLOCK.CAKE, BLOCK.ITEM_RAW_PORKCHOP, BLOCK.ITEM_COOKED_PORKCHOP, BLOCK.ITEM_RAW_FISH, BLOCK.ITEM_COOKED_FISH,
  BLOCK.ITEM_MINECART, BLOCK.ITEM_BOAT,
  BLOCK.CRAFTING_TABLE, BLOCK.FURNACE, BLOCK.ANVIL, BLOCK.ENCHANTING_TABLE, BLOCK.BED, BLOCK.CHEST, BLOCK.BOOKSHELF,
  BLOCK.IRON_BLOCK, BLOCK.GOLD_BLOCK, BLOCK.DIAMOND_BLOCK, BLOCK.EMERALD_BLOCK,
  BLOCK.WOOL, BLOCK.GRAVEL, BLOCK.CLAY, BLOCK.NETHERRACK, BLOCK.END_STONE,
  BLOCK.RAIL, BLOCK.LILY_PAD, BLOCK.PISTON, BLOCK.PORTAL, BLOCK.ICE, BLOCK.LADDER, BLOCK.TRAPDOOR_CLOSED,
  BLOCK.TORCH, BLOCK.TNT, BLOCK.SLIME, BLOCK.DOOR_CLOSED, BLOCK.LEVER_OFF, BLOCK.REDSTONE_LAMP_OFF,
  BLOCK.SAPLING, BLOCK.WHEAT_1, BLOCK.WHEAT_3, BLOCK.AMETHYST, BLOCK.GLOW_MUSHROOM,
  BLOCK.LAVA, BLOCK.OBSIDIAN, BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.WOOD, BLOCK.PLANKS,
  BLOCK.BRICK, BLOCK.SAND, BLOCK.GLASS, BLOCK.GLOWSTONE, BLOCK.SNOW, BLOCK.LEAVES,
  BLOCK.COAL_ORE, BLOCK.IRON_ORE, BLOCK.GOLD_ORE, BLOCK.DIAMOND_ORE,
  BLOCK.FLOWER_RED, BLOCK.FLOWER_YELLOW, BLOCK.TALL_GRASS, BLOCK.CACTUS
];

function isPickaxeItem(id) { return id === BLOCK.TOOL_PICKAXE || (id >= BLOCK.TOOL_WOOD_PICKAXE && id <= BLOCK.TOOL_GOLD_PICKAXE); }
function isSwordItem(id) { return id === BLOCK.TOOL_SWORD || (id >= BLOCK.TOOL_WOOD_SWORD && id <= BLOCK.TOOL_GOLD_SWORD); }
function getArmorSlotForItem(id) {
  if (id === BLOCK.ARMOR_IRON_HELMET || id === BLOCK.ARMOR_DIAMOND_HELMET) return 0;
  if (id === BLOCK.ARMOR_IRON_CHESTPLATE || id === BLOCK.ARMOR_DIAMOND_CHESTPLATE) return 1;
  if (id === BLOCK.ARMOR_IRON_LEGGINGS || id === BLOCK.ARMOR_DIAMOND_LEGGINGS) return 2;
  if (id === BLOCK.ARMOR_IRON_BOOTS || id === BLOCK.ARMOR_DIAMOND_BOOTS) return 3;
  return -1;
}
function isArmorItem(id) { return getArmorSlotForItem(id) !== -1; }
function isFoodItem(id) { return id === BLOCK.ITEM_APPLE || id === BLOCK.ITEM_BREAD || (id >= BLOCK.ITEM_RAW_PORKCHOP && id <= BLOCK.ITEM_GOLDEN_APPLE); }
function isNonStackTool(id) { return (id >= BLOCK.TOOL_PICKAXE && id <= BLOCK.TOOL_BOW) || id === BLOCK.TOOL_GRAPPLING_HOOK || (id >= BLOCK.TOOL_WOOD_PICKAXE && id <= BLOCK.TOOL_FLINT_AND_STEEL) || (id >= BLOCK.ARMOR_IRON_HELMET && id <= BLOCK.TOOL_FISHING_ROD) || id === BLOCK.ITEM_COMPASS || id === BLOCK.ITEM_CLOCK || id === BLOCK.ITEM_MAP || (BLOCK_DEFS[id] && BLOCK_DEFS[id].nonStack); }

const hotbarSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// Minecraft-Style Crafting Recipes (gridSize: 2 = Hand Crafting in Inventory E, gridSize: 3 = Crafting Table 3x3)
const CRAFTING_RECIPES = [
  { name: '4× Madera (Tablones)',       outId: BLOCK.PLANKS,              outCount: 4, gridSize: 2, pattern: [BLOCK.WOOD, 0, 0, 0], ingredients: [{ id: BLOCK.WOOD, count: 1 }] },
  { name: '1× Mesa de Crafteo',         outId: BLOCK.CRAFTING_TABLE,      outCount: 1, gridSize: 2, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS], ingredients: [{ id: BLOCK.PLANKS, count: 4 }] },
  { name: '4× Antorchas',               outId: BLOCK.TORCH,               outCount: 4, gridSize: 2, pattern: [BLOCK.COAL_ORE, 0, BLOCK.PLANKS, 0], ingredients: [{ id: BLOCK.COAL_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '2× Ladrillos',               outId: BLOCK.BRICK,               outCount: 2, gridSize: 2, pattern: [BLOCK.DIRT, BLOCK.DIRT, BLOCK.SAND, 0], ingredients: [{ id: BLOCK.DIRT, count: 2 }, { id: BLOCK.SAND, count: 1 }] },
  { name: '2× Cristal',                 outId: BLOCK.GLASS,               outCount: 2, gridSize: 2, pattern: [BLOCK.SAND, BLOCK.SAND, BLOCK.COAL_ORE, 0], ingredients: [{ id: BLOCK.SAND, count: 2 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '2× Piedra Luminosa',         outId: BLOCK.GLOWSTONE,           outCount: 2, gridSize: 2, pattern: [BLOCK.TORCH, BLOCK.GOLD_ORE, 0, 0], ingredients: [{ id: BLOCK.TORCH, count: 1 }, { id: BLOCK.GOLD_ORE, count: 1 }] },
  { name: '2× TNT (Explosivo)',         outId: BLOCK.TNT,                 outCount: 2, gridSize: 3, pattern: [BLOCK.SAND, BLOCK.COAL_ORE, BLOCK.SAND, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.SAND, count: 2 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '2× Piedra Lisa',             outId: BLOCK.STONE,               outCount: 2, gridSize: 2, pattern: [BLOCK.COBBLE, BLOCK.COBBLE, 0, 0], ingredients: [{ id: BLOCK.COBBLE, count: 2 }] },
  { name: '1× Pico de Diamante',        outId: BLOCK.TOOL_PICKAXE,        outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, 0, BLOCK.PLANKS, 0, 0, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 2 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Espada de Diamante',      outId: BLOCK.TOOL_SWORD,          outCount: 1, gridSize: 3, pattern: [0, BLOCK.DIAMOND_ORE, 0, 0, BLOCK.PLANKS, 0, 0, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Arco y Flechas',          outId: BLOCK.TOOL_BOW,            outCount: 1, gridSize: 3, pattern: [0, BLOCK.PLANKS, BLOCK.TALL_GRASS, BLOCK.PLANKS, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.TALL_GRASS, count: 1 }] },
  { name: '2× Manzana Roja (+4🍗)',      outId: BLOCK.ITEM_APPLE,          outCount: 2, gridSize: 2, pattern: [BLOCK.FLOWER_RED, BLOCK.GOLD_ORE, 0, 0], ingredients: [{ id: BLOCK.FLOWER_RED, count: 1 }, { id: BLOCK.GOLD_ORE, count: 1 }] },
  { name: '2× Palanca Redstone',        outId: BLOCK.LEVER_OFF,           outCount: 2, gridSize: 2, pattern: [BLOCK.PLANKS, 0, BLOCK.COBBLE, 0], ingredients: [{ id: BLOCK.COBBLE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '2× Lámpara Redstone',        outId: BLOCK.REDSTONE_LAMP_OFF,   outCount: 2, gridSize: 3, pattern: [0, BLOCK.IRON_ORE, 0, 0, BLOCK.GLOWSTONE, 0, 0, 0, 0], ingredients: [{ id: BLOCK.GLOWSTONE, count: 1 }, { id: BLOCK.IRON_ORE, count: 1 }] },
  { name: '1× Pan Crujiente (+5🍗)',     outId: BLOCK.ITEM_BREAD,          outCount: 1, gridSize: 3, pattern: [BLOCK.WHEAT_3, BLOCK.WHEAT_3, 0, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.WHEAT_3, count: 2 }] },
  { name: '2× Bloque de Slime (Rebote)',outId: BLOCK.SLIME,               outCount: 2, gridSize: 3, pattern: [BLOCK.TALL_GRASS, BLOCK.TALL_GRASS, 0, BLOCK.GLOW_MUSHROOM, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.TALL_GRASS, count: 2 }, { id: BLOCK.GLOW_MUSHROOM, count: 1 }] },
  { name: '2× Compuerta Mecánica',      outId: BLOCK.DOOR_CLOSED,         outCount: 2, gridSize: 3, pattern: [BLOCK.PLANKS, BLOCK.COBBLE, 0, BLOCK.PLANKS, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.COBBLE, count: 1 }] },
  { name: '4× Palos de Madera',         outId: BLOCK.ITEM_STICK,          outCount: 4, gridSize: 2, pattern: [BLOCK.PLANKS, 0, BLOCK.PLANKS, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }] },
  { name: '4× Escalera de Mano',        outId: BLOCK.LADDER,              outCount: 4, gridSize: 3, pattern: [BLOCK.PLANKS, 0, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 0, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 5 }] },
  { name: '2× Trampilla Mecánica',      outId: BLOCK.TRAPDOOR_CLOSED,     outCount: 2, gridSize: 2, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }] },
  { name: '6× Vía de Ferrocarril',      outId: BLOCK.RAIL,                outCount: 6, gridSize: 3, pattern: [BLOCK.IRON_ORE, BLOCK.PLANKS, 0, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.IRON_ORE, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Vagoneta de Tren (R)',    outId: BLOCK.ITEM_MINECART,       outCount: 1, gridSize: 3, pattern: [BLOCK.IRON_ORE, 0, BLOCK.IRON_ORE, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.IRON_ORE, count: 2 }] },
  { name: '1× Cofre de Tesoro',         outId: BLOCK.CHEST,               outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, 0, BLOCK.PLANKS, BLOCK.PLANKS, 0, BLOCK.PLANKS, 0, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 4 }] },
  { name: '1× Barca Navegable (R)',     outId: BLOCK.ITEM_BOAT,           outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, 0, BLOCK.PLANKS, 0, BLOCK.PLANKS, 0, 0, 0, 0], ingredients: [{ id: BLOCK.PLANKS, count: 3 }] },
  { name: '4× Nenúfar Acuático',        outId: BLOCK.LILY_PAD,            outCount: 4, gridSize: 2, pattern: [BLOCK.TALL_GRASS, BLOCK.TALL_GRASS, 0, 0], ingredients: [{ id: BLOCK.TALL_GRASS, count: 2 }] },
  { name: '2× Pistón Mecánico Redstone',outId: BLOCK.PISTON,              outCount: 2, gridSize: 3, pattern: [BLOCK.PLANKS, 0, 0, BLOCK.COBBLE, BLOCK.IRON_ORE, BLOCK.COBBLE, 0, 0, 0], ingredients: [{ id: BLOCK.COBBLE, count: 2 }, { id: BLOCK.PLANKS, count: 1 }, { id: BLOCK.IRON_ORE, count: 1 }] },
  { name: '1× Gancho de Agarre',        outId: BLOCK.TOOL_GRAPPLING_HOOK, outCount: 1, gridSize: 3, pattern: [0, BLOCK.IRON_ORE, 0, 0, BLOCK.AMETHYST, 0, 0, 0, 0], ingredients: [{ id: BLOCK.IRON_ORE, count: 1 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '2× Portal de Obsidiana',     outId: BLOCK.PORTAL,              outCount: 2, gridSize: 3, pattern: [BLOCK.OBSIDIAN, BLOCK.AMETHYST, BLOCK.OBSIDIAN, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.OBSIDIAN, count: 2 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '2× Hielo Resbaladizo',       outId: BLOCK.ICE,                 outCount: 2, gridSize: 2, pattern: [BLOCK.SNOW, BLOCK.SNOW, 0, 0], ingredients: [{ id: BLOCK.SNOW, count: 2 }] },
  { name: '1× Horno de Fundición',      outId: BLOCK.FURNACE,             outCount: 1, gridSize: 3, pattern: [BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, 0, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE], ingredients: [{ id: BLOCK.COBBLE, count: 8 }] },
  { name: '1× Pico de Madera',          outId: BLOCK.TOOL_WOOD_PICKAXE,   outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.PLANKS, count: 3 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Pico de Piedra',          outId: BLOCK.TOOL_STONE_PICKAXE,  outCount: 1, gridSize: 3, pattern: [BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.COBBLE, count: 3 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Pico de Hierro',          outId: BLOCK.TOOL_IRON_PICKAXE,   outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 3 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Pico de Oro',             outId: BLOCK.TOOL_GOLD_PICKAXE,   outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_GOLD_INGOT, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_GOLD_INGOT, count: 3 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Espada de Madera',        outId: BLOCK.TOOL_WOOD_SWORD,     outCount: 1, gridSize: 3, pattern: [0, BLOCK.PLANKS, 0, 0, BLOCK.PLANKS, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '1× Espada de Piedra',        outId: BLOCK.TOOL_STONE_SWORD,    outCount: 1, gridSize: 3, pattern: [0, BLOCK.COBBLE, 0, 0, BLOCK.COBBLE, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.COBBLE, count: 2 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '1× Espada de Hierro',        outId: BLOCK.TOOL_IRON_SWORD,     outCount: 1, gridSize: 3, pattern: [0, BLOCK.ITEM_IRON_INGOT, 0, 0, BLOCK.ITEM_IRON_INGOT, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 2 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '1× Espada de Oro',           outId: BLOCK.TOOL_GOLD_SWORD,     outCount: 1, gridSize: 3, pattern: [0, BLOCK.ITEM_GOLD_INGOT, 0, 0, BLOCK.ITEM_GOLD_INGOT, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_GOLD_INGOT, count: 2 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '1× Hacha de Diamante',       outId: BLOCK.TOOL_AXE,            outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 3 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Pala de Diamante',        outId: BLOCK.TOOL_SHOVEL,         outCount: 1, gridSize: 3, pattern: [0, BLOCK.DIAMOND_ORE, 0, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 1 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Azada de Diamante',       outId: BLOCK.TOOL_HOE,            outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, 0, BLOCK.ITEM_STICK, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 2 }, { id: BLOCK.ITEM_STICK, count: 2 }] },
  { name: '1× Tijeras de Esquila',      outId: BLOCK.TOOL_SHEARS,         outCount: 1, gridSize: 2, pattern: [0, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 2 }] },
  { name: '1× Mechero de Pedernal',     outId: BLOCK.TOOL_FLINT_AND_STEEL,outCount: 1, gridSize: 2, pattern: [BLOCK.ITEM_IRON_INGOT, 0, 0, BLOCK.COBBLE], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 1 }, { id: BLOCK.COBBLE, count: 1 }] },
  { name: '1× Cubo Vacío',              outId: BLOCK.ITEM_BUCKET,         outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, 0, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 3 }] },
  { name: '1× Bloque de Hierro',        outId: BLOCK.IRON_BLOCK,          outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 4 }] },
  { name: '1× Bloque de Oro',           outId: BLOCK.GOLD_BLOCK,          outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_GOLD_INGOT, 0, BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_GOLD_INGOT, 0, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_GOLD_INGOT, count: 4 }] },
  { name: '1× Bloque de Diamante',      outId: BLOCK.DIAMOND_BLOCK,       outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, 0, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 4 }] },
  { name: '1× Estantería de Libros',    outId: BLOCK.BOOKSHELF,           outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.WHEAT_3, BLOCK.WHEAT_3, 0, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS], ingredients: [{ id: BLOCK.PLANKS, count: 6 }, { id: BLOCK.WHEAT_3, count: 2 }] },
  { name: '1× Casco de Hierro',         outId: BLOCK.ARMOR_IRON_HELMET,        outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 5 }] },
  { name: '1× Peto de Hierro',          outId: BLOCK.ARMOR_IRON_CHESTPLATE,    outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 8 }] },
  { name: '1× Grebas de Hierro',        outId: BLOCK.ARMOR_IRON_LEGGINGS,      outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 7 }] },
  { name: '1× Botas de Hierro',         outId: BLOCK.ARMOR_IRON_BOOTS,         outCount: 1, gridSize: 3, pattern: [0, 0, 0, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 4 }] },
  { name: '1× Casco de Diamante',       outId: BLOCK.ARMOR_DIAMOND_HELMET,     outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, 0, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 5 }] },
  { name: '1× Peto de Diamante',        outId: BLOCK.ARMOR_DIAMOND_CHESTPLATE, outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 8 }] },
  { name: '1× Grebas de Diamante',      outId: BLOCK.ARMOR_DIAMOND_LEGGINGS,   outCount: 1, gridSize: 3, pattern: [BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 7 }] },
  { name: '1× Botas de Diamante',       outId: BLOCK.ARMOR_DIAMOND_BOOTS,      outCount: 1, gridSize: 3, pattern: [0, 0, 0, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE, BLOCK.DIAMOND_ORE, 0, BLOCK.DIAMOND_ORE], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 4 }] },
  { name: '1× Caña de Pescar',          outId: BLOCK.TOOL_FISHING_ROD,         outCount: 1, gridSize: 3, pattern: [0, 0, BLOCK.ITEM_STICK, 0, BLOCK.ITEM_STICK, BLOCK.TALL_GRASS, BLOCK.ITEM_STICK, 0, BLOCK.TALL_GRASS], ingredients: [{ id: BLOCK.ITEM_STICK, count: 3 }, { id: BLOCK.TALL_GRASS, count: 2 }] },
  { name: '3× Polvo de Hueso',          outId: BLOCK.ITEM_BONE_MEAL,           outCount: 3, gridSize: 2, pattern: [BLOCK.ITEM_BONE, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_BONE, count: 1 }] },
  { name: '1× Manzana Dorada (+10❤ +4🍗)',outId: BLOCK.ITEM_GOLDEN_APPLE,       outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_APPLE, BLOCK.ITEM_GOLD_INGOT, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_APPLE, count: 1 }, { id: BLOCK.ITEM_GOLD_INGOT, count: 2 }] },
  { name: '1× Tarta Dulce (+6🍗)',       outId: BLOCK.CAKE,                     outCount: 1, gridSize: 3, pattern: [BLOCK.WHEAT_3, BLOCK.ITEM_APPLE, BLOCK.WHEAT_3, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.WHEAT_3, count: 2 }, { id: BLOCK.ITEM_APPLE, count: 1 }] },
  { name: '2× Lana Blanca',             outId: BLOCK.WOOL,                     outCount: 2, gridSize: 2, pattern: [BLOCK.SNOW, BLOCK.TALL_GRASS, 0, 0], ingredients: [{ id: BLOCK.SNOW, count: 1 }, { id: BLOCK.TALL_GRASS, count: 1 }] },
  { name: '1× Cama Roja (Dormir)',      outId: BLOCK.BED,                      outCount: 1, gridSize: 3, pattern: [BLOCK.WOOL, BLOCK.WOOL, BLOCK.WOOL, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 0, 0, 0], ingredients: [{ id: BLOCK.WOOL, count: 3 }, { id: BLOCK.PLANKS, count: 3 }] },
  { name: '1× Yunque de Hierro',        outId: BLOCK.ANVIL,                    outCount: 1, gridSize: 3, pattern: [BLOCK.IRON_BLOCK, BLOCK.ITEM_IRON_INGOT, BLOCK.IRON_BLOCK, 0, BLOCK.ITEM_IRON_INGOT, 0, 0, 0, 0], ingredients: [{ id: BLOCK.IRON_BLOCK, count: 2 }, { id: BLOCK.ITEM_IRON_INGOT, count: 2 }] },
  { name: '1× Mesa de Encantamientos',  outId: BLOCK.ENCHANTING_TABLE,         outCount: 1, gridSize: 3, pattern: [0, BLOCK.BOOKSHELF, 0, BLOCK.DIAMOND_ORE, BLOCK.OBSIDIAN, BLOCK.DIAMOND_ORE, 0, 0, 0], ingredients: [{ id: BLOCK.BOOKSHELF, count: 1 }, { id: BLOCK.DIAMOND_ORE, count: 2 }, { id: BLOCK.OBSIDIAN, count: 1 }] },
  { name: '2× Grava (Gravedad)',        outId: BLOCK.GRAVEL,                   outCount: 2, gridSize: 2, pattern: [BLOCK.COBBLE, BLOCK.SAND, 0, 0], ingredients: [{ id: BLOCK.COBBLE, count: 1 }, { id: BLOCK.SAND, count: 1 }] },
  { name: '2× Arcilla Húmeda',          outId: BLOCK.CLAY,                     outCount: 2, gridSize: 2, pattern: [BLOCK.DIRT, BLOCK.SAND, 0, 0], ingredients: [{ id: BLOCK.DIRT, count: 1 }, { id: BLOCK.SAND, count: 1 }] },
  { name: '2× Netherrack Abisal',       outId: BLOCK.NETHERRACK,               outCount: 2, gridSize: 2, pattern: [BLOCK.COBBLE, BLOCK.COAL_ORE, 0, 0], ingredients: [{ id: BLOCK.COBBLE, count: 1 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '2× Piedra del End',          outId: BLOCK.END_STONE,                outCount: 2, gridSize: 2, pattern: [BLOCK.SAND, BLOCK.AMETHYST, 0, 0], ingredients: [{ id: BLOCK.SAND, count: 1 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '2× Esmeralda Brillante',     outId: BLOCK.ITEM_EMERALD,             outCount: 2, gridSize: 2, pattern: [BLOCK.DIAMOND_ORE, BLOCK.TALL_GRASS, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_ORE, count: 1 }, { id: BLOCK.TALL_GRASS, count: 1 }] },
  { name: '1× Bloque de Esmeralda',     outId: BLOCK.EMERALD_BLOCK,            outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_EMERALD, BLOCK.ITEM_EMERALD, 0, BLOCK.ITEM_EMERALD, BLOCK.ITEM_EMERALD, 0, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_EMERALD, count: 4 }] },
  { name: '2× Perla de Ender (TP)',     outId: BLOCK.ITEM_ENDER_PEARL,         outCount: 2, gridSize: 2, pattern: [BLOCK.OBSIDIAN, BLOCK.AMETHYST, 0, 0], ingredients: [{ id: BLOCK.OBSIDIAN, count: 1 }, { id: BLOCK.AMETHYST, count: 1 }] },
  { name: '1× Brújula Magnética',       outId: BLOCK.ITEM_COMPASS,             outCount: 1, gridSize: 3, pattern: [0, BLOCK.ITEM_IRON_INGOT, 0, BLOCK.ITEM_IRON_INGOT, BLOCK.COAL_ORE, BLOCK.ITEM_IRON_INGOT, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 3 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '1× Reloj Solar',             outId: BLOCK.ITEM_CLOCK,               outCount: 1, gridSize: 3, pattern: [0, BLOCK.ITEM_GOLD_INGOT, 0, BLOCK.ITEM_GOLD_INGOT, BLOCK.COAL_ORE, BLOCK.ITEM_GOLD_INGOT, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_GOLD_INGOT, count: 3 }, { id: BLOCK.COAL_ORE, count: 1 }] },
  { name: '4× Lingotes de Hierro (De Bloque)', outId: BLOCK.ITEM_IRON_INGOT,  outCount: 4, gridSize: 2, pattern: [BLOCK.IRON_BLOCK, 0, 0, 0], ingredients: [{ id: BLOCK.IRON_BLOCK, count: 1 }] },
  { name: '4× Lingotes de Oro (De Bloque)',    outId: BLOCK.ITEM_GOLD_INGOT,  outCount: 4, gridSize: 2, pattern: [BLOCK.GOLD_BLOCK, 0, 0, 0], ingredients: [{ id: BLOCK.GOLD_BLOCK, count: 1 }] },
  { name: '4× Gemas de Diamante (De Bloque)',  outId: BLOCK.ITEM_DIAMOND,     outCount: 4, gridSize: 2, pattern: [BLOCK.DIAMOND_BLOCK, 0, 0, 0], ingredients: [{ id: BLOCK.DIAMOND_BLOCK, count: 1 }] },
  { name: '4× Esmeraldas (De Bloque)',         outId: BLOCK.ITEM_EMERALD,     outCount: 4, gridSize: 2, pattern: [BLOCK.EMERALD_BLOCK, 0, 0, 0], ingredients: [{ id: BLOCK.EMERALD_BLOCK, count: 1 }] },
  { name: '4× Antorchas (Carbón + Palo)',      outId: BLOCK.TORCH,            outCount: 4, gridSize: 2, pattern: [BLOCK.ITEM_COAL, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_COAL, count: 1 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '4× Escalera Clásica (7× Palos)',    outId: BLOCK.LADDER,           outCount: 4, gridSize: 3, pattern: [BLOCK.ITEM_STICK, 0, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, 0, BLOCK.ITEM_STICK], ingredients: [{ id: BLOCK.ITEM_STICK, count: 7 }] },
  { name: '1× Pan Clásico (3× Trigo)',         outId: BLOCK.ITEM_BREAD,       outCount: 1, gridSize: 3, pattern: [BLOCK.WHEAT_3, BLOCK.WHEAT_3, BLOCK.WHEAT_3, 0, 0, 0, 0, 0, 0], ingredients: [{ id: BLOCK.WHEAT_3, count: 3 }] },
  { name: '1× Cofre Clásico (8× Tablones)',    outId: BLOCK.CHEST,            outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 0, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS], ingredients: [{ id: BLOCK.PLANKS, count: 8 }] },
  { name: '3× Papel de Caña',                  outId: BLOCK.ITEM_PAPER,       outCount: 3, gridSize: 2, pattern: [BLOCK.TALL_GRASS, BLOCK.TALL_GRASS, 0, 0], ingredients: [{ id: BLOCK.TALL_GRASS, count: 2 }] },
  { name: '1× Mapa en Blanco (Brújula+Papel)', outId: BLOCK.ITEM_EMPTY_MAP,   outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.ITEM_COMPASS, BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER], ingredients: [{ id: BLOCK.ITEM_COMPASS, count: 1 }, { id: BLOCK.ITEM_PAPER, count: 8 }] }
];

function normalizeCraftingId(id) {
  return id === BLOCK.ITEM_DIAMOND ? BLOCK.DIAMOND_ORE : (id === BLOCK.ITEM_COAL ? BLOCK.COAL_ORE : (id || 0));
}
function areCraftingItemsEquivalent(idA, idB) { return idA > 0 && idB > 0 && normalizeCraftingId(idA) === normalizeCraftingId(idB); }
function getAvailIngredientCount(ingId) {
  const norm = normalizeCraftingId(ingId);
  if (norm === BLOCK.DIAMOND_ORE) return (inventoryCounts[BLOCK.DIAMOND_ORE] || 0) + (inventoryCounts[BLOCK.ITEM_DIAMOND] || 0);
  if (norm === BLOCK.COAL_ORE) return (inventoryCounts[BLOCK.COAL_ORE] || 0) + (inventoryCounts[BLOCK.ITEM_COAL] || 0);
  return inventoryCounts[ingId] || 0;
}
function consumeInventoryIngredient(ingId, count) {
  const norm = normalizeCraftingId(ingId);
  const candidates = norm === BLOCK.DIAMOND_ORE ? [BLOCK.ITEM_DIAMOND, BLOCK.DIAMOND_ORE] : (norm === BLOCK.COAL_ORE ? [BLOCK.ITEM_COAL, BLOCK.COAL_ORE] : [ingId]);
  let rem = count;
  for (const cid of candidates) { const take = Math.min(rem, inventoryCounts[cid] || 0); if (take > 0) { inventoryCounts[cid] -= take; rem -= take; } }
}

const SMELT_RECIPES = [
  { inId: BLOCK.IRON_ORE, outId: BLOCK.ITEM_IRON_INGOT, count: 1 }, { inId: BLOCK.GOLD_ORE, outId: BLOCK.ITEM_GOLD_INGOT, count: 1 },
  { inId: BLOCK.DIAMOND_ORE, outId: BLOCK.ITEM_DIAMOND, count: 1 }, { inId: BLOCK.ITEM_RAW_PORKCHOP, outId: BLOCK.ITEM_COOKED_PORKCHOP, count: 1 },
  { inId: BLOCK.ITEM_RAW_FISH, outId: BLOCK.ITEM_COOKED_FISH, count: 1 }, { inId: BLOCK.CLAY, outId: BLOCK.BRICK, count: 2 },
  { inId: BLOCK.SAND, outId: BLOCK.GLASS, count: 1 }, { inId: BLOCK.COBBLE, outId: BLOCK.STONE, count: 1 }, { inId: BLOCK.WOOD, outId: BLOCK.ITEM_COAL, count: 1 }
];

const recipeBookState = { category: 'all', search: '', craftableOnly: false };

function getRecipeCategory(rec) {
  const id = rec.outId;
  if (isPickaxeItem(id) || isSwordItem(id) || id === BLOCK.TOOL_BOW || id === BLOCK.TOOL_GRAPPLING_HOOK || id === BLOCK.TOOL_FISHING_ROD || (id >= BLOCK.TOOL_AXE && id <= BLOCK.ITEM_LAVA_BUCKET)) return 'tools';
  if (isArmorItem(id) || isFoodItem(id) || id === BLOCK.CAKE || id === BLOCK.BED || id === BLOCK.ITEM_BONE_MEAL || id === BLOCK.ITEM_PAPER || id === BLOCK.ITEM_EMPTY_MAP || id === BLOCK.ITEM_MAP) return 'equip';
  if (id === BLOCK.LEVER_OFF || id === BLOCK.REDSTONE_LAMP_OFF || id === BLOCK.PISTON || id === BLOCK.DOOR_CLOSED || id === BLOCK.TRAPDOOR_CLOSED || id === BLOCK.RAIL || id === BLOCK.ITEM_MINECART || id === BLOCK.ITEM_BOAT || id === BLOCK.PORTAL || id === BLOCK.TNT || id === BLOCK.ITEM_ENDER_PEARL || id === BLOCK.ITEM_COMPASS || id === BLOCK.ITEM_CLOCK) return 'redstone';
  return 'blocks';
}

function buildMiniPatternHTML(rec) {
  const gSize = rec.gridSize || 2, pat = rec.pattern || [], total = gSize * gSize;
  let cells = '';
  for (let i = 0; i < total; i++) {
    const bId = pat[i] || 0;
    if (bId > 0 && BLOCK_DEFS[bId]) {
      const hex = '#' + (BLOCK_DEFS[bId].color || 0x94a3b8).toString(16).padStart(6, '0');
      cells += `<span class="mc-mini-cell" style="background:${hex};" title="${BLOCK_DEFS[bId].name}"></span>`;
    } else {
      cells += `<span class="mc-mini-cell"></span>`;
    }
  }
  return `<div class="mc-mini-pattern p${gSize}" title="Patrón ${gSize}×${gSize}">${cells}</div>`;
}

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

function getDropItemForBlock(blockId, toolId) {
  if (toolId === BLOCK.TOOL_SHEARS) {
    if (blockId === BLOCK.LEAVES || blockId === BLOCK.SNOW_LEAVES) return BLOCK.LEAVES;
    if (blockId === BLOCK.TALL_GRASS || blockId === BLOCK.FLOWER_RED || blockId === BLOCK.FLOWER_YELLOW || blockId === BLOCK.LILY_PAD) return blockId;
  }
  if (blockId === BLOCK.STONE) return BLOCK.COBBLE;
  if (blockId === BLOCK.LEVER_ON) return BLOCK.LEVER_OFF;
  if (blockId === BLOCK.REDSTONE_LAMP_ON) return BLOCK.REDSTONE_LAMP_OFF;
  if (blockId === BLOCK.DOOR_OPEN) return BLOCK.DOOR_CLOSED;
  if (blockId === BLOCK.TRAPDOOR_OPEN) return BLOCK.TRAPDOOR_CLOSED;
  if (blockId === BLOCK.WHEAT_2) return BLOCK.WHEAT_1;
  if (blockId === BLOCK.LEAVES || blockId === BLOCK.SNOW_LEAVES) {
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

  // 0..16: Core Terrain & Building Blocks (Minecraft Default 16x16 style)
  const stoneBase = (x, y) => {
    const h = ((Math.imul(x + 11, 73) ^ Math.imul(y + 5, 151)) & 15) / 15;
    const strata = ((x + y * 3) % 7 === 0) ? 0.86 : (((x * 2 + y) % 9 === 0) ? 1.07 : 0.96);
    return shade(125, 128, 132, (0.88 + h * 0.16) * strata);
  };
  drawTile(0, (x, y, r) => shade(88, 168, 58, 0.86 + r * 0.26 + (((x * 3 + y * 5) % 7 === 0) ? 0.06 : 0)));
  drawTile(1, (x, y, r) => {
    const grassDepth = 3 + ((Math.sin(x * 1.3) * 1.5 + 1.5) | 0);
    if (y < grassDepth) return shade(88, 168, 58, 0.85 + r * 0.25);
    if (y === grassDepth) return shade(62, 125, 42, 0.9);
    return shade(134, 96, 67, 0.86 + r * 0.26 + (((x * 5 + y * 3) % 11 === 0) ? -0.1 : 0));
  });
  drawTile(2, (x, y, r) => shade(134, 96, 67, 0.85 + r * 0.28 + (((x * 5 + y * 3) % 9 === 0) ? 0.1 : 0)));
  drawTile(3, (x, y) => stoneBase(x, y));
  drawTile(4, (x, y, r) => shade(224, 206, 148, 0.92 + Math.sin((x + y) * 0.6) * 0.05 + r * 0.14));
  drawTile(5, (x, y, r) => shade(107, 78, 46, (0.86 + r * 0.22) * (x % 4 === 0 ? 0.74 : (x % 4 === 2 ? 1.05 : 0.95))));
  drawTile(6, (x, y, r) => {
    const dist = Math.hypot(x - 7.5, y - 7.5);
    if (dist > 6.6) return shade(107, 78, 46, 0.85 + r * 0.2);
    return shade(172, 136, 86, (Math.sin(dist * 2.3) > 0.25 ? 0.88 : 1.05) * (0.95 + r * 0.1));
  });
  drawTile(7, (x, y, r) => shade(52, 128, 42, (((x * 3 + y * 5) % 4 === 0) ? 0.68 : 0.84) + r * 0.34));
  drawTile(8, (x, y, r) => {
    const border = (y % 4 === 0) || ((x + (y >> 2) * 7) % 16 === 0);
    return shade(176, 136, 82, (border ? 0.76 : (y % 4 === 1 ? 1.03 : 0.95)) + r * 0.08);
  });
  drawTile(9, (x, y, r) => {
    const cell = ((x * 3 + y * 5) ^ (x * y)) & 7;
    return shade(115, 118, 122, cell === 0 ? 0.64 : (cell === 3 ? 1.08 : (0.85 + r * 0.26)));
  });
  drawTile(10, (x, y, r) => {
    const row = y >> 2;
    if ((y % 4 === 0) || ((x + (row % 2) * 4) % 8 === 0)) return shade(192, 186, 178, 0.9 + r * 0.1);
    return shade(172, 74, 58, (y % 4 === 1 ? 0.98 : 0.86) + r * 0.2);
  });
  drawTile(11, (x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return 'rgba(215, 242, 255, 0.95)';
    if ((x + y === 5) || (x + y === 6) || (x + y === 19)) return 'rgba(255, 255, 255, 0.82)';
    return null;
  });
  drawTile(12, (x, y, r) => `rgba(28, ${118 + ((Math.sin(x * 0.5 + y * 0.3) * 12) | 0)}, 216, ${0.74 + r * 0.08})`);
  drawTile(13, (x, y, r) => shade(240, 248, 255, 0.94 + r * 0.08));
  drawTile(14, (x, y, r) => {
    const snowDepth = 3 + ((Math.cos(x * 1.2) * 1.5 + 1.5) | 0);
    return y <= snowDepth ? shade(240, 248, 255, 0.94 + r * 0.08) : shade(134, 96, 67, 0.86 + r * 0.26);
  });
  drawTile(15, (x, y, r) => r > 0.72 ? shade(255, 250, 185, 1.0) : (r > 0.35 ? shade(238, 190, 76, 0.95) : shade(155, 102, 36, 0.9)));
  drawTile(16, (x, y, r) => shade(45, 45, 50, 0.52 + r * 0.72));

  // 17..20: Ores embedded in deterministic Stone matrix with specular top-left highlight
  const ORE_VEIN_COORDS = [[3,4],[4,4],[5,4],[3,5],[4,5],[10,3],[11,3],[10,4],[11,4],[12,4],[11,5],[5,10],[6,10],[7,10],[5,11],[6,11],[6,12],[11,11],[12,11],[13,11],[11,12],[12,12]];
  const drawOre = (tileIdx, oreR, oreG, oreB) => {
    drawTile(tileIdx, (x, y) => {
      for (let i = 0; i < ORE_VEIN_COORDS.length; i++) {
        if (ORE_VEIN_COORDS[i][0] === x && ORE_VEIN_COORDS[i][1] === y) {
          const f = (i % 5 === 0) ? 1.18 : ((i % 5 === 4) ? 0.82 : 0.98);
          return shade(oreR, oreG, oreB, f);
        }
      }
      return stoneBase(x, y);
    });
  };
  drawOre(17, 32, 34, 38);     // Coal Ore
  drawOre(18, 218, 175, 145);  // Iron Ore
  drawOre(19, 255, 232, 68);   // Gold Ore
  drawOre(20, 90, 242, 255);   // Diamond Ore

  // 21..39: Flora, Cacti, TNT, Magma, Obsidian, Redstone, Crops, Geode & Mushroom
  drawTile(21, (x, y, r) => {
    if (x < 7 || x > 8 || y < 5) return null;
    if (y <= 6) return shade(255, 245, 160, 1.0);
    if (y <= 8) return shade(255, 165, 36, 0.95 + r * 0.1);
    return shade(122, 88, 48, 0.88 + r * 0.2);
  });
  drawTile(22, (x, y, r) => (y < 4 + (((x * 7) % 5) * 2) || (x % 2 === 0 && y < 11)) ? null : shade(76, 158, 48, 0.82 + r * 0.28));
  drawTile(23, (x, y, r) => (x >= 6 && x <= 9 && y >= 5 && y <= 8) ? shade(232, 45, 45, 0.9 + r * 0.2) : (((x === 7 || x === 8) && y >= 9) ? shade(62, 142, 44, 0.9) : null));
  drawTile(24, (x, y, r) => (x >= 6 && x <= 9 && y >= 5 && y <= 8) ? shade(250, 208, 24, 0.92 + r * 0.15) : (((x === 7 || x === 8) && y >= 9) ? shade(62, 142, 44, 0.9) : null));
  drawTile(25, (x, y, r) => {
    const rib = (x % 4 === 0);
    if (rib && (y % 5 === 2)) return '#e2e8f0';
    return shade(44, 138, 60, (rib ? 0.78 : 0.96) + r * 0.14);
  });
  drawTile(26, (x, y, r) => {
    if (y >= 5 && y <= 10) {
      const inText = (y >= 6 && y <= 9) && ((x >= 2 && x <= 4 && (y === 6 || x === 3)) || (x >= 6 && x <= 9 && (x === 6 || x === 9 || x - 6 === y - 6)) || (x >= 11 && x <= 13 && (y === 6 || x === 12)));
      return inText ? '#1e293b' : shade(245, 245, 245, 0.94 + r * 0.08);
    }
    return shade(215, 38, 38, (x % 4 === 0 ? 0.75 : 0.96) + r * 0.12);
  });
  drawTile(27, (x, y, r) => {
    if (x >= 7 && x <= 8 && y >= 7 && y <= 8) return '#f8fafc';
    if (x >= 6 && x <= 9 && y >= 6 && y <= 9) return '#334155';
    return shade(200, 35, 35, ((x % 4 === 0 || y % 4 === 0) ? 0.72 : 0.92) + r * 0.14);
  });
  drawTile(28, (x, y, r) => {
    const swirl = Math.sin(x * 0.55 + y * 0.45) + Math.cos(x * 0.35 - y * 0.6);
    return swirl > 0.85 ? shade(255, 238, 95, 0.95 + r * 0.1) : (swirl > -0.2 ? shade(255, 115, 24, 0.9 + r * 0.15) : shade(198, 42, 12, 0.88 + r * 0.15));
  });
  drawTile(29, (x, y, r) => ((x * 5 + y * 3) % 11 === 0) ? shade(98, 58, 152, 0.9 + r * 0.2) : shade(32, 20, 52, 0.78 + r * 0.35));
  drawTile(30, (x, y, r) => (y >= 12 && x >= 5 && x <= 10) ? shade(110, 114, 120, 0.9 + r * 0.15) : ((y >= 6 && y < 12 && x >= 7 && x <= 8) ? shade(142, 102, 58, 0.9 + r * 0.15) : ((y >= 4 && y <= 6 && x >= 6 && x <= 9) ? shade(120, 36, 36, 0.9) : null)));
  drawTile(31, (x, y) => (y >= 12 && x >= 5 && x <= 10) ? shade(160, 50, 50, 0.95) : ((y >= 6 && y < 12 && x >= 7 && x <= 8) ? shade(168, 122, 68, 0.95) : ((y >= 4 && y <= 6 && x >= 6 && x <= 9) ? shade(255, 58, 58, 1.0) : null)));
  drawTile(32, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 || x === y || (x + y === 15)) ? shade(62, 38, 24, 0.9) : shade(118, 72, 42, 0.85 + r * 0.2));
  drawTile(33, (x, y, r) => (x <= 1 || x >= 14 || y <= 1 || y >= 14) ? shade(78, 46, 26, 0.94) : (Math.hypot(x - 7.5, y - 7.5) < 4.5 ? shade(235, 188, 102, 0.94 + r * 0.08) : shade(168, 112, 54, 0.90 + r * 0.12)));
  drawTile(34, (x, y, r) => ((x === 7 || x === 8) && y >= 9) ? shade(115, 78, 42, 0.92) : (Math.hypot(x - 7.5, y - 6.5) < 4.2 ? shade(68, 185, 58, 0.85 + r * 0.25) : null));
  drawTile(35, (x, y, r) => (y < 10 || (x % 3 !== 1)) ? null : shade(112, 198, 42, 0.88 + r * 0.2));
  drawTile(36, (x, y, r) => (y < 6 || (x % 3 === 0)) ? null : (y < 9 ? shade(198, 212, 52, 0.92 + r * 0.15) : shade(124, 188, 46, 0.88 + r * 0.18)));
  drawTile(37, (x, y, r) => (y < 3 || (x % 2 === 0 && y < 7)) ? null : (y < 8 ? shade(245, 194, 28, 0.94 + r * 0.14) : shade(212, 162, 34, 0.88 + r * 0.18)));
  drawTile(38, (x, y, r) => (((x * 3 + y * 5) % 9 === 0) || (x + y === 15)) ? shade(232, 175, 255, 0.96 + r * 0.1) : shade(148, 62, 224, 0.82 + r * 0.28));
  drawTile(39, (x, y, r) => ((x === 7 || x === 8) && y >= 9) ? shade(185, 235, 245, 0.92) : ((y >= 4 && y <= 8 && Math.abs(x - 7.5) <= (8 - Math.abs(y - 7) * 1.3)) ? (((x + y) % 3 === 0) ? '#a5f3fc' : shade(34, 211, 238, 0.9 + r * 0.18)) : null));
  drawTile(40, (x, y, r) => (x <= 1 || x >= 14 || y <= 1 || y >= 14) ? shade(58, 198, 86, 0.95) : ((x >= 4 && x <= 11 && y >= 4 && y <= 11) ? shade(38, 148, 62, 0.92 + r * 0.12) : shade(82, 228, 108, 0.9 + r * 0.15)));
  drawTile(41, (x, y, r) => (x <= 1 || x >= 14 || y <= 1 || y >= 14 || y === 7 || y === 8) ? shade(102, 66, 36, 0.92 + r * 0.12) : ((y < 7 && (x === 5 || x === 10)) ? shade(148, 163, 184, 0.92) : (y < 7 ? null : shade(156, 108, 62, 0.88 + r * 0.16))));
  drawTile(42, (x, y, r) => ((x >= 2 && x <= 3) || (x >= 12 && x <= 13)) ? shade(162, 114, 62, 0.9 + r * 0.15) : (((x >= 2 && x <= 13) && (y === 2 || y === 6 || y === 10 || y === 14)) ? shade(194, 142, 76, 0.92 + r * 0.14) : null));

  // 43..54: Trapdoor, Rail, Chest, Lily Pad, Piston, Portal, Ice, Crafting Table, Furnace
  drawTile(43, (x, y, r) => {
    const frame = x <= 2 || x >= 13 || y <= 2 || y >= 13 || x === 7 || x === 8 || y === 7 || y === 8;
    if ((x === 1 || x === 14) && (y === 3 || y === 12)) return shade(148, 163, 184, 0.95);
    return frame ? shade(146, 96, 48, 0.9 + r * 0.14) : null;
  });
  drawTile(44, (x, y, r) => {
    if (x === 3 || x === 4 || x === 11 || x === 12) return shade(203, 213, 225, 0.92 + r * 0.12);
    return ((x >= 1 && x <= 14) && (y % 4 === 1 || y % 4 === 2)) ? shade(132, 88, 46, 0.88 + r * 0.14) : null;
  });
  drawTile(45, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(45, 32, 20, 0.95) : shade(184, 118, 42, 0.88 + r * 0.16));
  drawTile(46, (x, y, r) => {
    if (x >= 7 && x <= 8 && y >= 4 && y <= 7) return shade(250, 204, 21, 0.98);
    if (y === 5) return shade(28, 22, 16, 0.98);
    return (x === 0 || x === 15 || y === 0 || y === 15) ? shade(62, 40, 22, 0.94) : shade(176, 112, 38, 0.88 + r * 0.16);
  });
  drawTile(47, (x, y, r) => {
    const dist = Math.hypot(x - 7.5, y - 9.5);
    if (x >= 6 && x <= 9 && y >= 7 && y <= 10) return shade(244, 114, 182, 0.95 + r * 0.1);
    return (dist <= 6.2 && !(x > 8 && y < 8)) ? shade(34, 197, 94, 0.86 + r * 0.22) : null;
  });
  drawTile(48, (x, y, r) => {
    if (y <= 3) return shade(184, 134, 72, 0.92 + r * 0.12);
    if (y === 4) return shade(203, 213, 225, 0.95);
    return (x >= 6 && x <= 9 && y <= 10) ? shade(148, 163, 184, 0.94) : shade(105, 110, 118, 0.84 + r * 0.22);
  });
  drawTile(49, (x, y, r) => {
    const swirl = Math.sin(x * 0.65 + y * 0.65) + Math.cos((x - 7.5) * 0.5 - (y - 7.5) * 0.5);
    return swirl > 0.7 ? shade(240, 171, 252, 0.98) : shade(168, 85, 247, 0.85 + r * 0.2);
  });
  drawTile(50, (x, y, r) => (((x + y) === 7) || ((x + y) === 8) || ((x + y) === 18)) ? shade(240, 249, 255, 0.98) : shade(125, 211, 252, 0.88 + r * 0.14));
  drawTile(51, (x, y, r) => {
    if ((x === 1 || x === 14) && (y === 1 || y === 14)) return shade(148, 163, 184, 0.98);
    if (x <= 1 || x >= 14 || y <= 1 || y >= 14) return shade(110, 72, 38, 0.92 + r * 0.1);
    const gridLine = x === 2 || x === 6 || x === 9 || x === 13 || y === 2 || y === 6 || y === 9 || y === 13;
    return gridLine ? shade(58, 36, 18, 0.96) : shade(182, 128, 72, 0.90 + r * 0.14);
  });
  drawTile(52, (x, y, r) => {
    if (y <= 2) return shade(92, 58, 30, 0.94);
    if (y === 3) return shade(48, 30, 15, 0.96);
    if (x >= 3 && x <= 6 && y >= 5 && y <= 11) {
      if (y <= 6) return shade(120, 72, 32, 0.96);
      if (x <= 5 && y + x <= 15) return shade(203, 213, 225, 0.98);
    }
    if (x >= 10 && x <= 12 && y >= 5 && y <= 12) return y <= 7 ? shade(148, 163, 184, 0.98) : (x === 11 ? shade(110, 70, 32, 0.95) : shade(168, 118, 66, 0.9));
    return (x === 0 || x === 15 || y === 15) ? shade(92, 58, 30, 0.92) : shade(168, 118, 66, 0.88 + r * 0.15);
  });
  drawTile(53, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 || y === 7) ? shade(71, 85, 105, 0.92) : shade(115, 125, 138, 0.86 + r * 0.18));
  drawTile(54, (x, y, r) => {
    if (x >= 4 && x <= 11 && y >= 3 && y <= 7) return shade(30, 41, 59, 0.96);
    if (x >= 4 && x <= 11 && y >= 10 && y <= 14) return (y >= 12 && x >= 6 && x <= 9) ? shade(250, 204, 21, 0.98) : shade(249, 115, 22, 0.95);
    return (x === 0 || x === 15 || y === 0 || y === 15) ? shade(71, 85, 105, 0.94) : shade(115, 125, 138, 0.86 + r * 0.16);
  });
  drawTile(55, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(148, 163, 184, 0.95) : shade(226, 232, 240, (y % 4 === 1 ? 1.04 : 0.96) * (0.94 + r * 0.08)));
  drawTile(56, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(180, 83, 9, 0.95) : (((x + y) === 6 || (x + y) === 7) ? shade(254, 249, 195, 0.98) : shade(250, 204, 21, 0.90 + r * 0.14)));
  drawTile(57, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(14, 116, 144, 0.96) : (((x >= 3 && x <= 5 && y >= 3 && y <= 5) || (x + y === 14)) ? shade(224, 242, 254, 0.99) : shade(56, 189, 248, 0.90 + r * 0.14)));
  drawTile(58, (x, y, r) => {
    if (y <= 1 || y === 7 || y === 8 || y >= 14 || x === 0 || x === 15) return shade(161, 98, 7, 0.92 + r * 0.12);
    const bc = [[220, 38, 38], [37, 99, 235], [22, 163, 74], [147, 51, 234], [217, 119, 6], [13, 148, 136]][(Math.floor((x - 1) / 3) + (y > 8 ? 3 : 0)) % 6];
    return ((x - 1) % 3 === 2) ? shade(30, 20, 10, 0.94) : shade(bc[0], bc[1], bc[2], 0.88 + r * 0.14);
  });
  drawTile(59, (x, y, r) => {
    if (x <= 1 || x >= 14 || y <= 1 || y >= 14) return shade(217, 119, 6, 0.92);
    return (((x === 5 || x === 10) && (y === 5 || y === 10)) || (x >= 7 && x <= 8 && y >= 7 && y <= 8)) ? shade(225, 29, 72, 0.96) : shade(248, 250, 252, 0.94 + r * 0.06);
  });
  drawTile(60, (x, y, r) => {
    if (y <= 5 || (y === 6 && x % 3 !== 0)) return (y === 3 && (x === 4 || x === 8 || x === 12)) ? shade(225, 29, 72, 0.96) : shade(248, 250, 252, 0.94 + r * 0.06);
    return shade(217, 119, 6, 0.88 + r * 0.16);
  });
  // 61..71: Bed Top/Side, Anvil, Enchanting Table Top/Side, Gravel, Clay, White Wool, Netherrack, End Stone, Emerald Block
  drawTile(61, (x, y, r) => y <= 4 ? shade(248, 250, 252, 0.94 + r * 0.06) : shade(220, 38, 38, 0.90 + r * 0.14));
  drawTile(62, (x, y, r) => y <= 5 ? (x <= 4 ? shade(248, 250, 252, 0.95) : shade(220, 38, 38, 0.92 + r * 0.1)) : shade(161, 98, 7, 0.88 + r * 0.14));
  drawTile(63, (x, y, r) => (y >= 5 && y <= 9 && (x <= 3 || x >= 12)) ? shade(30, 41, 59, 0.95) : shade(71, 85, 105, 0.88 + r * 0.16));
  drawTile(64, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(56, 189, 248, 0.98) : ((x >= 4 && x <= 11 && y >= 4 && y <= 11) ? shade(220, 38, 38, 0.94 + r * 0.1) : shade(49, 46, 129, 0.9)));
  drawTile(65, (x, y, r) => y <= 3 ? shade(220, 38, 38, 0.94) : ((y === 4 && x % 3 === 1) ? shade(56, 189, 248, 0.98) : shade(30, 27, 75, 0.86 + r * 0.2)));
  drawTile(66, (x, y, r) => shade(148, 142, 138, ((x * 5 + y * 7) % 4 === 0 ? 0.74 : 0.94) + r * 0.18));
  drawTile(67, (x, y, r) => shade(156, 163, 178, 0.90 + Math.sin(x * 0.8 + y * 0.6) * 0.05 + r * 0.1));
  drawTile(68, (x, y, r) => shade(244, 246, 250, 0.92 + r * 0.1));
  drawTile(69, (x, y, r) => shade(127, 29, 29, 0.78 + r * 0.34));
  drawTile(70, (x, y, r) => shade(234, 228, 176, (((x * 3 + y * 5) % 7 === 0) ? 0.82 : 0.96) + r * 0.1));
  drawTile(71, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(5, 150, 105, 0.96) : (((x + y === 7) || (x + y === 14)) ? shade(167, 243, 208, 0.99) : shade(16, 185, 129, 0.90 + r * 0.14)));
  // 72..81: Dedicated Minecraft-faithful Top/Bottom/Side faces for Cactus, TNT, Chest, Crafting Table, Furnace, Piston, Cake & Anvil
  drawTile(72, (x, y, r) => ((x <= 1 || x >= 14 || y <= 1 || y >= 14) && (x + y) % 4 === 0) ? '#e2e8f0' : ((x >= 6 && x <= 9 && y >= 6 && y <= 9) ? shade(134, 198, 92, 0.94 + r * 0.1) : shade(44, 138, 60, (x <= 1 || x >= 14 || y <= 1 || y >= 14 ? 0.78 : 0.95) + r * 0.12)));
  drawTile(73, (x, y, r) => (x >= 4 && x <= 11 && y >= 4 && y <= 11) ? shade(208, 194, 128, 0.92 + r * 0.12) : shade(44, 138, 60, 0.84 + r * 0.14));
  drawTile(74, (x, y, r) => (x % 4 === 0 || y % 4 === 0) ? shade(135, 22, 22, 0.9) : shade(212, 48, 38, 0.88 + r * 0.16));
  drawTile(75, (x, y, r) => y === 5 ? shade(28, 22, 16, 0.98) : ((x === 0 || x === 15 || y === 0 || y === 15) ? shade(62, 40, 22, 0.94) : shade(176, 112, 38, 0.88 + r * 0.16)));
  drawTile(76, (x, y, r) => {
    if (y <= 2) return shade(92, 58, 30, 0.94);
    if (y === 3) return shade(48, 30, 15, 0.96);
    if (x >= 3 && x <= 6 && y >= 5 && y <= 11) return (x === 3 || x === 6 || y === 5 || y === 11) ? shade(58, 36, 18, 0.96) : shade(120, 72, 32, 0.94);
    if (x >= 10 && x <= 13 && y >= 5 && y <= 11) return (y <= 6 || x === 11) ? shade(203, 213, 225, 0.98) : shade(168, 118, 66, 0.9);
    return (x === 0 || x === 15 || y === 15) ? shade(92, 58, 30, 0.92) : shade(168, 118, 66, 0.88 + r * 0.15);
  });
  drawTile(77, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15 || y === 8 || ((x + (y >> 2) * 4) % 8 === 0)) ? shade(71, 85, 105, 0.92) : shade(115, 125, 138, 0.86 + r * 0.18));
  drawTile(78, (x, y, r) => ((x <= 2 || x >= 13) && (y <= 2 || y >= 13)) ? shade(148, 163, 184, 0.96) : shade(184, 134, 72, (y % 4 === 0 ? 0.78 : 0.94) + r * 0.1));
  drawTile(79, (x, y, r) => (x === 0 || x === 15 || y === 0 || y === 15) ? shade(71, 85, 105, 0.94) : (Math.hypot(x - 7.5, y - 7.5) < 4.2 ? shade(51, 65, 85, 0.94) : shade(105, 110, 118, 0.86 + r * 0.18)));
  drawTile(80, (x, y, r) => (x <= 1 || x >= 14 || y <= 1 || y >= 14) ? shade(180, 83, 9, 0.92) : shade(217, 119, 6, 0.88 + r * 0.14));
  drawTile(81, (x, y, r) => (x >= 3 && x <= 12 && y >= 4 && y <= 11) ? shade(100, 116, 139, 0.92 + r * 0.12) : shade(51, 65, 85, 0.88 + r * 0.14));

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return { texture, canvas };
}

// Create 8-stage Cumulative Pixel-Art Fracture Overlay Atlas (Minecraft destroy_stage_0..7 style)
const CRACK_STAGE_PIXELS = [
  [[7,7],[8,7],[7,8],[8,6],[6,8]],
  [[6,6],[9,6],[8,9],[5,8],[9,8],[7,5]],
  [[5,5],[10,5],[10,6],[9,10],[4,9],[6,10],[11,8]],
  [[4,4],[6,4],[11,4],[10,11],[8,11],[3,9],[4,7],[12,9]],
  [[3,3],[7,3],[12,3],[12,5],[11,12],[7,12],[2,10],[3,6],[13,10],[5,11]],
  [[2,2],[8,2],[13,2],[13,6],[12,13],[6,13],[1,11],[2,5],[14,10],[4,12],[9,4],[10,9]],
  [[1,1],[8,1],[14,2],[14,6],[13,14],[5,14],[1,12],[1,5],[14,11],[3,13],[6,7],[9,7],[7,9],[11,7]],
  [[0,1],[9,0],[15,1],[15,6],[14,15],[4,15],[0,13],[0,4],[15,11],[2,14],[5,6],[10,7],[6,9],[9,9],[8,8]]
];
function createCrackTextures() {
  const stages = [];
  for (let s = 0; s < 8; s++) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    for (let w = 0; w <= s; w++) for (const [x, y] of CRACK_STAGE_PIXELS[w]) if (x < 15 && y < 15) ctx.fillRect(x + 1, y + 1, 1, 1);
    for (let w = 0; w <= s; w++) {
      ctx.fillStyle = w <= s - 3 ? 'rgba(8, 10, 14, 0.94)' : 'rgba(16, 20, 28, 0.84)';
      for (const [x, y] of CRACK_STAGE_PIXELS[w]) ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    stages.push(tex);
  }
  return stages;
}
