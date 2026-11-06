# PLAN.md — Hoja de Ruta para Incorporar Todo `mc-reference/` en VoxelCraft HTML5

Este documento define el plan técnico, de arquitectura y de fases para incorporar progresivamente la totalidad de bloques, criaturas, ítems, texturas de entorno, interfaz (GUI), partículas, cuadros y efectos de estado disponibles en [`mc-reference/assets/minecraft/textures/`](mc-reference/assets/minecraft/textures/) (`4,225` archivos `.png` oficiales del **Minecraft Default Pack**, ignorados en Git mediante [`.gitignore`](.gitignore) y descargables localmente en cada PC según la **Regla 7** de [`AGENTS.md`](AGENTS.md)), manteniendo **60 FPS constantes**, **coste 0 de Garbage Collector (Zero-GC)**, archivos **`< 800` líneas** y el **contrato de igualdad píxel a píxel (`maxDiff === 0`) en [`test.html`](test.html) (`Suite 52` y `Suite 53`)**.

---

## 1. Inventario Actual de `mc-reference/` vs Uso Actual en el Motor

| Categoría en `mc-reference/assets/minecraft/textures/` | Archivos `.png` Disponibles | En Uso Actualmente | Pendientes de Incorporar |
| :--- | ---: | ---: | :--- |
| **`block/`** *(Caras de bloques y vegetación)* | `1,322` | `82` tiles (`64` bloques) | Variantes de madera, minerales profundos, cultivos, flores, piedras decorativas, bloques de trabajo y grietas `destroy_stage_0..9` |
| **`item/`** *(Herramientas, armas, armaduras, comida, materiales)* | `836` | `52` ítems (`100..151`) | Sets completos por material (Madera/Piedra/Hierro/Oro/Diamante/Netherita), tridente, ballesta, escudo, catalejo, pociones, tintes y comidas |
| **`entity/`** *(Criaturas, vehículos, cofres, proyectiles)* | `746` | `15` texturas (`12` mobs + cofre) | Aldeanos, caballos, zorros, osos polares, pandas, loros, ranas, ajolotes, abejas, peces, brujas, saqueadores, blazes, ghasts, warden y jefes |
| **`gui/`** *(HUD de corazones/hambre/oxígeno y modales)* | `569` | `0` *(actualmente CSS/SVG)* | Corazones (`heart/`), muslitos (`food_*.png`), burbujas (`air.png`), armadura (`armor_*.png`), hotbar (`hotbar.png`), mirilla (`crosshair.png`) y contenedores |
| **`particle/`** *(Partículas atmosféricas y de combate)* | `306` | `0` *(cubos de color)* | Llamas (`flame.png`), humo (`smoke_*.png`), corazones (`heart.png`), críticos (`crit.png`), burbujas (`bubble.png`), explosiones (`explosion_*.png`), notas y portales |
| **`painting/`** *(Cuadros decorativos de pared)* | `52` | `0` | 26 cuadros clásicos pixel-art ($1\times1$, $2\times1$, $2\times2$, $4\times3$) + reverso `back.png` |
| **`map/`** *(Pergamino e iconos cartográficos)* | `42` | `0` *(dibujo Canvas)* | `map_background.png` + marcadores oficiales de jugador, aldeas, templos, minas y banderas (`map/decorations/*.png`) |
| **`mob_effect/`** *(Iconos de pociones y estados)* | `41` | `0` | 41 iconos de efectos (*Velocidad, Fuerza, Regeneración, Resistencia al Fuego, Visión Nocturna, Caída Lenta, Veneno, etc.*) |
| **`trims/` + `palettes/`** *(Adornos de herrería en armaduras)* | `57` | `0` | Plantillas de herrería para personalizar armaduras en la Mesa de Herrería |
| **`environment/`** *(Sol, fases lunares, lluvia, nieve, cielo End)* | `14` | `0` *(geometría/color)* | `celestial/sun.png`, las 8 fases lunares (`celestial/moon/*.png`), `rain.png`, `snow.png`, `clouds.png` y `end_sky.png` |
| **`misc/`** *(Overlays de cámara y encantamientos)* | `13` | `0` | `enchanted_glint_item.png`, `underwater.png`, `spyglass_scope.png`, `pumpkinblur.png`, `vignette.png` |
| **`colormap/`** *(Mapas térmicos/hídricos de bioma)* | `3` | `0` *(tinte fijo)* | `grass.png`, `foliage.png` y `dry_foliage.png` para teñir césped y hojas según temperatura y humedad de cada bioma |
| **TOTAL** | **`4,225` PNGs** | **`~149` PNGs** | **`~4,076` PNGs listos localmente en el repositorio** |

