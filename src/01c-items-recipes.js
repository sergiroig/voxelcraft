// VoxelCraft HTML5 — 01c-items-recipes.js (PHASES 4, 5, 6, 8 & 9: EXTRA ITEMS >= 308,SPRITES & RECIPES)
'use strict';

// ============================================================================
// EXTRA ITEM IDS (308..386, never placed in chunk voxel data)
// ============================================================================
Object.assign(BLOCK, {
  // Fase 4: Alimentos Agrícolas
  ITEM_CARROT: 308, ITEM_GOLDEN_CARROT: 309, ITEM_POTATO: 310, ITEM_BAKED_POTATO: 311,
  ITEM_BEETROOT: 312, ITEM_BEETROOT_SOUP: 313, ITEM_MELON_SLICE: 314, ITEM_PUMPKIN_PIE: 315,
  ITEM_COOKIE: 316, ITEM_SWEET_BERRIES: 317, ITEM_MUSHROOM_STEW: 318,

  // Fase 5: Los 6 Materiales Completos para Picos, Espadas, Hachas, Palas y Azadas
  TOOL_NETHERITE_PICKAXE: 319, TOOL_NETHERITE_SWORD: 320,
  TOOL_WOOD_AXE: 321, TOOL_STONE_AXE: 322, TOOL_GOLD_AXE: 323, TOOL_IRON_AXE: 324, TOOL_NETHERITE_AXE: 325,
  TOOL_WOOD_SHOVEL: 326, TOOL_STONE_SHOVEL: 327, TOOL_GOLD_SHOVEL: 328, TOOL_IRON_SHOVEL: 329, TOOL_NETHERITE_SHOVEL: 330,
  TOOL_WOOD_HOE: 331, TOOL_STONE_HOE: 332, TOOL_GOLD_HOE: 333, TOOL_IRON_HOE: 334, TOOL_NETHERITE_HOE: 335,

  // Fase 5: Los 6 Conjuntos de Armadura + Caparazón de Tortuga
  ARMOR_LEATHER_HELMET: 336, ARMOR_LEATHER_CHESTPLATE: 337, ARMOR_LEATHER_LEGGINGS: 338, ARMOR_LEATHER_BOOTS: 339,
  ARMOR_CHAINMAIL_HELMET: 340, ARMOR_CHAINMAIL_CHESTPLATE: 341, ARMOR_CHAINMAIL_LEGGINGS: 342, ARMOR_CHAINMAIL_BOOTS: 343,
  ARMOR_GOLD_HELMET: 344, ARMOR_GOLD_CHESTPLATE: 345, ARMOR_GOLD_LEGGINGS: 346, ARMOR_GOLD_BOOTS: 347,
  ARMOR_NETHERITE_HELMET: 348, ARMOR_NETHERITE_CHESTPLATE: 349, ARMOR_NETHERITE_LEGGINGS: 350, ARMOR_NETHERITE_BOOTS: 351,
  ARMOR_TURTLE_HELMET: 352,

  // Fase 5: Lingotes, Gemas, Armas y Utilidades Especiales
  ITEM_COPPER_INGOT: 353, ITEM_LAPIS_LAZULI: 354, ITEM_REDSTONE: 355, ITEM_QUARTZ: 356, ITEM_NETHERITE_INGOT: 357,
  TOOL_SHIELD: 358, TOOL_CROSSBOW: 359, TOOL_TRIDENT: 360, TOOL_SPYGLASS: 361,
  ITEM_ELYTRA: 362, ITEM_TOTEM_OF_UNDYING: 363, ITEM_FIREWORK_ROCKET: 364, ITEM_SADDLE: 365,

  // Fase 6: Vehículos Avanzados
  ITEM_CHEST_MINECART: 366, ITEM_TNT_MINECART: 367, ITEM_CHEST_BOAT: 368,

  // Fase 8: Alquimia, Ingredientes y Pociones
  ITEM_GLASS_BOTTLE: 369, ITEM_NETHER_WART: 370, ITEM_BLAZE_POWDER: 371, ITEM_GHAST_TEAR: 372,
  ITEM_MAGMA_CREAM: 373, ITEM_PHANTOM_MEMBRANE: 374, ITEM_PUFFERFISH: 375, ITEM_SPIDER_EYE: 376, ITEM_SUGAR: 377,
  ITEM_POTION_SPEED: 378, ITEM_POTION_STRENGTH: 379, ITEM_POTION_REGEN: 380, ITEM_POTION_FIRE_RES: 381,
  ITEM_POTION_NIGHT_VISION: 382, ITEM_POTION_SLOW_FALLING: 383, ITEM_POTION_WATER_BREATHING: 384, ITEM_POTION_POISON: 385,

  // Fase 9: Cuadros Decorativos
  ITEM_PAINTING: 386
});

const addIDef = (id, name, color, tile, nonStack = false) => {
  BLOCK_DEFS[id] = { name, solid: false, opaque: false, shape: 'tool', light: 0, hardness: 0, stoneLike: false, color, tiles: [tile, tile, tile, tile, tile, tile], nonStack };
};

