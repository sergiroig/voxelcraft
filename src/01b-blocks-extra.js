// VoxelCraft HTML5 — 01b-blocks-extra.js (PHASES 2, 3, 4, 6, 8 & 10: 126 EXTRA BLOCKS 65..190 & TILES 82..250)
'use strict';

// ============================================================================
// EXTRA BLOCK IDS (65..190, stored in Uint8Array(16384) with 0 extra RAM)
// ============================================================================
Object.assign(BLOCK, {
  // Fase 2: 7 Familias de Madera (Abeto, Abedul, Jungla, Acacia, Roble Oscuro, Manglar, Cerezo)
  SPRUCE_LOG: 65, SPRUCE_PLANKS: 66, SPRUCE_LEAVES: 67, SPRUCE_SAPLING: 68,
  BIRCH_LOG: 69, BIRCH_PLANKS: 70, BIRCH_LEAVES: 71, BIRCH_SAPLING: 72,
  JUNGLE_LOG: 73, JUNGLE_PLANKS: 74, JUNGLE_LEAVES: 75, JUNGLE_SAPLING: 76,
  ACACIA_LOG: 77, ACACIA_PLANKS: 78, ACACIA_LEAVES: 79, ACACIA_SAPLING: 80,
  DARK_OAK_LOG: 81, DARK_OAK_PLANKS: 82, DARK_OAK_LEAVES: 83, DARK_OAK_SAPLING: 84,
  MANGROVE_LOG: 85, MANGROVE_PLANKS: 86, MANGROVE_LEAVES: 87, MANGROVE_PROPAGULE: 88,
  CHERRY_LOG: 89, CHERRY_PLANKS: 90, CHERRY_LEAVES: 91, CHERRY_SAPLING: 92,

  // Fase 3: Pizarra Profunda (Deepslate), Nuevos Minerales, Piedras Regionales y Bloques de Trabajo
  DEEPSLATE: 93, COBBLED_DEEPSLATE: 94, DEEPSLATE_BRICKS: 95,
  COPPER_ORE: 96, COPPER_BLOCK: 97, LAPIS_ORE: 98, LAPIS_BLOCK: 99,
  REDSTONE_ORE: 100, EMERALD_ORE: 101, NETHER_QUARTZ_ORE: 102, QUARTZ_BLOCK: 103,
  ANCIENT_DEBRIS: 104, NETHERITE_BLOCK: 105,
  SANDSTONE: 106, CHISELED_SANDSTONE: 107, CUT_SANDSTONE: 108,
  RED_SAND: 109, TERRACOTTA: 110, RED_TERRACOTTA: 111, ORANGE_TERRACOTTA: 112, YELLOW_TERRACOTTA: 113, WHITE_TERRACOTTA: 114,
  STONE_BRICKS: 115, MOSSY_STONE_BRICKS: 116, CRACKED_STONE_BRICKS: 117, CHISELED_STONE_BRICKS: 118, MOSSY_COBBLESTONE: 119,
  PRISMARINE: 120, PRISMARINE_BRICKS: 121, DARK_PRISMARINE: 122,
  LANTERN: 123, SOUL_LANTERN: 124, SEA_LANTERN: 125, CAMPFIRE: 126,
  HAY_BLOCK: 127, BARREL: 128, JUKEBOX: 129, NOTE_BLOCK: 130,
  STONECUTTER: 131, LOOM: 132, SMITHING_TABLE: 133, CARTOGRAPHY_TABLE: 134,

  // Fase 4: Agricultura Ampliada, Cultivos, Flores, Helechos, Lianas y Setas
  CARROTS: 135, POTATOES: 136, BEETROOTS: 137,
  PUMPKIN: 138, CARVED_PUMPKIN: 139, JACK_O_LANTERN: 140, MELON: 141,
  SUGAR_CANE: 142, BAMBOO: 143, COCOA: 144, SWEET_BERRY_BUSH: 145,
  BLUE_ORCHID: 146, ALLIUM: 147, AZURE_BLUET: 148, RED_TULIP: 149, ORANGE_TULIP: 150, WHITE_TULIP: 151, PINK_TULIP: 152,
  OXEYE_DAISY: 153, CORNFLOWER: 154, LILY_OF_THE_VALLEY: 155,
  FERN: 156, DEAD_BUSH: 157, VINE: 158, RED_MUSHROOM: 159, BROWN_MUSHROOM: 160,

  // Fase 6: Redstone Avanzado y Ferrocarril
  REDSTONE_DUST: 161, REDSTONE_TORCH: 162, REPEATER: 163, COMPARATOR: 164,
  OBSERVER: 165, STICKY_PISTON: 166, DISPENSER: 167, HOPPER: 168,
  TARGET: 169, POWERED_RAIL: 170, DETECTOR_RAIL: 171,

  // Fase 8: Alquimia
  BREWING_STAND: 172,

  // Fase 10: Bloques Dimensionales del Nether y del End
  SOUL_SAND: 173, SOUL_SOIL: 174, BASALT: 175, BLACKSTONE: 176, NETHER_GOLD_ORE: 177,
  CRIMSON_NYLIUM: 178, CRIMSON_STEM: 179, SHROOMLIGHT: 180,
  WARPED_NYLIUM: 181, WARPED_STEM: 182, NETHER_BRICKS: 183,
  END_STONE_BRICKS: 184, CHORUS_PLANT: 185, CHORUS_FLOWER: 186,
  PURPUR_BLOCK: 187, PURPUR_PILLAR: 188, END_ROD: 189, END_PORTAL_FRAME: 190
});