---

## 2. Arquitectura para Escalar sin Aumentar el Consumo de Recursos

Para multiplicar por $4\times$ el número de bloques, ítems y criaturas manteniendo el mismo consumo de memoria RAM, VRAM y CPU (`~0.20 ms/frame`):

### 2.1. Separación de IDs de Bloques (`1..255`) e IDs de Ítems (`>= 256`)
- **Estado actual:** Los bloques usan los IDs `1..64` y los ítems usan `100..151` dentro del mismo espacio `0..255`.
- **Mejora clave:**
  - Los chunks almacenan sus vóxeles en `Uint8Array(16384)` (`0..255`). Los ítems (`TOOL_*`, `ITEM_*`, `ARMOR_*`) **nunca se colocan como vóxel en `chunk.data`**, solo viven en el inventario, cofres y drops.
  - Reservando el rango **`1..255` exclusivamente para bloques colocables** y trasladando todos los ítems al rango **`256..1024`** (`isItem(id) => id >= 256`), ganamos capacidad para **255 bloques 3D distintos** y **cientos de ítems** **sin cambiar `Uint8Array(16384)` a `Uint16Array` (0 bytes extra de RAM por chunk)**.

### 2.2. Atlas de Bloques 2D Multipágina (`256×256 px` o `512×256 px`)
- **Estado actual:** `atlasCanvas` es una tira horizontal 1D de `82 × 16 = 1312×16 px`.
- **Mejora clave:**
  - Reorganizar `atlasCanvas` como una cuadrícula 2D de **`16 columnas × 16 filas` (`256×256 px` = `256` tiles de `16×16`)** o **`32 × 16` (`512×256 px` = `512` tiles)**.
  - Un atlas de `512×256 px` ocupa tan solo **`512 KB` de VRAM**, es compatible con el 100% de GPUs móviles y permite renderizar **hasta 512 caras de bloques distintas en el mismo único Draw Call por chunk**.

### 2.3. Atlas de Criaturas Ampliado (`mobAtlasCanvas` 2D) y Carga Bajo Demanda de Entidades
- Ampliar `mobAtlasCanvas` a una cuadrícula 2D de **`16 × 16` tiles de `8×8 px` (`128×128 px` = `256` tiles, `64 KB` de VRAM)** para alojar más de 40 especies de criaturas en una sola textura compartida.

### 2.4. Organización Modular (`< 800` líneas por archivo, Regla 1 de `AGENTS.md`)
- Conforme se incorporen nuevas fases, se dividirán responsabilidades en módulos ligeros adicionales cargados en [`index.html`](index.html):
  - `src/01b-blocks-extra.js`: Definiciones de bloques `65..255` y mapeo `MC_BLOCK_TILE_FILES`.
  - `src/01c-items-recipes.js`: Definiciones de ítems `>= 256`, `MC_ITEM_SPRITE_FILES` y recetas de crafteo/horno/alquimia.
  - `src/06b-mobs-villagers.js`: Nuevas criaturas pasivas/hostiles, comercio con Aldeanos y jefes.
  - `src/07c-potions-paintings.js`: Sistema de pociones (`mob_effect/`), cuadros decorativos (`painting/`) y partículas (`particle/`).

---

## 3. Plan de Implementación por Fases

### Fase 1: Texturas Oficiales en Sistemas Ya Existentes (Entorno, Grietas, HUD, Mapa y Colormaps)
> **Objetivo:** Sustituir todos los gráficos que hoy siguen siendo procedurales o CSS en funcionalidades que **ya existen** en el juego por sus `.png` oficiales de `mc-reference/`, sin añadir complejidad lógica.