// Fase 4: Alimentos
addIDef(BLOCK.ITEM_CARROT,          'Zanahoria Fresca (+3🍗)',       0xf97316, 179);
addIDef(BLOCK.ITEM_GOLDEN_CARROT,   'Zanahoria Dorada (+6🍗)',       0xfacc15, 56);
addIDef(BLOCK.ITEM_POTATO,          'Patata Cruda (+1🍗)',           0xd97706, 180);
addIDef(BLOCK.ITEM_BAKED_POTATO,    'Patata Asada (+5🍗)',           0xf59e0b, 180);
addIDef(BLOCK.ITEM_BEETROOT,        'Remolacha (+1🍗)',              0xbe123c, 181);
addIDef(BLOCK.ITEM_BEETROOT_SOUP,   'Sopa de Remolacha (+6🍗)',      0x9f1239, 181);
addIDef(BLOCK.ITEM_MELON_SLICE,     'Rodaja de Sandía (+2🍗)',       0xef4444, 187);
addIDef(BLOCK.ITEM_PUMPKIN_PIE,     'Tarta de Calabaza (+8🍗)',      0xd97706, 183);
addIDef(BLOCK.ITEM_COOKIE,          'Galleta con Cacao (+2🍗)',      0xb45309, 190);
addIDef(BLOCK.ITEM_SWEET_BERRIES,   'Bayas Dulces (+2🍗)',           0xdc2626, 191);
addIDef(BLOCK.ITEM_MUSHROOM_STEW,   'Estofado de Setas (+6🍗)',      0xb45309, 205);

// Fase 5: Herramientas y Armas Completas (6 Materiales)
addIDef(BLOCK.TOOL_NETHERITE_PICKAXE, 'Pico de Netherita',           0x423d40, 133, true);
addIDef(BLOCK.TOOL_NETHERITE_SWORD,   'Espada de Netherita',         0x423d40, 133, true);
addIDef(BLOCK.TOOL_WOOD_AXE,          'Hacha de Madera',             0xa16207, 8,   true);
addIDef(BLOCK.TOOL_STONE_AXE,         'Hacha de Piedra',             0x94a3b8, 9,   true);
addIDef(BLOCK.TOOL_GOLD_AXE,          'Hacha de Oro',                0xfacc15, 56,  true);
addIDef(BLOCK.TOOL_IRON_AXE,          'Hacha de Hierro',             0xe2e8f0, 55,  true);
addIDef(BLOCK.TOOL_NETHERITE_AXE,     'Hacha de Netherita',          0x423d40, 133, true);
addIDef(BLOCK.TOOL_WOOD_SHOVEL,       'Pala de Madera',              0xa16207, 8,   true);
addIDef(BLOCK.TOOL_STONE_SHOVEL,      'Pala de Piedra',              0x94a3b8, 9,   true);
addIDef(BLOCK.TOOL_GOLD_SHOVEL,       'Pala de Oro',                 0xfacc15, 56,  true);
addIDef(BLOCK.TOOL_IRON_SHOVEL,       'Pala de Hierro',              0xe2e8f0, 55,  true);
addIDef(BLOCK.TOOL_NETHERITE_SHOVEL,  'Pala de Netherita',           0x423d40, 133, true);
addIDef(BLOCK.TOOL_WOOD_HOE,          'Azada de Madera',             0xa16207, 8,   true);
addIDef(BLOCK.TOOL_STONE_HOE,         'Azada de Piedra',             0x94a3b8, 9,   true);
addIDef(BLOCK.TOOL_GOLD_HOE,          'Azada de Oro',                0xfacc15, 56,  true);
addIDef(BLOCK.TOOL_IRON_HOE,          'Azada de Hierro',             0xe2e8f0, 55,  true);
addIDef(BLOCK.TOOL_NETHERITE_HOE,     'Azada de Netherita',          0x423d40, 133, true);

// Fase 5: Armaduras Completas (Cuero, Malla, Oro, Netherita, Tortuga)
addIDef(BLOCK.ARMOR_LEATHER_HELMET,      'Casco de Cuero',           0xa16207, 8,   true);
addIDef(BLOCK.ARMOR_LEATHER_CHESTPLATE,  'Túnica de Cuero',          0xa16207, 8,   true);
addIDef(BLOCK.ARMOR_LEATHER_LEGGINGS,    'Pantalones de Cuero',      0xa16207, 8,   true);
addIDef(BLOCK.ARMOR_LEATHER_BOOTS,       'Botas de Cuero',           0xa16207, 8,   true);
addIDef(BLOCK.ARMOR_CHAINMAIL_HELMET,    'Casco de Cota de Malla',   0x94a3b8, 9,   true);
addIDef(BLOCK.ARMOR_CHAINMAIL_CHESTPLATE,'Peto de Cota de Malla',    0x94a3b8, 9,   true);
addIDef(BLOCK.ARMOR_CHAINMAIL_LEGGINGS,  'Grebas de Cota de Malla',  0x94a3b8, 9,   true);
addIDef(BLOCK.ARMOR_CHAINMAIL_BOOTS,     'Botas de Cota de Malla',   0x94a3b8, 9,   true);
addIDef(BLOCK.ARMOR_GOLD_HELMET,         'Casco de Oro',             0xfacc15, 56,  true);
addIDef(BLOCK.ARMOR_GOLD_CHESTPLATE,     'Peto de Oro',              0xfacc15, 56,  true);
addIDef(BLOCK.ARMOR_GOLD_LEGGINGS,       'Grebas de Oro',            0xfacc15, 56,  true);
addIDef(BLOCK.ARMOR_GOLD_BOOTS,          'Botas de Oro',             0xfacc15, 56,  true);
addIDef(BLOCK.ARMOR_NETHERITE_HELMET,    'Casco de Netherita',       0x423d40, 133, true);
addIDef(BLOCK.ARMOR_NETHERITE_CHESTPLATE,'Peto de Netherita',        0x423d40, 133, true);
addIDef(BLOCK.ARMOR_NETHERITE_LEGGINGS,  'Grebas de Netherita',      0x423d40, 133, true);
addIDef(BLOCK.ARMOR_NETHERITE_BOOTS,     'Botas de Netherita',       0x423d40, 133, true);
addIDef(BLOCK.ARMOR_TURTLE_HELMET,       'Caparazón de Tortuga',     0x22c55e, 150, true);