// Extra tile files 82..250 (169 tiles -> ATLAS_COLS = 251)
const MC_EXTRA_BLOCK_TILE_FILES = [
  // 82..116: Fase 2 Wood Families (Spruce, Birch, Jungle, Acacia, Dark Oak, Mangrove, Cherry)
  'block/spruce_log.png', 'block/spruce_log_top.png', 'block/spruce_planks.png', 'block/spruce_leaves.png', 'block/spruce_sapling.png',
  'block/birch_log.png', 'block/birch_log_top.png', 'block/birch_planks.png', 'block/birch_leaves.png', 'block/birch_sapling.png',
  'block/jungle_log.png', 'block/jungle_log_top.png', 'block/jungle_planks.png', 'block/jungle_leaves.png', 'block/jungle_sapling.png',
  'block/acacia_log.png', 'block/acacia_log_top.png', 'block/acacia_planks.png', 'block/acacia_leaves.png', 'block/acacia_sapling.png',
  'block/dark_oak_log.png', 'block/dark_oak_log_top.png', 'block/dark_oak_planks.png', 'block/dark_oak_leaves.png', 'block/dark_oak_sapling.png',
  'block/mangrove_log.png', 'block/mangrove_log_top.png', 'block/mangrove_planks.png', 'block/mangrove_leaves.png', 'block/mangrove_propagule.png',
  'block/cherry_log.png', 'block/cherry_log_top.png', 'block/cherry_planks.png', 'block/cherry_leaves.png', 'block/cherry_sapling.png',
  // 117..133: Fase 3 Deepslate & Ores
  'block/deepslate.png', 'block/deepslate_top.png', 'block/cobbled_deepslate.png', 'block/deepslate_bricks.png',
  'block/copper_ore.png', 'block/copper_block.png', 'block/lapis_ore.png', 'block/lapis_block.png',
  'block/redstone_ore.png', 'block/emerald_ore.png', 'block/nether_quartz_ore.png',
  'block/quartz_block_top.png', 'block/quartz_block_bottom.png', 'block/quartz_block_side.png',
  'block/ancient_debris_top.png', 'block/ancient_debris_side.png', 'block/netherite_block.png',
  // 134..152: Fase 3 Regional Stones
  'block/sandstone_top.png', 'block/sandstone_bottom.png', 'block/sandstone.png', 'block/chiseled_sandstone.png', 'block/cut_sandstone.png',
  'block/red_sand.png', 'block/terracotta.png', 'block/red_terracotta.png', 'block/orange_terracotta.png', 'block/yellow_terracotta.png', 'block/white_terracotta.png',
  'block/stone_bricks.png', 'block/mossy_stone_bricks.png', 'block/cracked_stone_bricks.png', 'block/chiseled_stone_bricks.png', 'block/mossy_cobblestone.png',
  'block/prismarine.png', 'block/prismarine_bricks.png', 'block/dark_prismarine.png',
  // 153..178: Fase 3 Functional & Utility Blocks
  'block/lantern.png', 'block/soul_lantern.png', 'block/sea_lantern.png', 'block/campfire_log_lit.png',
  'block/hay_block_top.png', 'block/hay_block_side.png',
  'block/barrel_top.png', 'block/barrel_bottom.png', 'block/barrel_side.png',
  'block/jukebox_top.png', 'block/jukebox_side.png', 'block/note_block.png',
  'block/stonecutter_top.png', 'block/stonecutter_bottom.png', 'block/stonecutter_side.png',
  'block/loom_top.png', 'block/loom_bottom.png', 'block/loom_front.png', 'block/loom_side.png',
  'block/smithing_table_top.png', 'block/smithing_table_bottom.png', 'block/smithing_table_front.png', 'block/smithing_table_side.png',
  'block/cartography_table_top.png', 'block/cartography_table_side1.png', 'block/cartography_table_side3.png',
  // 179..206: Fase 4 Agriculture, Crops & Flora
  'block/carrots_stage3.png', 'block/potatoes_stage3.png', 'block/beetroots_stage3.png',
  'block/pumpkin_top.png', 'block/pumpkin_side.png', 'block/carved_pumpkin.png', 'block/jack_o_lantern.png',
  'block/melon_top.png', 'block/melon_side.png',
  'block/sugar_cane.png', 'block/bamboo_stalk.png', 'block/cocoa_stage2.png', 'block/sweet_berry_bush_stage3.png',
  'block/blue_orchid.png', 'block/allium.png', 'block/azure_bluet.png', 'block/red_tulip.png', 'block/orange_tulip.png', 'block/white_tulip.png', 'block/pink_tulip.png',
  'block/oxeye_daisy.png', 'block/cornflower.png', 'block/lily_of_the_valley.png',
  'block/fern.png', 'block/dead_bush.png', 'block/vine.png', 'block/red_mushroom.png', 'block/brown_mushroom.png',
  // 207..222: Fase 6 Redstone & Rails
  'block/redstone_dust_dot.png', 'block/redstone_torch.png', 'block/repeater_on.png', 'block/comparator_on.png',
  'block/observer_top.png', 'block/observer_front.png', 'block/observer_back.png', 'block/observer_side.png',
  'block/piston_top_sticky.png', 'block/dispenser_front.png', 'block/hopper_top.png', 'block/hopper_outside.png',
  'block/target_top.png', 'block/target_side.png', 'block/powered_rail_on.png', 'block/detector_rail.png',
  // 223..224: Fase 8 Brewing Stand
  'block/brewing_stand.png', 'block/brewing_stand_base.png',
  // 225..250: Fase 10 Nether & End Blocks
  'block/soul_sand.png', 'block/soul_soil.png', 'block/basalt_top.png', 'block/basalt_side.png',
  'block/blackstone_top.png', 'block/blackstone.png', 'block/nether_gold_ore.png',
  'block/crimson_nylium.png', 'block/crimson_nylium_side.png', 'block/crimson_stem_top.png', 'block/crimson_stem.png', 'block/shroomlight.png',
  'block/warped_nylium.png', 'block/warped_nylium_side.png', 'block/warped_stem_top.png', 'block/warped_stem.png', 'block/nether_bricks.png',
  'block/end_stone_bricks.png', 'block/chorus_plant.png', 'block/chorus_flower.png',
  'block/purpur_block.png', 'block/purpur_pillar_top.png', 'block/purpur_pillar_side.png',
  'block/end_rod.png', 'block/end_portal_frame_top.png', 'block/end_portal_frame_side.png'
];