1. **Grietas de Rotura Oficiales (`block/destroy_stage_0.png .. destroy_stage_7.png`):**
   - Volcar directamente `destroy_stage_0..7.png` desde `mc-reference/assets/minecraft/textures/block/` sobre las 8 texturas de `crackTextures[]`.
2. **Astros y Clima (`environment/**`):**
   - Texturizar el Sol con `environment/celestial/sun.png` y la Luna con las **8 fases lunares reales** (`full_moon.png`, `waning_gibbous.png`, `third_quarter.png`, `waning_crescent.png`, `new_moon.png`, `waxing_crescent.png`, `first_quarter.png`, `waxing_gibbous.png`) rotando cada noche del ciclo solar.
   - Texturizar las partículas de lluvia y nieve con `environment/rain.png` y `environment/snow.png`.
3. **HUD Oficial de Supervivencia y Mirilla (`gui/sprites/hud/**`):**
   - Renderizar en `#hearts-row`, `#hunger-row`, `#air-row` y armadura los sprites oficiales `heart/container.png`, `heart/full.png`, `heart/half.png`, `food_empty.png`, `food_full.png`, `food_half.png`, `air.png`, `air_bursting.png`, `armor_empty.png`, `armor_full.png`, `hotbar.png`, `hotbar_selection.png` y `crosshair.png`.
4. **Mapa Cartográfico y Overlays de Cámara (`map/**` + `misc/**`):**
   - Usar `map/map_background.png` como fondo del Mapa Cartográfico (`BLOCK.ITEM_MAP`) y `map/decorations/player.png`, `plains_village.png`, `desert_pyramid.png`, `jungle_temple.png`, `mineshaft.png` y `target_x.png` para los iconos de estructuras y balizas GPS.
   - Aplicar `misc/spyglass_scope.png` al activar el Zoom Catalejo (`Z`), `misc/underwater.png` bajo el agua y `misc/enchanted_glint_item.png` en ítems encantados.
5. **Colormaps Reales por Bioma (`colormap/grass.png` y `colormap/foliage.png`):**
   - Muestrear las coordenadas $(T, H)$ de temperatura y humedad de cada uno de los 9 biomas sobre `colormap/grass.png` y `colormap/foliage.png` para teñir césped, lianas, caña de azúcar y follaje con los colores exactos de cada bioma de Minecraft.

---

### Fase 2: Las 7 Familias de Madera y Árboles por Bioma (`block/*_log.png`, `*_planks.png`, `*_leaves.png`)
> **Objetivo:** Que cada uno de los 5+ tipos de árboles del generador de mundo tenga su propia madera, corteza, tablones, hojas y brotes oficiales de `mc-reference/`.

1. **Troncos con Corteza y Anillos (`[Top +Y, Bottom -Y, Sides]`):**
   - **Roble (`oak_log` + `oak_log_top`)** en Bosque y Llanura.
   - **Abeto (`spruce_log` + `spruce_log_top`)** en Taiga Nevada y Cumbres Heladas.
   - **Abedul (`birch_log` + `birch_log_top`)** en Bosques templados.
   - **Jungla (`jungle_log` + `jungle_log_top`)** en Jungla.
   - **Acacia (`acacia_log` + `acacia_log_top`)** en Sabana.
   - **Roble Oscuro / Manglar (`dark_oak_log`, `mangrove_log`)** en Pantano.
   - **Cerezo (`cherry_log` + `cherry_leaves`)** en colinas floridas.
2. **Tablones, Hojas, Brotes y Puertas Correspondientes:**
   - `spruce_planks`, `birch_planks`, `jungle_planks`, `acacia_planks`, `dark_oak_planks`, `cherry_planks` y sus respectivas hojas (`spruce_leaves`, `birch_leaves`, `jungle_leaves`, `acacia_leaves`, `cherry_leaves`) y brotes (`*_sapling.png`).

---