// Fase 5: Minerales y Utilidades Especiales
addIDef(BLOCK.ITEM_COPPER_INGOT,     'Lingote de Cobre',             0xc26b4c, 122);
addIDef(BLOCK.ITEM_LAPIS_LAZULI,     'Lapislázuli',                  0x2563eb, 124);
addIDef(BLOCK.ITEM_REDSTONE,         'Polvo de Redstone',            0xdc2626, 207);
addIDef(BLOCK.ITEM_QUARTZ,           'Cuarzo del Nether',            0xf8fafc, 128);
addIDef(BLOCK.ITEM_NETHERITE_INGOT,  'Lingote de Netherita',         0x423d40, 133);
addIDef(BLOCK.TOOL_SHIELD,           'Escudo Defensivo',             0xb45309, 8,   true);
addIDef(BLOCK.TOOL_CROSSBOW,         'Ballesta de Precisión',        0x92400e, 8,   true);
addIDef(BLOCK.TOOL_TRIDENT,          'Tridente Marino (Retornable)', 0x38bdf8, 150, true);
addIDef(BLOCK.TOOL_SPYGLASS,         'Catalejo Óptico (Zoom)',       0xd97706, 122, true);
addIDef(BLOCK.ITEM_ELYTRA,           'Élitros (Planeo Aéreo)',       0x94a3b8, 55,  true);
addIDef(BLOCK.ITEM_TOTEM_OF_UNDYING, 'Tótem de la Inmortalidad',     0xfacc15, 56,  true);
addIDef(BLOCK.ITEM_FIREWORK_ROCKET,  'Cohete Propulsor',             0xef4444, 26);
addIDef(BLOCK.ITEM_SADDLE,           'Montura de Caballo',           0xb45309, 8,   true);

// Fase 6: Vehículos
addIDef(BLOCK.ITEM_CHEST_MINECART,   'Vagoneta con Cofre',           0xd97706, 45,  true);
addIDef(BLOCK.ITEM_TNT_MINECART,     'Vagoneta con TNT',             0xdc2626, 26,  true);
addIDef(BLOCK.ITEM_CHEST_BOAT,       'Barca con Cofre',              0xb45309, 8,   true);

// Fase 8: Alquimia y Pociones
addIDef(BLOCK.ITEM_GLASS_BOTTLE,            'Frasco de Cristal',                0xdaf0ff, 11);
addIDef(BLOCK.ITEM_NETHER_WART,             'Verruga del Nether',               0xbe123c, 232);
addIDef(BLOCK.ITEM_BLAZE_POWDER,            'Polvo de Blaze',                   0xf97316, 28);
addIDef(BLOCK.ITEM_GHAST_TEAR,              'Lágrima de Ghast',                 0xe2e8f0, 50);
addIDef(BLOCK.ITEM_MAGMA_CREAM,             'Crema de Magma',                   0xf59e0b, 40);
addIDef(BLOCK.ITEM_PHANTOM_MEMBRANE,        'Membrana de Fantasma',             0xcbd5e1, 68);
addIDef(BLOCK.ITEM_PUFFERFISH,              'Pez Globo',                        0xfacc15, 19);
addIDef(BLOCK.ITEM_SPIDER_EYE,              'Ojo de Araña',                     0x9f1239, 205);
addIDef(BLOCK.ITEM_SUGAR,                   'Azúcar de Caña',                   0xffffff, 13);
addIDef(BLOCK.ITEM_POTION_SPEED,            'Poción de Velocidad',              0x38bdf8, 11, true);
addIDef(BLOCK.ITEM_POTION_STRENGTH,         'Poción de Fuerza',                 0xef4444, 11, true);
addIDef(BLOCK.ITEM_POTION_REGEN,            'Poción de Regeneración',           0xf472b6, 11, true);
addIDef(BLOCK.ITEM_POTION_FIRE_RES,         'Poción de Resistencia al Fuego',   0xf97316, 11, true);
addIDef(BLOCK.ITEM_POTION_NIGHT_VISION,     'Poción de Visión Nocturna',        0x1d4ed8, 11, true);
addIDef(BLOCK.ITEM_POTION_SLOW_FALLING,     'Poción de Caída Lenta',            0xf8fafc, 11, true);
addIDef(BLOCK.ITEM_POTION_WATER_BREATHING,  'Poción de Respiración Acuática',   0x0284c7, 11, true);
addIDef(BLOCK.ITEM_POTION_POISON,           'Poción de Veneno',                 0x16a34a, 11, true);

// Fase 9: Cuadros Decorativos
addIDef(BLOCK.ITEM_PAINTING,                'Cuadro Decorativo (Pared)',        0xb45309, 8);

// Extend helper classifiers for all new tool/armor/food tiers
const _origIsPickaxeItem = isPickaxeItem;
isPickaxeItem = function(id) { return _origIsPickaxeItem(id) || id === BLOCK.TOOL_NETHERITE_PICKAXE; };

const _origIsSwordItem = isSwordItem;
isSwordItem = function(id) { return _origIsSwordItem(id) || id === BLOCK.TOOL_NETHERITE_SWORD; };