ATLAS_COLS = 82 + MC_EXTRA_BLOCK_TILE_FILES.length; // 251 tiles (4016x16 px)

const addBDef = (id, name, solid, opaque, shape, light, hardness, stoneLike, color, tiles, extra = {}) => {
  BLOCK_DEFS[id] = { name, solid, opaque, shape, light, hardness, stoneLike, color, tiles, ...extra };
};
const u6 = (t) => [t, t, t, t, t, t];
const log6 = (top, side) => [top, top, side, side, side, side];
const tb6 = (top, bot, side) => [top, bot, side, side, side, side];

// Fase 2: 7 Familias de Madera
addBDef(BLOCK.SPRUCE_LOG,         'Tronco de Abeto',         true,  true,  'cube',  0, 0.65, false, 0x4a3520, log6(83, 82));
addBDef(BLOCK.SPRUCE_PLANKS,      'Tablones de Abeto',       true,  true,  'cube',  0, 0.60, false, 0x735535, u6(84));
addBDef(BLOCK.SPRUCE_LEAVES,      'Hojas de Abeto',          true,  true,  'cube',  0, 0.18, false, 0x2d5a36, u6(85));
addBDef(BLOCK.SPRUCE_SAPLING,     'Brote de Abeto',          false, false, 'cross', 0, 0.05, false, 0x2d5a36, u6(86));
addBDef(BLOCK.BIRCH_LOG,          'Tronco de Abedul',        true,  true,  'cube',  0, 0.65, false, 0xdcd7cd, log6(88, 87));
addBDef(BLOCK.BIRCH_PLANKS,       'Tablones de Abedul',      true,  true,  'cube',  0, 0.60, false, 0xc8b77a, u6(89));
addBDef(BLOCK.BIRCH_LEAVES,       'Hojas de Abedul',         true,  true,  'cube',  0, 0.18, false, 0x6ba844, u6(90));
addBDef(BLOCK.BIRCH_SAPLING,      'Brote de Abedul',         false, false, 'cross', 0, 0.05, false, 0x6ba844, u6(91));
addBDef(BLOCK.JUNGLE_LOG,         'Tronco de Jungla',        true,  true,  'cube',  0, 0.65, false, 0x574426, log6(93, 92));
addBDef(BLOCK.JUNGLE_PLANKS,      'Tablones de Jungla',      true,  true,  'cube',  0, 0.60, false, 0xa87654, u6(94));
addBDef(BLOCK.JUNGLE_LEAVES,      'Hojas de Jungla',         true,  true,  'cube',  0, 0.18, false, 0x30bb0b, u6(95));
addBDef(BLOCK.JUNGLE_SAPLING,     'Brote de Jungla',         false, false, 'cross', 0, 0.05, false, 0x30bb0b, u6(96));
addBDef(BLOCK.ACACIA_LOG,         'Tronco de Acacia',        true,  true,  'cube',  0, 0.65, false, 0x676157, log6(98, 97));
addBDef(BLOCK.ACACIA_PLANKS,      'Tablones de Acacia',      true,  true,  'cube',  0, 0.60, false, 0xba6337, u6(99));
addBDef(BLOCK.ACACIA_LEAVES,      'Hojas de Acacia',         true,  true,  'cube',  0, 0.18, false, 0x6d9927, u6(100));
addBDef(BLOCK.ACACIA_SAPLING,     'Brote de Acacia',         false, false, 'cross', 0, 0.05, false, 0x6d9927, u6(101));
addBDef(BLOCK.DARK_OAK_LOG,       'Tronco de Roble Oscuro',  true,  true,  'cube',  0, 0.65, false, 0x3c2e1a, log6(103, 102));
addBDef(BLOCK.DARK_OAK_PLANKS,    'Tablones de Roble Oscuro',true,  true,  'cube',  0, 0.60, false, 0x432b14, u6(104));
addBDef(BLOCK.DARK_OAK_LEAVES,    'Hojas de Roble Oscuro',   true,  true,  'cube',  0, 0.18, false, 0x2c6e1f, u6(105));
addBDef(BLOCK.DARK_OAK_SAPLING,   'Brote de Roble Oscuro',   false, false, 'cross', 0, 0.05, false, 0x2c6e1f, u6(106));
addBDef(BLOCK.MANGROVE_LOG,       'Tronco de Manglar',       true,  true,  'cube',  0, 0.65, false, 0x543a29, log6(108, 107));
addBDef(BLOCK.MANGROVE_PLANKS,    'Tablones de Manglar',     true,  true,  'cube',  0, 0.60, false, 0x773731, u6(109));
addBDef(BLOCK.MANGROVE_LEAVES,    'Hojas de Manglar',        true,  true,  'cube',  0, 0.18, false, 0x528828, u6(110));
addBDef(BLOCK.MANGROVE_PROPAGULE, 'Propágulo de Manglar',    false, false, 'cross', 0, 0.05, false, 0x528828, u6(111));
addBDef(BLOCK.CHERRY_LOG,         'Tronco de Cerezo',        true,  true,  'cube',  0, 0.65, false, 0x3b222c, log6(113, 112));
addBDef(BLOCK.CHERRY_PLANKS,      'Tablones de Cerezo',      true,  true,  'cube',  0, 0.60, false, 0xe4b5ae, u6(114));
addBDef(BLOCK.CHERRY_LEAVES,      'Hojas de Cerezo',         true,  true,  'cube',  0, 0.18, false, 0xf4b6c8, u6(115));
addBDef(BLOCK.CHERRY_SAPLING,     'Brote de Cerezo',         false, false, 'cross', 0, 0.05, false, 0xf4b6c8, u6(116));