### Fase 3: Minerales Restantes, Pizarra Profunda (`Deepslate`) y Bloques de Construcción/Decoración
> **Objetivo:** Poblar las cuevas profundas (`y < 16`), estructuras (Pirámides, Templos, Aldeas, Ruinas) y recetas de construcción con la paleta completa de `mc-reference/block/`.

1. **Estrato de Pizarra Profunda (`y <= 14`) y Nuevos Minerales:**
   - `deepslate` (`deepslate_top.png` + `deepslate.png`), `cobbled_deepslate`, `deepslate_bricks`.
   - Nuevas menas y bloques minerales: **Cobre (`copper_ore`, `copper_block`)**, **Lapislázuli (`lapis_ore`, `lapis_block`, requerido para encantar)**, **Redstone (`redstone_ore`)**, **Esmeralda (`emerald_ore`)**, **Cuarzo (`nether_quartz_ore`, `quartz_block_top`/`side`)** y **Escombros Ancestrales / Netherita (`ancient_debris_top`/`side`, `netherite_block`)**.
2. **Piedras Regionales y Ladrillos de Estructuras:**
   - **Desierto y Pirámides:** `sandstone` (`top`, `bottom`, `normal`, `chiseled_sandstone`, `cut_sandstone`).
   - **Meseta (Badlands):** `red_sand`, `terracotta`, `red_terracotta`, `orange_terracotta`, `yellow_terracotta`, `white_terracotta`.
   - **Templos, Mazmorras y Fortalezas:** `stone_bricks`, `mossy_stone_bricks`, `cracked_stone_bricks`, `chiseled_stone_bricks`, `mossy_cobblestone`, `prismarine`, `prismarine_bricks`, `dark_prismarine`.
3. **Bloques Funcionales y de Iluminación:**
   - **Farolillos (`lantern.png`, `soul_lantern.png`)**, **Linterna Marina (`sea_lantern.png`)**, **Hoguera (`campfire_log_lit.png` + `campfire_fire.png`)**, **Bala de Heno (`hay_block_top`/`side` en aldeas)**, **Barril (`barrel_top`/`bottom`/`side`)**, **Tocadiscos (`jukebox_top`/`side`)**, **Bloque Musical (`note_block.png`)**, **Cortapiedras (`stonecutter_top`/`bottom`/`side` + `stonecutter_saw.png`)**, **Telar (`loom_*`)**, **mesa de Herrería (`smithing_table_*`)** y **mesa de Cartografía (`cartography_table_*`)**.

---

### Fase 4: Agricultura Ampliada, Flora y Vegetación por Bioma (`block/` + `item/`)
> **Objetivo:** Ampliar la agricultura y la flora silvestre de cada bioma usando los sprites oficiales de cultivos y plantas.

1. **Nuevos Cultivos y Alimentos Agrícolas:**
   - **Zanahorias (`carrots_stage0..3.png` + `item/carrot.png` + `item/golden_carrot.png`)**.
   - **Patatas (`potatoes_stage0..3.png` + `item/potato.png` + `item/baked_potato.png`)**.
   - **Remolacha (`beetroots_stage0..3.png` + `item/beetroot.png` + `item/beetroot_soup.png`)**.
   - **Calabaza y Sandía (`pumpkin_side`/`top`, `carved_pumpkin`, `jack_o_lantern`, `melon_side`/`top`, `item/melon_slice.png`, `item/pumpkin_pie.png`)**.
   - **Caña de Azúcar (`sugar_cane.png` $\rightarrow$ Azúcar y Papel)** en orillas de ríos y oasis, **Bambú (`bamboo_stalk.png`)** y **Cacao (`cocoa_stage0..2.png` $\rightarrow$ `item/cookie.png`)** en Jungla, y **Bayas Dulces (`sweet_berry_bush_stage0..3.png` + `item/sweet_berries.png`)** en Taiga.
2. **Flores, Helechos, Lianas y Setas:**
   - `blue_orchid` (Pantano), `allium`, `azure_bluet`, `red_tulip`, `orange_tulip`, `white_tulip`, `pink_tulip`, `oxeye_daisy`, `cornflower`, `lily_of_the_valley`, `fern` (Taiga/Jungla), `dead_bush` (Desierto/Meseta), `vine` (lianas trepables en Jungla y Pantano) y `red_mushroom` + `brown_mushroom` ($\rightarrow$ `item/mushroom_stew.png`).