function isAxeItem(id) { return id === BLOCK.TOOL_AXE || (id >= BLOCK.TOOL_WOOD_AXE && id <= BLOCK.TOOL_NETHERITE_AXE); }
function isShovelItem(id) { return id === BLOCK.TOOL_SHOVEL || (id >= BLOCK.TOOL_WOOD_SHOVEL && id <= BLOCK.TOOL_NETHERITE_SHOVEL); }
function isHoeItem(id) { return id === BLOCK.TOOL_HOE || (id >= BLOCK.TOOL_WOOD_HOE && id <= BLOCK.TOOL_NETHERITE_HOE); }
function isPotionItem(id) { return id >= BLOCK.ITEM_POTION_SPEED && id <= BLOCK.ITEM_POTION_POISON; }

const _origGetArmorSlot = getArmorSlotForItem;
getArmorSlotForItem = function(id) {
  const base = _origGetArmorSlot(id);
  if (base !== -1) return base;
  if (id === BLOCK.ARMOR_TURTLE_HELMET) return 0;
  if (id === BLOCK.ITEM_ELYTRA) return 1;
  if (id >= BLOCK.ARMOR_LEATHER_HELMET && id <= BLOCK.ARMOR_NETHERITE_BOOTS) {
    return (id - BLOCK.ARMOR_LEATHER_HELMET) % 4;
  }
  return -1;
};

const _origIsFoodItem = isFoodItem;
isFoodItem = function(id) {
  return _origIsFoodItem(id) || (id >= BLOCK.ITEM_CARROT && id <= BLOCK.ITEM_MUSHROOM_STEW);
};

// Extend getDropItemForBlock for new ores, crops & leaves
const _origGetDropItem = getDropItemForBlock;
getDropItemForBlock = function(blockId, toolId) {
  if (blockId === BLOCK.COAL_ORE) return BLOCK.ITEM_COAL;
  if (toolId !== undefined) {
    if (blockId === BLOCK.IRON_ORE) return BLOCK.ITEM_IRON_INGOT;
    if (blockId === BLOCK.GOLD_ORE) return BLOCK.ITEM_GOLD_INGOT;
    if (blockId === BLOCK.DIAMOND_ORE) return BLOCK.ITEM_DIAMOND;
  }
  if (blockId === BLOCK.DEEPSLATE) return BLOCK.COBBLED_DEEPSLATE;
  if (blockId === BLOCK.COPPER_ORE) return BLOCK.ITEM_COPPER_INGOT;
  if (blockId === BLOCK.LAPIS_ORE) return BLOCK.ITEM_LAPIS_LAZULI;
  if (blockId === BLOCK.REDSTONE_ORE) return BLOCK.ITEM_REDSTONE;
  if (blockId === BLOCK.EMERALD_ORE) return BLOCK.ITEM_EMERALD;
  if (blockId === BLOCK.NETHER_QUARTZ_ORE) return BLOCK.ITEM_QUARTZ;
  if (blockId === BLOCK.NETHER_GOLD_ORE) return BLOCK.ITEM_GOLD_INGOT;
  if (blockId === BLOCK.CARROTS) return BLOCK.ITEM_CARROT;
  if (blockId === BLOCK.POTATOES) return BLOCK.ITEM_POTATO;
  if (blockId === BLOCK.BEETROOTS) return BLOCK.ITEM_BEETROOT;
  if (blockId === BLOCK.MELON) return BLOCK.ITEM_MELON_SLICE;
  if (blockId === BLOCK.SWEET_BERRY_BUSH) return BLOCK.ITEM_SWEET_BERRIES;
  if (toolId === BLOCK.TOOL_SHEARS && (blockId === BLOCK.VINE || blockId === BLOCK.FERN || blockId === BLOCK.DEAD_BUSH || (blockId >= BLOCK.SPRUCE_LEAVES && blockId <= BLOCK.CHERRY_LEAVES && BLOCK_DEFS[blockId].name.startsWith('Hojas')))) {
    return blockId;
  }
  return _origGetDropItem(blockId, toolId);
};

// Register all new blocks (65..190) and items (308..386) into ALL_INVENTORY_ITEMS & inventoryCounts
for (const [, id] of Object.entries(BLOCK)) {
  if (id > 0 && !ALL_INVENTORY_ITEMS.includes(id)) {
    ALL_INVENTORY_ITEMS.push(id);
    inventoryCounts[id] = 0;
  }
}