// Fase 3: Pizarra Profunda, Minerales, Piedras Regionales y Bloques Funcionales
addBDef(BLOCK.DEEPSLATE,            'Pizarra Profunda',         true, true,  'cube',  0,  1.45, true,  0x4b4b52, log6(118, 117));
addBDef(BLOCK.COBBLED_DEEPSLATE,    'Pizarra Adoquinada',       true, true,  'cube',  0,  1.50, true,  0x44444a, u6(119));
addBDef(BLOCK.DEEPSLATE_BRICKS,     'Ladrillos de Pizarra',     true, true,  'cube',  0,  1.55, true,  0x3f3f45, u6(120));
addBDef(BLOCK.COPPER_ORE,           'Mena de Cobre',            true, true,  'cube',  0,  1.30, true,  0xc87351, u6(121));
addBDef(BLOCK.COPPER_BLOCK,         'Bloque de Cobre',          true, true,  'cube',  0,  1.45, true,  0xc26b4c, u6(122));
addBDef(BLOCK.LAPIS_ORE,            'Mena de Lapislázuli',      true, true,  'cube',  0,  1.35, true,  0x26489c, u6(123));
addBDef(BLOCK.LAPIS_BLOCK,          'Bloque de Lapislázuli',    true, true,  'cube',  0,  1.45, true,  0x1e4096, u6(124));
addBDef(BLOCK.REDSTONE_ORE,         'Mena de Redstone',         true, true,  'cube',  4,  1.40, true,  0x9c1b1b, u6(125));
addBDef(BLOCK.EMERALD_ORE,          'Mena de Esmeralda',        true, true,  'cube',  0,  1.60, true,  0x17b964, u6(126));
addBDef(BLOCK.NETHER_QUARTZ_ORE,    'Mena de Cuarzo del Nether',true, true,  'cube',  0,  1.30, true,  0xb8968a, u6(127));
addBDef(BLOCK.QUARTZ_BLOCK,         'Bloque de Cuarzo',         true, true,  'cube',  0,  1.25, true,  0xede8e1, tb6(128, 129, 130));
addBDef(BLOCK.ANCIENT_DEBRIS,       'Escombros Ancestrales',    true, true,  'cube',  0,  2.40, true,  0x654b43, log6(131, 132));
addBDef(BLOCK.NETHERITE_BLOCK,      'Bloque de Netherita',      true, true,  'cube',  0,  2.50, true,  0x423d40, u6(133));
addBDef(BLOCK.SANDSTONE,            'Arenisca',                 true, true,  'cube',  0,  0.90, true,  0xd9cf9c, tb6(134, 135, 136));
addBDef(BLOCK.CHISELED_SANDSTONE,   'Arenisca Cincelada',       true, true,  'cube',  0,  0.90, true,  0xd9cf9c, tb6(134, 135, 137));
addBDef(BLOCK.CUT_SANDSTONE,        'Arenisca Cortada',         true, true,  'cube',  0,  0.90, true,  0xd9cf9c, tb6(134, 135, 138));
addBDef(BLOCK.RED_SAND,             'Arena Roja',               true, true,  'cube',  0,  0.35, false, 0xbf6721, u6(139));
addBDef(BLOCK.TERRACOTTA,           'Terracota',                true, true,  'cube',  0,  1.10, true,  0x985e43, u6(140));
addBDef(BLOCK.RED_TERRACOTTA,       'Terracota Roja',           true, true,  'cube',  0,  1.10, true,  0x8f3d2e, u6(141));
addBDef(BLOCK.ORANGE_TERRACOTTA,    'Terracota Naranja',        true, true,  'cube',  0,  1.10, true,  0xa15325, u6(142));
addBDef(BLOCK.YELLOW_TERRACOTTA,    'Terracota Amarilla',       true, true,  'cube',  0,  1.10, true,  0xba8523, u6(143));
addBDef(BLOCK.WHITE_TERRACOTTA,     'Terracota Blanca',         true, true,  'cube',  0,  1.10, true,  0xd1b2a1, u6(144));
addBDef(BLOCK.STONE_BRICKS,         'Ladrillos de Piedra',      true, true,  'cube',  0,  1.20, true,  0x7a7a7a, u6(145));
addBDef(BLOCK.MOSSY_STONE_BRICKS,   'Ladrillos Musgosos',       true, true,  'cube',  0,  1.20, true,  0x6b7862, u6(146));
addBDef(BLOCK.CRACKED_STONE_BRICKS, 'Ladrillos Agrietados',     true, true,  'cube',  0,  1.20, true,  0x747474, u6(147));
addBDef(BLOCK.CHISELED_STONE_BRICKS,'Ladrillos Cincelados',     true, true,  'cube',  0,  1.20, true,  0x787878, u6(148));
addBDef(BLOCK.MOSSY_COBBLESTONE,    'Adoquín Musgoso',          true, true,  'cube',  0,  1.15, true,  0x647658, u6(149));
addBDef(BLOCK.PRISMARINE,           'Prismarina',               true, true,  'cube',  0,  1.25, true,  0x639c97, u6(150));
addBDef(BLOCK.PRISMARINE_BRICKS,    'Ladrillos de Prismarina',  true, true,  'cube',  0,  1.30, true,  0x63ab9e, u6(151));
addBDef(BLOCK.DARK_PRISMARINE,      'Prismarina Oscura',        true, true,  'cube',  0,  1.35, true,  0x335b4b, u6(152));
addBDef(BLOCK.LANTERN,              'Farolillo Luminoso',       false,false, 'cross', 15, 0.25, true,  0xf59e0b, u6(153));
addBDef(BLOCK.SOUL_LANTERN,         'Farolillo de Almas',       false,false, 'cross', 12, 0.25, true,  0x38bdf8, u6(154));
addBDef(BLOCK.SEA_LANTERN,          'Linterna Marina',          true, true,  'cube',  15, 0.40, false, 0xbae6fd, u6(155));
addBDef(BLOCK.CAMPFIRE,             'Hoguera de Campamento',    true, false, 'cube',  15, 0.50, false, 0xf97316, u6(156));
addBDef(BLOCK.HAY_BLOCK,            'Bala de Heno',             true, true,  'cube',  0,  0.40, false, 0xd4a928, log6(157, 158));
addBDef(BLOCK.BARREL,               'Barril de Almacenaje',     true, true,  'cube',  0,  0.65, false, 0x87643b, tb6(159, 160, 161));
addBDef(BLOCK.JUKEBOX,              'Tocadiscos Musical',       true, true,  'cube',  0,  0.80, false, 0x65432c, log6(162, 163));
addBDef(BLOCK.NOTE_BLOCK,           'Bloque Musical',           true, true,  'cube',  0,  0.65, false, 0x6f4930, u6(164));
addBDef(BLOCK.STONECUTTER,          'Cortapiedras',             true, true,  'cube',  0,  1.15, true,  0x7a7a7a, tb6(165, 166, 167));
addBDef(BLOCK.LOOM,                 'Telar de Estandartes',     true, true,  'cube',  0,  0.65, false, 0x99774d, [168, 169, 170, 171, 171, 171]);
addBDef(BLOCK.SMITHING_TABLE,       'Mesa de Herrería',         true, true,  'cube',  0,  0.85, false, 0x3b3d4a, [172, 173, 174, 175, 175, 175]);
addBDef(BLOCK.CARTOGRAPHY_TABLE,    'Mesa de Cartografía',      true, true,  'cube',  0,  0.65, false, 0x6b4c2b, [176, 104, 177, 178, 177, 178]);