---

### Fase 5: Set Completo de Herramientas, Armas, Armaduras y Equipamiento (`item/` + `entity/`)
> **Objetivo:** Completar todos los niveles de equipamiento de Minecraft y las armas especiales presentes en `mc-reference/`.

1. **Los 6 Materiales Completos para Picos, Espadas, Hachas, Palas y Azadas (`30` herramientas en `item/*.png`):**
   - Niveles: **Madera (`wooden_*`)**, **Piedra (`stone_*`)**, **Oro (`golden_*`)**, **Hierro (`iron_*`)**, **Diamante (`diamond_*`)** y **Netherita (`netherite_*`)** para `pickaxe`, `sword`, `axe`, `shovel` y `hoe`.
2. **Los 6 Conjuntos de Armadura (`24` piezas en `item/*.png` + `entity/equipment/humanoid/`):**
   - **Cuero (`leather_helmet`/`chestplate`/`leggings`/`boots`)**, **Cota de Malla (`chainmail_*`)**, **Hierro (`iron_*`)**, **Oro (`golden_*`)**, **Diamante (`diamond_*`)** y **Netherita (`netherite_*`)**, más el **Caparazón de Tortuga (`turtle_helmet.png`)**.
3. **Armas y Utilidades Especiales:**
   - **Escudo Dedicado (`item/shield` + bloqueo en mano secundaria)**, **Ballesta (`crossbow_standby.png`, `crossbow_pulling_0..2.png`, `crossbow_arrow.png`)**, **Tridente (`item/trident.png` + proyectil 3D `entity/trident.png` retornable)**, **Catalejo (`item/spyglass.png` + `misc/spyglass_scope.png`)**, **Élitros (`item/elytra.png` para planeo aéreo)**, **Tótem de la Inmortalidad (`item/totem_of_undying.png` que salva de la muerte)** y **Cohetes (`item/firework_rocket.png`)**.

---

### Fase 6: Redstone Avanzado y Nuevos Vehículos (`block/` + `item/` + `entity/`)
> **Objetivo:** Completar los circuitos lógicos y de transporte vóxel.

1. **Componentes Redstone:**
   - **Polvo de Redstone (`redstone_dust_dot.png`, `redstone_dust_line0.png`)**, **Antorcha de Redstone (`redstone_torch.png` / `redstone_torch_off.png`)**, **Repetidor (`repeater.png` / `repeater_on.png`)**, **Comparador (`comparator.png` / `comparator_on.png`)**, **Observador (`observer_front`/`back`/`side`/`top`)**, **Pistón Pegajoso (`piston_top_sticky.png` que empuja y retrae bloques)**, **Dispensador (`dispenser_front.png` que dispara flechas/agua/TNT)**, **Tolva (`hopper_*`)** y **Bloque Diana (`target_top`/`side` que emite señal al recibir un flechazo)**.
2. **Ferrocarril y Navegación Avanzada:**
   - **Raíl Propulsor (`powered_rail.png` / `powered_rail_on.png`)**, **Raíl Detector (`detector_rail.png`)**, **Vagoneta con Cofre (`item/chest_minecart.png`)**, **Vagoneta con TNT (`item/tnt_minecart.png`)** y **Barca con Cofre (`item/oak_chest_boat.png`)**.

---

### Fase 7: Nuevas Criaturas por Bioma, Aldeanos con Comercio y Jefes (`entity/**`)
> **Objetivo:** Poblar cada bioma, río, océano y estructura con sus criaturas características de `mc-reference/assets/minecraft/textures/entity/`.

1. **Aldeanos y Comercio (`entity/villager/villager.png` + `wandering_trader.png`):**
   - Spawnear **Aldeanos** en los Pueblos (`village`) y un **Comerciante Ambulante** ocasional; al hacer clic derecho sobre ellos se abre la ventana de trueque para intercambiar cultivos/recursos por **Esmeraldas (`ITEM_EMERALD`)**, herramientas encantadas y mapas de estructuras.