// Add Crafting & Smelting Recipes for Phases 2..10
CRAFTING_RECIPES.push(
  // Fase 2: Tablones por especie
  { name: '4× Tablones de Abeto',       outId: BLOCK.SPRUCE_PLANKS,   outCount: 4, gridSize: 2, pattern: [BLOCK.SPRUCE_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.SPRUCE_LOG, count: 1 }] },
  { name: '4× Tablones de Abedul',      outId: BLOCK.BIRCH_PLANKS,    outCount: 4, gridSize: 2, pattern: [BLOCK.BIRCH_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.BIRCH_LOG, count: 1 }] },
  { name: '4× Tablones de Jungla',      outId: BLOCK.JUNGLE_PLANKS,   outCount: 4, gridSize: 2, pattern: [BLOCK.JUNGLE_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.JUNGLE_LOG, count: 1 }] },
  { name: '4× Tablones de Acacia',      outId: BLOCK.ACACIA_PLANKS,   outCount: 4, gridSize: 2, pattern: [BLOCK.ACACIA_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.ACACIA_LOG, count: 1 }] },
  { name: '4× Tablones Roble Oscuro',   outId: BLOCK.DARK_OAK_PLANKS, outCount: 4, gridSize: 2, pattern: [BLOCK.DARK_OAK_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.DARK_OAK_LOG, count: 1 }] },
  { name: '4× Tablones de Manglar',     outId: BLOCK.MANGROVE_PLANKS, outCount: 4, gridSize: 2, pattern: [BLOCK.MANGROVE_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.MANGROVE_LOG, count: 1 }] },
  { name: '4× Tablones de Cerezo',      outId: BLOCK.CHERRY_PLANKS,   outCount: 4, gridSize: 2, pattern: [BLOCK.CHERRY_LOG, 0, 0, 0], ingredients: [{ id: BLOCK.CHERRY_LOG, count: 1 }] },
  // Fase 3: Bloques de Construcción y Funcionales
  { name: '4× Ladrillos de Pizarra',    outId: BLOCK.DEEPSLATE_BRICKS,outCount: 4, gridSize: 2, pattern: [BLOCK.COBBLED_DEEPSLATE, BLOCK.COBBLED_DEEPSLATE, BLOCK.COBBLED_DEEPSLATE, BLOCK.COBBLED_DEEPSLATE], ingredients: [{ id: BLOCK.COBBLED_DEEPSLATE, count: 4 }] },
  { name: '1× Arenisca',                outId: BLOCK.SANDSTONE,       outCount: 1, gridSize: 2, pattern: [BLOCK.SAND, BLOCK.SAND, BLOCK.SAND, BLOCK.SAND], ingredients: [{ id: BLOCK.SAND, count: 4 }] },
  { name: '4× Ladrillos de Piedra',     outId: BLOCK.STONE_BRICKS,    outCount: 4, gridSize: 2, pattern: [BLOCK.STONE, BLOCK.STONE, BLOCK.STONE, BLOCK.STONE], ingredients: [{ id: BLOCK.STONE, count: 4 }] },
  { name: '1× Farolillo Luminoso',      outId: BLOCK.LANTERN,         outCount: 1, gridSize: 2, pattern: [BLOCK.TORCH, BLOCK.ITEM_IRON_INGOT, 0, 0], ingredients: [{ id: BLOCK.TORCH, count: 1 }, { id: BLOCK.ITEM_IRON_INGOT, count: 1 }] },
  { name: '1× Hoguera de Campamento',   outId: BLOCK.CAMPFIRE,        outCount: 1, gridSize: 2, pattern: [BLOCK.TORCH, BLOCK.WOOD, 0, 0], ingredients: [{ id: BLOCK.TORCH, count: 1 }, { id: BLOCK.WOOD, count: 1 }] },
  { name: '1× Bala de Heno',            outId: BLOCK.HAY_BLOCK,       outCount: 1, gridSize: 2, pattern: [BLOCK.WHEAT_3, BLOCK.WHEAT_3, BLOCK.WHEAT_3, 0], ingredients: [{ id: BLOCK.WHEAT_3, count: 3 }] },
  { name: '1× Barril de Almacenaje',    outId: BLOCK.BARREL,          outCount: 1, gridSize: 2, pattern: [BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.PLANKS, count: 2 }, { id: BLOCK.ITEM_STICK, count: 1 }] },
  { name: '1× Mesa de Herrería',        outId: BLOCK.SMITHING_TABLE,  outCount: 1, gridSize: 2, pattern: [BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_IRON_INGOT, BLOCK.PLANKS, BLOCK.PLANKS], ingredients: [{ id: BLOCK.ITEM_IRON_INGOT, count: 2 }, { id: BLOCK.PLANKS, count: 2 }] },
  { name: '1× Mesa de Cartografía',     outId: BLOCK.CARTOGRAPHY_TABLE,outCount: 1, gridSize: 2, pattern: [BLOCK.ITEM_PAPER, BLOCK.ITEM_PAPER, BLOCK.PLANKS, BLOCK.PLANKS], ingredients: [{ id: BLOCK.ITEM_PAPER, count: 2 }, { id: BLOCK.PLANKS, count: 2 }] },
  // Fase 4: Agricultura y Comidas
  { name: '2× Azúcar de Caña',          outId: BLOCK.ITEM_SUGAR,         outCount: 2, gridSize: 2, pattern: [BLOCK.SUGAR_CANE, 0, 0, 0], ingredients: [{ id: BLOCK.SUGAR_CANE, count: 1 }] },
  { name: '1× Calabaza Luminosa',       outId: BLOCK.JACK_O_LANTERN,     outCount: 1, gridSize: 2, pattern: [BLOCK.CARVED_PUMPKIN, BLOCK.TORCH, 0, 0], ingredients: [{ id: BLOCK.CARVED_PUMPKIN, count: 1 }, { id: BLOCK.TORCH, count: 1 }] },
  { name: '1× Zanahoria Dorada (+6🍗)',  outId: BLOCK.ITEM_GOLDEN_CARROT, outCount: 1, gridSize: 2, pattern: [BLOCK.ITEM_CARROT, BLOCK.ITEM_GOLD_INGOT, 0, 0], ingredients: [{ id: BLOCK.ITEM_CARROT, count: 1 }, { id: BLOCK.ITEM_GOLD_INGOT, count: 1 }] },
  { name: '1× Sopa de Remolacha (+6🍗)', outId: BLOCK.ITEM_BEETROOT_SOUP, outCount: 1, gridSize: 2, pattern: [BLOCK.ITEM_BEETROOT, BLOCK.ITEM_BEETROOT, BLOCK.PLANKS, 0], ingredients: [{ id: BLOCK.ITEM_BEETROOT, count: 2 }, { id: BLOCK.PLANKS, count: 1 }] },
  { name: '1× Tarta de Calabaza (+8🍗)', outId: BLOCK.ITEM_PUMPKIN_PIE,   outCount: 1, gridSize: 2, pattern: [BLOCK.PUMPKIN, BLOCK.ITEM_SUGAR, 0, 0], ingredients: [{ id: BLOCK.PUMPKIN, count: 1 }, { id: BLOCK.ITEM_SUGAR, count: 1 }] },
  { name: '4× Galletas con Cacao (+2🍗)',outId: BLOCK.ITEM_COOKIE,        outCount: 4, gridSize: 2, pattern: [BLOCK.WHEAT_3, BLOCK.COCOA, 0, 0], ingredients: [{ id: BLOCK.WHEAT_3, count: 1 }, { id: BLOCK.COCOA, count: 1 }] },
  { name: '1× Estofado de Setas (+6🍗)', outId: BLOCK.ITEM_MUSHROOM_STEW, outCount: 1, gridSize: 2, pattern: [BLOCK.RED_MUSHROOM, BLOCK.BROWN_MUSHROOM, BLOCK.PLANKS, 0], ingredients: [{ id: BLOCK.RED_MUSHROOM, count: 1 }, { id: BLOCK.BROWN_MUSHROOM, count: 1 }, { id: BLOCK.PLANKS, count: 1 }] },
  // Fase 5: Armas y Utilidades Especiales
  { name: '1× Escudo Defensivo',        outId: BLOCK.TOOL_SHIELD,           outCount: 1, gridSize: 3, pattern: [BLOCK.PLANKS, BLOCK.ITEM_IRON_INGOT, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, BLOCK.PLANKS, 0, BLOCK.PLANKS, 0], ingredients: [{ id: BLOCK.PLANKS, count: 6 }, { id: BLOCK.ITEM_IRON_INGOT, count: 1 }] },
  { name: '1× Ballesta de Precisión',   outId: BLOCK.TOOL_CROSSBOW,         outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_STICK, BLOCK.ITEM_IRON_INGOT, BLOCK.ITEM_STICK, 0, BLOCK.TALL_GRASS, 0, 0, BLOCK.ITEM_STICK, 0], ingredients: [{ id: BLOCK.ITEM_STICK, count: 3 }, { id: BLOCK.ITEM_IRON_INGOT, count: 1 }, { id: BLOCK.TALL_GRASS, count: 1 }] },
  { name: '1× Catalejo Óptico (Zoom)',  outId: BLOCK.TOOL_SPYGLASS,         outCount: 1, gridSize: 3, pattern: [0, BLOCK.AMETHYST, 0, 0, BLOCK.ITEM_COPPER_INGOT, 0, 0, BLOCK.ITEM_COPPER_INGOT, 0], ingredients: [{ id: BLOCK.AMETHYST, count: 1 }, { id: BLOCK.ITEM_COPPER_INGOT, count: 2 }] },
  { name: '1× Pico de Netherita',       outId: BLOCK.TOOL_NETHERITE_PICKAXE,outCount: 1, gridSize: 2, pattern: [BLOCK.TOOL_PICKAXE, BLOCK.ITEM_NETHERITE_INGOT, 0, 0], ingredients: [{ id: BLOCK.TOOL_PICKAXE, count: 1 }, { id: BLOCK.ITEM_NETHERITE_INGOT, count: 1 }] },
  { name: '1× Espada de Netherita',     outId: BLOCK.TOOL_NETHERITE_SWORD,  outCount: 1, gridSize: 2, pattern: [BLOCK.TOOL_SWORD, BLOCK.ITEM_NETHERITE_INGOT, 0, 0], ingredients: [{ id: BLOCK.TOOL_SWORD, count: 1 }, { id: BLOCK.ITEM_NETHERITE_INGOT, count: 1 }] },
  { name: '2× Cohete Propulsor',        outId: BLOCK.ITEM_FIREWORK_ROCKET,  outCount: 2, gridSize: 2, pattern: [BLOCK.ITEM_PAPER, BLOCK.ITEM_COAL, 0, 0], ingredients: [{ id: BLOCK.ITEM_PAPER, count: 1 }, { id: BLOCK.ITEM_COAL, count: 1 }] },
  // Fase 6: Redstone Avanzado y Vehículos
  { name: '1× Pistón Pegajoso',         outId: BLOCK.STICKY_PISTON,         outCount: 1, gridSize: 2, pattern: [BLOCK.PISTON, BLOCK.SLIME, 0, 0], ingredients: [{ id: BLOCK.PISTON, count: 1 }, { id: BLOCK.SLIME, count: 1 }] },
  { name: '1× Dispensador Automático',  outId: BLOCK.DISPENSER,             outCount: 1, gridSize: 3, pattern: [BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.TOOL_BOW, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.ITEM_REDSTONE, BLOCK.COBBLE], ingredients: [{ id: BLOCK.COBBLE, count: 7 }, { id: BLOCK.TOOL_BOW, count: 1 }, { id: BLOCK.ITEM_REDSTONE, count: 1 }] },
  { name: '1× Bloque Diana (Redstone)', outId: BLOCK.TARGET,                outCount: 1, gridSize: 2, pattern: [BLOCK.HAY_BLOCK, BLOCK.ITEM_REDSTONE, 0, 0], ingredients: [{ id: BLOCK.HAY_BLOCK, count: 1 }, { id: BLOCK.ITEM_REDSTONE, count: 1 }] },
  { name: '6× Raíl Propulsor (Turbo)',  outId: BLOCK.POWERED_RAIL,          outCount: 6, gridSize: 3, pattern: [BLOCK.ITEM_GOLD_INGOT, 0, BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_GOLD_INGOT, BLOCK.ITEM_STICK, BLOCK.ITEM_GOLD_INGOT, 0, BLOCK.ITEM_REDSTONE, 0], ingredients: [{ id: BLOCK.ITEM_GOLD_INGOT, count: 4 }, { id: BLOCK.ITEM_STICK, count: 1 }, { id: BLOCK.ITEM_REDSTONE, count: 1 }] },
  { name: '1× Vagoneta con Cofre',      outId: BLOCK.ITEM_CHEST_MINECART,   outCount: 1, gridSize: 2, pattern: [BLOCK.CHEST, BLOCK.ITEM_MINECART, 0, 0], ingredients: [{ id: BLOCK.CHEST, count: 1 }, { id: BLOCK.ITEM_MINECART, count: 1 }] },
  { name: '1× Vagoneta con TNT',        outId: BLOCK.ITEM_TNT_MINECART,     outCount: 1, gridSize: 2, pattern: [BLOCK.TNT, BLOCK.ITEM_MINECART, 0, 0], ingredients: [{ id: BLOCK.TNT, count: 1 }, { id: BLOCK.ITEM_MINECART, count: 1 }] },
  { name: '1× Barca con Cofre',         outId: BLOCK.ITEM_CHEST_BOAT,       outCount: 1, gridSize: 2, pattern: [BLOCK.CHEST, BLOCK.ITEM_BOAT, 0, 0], ingredients: [{ id: BLOCK.CHEST, count: 1 }, { id: BLOCK.ITEM_BOAT, count: 1 }] },
  // Fase 8: Alquimia
  { name: '1× Soporte de Pociones',     outId: BLOCK.BREWING_STAND,         outCount: 1, gridSize: 3, pattern: [0, BLOCK.ITEM_BLAZE_POWDER, 0, BLOCK.COBBLE, BLOCK.COBBLE, BLOCK.COBBLE, 0, 0, 0], ingredients: [{ id: BLOCK.ITEM_BLAZE_POWDER, count: 1 }, { id: BLOCK.COBBLE, count: 3 }] },
  { name: '3× Frasco de Cristal',       outId: BLOCK.ITEM_GLASS_BOTTLE,     outCount: 3, gridSize: 3, pattern: [BLOCK.GLASS, 0, BLOCK.GLASS, 0, BLOCK.GLASS, 0, 0, 0, 0], ingredients: [{ id: BLOCK.GLASS, count: 3 }] },
  // Fase 9: Cuadros
  { name: '1× Cuadro Decorativo',       outId: BLOCK.ITEM_PAINTING,         outCount: 1, gridSize: 3, pattern: [BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.WOOL, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK, BLOCK.ITEM_STICK], ingredients: [{ id: BLOCK.ITEM_STICK, count: 8 }, { id: BLOCK.WOOL, count: 1 }] }
);