// Fase 4: Cultivos, Flores, Helechos, Lianas y Setas
addBDef(BLOCK.CARROTS,              'Cultivo de Zanahorias',    false,false, 'cross', 0,  0.04, false, 0xf97316, u6(179));
addBDef(BLOCK.POTATOES,             'Cultivo de Patatas',       false,false, 'cross', 0,  0.04, false, 0xeab308, u6(180));
addBDef(BLOCK.BEETROOTS,            'Cultivo de Remolachas',    false,false, 'cross', 0,  0.04, false, 0xbe123c, u6(181));
addBDef(BLOCK.PUMPKIN,              'Calabaza',                 true, true,  'cube',  0,  0.55, false, 0xd97706, log6(182, 183));
addBDef(BLOCK.CARVED_PUMPKIN,       'Calabaza Tallada',         true, true,  'cube',  0,  0.55, false, 0xd97706, [182, 182, 184, 183, 183, 183]);
addBDef(BLOCK.JACK_O_LANTERN,       'Calabaza Luminosa',        true, true,  'cube',  15, 0.55, false, 0xf59e0b, [182, 182, 185, 183, 183, 183]);
addBDef(BLOCK.MELON,                'Sandía',                   true, true,  'cube',  0,  0.55, false, 0x65a30d, log6(186, 187));
addBDef(BLOCK.SUGAR_CANE,           'Caña de Azúcar',           false,false, 'cross', 0,  0.05, false, 0x84cc16, u6(188));
addBDef(BLOCK.BAMBOO,               'Bambú de Jungla',          true, false, 'cube',  0,  0.30, false, 0x65a30d, u6(189));
addBDef(BLOCK.COCOA,                'Vaina de Cacao',           false,false, 'cross', 0,  0.15, false, 0xb45309, u6(190));
addBDef(BLOCK.SWEET_BERRY_BUSH,     'Arbusto de Bayas Dulces',  false,false, 'cross', 0,  0.05, false, 0xdc2626, u6(191));
addBDef(BLOCK.BLUE_ORCHID,          'Orquídea Azul',            false,false, 'cross', 0,  0.04, false, 0x38bdf8, u6(192));
addBDef(BLOCK.ALLIUM,               'Allium Violeta',           false,false, 'cross', 0,  0.04, false, 0xc084fc, u6(193));
addBDef(BLOCK.AZURE_BLUET,          'iano Azul',                false,false, 'cross', 0,  0.04, false, 0xe2e8f0, u6(194));
addBDef(BLOCK.RED_TULIP,            'Tulipán Rojo',             false,false, 'cross', 0,  0.04, false, 0xef4444, u6(195));
addBDef(BLOCK.ORANGE_TULIP,         'Tulipán Naranja',          false,false, 'cross', 0,  0.04, false, 0xf97316, u6(196));
addBDef(BLOCK.WHITE_TULIP,          'Tulipán Blanco',           false,false, 'cross', 0,  0.04, false, 0xf8fafc, u6(197));
addBDef(BLOCK.PINK_TULIP,           'Tulipán Rosa',             false,false, 'cross', 0,  0.04, false, 0xf472b6, u6(198));
addBDef(BLOCK.OXEYE_DAISY,          'Margarita',                false,false, 'cross', 0,  0.04, false, 0xfef08a, u6(199));
addBDef(BLOCK.CORNFLOWER,           'Aciano Azul',              false,false, 'cross', 0,  0.04, false, 0x3b82f6, u6(200));
addBDef(BLOCK.LILY_OF_THE_VALLEY,   'Lirio del Valle',          false,false, 'cross', 0,  0.04, false, 0xffffff, u6(201));
addBDef(BLOCK.FERN,                 'Helecho Silvestre',        false,false, 'cross', 0,  0.04, false, 0x4d7c0f, u6(202));
addBDef(BLOCK.DEAD_BUSH,            'Arbusto Seco',             false,false, 'cross', 0,  0.04, false, 0x92400e, u6(203));
addBDef(BLOCK.VINE,                 'Lianas Trepables',         false,false, 'cross', 0,  0.12, false, 0x3f6212, u6(204), { climbable: true });
addBDef(BLOCK.RED_MUSHROOM,         'Seta Roja',                false,false, 'cross', 0,  0.04, false, 0xdc2626, u6(205));
addBDef(BLOCK.BROWN_MUSHROOM,       'Seta Marrón',              false,false, 'cross', 0,  0.04, false, 0x92400e, u6(206));