2. **Fauna por Bioma y Acuática (`entity/**`):**
   - **Llanura/Sabana:** **Caballo (`entity/horse/horse_brown.png`)** domesticable y montable con **Montura (`item/saddle.png`)**, y **Abeja (`entity/bee/bee.png`)**.
   - **Taiga y Cumbres Heladas:** **Zorro (`entity/fox/fox.png`)**, **Oso Polar (`entity/bear/polarbear.png`)**, **Conejo (`entity/rabbit/brown.png`)** y **Gólem de Nieve (`entity/snow_golem.png`)** invocable con 2 bloques de nieve + 1 calabaza tallada.
   - **Jungla:** **Panda (`entity/panda/panda.png`)**, **Loro (`entity/parrot/parrot_red_blue.png`)** y **Ocelote/Gato (`entity/cat/ocelot.png`)**.
   - **Pantano, Ríos y Mares:** **Rana (`entity/frog/temperate_frog.png`)**, **Ajolote (`entity/axolotl/axolotl_lucy.png`)**, **Calamar (`entity/squid/squid.png`)**, **Bacalao/Salmón (`entity/fish/cod.png`, `salmon.png`)**, **Delfín (`entity/dolphin.png`)** y **Tortuga (`entity/turtle/big_sea_turtle.png`)**.
   - **Desierto:** **Camello (`entity/camel/camel.png`)**.
3. **Nuevas Criaturas Hostiles y Jefes (`entity/**`):**
   - **Superficie/Estructuras:** **Bruja (`entity/witch.png`)** en Pantanos, **Saqueador (`entity/illager/pillager.png`)** con ballesta en Torres de Vigía, **Ahogado (`entity/zombie/drowned.png`)** en el agua, **Momia (`entity/zombie/husk.png`)** en Desierto y **Esqueleto Glacial (`entity/skeleton/stray.png`)** en Taiga Nevada.
   - **Nether y Cavernas Profundas:** **Blaze (`entity/blaze.png`)**, **Ghast (`entity/ghast/ghast.png`)**, **Piglin (`entity/piglin/piglin.png`)**, **Cubo de Magma (`entity/slime/magmacube.png`)** y **Warden (`entity/warden/warden.png`)**.
   - **Jefes Finales:** **Wither (`entity/wither/wither.png`)** y **Dragón del End (`entity/enderdragon/dragon.png`)** con barra de vida de jefe en el HUD (`gui/sprites/boss_bar/`).

---

### Fase 8: Alquimia, Pociones y Efectos de Estado (`mob_effect/*.png` + `item/*potion*.png`)
> **Objetivo:** Incorporar el Soporte de Pociones (`BLOCK.BREWING_STAND`) y los estados alterados con sus iconos oficiales en el HUD.

1. **Soporte de Pociones (`block/brewing_stand.png` + `block/brewing_stand_base.png`):**
   - Elaboración de pociones combinando `glass_bottle` con agua + `nether_wart` + ingrediente (`sugar` $\rightarrow$ Velocidad, `blaze_powder` $\rightarrow$ Fuerza, `ghast_tear` $\rightarrow$ Regeneración, `magma_cream` $\rightarrow$ Resistencia al Fuego, `golden_carrot` $\rightarrow$ Visión Nocturna, `phantom_membrane` $\rightarrow$ Caída Lenta, `pufferfish` $\rightarrow$ Respiración Acuática, `spider_eye` $\rightarrow$ Veneno).
2. **Iconos de Estado en el HUD (`mob_effect/*.png` + `gui/sprites/hud/effect_background.png`):**
   - Mostrar en la esquina superior los iconos activos (`speed.png`, `strength.png`, `regeneration.png`, `fire_resistance.png`, `night_vision.png`, `jump_boost.png`, `slow_falling.png`, `water_breathing.png`, `poison.png`, `absorption.png` al comer Manzana Dorada) con su temporizador.

---