SMELT_RECIPES.push(
  { inId: BLOCK.COPPER_ORE,        outId: BLOCK.ITEM_COPPER_INGOT,    count: 1 },
  { inId: BLOCK.LAPIS_ORE,         outId: BLOCK.ITEM_LAPIS_LAZULI,    count: 2 },
  { inId: BLOCK.REDSTONE_ORE,      outId: BLOCK.ITEM_REDSTONE,        count: 2 },
  { inId: BLOCK.EMERALD_ORE,       outId: BLOCK.ITEM_EMERALD,         count: 1 },
  { inId: BLOCK.NETHER_QUARTZ_ORE, outId: BLOCK.ITEM_QUARTZ,          count: 1 },
  { inId: BLOCK.ANCIENT_DEBRIS,    outId: BLOCK.ITEM_NETHERITE_INGOT, count: 1 },
  { inId: BLOCK.ITEM_POTATO,       outId: BLOCK.ITEM_BAKED_POTATO,    count: 1 },
  { inId: BLOCK.COBBLED_DEEPSLATE, outId: BLOCK.DEEPSLATE,            count: 1 }
);

// Extra item sprite files for loadMcReferenceTextures()
const MC_EXTRA_ITEM_SPRITE_FILES = [
  [BLOCK.ITEM_CARROT, 'item/carrot.png'], [BLOCK.ITEM_GOLDEN_CARROT, 'item/golden_carrot.png'],
  [BLOCK.ITEM_POTATO, 'item/potato.png'], [BLOCK.ITEM_BAKED_POTATO, 'item/baked_potato.png'],
  [BLOCK.ITEM_BEETROOT, 'item/beetroot.png'], [BLOCK.ITEM_BEETROOT_SOUP, 'item/beetroot_soup.png'],
  [BLOCK.ITEM_MELON_SLICE, 'item/melon_slice.png'], [BLOCK.ITEM_PUMPKIN_PIE, 'item/pumpkin_pie.png'],
  [BLOCK.ITEM_COOKIE, 'item/cookie.png'], [BLOCK.ITEM_SWEET_BERRIES, 'item/sweet_berries.png'],
  [BLOCK.ITEM_MUSHROOM_STEW, 'item/mushroom_stew.png'],
  [BLOCK.TOOL_NETHERITE_PICKAXE, 'item/netherite_pickaxe.png'], [BLOCK.TOOL_NETHERITE_SWORD, 'item/netherite_sword.png'],
  [BLOCK.TOOL_WOOD_AXE, 'item/wooden_axe.png'], [BLOCK.TOOL_STONE_AXE, 'item/stone_axe.png'],
  [BLOCK.TOOL_GOLD_AXE, 'item/golden_axe.png'], [BLOCK.TOOL_IRON_AXE, 'item/iron_axe.png'], [BLOCK.TOOL_NETHERITE_AXE, 'item/netherite_axe.png'],
  [BLOCK.TOOL_WOOD_SHOVEL, 'item/wooden_shovel.png'], [BLOCK.TOOL_STONE_SHOVEL, 'item/stone_shovel.png'],
  [BLOCK.TOOL_GOLD_SHOVEL, 'item/golden_shovel.png'], [BLOCK.TOOL_IRON_SHOVEL, 'item/iron_shovel.png'], [BLOCK.TOOL_NETHERITE_SHOVEL, 'item/netherite_shovel.png'],
  [BLOCK.TOOL_WOOD_HOE, 'item/wooden_hoe.png'], [BLOCK.TOOL_STONE_HOE, 'item/stone_hoe.png'],
  [BLOCK.TOOL_GOLD_HOE, 'item/golden_hoe.png'], [BLOCK.TOOL_IRON_HOE, 'item/iron_hoe.png'], [BLOCK.TOOL_NETHERITE_HOE, 'item/netherite_hoe.png'],
  [BLOCK.ARMOR_LEATHER_HELMET, 'item/leather_helmet.png'], [BLOCK.ARMOR_LEATHER_CHESTPLATE, 'item/leather_chestplate.png'],
  [BLOCK.ARMOR_LEATHER_LEGGINGS, 'item/leather_leggings.png'], [BLOCK.ARMOR_LEATHER_BOOTS, 'item/leather_boots.png'],
  [BLOCK.ARMOR_CHAINMAIL_HELMET, 'item/chainmail_helmet.png'], [BLOCK.ARMOR_CHAINMAIL_CHESTPLATE, 'item/chainmail_chestplate.png'],
  [BLOCK.ARMOR_CHAINMAIL_LEGGINGS, 'item/chainmail_leggings.png'], [BLOCK.ARMOR_CHAINMAIL_BOOTS, 'item/chainmail_boots.png'],
  [BLOCK.ARMOR_GOLD_HELMET, 'item/golden_helmet.png'], [BLOCK.ARMOR_GOLD_CHESTPLATE, 'item/golden_chestplate.png'],
  [BLOCK.ARMOR_GOLD_LEGGINGS, 'item/golden_leggings.png'], [BLOCK.ARMOR_GOLD_BOOTS, 'item/golden_boots.png'],
  [BLOCK.ARMOR_NETHERITE_HELMET, 'item/netherite_helmet.png'], [BLOCK.ARMOR_NETHERITE_CHESTPLATE, 'item/netherite_chestplate.png'],
  [BLOCK.ARMOR_NETHERITE_LEGGINGS, 'item/netherite_leggings.png'], [BLOCK.ARMOR_NETHERITE_BOOTS, 'item/netherite_boots.png'],
  [BLOCK.ARMOR_TURTLE_HELMET, 'item/turtle_helmet.png'],
  [BLOCK.ITEM_COPPER_INGOT, 'item/copper_ingot.png'], [BLOCK.ITEM_LAPIS_LAZULI, 'item/lapis_lazuli.png'],
  [BLOCK.ITEM_REDSTONE, 'item/redstone.png'], [BLOCK.ITEM_QUARTZ, 'item/quartz.png'], [BLOCK.ITEM_NETHERITE_INGOT, 'item/netherite_ingot.png'],
  [BLOCK.TOOL_SHIELD, 'item/wolf_armor.png'], [BLOCK.TOOL_CROSSBOW, 'item/crossbow_standby.png'],
  [BLOCK.TOOL_TRIDENT, 'item/trident.png'], [BLOCK.TOOL_SPYGLASS, 'item/spyglass.png'],
  [BLOCK.ITEM_ELYTRA, 'item/elytra.png'], [BLOCK.ITEM_TOTEM_OF_UNDYING, 'item/totem_of_undying.png'],
  [BLOCK.ITEM_FIREWORK_ROCKET, 'item/firework_rocket.png'], [BLOCK.ITEM_SADDLE, 'item/saddle.png'],
  [BLOCK.ITEM_CHEST_MINECART, 'item/chest_minecart.png'], [BLOCK.ITEM_TNT_MINECART, 'item/tnt_minecart.png'], [BLOCK.ITEM_CHEST_BOAT, 'item/oak_chest_boat.png'],
  [BLOCK.ITEM_GLASS_BOTTLE, 'item/glass_bottle.png'], [BLOCK.ITEM_NETHER_WART, 'item/nether_wart.png'],
  [BLOCK.ITEM_BLAZE_POWDER, 'item/blaze_powder.png'], [BLOCK.ITEM_GHAST_TEAR, 'item/ghast_tear.png'],
  [BLOCK.ITEM_MAGMA_CREAM, 'item/magma_cream.png'], [BLOCK.ITEM_PHANTOM_MEMBRANE, 'item/phantom_membrane.png'],
  [BLOCK.ITEM_PUFFERFISH, 'item/pufferfish.png'], [BLOCK.ITEM_SPIDER_EYE, 'item/spider_eye.png'], [BLOCK.ITEM_SUGAR, 'item/sugar.png'],
  [BLOCK.ITEM_POTION_SPEED, 'item/potion.png'], [BLOCK.ITEM_POTION_STRENGTH, 'item/splash_potion.png'],
  [BLOCK.ITEM_POTION_REGEN, 'item/lingering_potion.png'], [BLOCK.ITEM_POTION_FIRE_RES, 'item/dragon_breath.png'],
  [BLOCK.ITEM_POTION_NIGHT_VISION, 'item/honey_bottle.png'], [BLOCK.ITEM_POTION_SLOW_FALLING, 'item/experience_bottle.png'],
  [BLOCK.ITEM_POTION_WATER_BREATHING, 'item/ominous_bottle.png'], [BLOCK.ITEM_POTION_POISON, 'item/turtle_scute.png'],
  [BLOCK.ITEM_PAINTING, 'item/painting.png']
];