// Fase 6: Redstone Avanzado y Raíles
addBDef(BLOCK.REDSTONE_DUST,        'Polvo de Redstone (Cable)',false,false, 'cross', 4,  0.05, false, 0xdc2626, u6(207));
addBDef(BLOCK.REDSTONE_TORCH,       'Antorcha de Redstone',     false,false, 'cross', 9,  0.05, false, 0xef4444, u6(208));
addBDef(BLOCK.REPEATER,             'Repetidor Redstone',       true, false, 'cube',  5,  0.20, true,  0x94a3b8, tb6(209, 3, 3));
addBDef(BLOCK.COMPARATOR,           'Comparador Redstone',      true, false, 'cube',  5,  0.20, true,  0x94a3b8, tb6(210, 3, 3));
addBDef(BLOCK.OBSERVER,             'Observador Redstone',      true, true,  'cube',  0,  0.90, true,  0x64748b, [211, 211, 212, 213, 214, 214]);
addBDef(BLOCK.STICKY_PISTON,        'Pistón Pegajoso Redstone', true, true,  'cube',  0,  0.85, true,  0x84cc16, [215, 79, 48, 48, 48, 48]);
addBDef(BLOCK.DISPENSER,            'Dispensador Automático',   true, true,  'cube',  0,  1.10, true,  0x64748b, [53, 53, 216, 77, 77, 77]);
addBDef(BLOCK.HOPPER,               'Tolva de Transferencia',   true, false, 'cube',  0,  1.10, true,  0x475569, tb6(217, 218, 218));
addBDef(BLOCK.TARGET,               'Bloque Diana (Redstone)',  true, true,  'cube',  0,  0.50, false, 0xfca5a5, log6(219, 220));
addBDef(BLOCK.POWERED_RAIL,         'Raíl Propulsor (Turbo)',   false,false, 'cross', 7,  0.25, true,  0xfacc15, u6(221));
addBDef(BLOCK.DETECTOR_RAIL,        'Raíl Detector Redstone',   false,false, 'cross', 0,  0.25, true,  0xef4444, u6(222));