### Fase 9: Cuadros Decorativos (`painting/*.png`) y Atlas de Partículas Oficial (`particle/*.png`)
> **Objetivo:** Dar vida visual a las construcciones e impactos con los cuadros y partículas reales de Minecraft.

1. **Cuadros Colgables (`item/painting.png` + `painting/*.png`):**
   - Craftear un Cuadro (`8× Palo + 1× Lana`) y colocarlo sobre cualquier pared vertical para colgar los cuadros oficiales de `mc-reference/assets/minecraft/textures/painting/` (`kebab.png`, `aztec.png`, `wanderer.png`, `fighters.png`, `skeleton.png`, `skull_and_roses.png`, `donkey_kong.png`, `pigscene.png`, `burning_skull.png`, etc.) con respaldo `painting/back.png`.
2. **Sprites de Partículas Oficiales (`particle/*.png`):**
   - Texturizar el pool `InstancedMesh` de partículas con un mini-atlas de `particle/` para mostrar **corazones (`heart.png`)** al domesticar lobos/caballos, **estrellas de crítico (`crit.png`)** al golpear cayendo, **llamas (`flame.png`)** y **humo (`smoke_0..7.png`)** en antorchas/hogueras/hornos, **burbujas (`bubble.png`)** bajo el agua, **runas (`sga_*.png`)** en la Mesa de Encantamientos, **notas musicales (`note.png`)** y **ondas de explosión (`explosion_0..15.png`)**.

---

### Fase 10: Dimensiones Completas del Nether y del End al Cruzar Portales
> **Objetivo:** Que cruzar un Portal de Obsidiana (`BLOCK.PORTAL`) o un Portal del End (`end_portal_frame_top`/`side`) transporte al jugador a una dimensión real con sus propios biomas, bloques y criaturas de `mc-reference/`.

1. **Dimensión del Nether:**
   - Cielo rojizo y mares de lava en `y <= 20`, techo de Bedrock, terreno de `netherrack`, `soul_sand`, `soul_soil`, `basalt` (`basalt_top`/`side`), `blackstone`, `glowstone`, `nether_quartz_ore`, `nether_gold_ore` y `ancient_debris`, Bosques Carmesí (`crimson_nylium`, `crimson_stem`, `shroomlight`) y Distorsionados (`warped_nylium`, `warped_stem`), **Fortalezas del Nether (`nether_bricks`)** y criaturas del Nether (*Blaze, Ghast, Piglin, Esqueleto Wither, Strider*).
2. **Dimensión del End:**
   - Cielo estrellado (`environment/end_sky.png`), isla central e islas exteriores de `end_stone` y `end_stone_bricks`, pilares de `obsidian` con **Cristales del End (`entity/end_crystal/end_crystal.png`)**, árboles de **Chorus (`chorus_plant.png`, `chorus_flower.png`)**, **Ciudades del End (`purpur_block.png`, `purpur_pillar.png`, `end_rod.png`)** con **Shulkers (`entity/shulker/shulker.png`)** y combate contra el **Dragón del End (`entity/enderdragon/dragon.png`)**.

---

## 4. Regla de Validación en Cada Fase (`test.html` + `AGENTS.md`)

En cumplimiento de las **Reglas 4 y 7 de [`AGENTS.md`](AGENTS.md)**:
1. Cada fase añadirá sus nuevas entradas en `MC_BLOCK_TILE_FILES`, `MC_ITEM_SPRITE_FILES` o `MC_MOB_TILE_CROPS` y ampliará automáticamente los contratos `EXPECTED_BLOCK_FACE_CONTRACT`, `EXPECTED_MOB_SKIN_CONTRACT`, `EXPECTED_ITEM_ICON_CONTRACT` y el test de **igualdad píxel a píxel (`maxDiff === 0`)** en `Suite 52` de [`test.html`](test.html).
2. Antes de hacer `git commit` y `git push origin main` al cerrar cada fase, se ejecutará [`test.html`](test.html) en Chrome verificando `failed: 0` y que el coste por frame se mantiene dentro del presupuesto de **60 FPS fijos (`< 0.35 ms/frame`)**.