// Fase 8: Alquimia
addBDef(BLOCK.BREWING_STAND,        'Soporte de Pociones',      true, false, 'cube',  7,  0.65, true,  0xf59e0b, tb6(223, 224, 223));

// Fase 10: Nether y End
addBDef(BLOCK.SOUL_SAND,            'Arena de Almas',           true, true,  'cube',  0,  0.40, false, 0x524035, u6(225));
addBDef(BLOCK.SOUL_SOIL,            'Tierra de Almas',          true, true,  'cube',  0,  0.40, false, 0x4b3a30, u6(226));
addBDef(BLOCK.BASALT,               'Basalto Volcánico',        true, true,  'cube',  0,  1.05, true,  0x4f4b4f, log6(227, 228));
addBDef(BLOCK.BLACKSTONE,           'Piedra Negra',             true, true,  'cube',  0,  1.15, true,  0x2a242a, log6(229, 230));
addBDef(BLOCK.NETHER_GOLD_ORE,      'Mena de Oro del Nether',   true, true,  'cube',  0,  1.25, true,  0xd99b26, u6(231));
addBDef(BLOCK.CRIMSON_NYLIUM,       'Nilio Carmesí',            true, true,  'cube',  0,  0.55, true,  0x831f1f, tb6(232, 69, 233));
addBDef(BLOCK.CRIMSON_STEM,         'Tallo Carmesí',            true, true,  'cube',  0,  0.65, false, 0x6b213c, log6(234, 235));
addBDef(BLOCK.SHROOMLIGHT,          'Brillohongo',              true, true,  'cube',  15, 0.45, false, 0xf97316, u6(236));
addBDef(BLOCK.WARPED_NYLIUM,        'Nilio Distorsionado',      true, true,  'cube',  0,  0.55, true,  0x167e76, tb6(237, 69, 238));
addBDef(BLOCK.WARPED_STEM,          'Tallo Distorsionado',      true, true,  'cube',  0,  0.65, false, 0x286f68, log6(239, 240));
addBDef(BLOCK.NETHER_BRICKS,        'Ladrillos del Nether',     true, true,  'cube',  0,  1.30, true,  0x2c161a, u6(241));
addBDef(BLOCK.END_STONE_BRICKS,     'Ladrillos del End',        true, true,  'cube',  0,  1.45, true,  0xdbe2a3, u6(242));
addBDef(BLOCK.CHORUS_PLANT,         'Planta de Chorus',         true, false, 'cube',  0,  0.40, false, 0x5b3b5b, u6(243));
addBDef(BLOCK.CHORUS_FLOWER,        'Flor de Chorus',           true, false, 'cube',  4,  0.40, false, 0x9b799b, u6(244));
addBDef(BLOCK.PURPUR_BLOCK,         'Bloque de Púrpura',        true, true,  'cube',  0,  1.35, true,  0xa97da9, u6(245));
addBDef(BLOCK.PURPUR_PILLAR,        'Pilar de Púrpura',         true, true,  'cube',  0,  1.35, true,  0xab80ab, log6(246, 247));
addBDef(BLOCK.END_ROD,              'Vara del End (Luz)',       false,false, 'cross', 14, 0.15, false, 0xf8fafc, u6(248));
addBDef(BLOCK.END_PORTAL_FRAME,     'Marco del Portal del End', true, true,  'cube',  5,  999,  true,  0x3b6e5c, tb6(249, 70, 250));

// Wrap createProceduralAtlas so tiles 82..250 have instant procedural pixel-art fallbacks at t=0
const _origCreateProceduralAtlas = createProceduralAtlas;
createProceduralAtlas = function() {
  const res = _origCreateProceduralAtlas();
  const ctx = res.canvas.getContext('2d');
  for (let t = 82; t < ATLAS_COLS; t++) {
    const ox = t * TILE_PX;
    const h1 = (t * 47) & 255, h2 = (t * 97) & 255, h3 = (t * 151) & 255;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const v = ((x * 5 + y * 9 + t * 3) & 15) - 8;
        ctx.fillStyle = `rgb(${Math.max(20, Math.min(240, h1 + v * 3))},${Math.max(20, Math.min(240, h2 + v * 3))},${Math.max(20, Math.min(240, h3 + v * 3))})`;
        ctx.fillRect(ox + x, y, 1, 1);
      }
    }
  }
  res.texture.needsUpdate = true;
  return res;
};
