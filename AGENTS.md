# AGENTS.md — Guía y Reglas del Proyecto VoxelCraft HTML5

Este documento contiene las reglas de arquitectura, restricciones de rendimiento, flujo de tests y contexto del proyecto para cualquier agente o sesión de chat que trabaje en **VoxelCraft HTML5**.

---

## 1. Información General y Ubicación

- **Ruta local del proyecto:** `c:\Users\sroig\code\voxelcraft` (`/home/sergiroig@TierraZen.local/code/personal/voxelcraft`)
- **Repositorio GitHub:** [`https://github.com/sergiroig/voxelcraft`](https://github.com/sergiroig/voxelcraft) (`git@github.com:sergiroig/voxelcraft.git`)
- **URL pública (GitHub Pages):** [`https://sergiroig.github.io/voxelcraft/`](https://sergiroig.github.io/voxelcraft/)
- **URL de la suite de tests:** [`https://sergiroig.github.io/voxelcraft/test.html`](https://sergiroig.github.io/voxelcraft/test.html)
- **Idioma de comunicación:** Español siempre.
- **Archivos del repositorio (todos estrictamente `< 800` líneas en `src/` e `index.html`):**
  - [`index.html`](index.html) (`255` líneas): Estructura HTML del juego, `<link rel="preload">` paralelo, modales estilo Minecraft (`#inventory-modal`, `#chest-modal`, `#mc-cursor-item`) y carga ordenada de módulos.
  - [`src/styles.css`](src/styles.css) (`679` líneas): Hoja de estilos CSS completa (HUD, ranuras biseladas `.mc-slot`, cuadrículas `2×2`/`3×3`/`27` estilo Minecraft, menú y controles multitáctiles).
  - [`src/01-config-atlas.js`](src/01-config-atlas.js) (`686` líneas): Constantes, definiciones de bloques (`BLOCK`, `BLOCK_DEFS`, incluyendo `CRAFTING_TABLE`, `LILY_PAD`, `PISTON`, `PORTAL`, `ICE`, `ITEM_BOAT`, `TOOL_GRAPPLING_HOOK`), 28 recetas (`CRAFTING_RECIPES` con `gridSize: 2 | 3` y `pattern`) y generador procedural del Atlas de Texturas Pixel-Art de 53 tiles (`createProceduralAtlas`, `createCrackTextures`).
  - [`src/02-worldgen-lighting.js`](src/02-worldgen-lighting.js) (`532` líneas): Generador de terreno procedural, 4 biomas (con lagos helados `BLOCK.ICE` en *Taiga Nevada* y nenúfares `BLOCK.LILY_PAD` en *Llanura/Bosque*), cuevas 3D trilineales $4\times4\times4$, estructuras (*Pirámides, Cabañas* con `BLOCK.CHEST` y `BLOCK.CRAFTING_TABLE`) y motor de iluminación vóxel *Flood-Fill BFS* en 1 byte (`computeChunkLighting` + caché de minimapa).
  - [`src/03-mesher-audio.js`](src/03-mesher-audio.js) (`758` líneas): *Chunk Mesher* (`buildChunkMeshArrays` con *Hidden Face Culling* incluyendo bloques translúcidos `GLASS`/`ICE`/`PORTAL`, *Vertex AO* y *X-Mesh*) y sintetizador `Web Audio API` + música generativa *C418* FM (`SoundFX`, `updateAmbientAudio`).
  - [`src/04-world-renderer.js`](src/04-world-renderer.js) (`790` líneas): Estado del mundo (`chunks`, `worldDeltas`), escena `Three.js`, *Shaders GPU* (`onBeforeCompile`: viento en vegetación/nenúfares, vórtice en portales, destello en hielo/menas y olas 3D), pools `InstancedMesh` de partículas y *drops* 3D imantados, objeto en mano en 1ª/3ª persona idéntico a su icono `16×16` (`handIconTex`, `updateHeldItemVisual`) y Cielo Dinámico (`updateDynamicSky`).
  - [`src/05-simulation-entities.js`](src/05-simulation-entities.js) (`782` líneas): Cola de simulación vóxel (`updateVoxelSimulation`: arena, agua, lava/obsidiana, cultivo de trigo y crecimiento de árboles `growTreeAt`), TNT, Clima Dinámico (`updateWeather`), Flechas 3D y **Gancho de Agarre** (`shootArrow`, `shootGrappleHook`, `grapplePullPlayerTo`), Comida (`eatHeldApple`), Circuitos Redstone + **Pistones Mecánicos** + Puertas + Trampillas (`toggleVoxelLever`, `triggerVoxelPiston`, `toggleVoxelDoor`, `toggleVoxelTrapdoor`), Cofres del Tesoro de 27 ranuras (`openVoxelChest`, `ensureChestSlots`) y Ferrocarril + Vagonetas 3D (`spawnMinecart`, `toggleRideMinecart`, `updateMinecarts`).
  - [`src/06-mobs-worker.js`](src/06-mobs-worker.js) (`739` líneas): Motor optimizado de criaturas (`mobs`: Ovejas, Cerdos, Zombis, **Esqueletos Arqueros**, **Creepers Explosivos** y **Gólem de Hierro Guardián Aliado** `trySummonIronGolem`), subida de mallas (`applyArraysToMesh`) y `Web Worker` multihilo *inline* (`Blob URL` + `Transferable` *Zero-Copy*).
  - [`src/07-physics-camera.js`](src/07-physics-camera.js) (`692` líneas): Raycaster vóxel DDA 3D (`raycastVoxel`), físicas del jugador (`updatePlayerPhysics`, **Bloqueo con Escudo/Espada** `toggleShieldBlock`, patinaje en **Hielo Glaciar** `BLOCK.ICE`, escalada en `BLOCK.LADDER`, rebote en Slime, viaje en Vagoneta/Barca), **Portales Dimensionales de Obsidiana** (`activateObsidianPortal`, `useVoxelPortal`), **Barcas Navegables 3D** (`spawnBoat`, `toggleRideBoat`, `updateBoats`), minado progresivo, *Smart Frustum Culling 3D* (`updateFrustumCulling`), cámara en 3ª persona (`playerAvatar`, `toggleCameraMode`), zoom (`toggleZoom`) y streaming de chunks (`updateChunkStreaming`).
  - [`src/08-ui-minimap.js`](src/08-ui-minimap.js) (`762` líneas): Interfaz de usuario (hotbar, inventario `2×2` y apertura de `BLOCK.CRAFTING_TABLE` `3×3` con `openCraftingTable`, **Modo Foto / Captura de Pantalla** `takeGameScreenshot`, selector de semillas, teletransporte a biomas, **Balizas GPS / Waypoints** `addWaypoint`, `teleportToWaypoint`) y Minimapa Radar 2D Topográfico con brújula 360° (`updateMinimap`).
  - [`src/09-controls-loop.js`](src/09-controls-loop.js) (`790` líneas): Eventos de teclado/ratón en PC, controlador multitáctil móvil (`joy-zone`, botones táctiles), motor de ranuras estilo Minecraft (`clickSlot`, `evaluateCraftingGrid`, `craftFromOutputSlot`, `renderMinecraftInventoryDOM`, `buildChestModalUI`), bucle principal (`animate`), telemetría FPS y API de introspección `window.__VOXELCRAFT__`.
  - [`test.html`](test.html): Runner de **68 tests E2E/unitarios (36 suites)** y profiler de coste en FPS en tiempo real sobre el motor.
  - [`README.md`](README.md): Descripción general del repositorio.
  - [`AGENTS.md`](AGENTS.md): Este archivo de referencia.

---

## 2. Reglas de Oro del Proyecto (Inquebrantables)

### Regla 1: Arquitectura Modular Limpia (< 800 líneas por archivo) y Cero Dependencias Externas
- El proyecto está organizado en [`index.html`](index.html), [`src/styles.css`](src/styles.css) y **9 módulos JS numerados en `src/01-*.js` .. `src/09-*.js`** (todos por debajo de 800 líneas para lectura completa en 1 llamada y edición en paralelo sin pasos de compilación).
- **Prohibido usar recursos multimedia externos** (imágenes `.png`/`.jpg` externas, archivos de audio `.mp3`/`.ogg`), con la única excepción del CDN de `Three.js r128`.
- Todas las texturas se generan proceduralmente en memoria mediante Canvas 2D (`createProceduralAtlas`, `createCrackTextures`) y todos los efectos de sonido/música se sintetizan en tiempo real con `Web Audio API` (`SoundFX`).
- Los `Web Workers` se crean *inline* a partir de un `Blob` (`URL.createObjectURL(new Blob([...]))`) en [`src/06-mobs-worker.js`](src/06-mobs-worker.js).

### Regla 2: Optimización Extrema (Zero-GC y Mínimos Draw Calls)
Cada funcionalidad nueva debe diseñarse bajo la premisa de **máximo rendimiento en CPU, GPU y memoria**:
1. **Datos planos por Chunk:** Cada chunk ($16 \times 64 \times 16 = 16\,384$ vóxeles) almacena sus bloques en un `Uint8Array(16384)` (`chunks`) y su iluminación en otro `Uint8Array(16384)` (`chunkLights`).
2. **Prohibido crear un `Mesh` por bloque:** Cada chunk genera como máximo **1 `BufferGeometry` para bloques opacos/recortados** y **1 `BufferGeometry` para el agua**, descartando caras ocultas (*Hidden Face Culling*).
3. **Cero presión al Garbage Collector (GC):** El *mesher* (`buildChunkMeshArrays`) escribe sobre buffers tipados estáticos pre-asignados (`solidPos`, `solidNorm`, `solidUv`, `solidCol`, `solidIdx`, etc.) y solo recorta la vista exacta al subirla a GPU.
4. **Actualizaciones por lotes (Batching):** Cuando una acción modifique múltiples bloques a la vez (explosiones de TNT, pistones Redstone, caída de arena, flujo de agua, estructuras), usar **siempre** `setVoxelRawNoRebuild(x, y, z, id, affectedChunks)` y reconstruir los chunks afectados una única vez al final mediante `rebuildAffectedChunksSet(affectedChunks)`.
5. **Geometrías compartidas e Instancing:** Partículas (`InstancedMesh` de 120 instancias), nubes (malla fusionada única `cloudMesh`), proyectiles/gancho (`arrowInstanced`) y criaturas (`mobGeos` compartidos entre todas las entidades) deben minimizar los *draw calls* y el uso de VRAM.
6. **Aritmética entera de 32 bits en Hashes:** En funciones de hash/ruido determinista como `hash3D`, usar siempre `Math.imul(...)` en lugar del operador `*` antes de desplazamientos bit a bit para no perder precisión en los bits bajos por el límite de 53 bits de `Number` en JavaScript.

### Regla 3: Compatibilidad Híbrida PC + Móvil/Tablet
- El juego debe ser **100% jugable tanto en PC (ratón con `Pointer Lock` + teclado) como en dispositivos móviles/tablets (pantallas multitáctiles)**.
- Cualquier acción o mecánica nueva que añada un atajo de teclado o clic en PC **debe** tener su equivalente accesible desde la interfaz táctil (`#touch-controls`, botones en `#touch-actions` o `#touch-top-bar`, o controles dentro del modal de inventario `#inventory-modal`).

### Regla 4: Testing, Reproducción de Bugs (TDD) y Benchmark de FPS Obligatorios en Chrome (`test.html`)
- El motor expone su API interna de pruebas en `window.__VOXELCRAFT__` (al final de [`src/09-controls-loop.js`](src/09-controls-loop.js)).
- **Toda funcionalidad nueva debe ir acompañada de nuevos tests en [`test.html`](test.html)** y de su entrada en el profiler de rendimiento (`perFrameFeatures` / `onDemandFeatures`).
- **Regla de Bugs (Primero Reproducir en Test, Luego Arreglar):** Siempre que se detecte o reporte un bug, **primero se debe escribir un test automatizado en [`test.html`](test.html) que reproduzca el fallo** (verificando en Chrome que el test falla con el bug presente) y **después implementar la corrección** hasta que toda la suite pase con `failed: 0`.
- **Antes de dar por terminada una tarea o hacer `git push`**, es obligatorio ejecutar [`test.html`](test.html) en Chrome, comprobar que `window.__TEST_RESULTS__` devuelve **`failed: 0`** y **anotar el coste en FPS / tiempo por frame en la Sección 6 de este archivo (`AGENTS.md`)** tomando este PC como referencia.

### Regla 5: Git y Cuenta Personal de GitHub
- **Usar SIEMPRE la cuenta personal `sergiroig`**, **NUNCA** una organización de GitHub.
- Configuración de autor local en el repositorio:
  - `user.name`: `sergiroig`
  - `user.email`: `sergiroig@users.noreply.github.com`
- Hacer `git commit` y `git push origin main` tras verificar que los tests pasan en Chrome para mantener actualizado el despliegue en GitHub Pages.

---

## 3. Arquitectura Interna de VoxelCraft HTML5

| Subsistema | Funciones / Estructuras Clave | Descripción |
| :--- | :--- | :--- |
| **Coordenadas y Chunks** | `chunks`, `chunkKey`, `getVoxelGlobal`, `setVoxelGlobal`, `setVoxelRawNoRebuild` | Chunks de $16 \times 64 \times 16$ con streaming circular y reconstrucción por lotes (`rebuildAffectedChunksSet`). |
| **Terreno, Biomas, Cuevas 3D y Estructuras** | `createWorldGenerator`, `getBiomeAt`, `placeStructureInChunk` | 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada* con lagos helados `BLOCK.ICE` y nenúfares `BLOCK.LILY_PAD`), cuevas 3D con interpolación trilineal $4\times4\times4$ (425 muestras por chunk en lugar de $16\,384$), lagos de lava (`y <= 11`), minerales y estructuras (*Pirámides del Desierto* y *Cabañas de Explorador*). |
| **Iluminación Vóxel (1 Byte)** | `computeChunkLighting`, `getLightGlobal` | Empaqueta 4 bits altos (`>> 4`) para luz solar y 4 bits bajos (`& 15`) para luz cálida de bloques (*Antorchas, Glowstone, Lava, Lámparas Redstone, Hongos Luminosos y Portales*) propagada por *Flood-Fill BFS*, además de precalcular `ch.mapColors` (`Uint32Array(256)`). |
| **Mesher + AO + X-Mesh** | `buildChunkMeshArrays`, `FACE_DEFS` | Genera caras visibles con *Ambient Occlusion* en los 4 vértices y geometría cruzada (`X-Mesh`) para flores, hierba alta, antorchas y palancas, descartando caras internas entre bloques translúcidos (`GLASS`, `ICE`, `PORTAL`). |
| **Raycasting y Minado** | `raycastVoxel`, `updateMining`, `spawnBlockParticles` | Algoritmo DDA 3D rápido, rotura progresiva en 8 fases según `hardness` (con multiplicador $\times 3.5$ usando el Pico de Diamante) y partículas con `InstancedMesh`. |
| **Simulación Vóxel, Agricultura, Lava, Obsidiana y TNT** | `simQueue`, `updateVoxelSimulation`, `growTreeAt`, `igniteTNT`, `explodeAt` | Cola de simulación a 10 Hz: gravedad de arena, expansión de agua, flujo de lava, reacción **Agua + Lava $\rightarrow$ Obsidiana**, crecimiento de **Brotes de Roble $\rightarrow$ Árbol 3D** y cultivo de **Trigo (`WHEAT_1..3`) $\rightarrow$ Pan Horneado (`+5` ❤)**, más encendido de `BLOCK.TNT`. |
| **Circuitos Redstone, Pistones, Puertas y Trampillas** | `toggleVoxelLever`, `triggerVoxelPiston`, `toggleVoxelDoor`, `toggleVoxelTrapdoor`, `propagateRedstoneSignal` | Palancas interactivas con coste 0 en reposo que conmutan Lámparas de Redstone, abren/cierran **Puertas y Trampillas Mecánicas**, accionan **Pistones Mecánicos (`BLOCK.PISTON`)** que empujan hasta 4 bloques en lote y detonan TNT adyacente. |
| **Físicas Elásticas (Slime), Hielo Glaciar y Cuevas Bio** | `BLOCK.SLIME`, `BLOCK.ICE`, `BLOCK.AMETHYST`, `BLOCK.GLOW_MUSHROOM`, `updatePlayerPhysics` | **Bloques de Slime** que anulan el daño por caída e impulsan al jugador (`vy > 9.2`), **Hielo Glaciar (`BLOCK.ICE`)** con patinaje de alta velocidad (`× 1.45`) e inercia horizontal (`iceVx`, `iceVz`), y cavernas bioluminiscentes con **Amatista** (luz 5) y **Hongos Luminosos** (luz 12). |
| **Vehículos 3D (Vagonetas y Barcas) y Portales** | `spawnMinecart`, `toggleRideMinecart`, `updateMinecarts`, `spawnBoat`, `toggleRideBoat`, `updateBoats`, `activateObsidianPortal`, `useVoxelPortal` | **Vagonetas 3D** sobre raíles (`11.5 m/s`), **Barcas Navegables 3D (`BLOCK.ITEM_BOAT`)** sobre el agua (`9.5 m/s`) y **Portales Dimensionales de Obsidiana (`BLOCK.PORTAL`)** con teletransporte instantáneo entre portales enlazados. |
| **Smart Frustum Culling 3D + Cámara 3ªP, Zoom y Foto** | `updateFrustumCulling`, `ch.worldBox`, `playerAvatar`, `toggleCameraMode`, `toggleZoom`, `takeGameScreenshot` | Descarte automático por `THREE.Frustum` vs `THREE.Box3` (~50% menos draw calls), **Cámara en 3ª Persona (`C` / `🎥`)**, **Zoom Catalejo (`Z` / `🔭`, FOV `24°`)** y **Modo Foto PNG (`F2` / `K` / `📷`)**. |
| **Criaturas (Mobs), Escudo, Arco y Gancho de Agarre** | `mobs`, `spawnMob`, `updateMobs`, `toggleShieldBlock`, `arrowInstanced`, `shootArrow`, `shootGrappleHook`, `updateArrows` | *Ovejas, Cerdos, Zombis, Esqueletos Arqueros, Creepers y Gólems de Hierro* con geometrías compartidas (`mobGeos`). **Bloqueo con Escudo/Espada** (reduce daño un 80% y rebota flechas), **Arco 3D** y **Gancho de Agarre (`BLOCK.TOOL_GRAPPLING_HOOK`)** con tracción elástica. |
| **Cielo Dinámico y Clima por Bioma** | `sunMesh`, `moonMesh`, `starField`, `cloudMesh`, `updateDynamicSky`, `setTimeOfDay`, `weatherInstanced`, `toggleWeather`, `updateWeather` | Ciclo orbital continuo día/noche (`140s` por ciclo o salto con `T`), Sol y Luna esféricos (`SphereGeometry` con sombreado de cráteres lunares), color solar y de cielo/niebla/nubes realista según elevación (amanecer/atardecer naranja-carmesí, mediodía azul celeste, crepúsculo violeta y noche estrellada) e iluminación solar en GPU (`uSunLightColor` sin reconstruir chunks). Clima dinámico (`V` / `🌧`) en 1 `InstancedMesh`. |
| **Shaders en GPU (Coste 0 CPU)** | `gpuShaderUniforms`, `solidMaterial.onBeforeCompile`, `waterMaterial.onBeforeCompile`, `updateGPUShaders` | Viento orgánico en vegetación y nenúfares, llama en antorchas, pulso de magma en lava, vórtice dimensional en `BLOCK.PORTAL`, destello en hielo y menas de oro/diamante, olas 3D con espuma en el agua y atmósfera subacuática. |
| **Drops 3D, Supervivencia y Crafteo** | `dropInstanced`, `itemDrops`, `spawnItemDrop`, `updateItemDrops`, `CRAFTING_RECIPES`, `craftRecipe`, `toggleGameMode` | Pool `InstancedMesh` de 64 mini-bloques 3D flotantes e imantados en 1 *draw call*, modos Supervivencia y Creativo (`G`) y 27 recetas de crafteo rápido en el modal `E`. |
| **Minimapa Radar 2D, Balizas GPS y Semillas** | `updateMinimap`, `ch.mapColors`, `addWaypoint`, `teleportToWaypoint`, `applyWorldSeed`, `teleportToBiome` | Radar topográfico (`68×68 px` a 10 Hz) con lectura $O(1)$ desde `Uint32Array`, radar de criaturas, **Balizas GPS (`B` / `📍`)** con brújula 360° y teletransporte a biomas/balizas. |
| **Música C418 + Paisaje Sonoro** | `SoundFX`, `C418_SCALE_HZ`, `C418_CHORDS`, `triggerMusicChord`, `playCaveEcho`, `updateAmbientAudio`, `toggleMusic` | Sintetizador FM de piano cálido + *Reverb* algorítmica estéreo (`ConvolverNode` de 2s) + generador continuo de brisa/lluvia/cueva/agua en `Web Audio API` (`M` / `🎵`). |
| **`Web Worker` Multihilo + Escalado Dinámico** | `meshWorker`, `packChunkPaddedBuffers`, `requestChunkMeshWorker`, `updateDynamicResolution` | Worker *inline* (`Blob URL`) con transferencia *Zero-Copy* (`Transferable` `ArrayBuffer`) de una región $18 \times 64 \times 18$, reduciendo el coste en el hilo principal de `3.90 ms` a **`0.34 ms`** (**reducción del 91.2% / 11.4× más rápido**). |

---

## 4. Cómo Ejecutar los Tests Automatizados en Chrome

Para validar cambios con el navegador Chrome mediante `chrome_devtools`:

1. **Iniciar un servidor HTTP local temporal** en el directorio del proyecto:
   ```powershell
   python -m http.server 8765 --bind 127.0.0.1
   ```
2. **Abrir o recargar `http://127.0.0.1:8765/test.html`** en Chrome con las herramientas del navegador.
3. **Inspeccionar `window.__TEST_RESULTS__`** y verificar que **`failed === 0`** (68/68 tests exitosos en 36 suites), deteniendo el servidor HTTP temporal al finalizar.

---

## 5. Hoja de Ruta (Estado de Mejoras Optimizadas)

1. ✅ **Punto 1 — Mundo Vivo y Físicas Vóxel (Completado):** Criaturas con geometría compartida (*Ovejas, Cerdos, Zombis*), gravedad de arena, flujo de agua, TNT y cielo dinámico.
2. ✅ **Punto 2 — Shaders en GPU (`Coste 0 en CPU`, Completado):** Viento en vegetación, antorchas, destellos en menas, olas 3D con espuma y atmósfera subacuática.
3. ✅ **Punto 3 — Jugabilidad, Drops 3D y Crafteo (Completado):** Mini-bloques 3D flotantes e imantados (`InstancedMesh` de 64 instancias), modo Supervivencia/Creativo (`G`) y Mesa de Crafteo (`E`).
4. ✅ **Punto 4 — Audio y Música Ambiental Generativa (Web Audio API, Completado):** Música estilo *C418* FM con *Reverb* algorítmica estéreo y paisaje sonoro adaptativo (`M` / `🎵`).
5. ✅ **Punto 5 — Rendimiento Extremo (Multihilo y Escalado Dinámico, Completado):** `Web Worker` *inline* (`Blob URL` + `Transferable` *Zero-Copy*, `11.4×` más rápido en hilo principal) y escalado dinámico de `PixelRatio`.
6. ✅ **Punto 6 — Estructuras Procedurales, Lava Fluida y Reacción Agua + Lava → Obsidiana (Completado):** *Pirámides del Desierto*, *Cabañas de Explorador*, `BLOCK.LAVA` (luz 15) y solidificación en `BLOCK.OBSIDIAN`.
7. ✅ **Punto 7 — Clima Dinámico por Bioma (`1 Draw Call`, Completado):** Lluvia, Nieve en *Taiga Nevada* y Tormentas Eléctricas con relámpagos y truenos (`V` / `🌧`).
8. ✅ **Punto 8 — Herramientas Especializadas, Arco con Flechas 3D y Curación (Completado):** Espada de Diamante (`5 dmg`), Arco con Flechas Balísticas 3D (`arrowInstanced`) y Manzana Curativa (`+4` ❤).
9. ✅ **Punto 9 — Minimapa Radar 2D Topográfico + Semillas y Teletransporte (Completado):** Radar topográfico `68×68 px` a 10 Hz (`Uint32Array` $O(1)$), selector de semilla y teletransporte a biomas.
10. ✅ **Punto 10 — Circuitos Vóxel / Redstone Ligero (`Coste 0 en Reposo`, Completado):** Palanca (`LEVER_OFF`/`ON`) y Lámpara de Redstone (`REDSTONE_LAMP_OFF`/`ON`, luz BFS 15).
11. ✅ **Punto 11 — Smart Frustum Culling 3D (`Box3` vs `THREE.Frustum`, Completado):** Descarta en `6.6 µs/frame` los chunks y criaturas fuera del cono de visión (~50% menos draw calls).
12. ✅ **Punto 12 — Agricultura Vóxel, Crecimiento Orgánico de Árboles y Pan Horneado (Completado):** Brotes de Roble (`SAPLING` $\rightarrow$ Árbol 3D), Trigo (`WHEAT_1..3`) y Pan Horneado (`+5` ❤).
13. ✅ **Punto 13 — Cuevas Bioluminiscentes: Drusas de Amatista y Hongos Luminosos (Completado):** `BLOCK.AMETHYST` (luz BFS 5, sonido `'chime'`) y `BLOCK.GLOW_MUSHROOM` (luz BFS 12, pulso GPU).
14. ✅ **Punto 14 — Bloques de Slime Elásticos y Puertas Mecánicas Redstone (Completado):** Rebote elástico en `BLOCK.SLIME` sin daño por caída y Puertas Mecánicas (`DOOR_CLOSED`/`OPEN`).
15. ✅ **Punto 15 — Cámara en 3ª Persona con Avatar Vóxel Articulado (`C`) y Zoom Óptico Catalejo (`Z`) (Completado):** Avatar articulado de 6 piezas con raycast anticolisión y Zoom `24°`.
16. ✅ **Punto 16 — Escaleras de Mano (`BLOCK.LADDER`) y Trampillas Mecánicas Redstone (`BLOCK.TRAPDOOR`) (Completado):** Escalada vertical sin daño por caída y escotillas accionables manualmente o con Redstone.
17. ✅ **Punto 17 — Vías de Ferrocarril (`BLOCK.RAIL`) y Vagoneta de Tren 3D Montable (`R` / `🛤`) (Completado):** Vagonetas 3D a `11.5 m/s` con giro automático de 90° en curvas y subida de pendientes.
18. ✅ **Punto 18 — Cofres del Tesoro y Almacenamiento Persistente (`BLOCK.CHEST`, `openVoxelChest`) (Completado):** Cofres con botín inicial, almacenamiento persistente en `localStorage` y modal interactivo `#chest-modal`.
19. ✅ **Punto 19 — Creeper Explosivo (`'creeper'`) y Gólem de Hierro Guardián Aliado (`'golem'`, `trySummonIronGolem`) (Completado):** Creepers con mecha/hinchado y Gólems de Hierro aliados invocables con tótem.
20. ✅ **Punto 20 — Sistema de Balizas GPS (`Waypoints`, `B` / `📍`), Brújula 360° en Radar y Teletransporte (Completado):** Marcadores GPS con nombre/color, brújula perimetral en el radar 2D y teletransporte en 1 clic.
21. ✅ **Punto 21 — Barcas Navegables 3D (`BLOCK.ITEM_BOAT`) y Nenúfares Acuáticos (`BLOCK.LILY_PAD`) (Completado):**
    - **Nenúfares (`BLOCK.LILY_PAD`):** Generados sobre lagos en *Llanura* y *Bosque*; tienen colisión sólida (`solid: true`) para caminar sobre el agua y mecido suave en el Vertex Shader.
    - **Barca de Remo 3D (`BLOCK.ITEM_BOAT`, `spawnBoat`, `toggleRideBoat`, `updateBoats`):** Permite navegar sobre ríos y mares a `9.5 m/s` con sonido de chapoteo (`'splash'`) pulsando `R`, el botón táctil `🛤/⛵ Vehíc.` o clic derecho con la barca equipada.
22. ✅ **Punto 22 — Pistones Mecánicos Redstone (`BLOCK.PISTON`, `triggerVoxelPiston`) (Completado):**
    - Al activarse mediante una Palanca Redstone cercana (`propagateRedstoneSignal`), empujan filas de hasta **4 bloques sólidos contiguos** en una sola pasada por lotes (`setVoxelRawNoRebuild` + `rebuildAffectedChunksSet`) y catapultan al jugador (`vy = 13.5`) si está sobre ellos.
23. ✅ **Punto 23 — Gancho de Agarre Balístico 3D (`BLOCK.TOOL_GRAPPLING_HOOK`, `shootGrappleHook`) (Completado):**
    - Fabricable con *Mena de Hierro + Amatista + Madera*. Dispara un proyectil 3D veloz (`28 m/s`) reutilizando el pool `arrowInstanced` que al impactar contra un bloque sólido dentro de `24m` impulsa y tracciona elásticamente al jugador (`grapplePullPlayerTo`), anulando el daño por caída (`maxFallVel = 0`).
24. ✅ **Punto 24 — Portales Dimensionales de Obsidiana (`BLOCK.PORTAL`, `activateObsidianPortal`, `useVoxelPortal`) (Completado):**
    - Bloque translúcido con luz violeta BFS `12` y animación de vórtice dimensional en el *Fragment Shader*. Al interactuar con un bloque `BLOCK.PORTAL` (o encender Obsidiana con Amatista/Antorcha), enlaza portales distantes y teletransporta instantáneamente al jugador (creando automáticamente un portal hermano a `(+32, y, +32)` si solo existe uno).
25. ✅ **Punto 25 — Esqueleto Arquero Hostil (`'skeleton'`) y Bloqueo con Escudo / Espada (`toggleShieldBlock`) (Completado):**
    - **Esqueleto Arquero (`'skeleton'`):** Aparece en cuevas oscuras y de noche reutilizando `mobGeos`, mantiene la distancia óptima y dispara flechas balísticas 3D (`fromMob: true`) hacia el jugador.
    - **Bloqueo con Escudo / Espada (`isShieldBlocking`, `toggleShieldBlock`):** Al mantener clic derecho (o pulsar acción secundaria) con la Espada de Diamante, activa la postura defensiva que **reduce un 80% el daño recibido** y **rebota las flechas de los Esqueletos** en sentido contrario con sonido metálico (`'shield'`).
26. ✅ **Punto 26 + Mejoras Técnicas — Hielo Glaciar Resbaladizo (`BLOCK.ICE`), Modo Foto (`F2` / `📷`) y `< 800` Líneas por Archivo (Completado):**
    - **Hielo Glaciar (`BLOCK.ICE`):** El agua superficial en *Taiga Nevada* se congela en bloques de hielo translúcido con *Hidden Face Culling* interno, destello helado en GPU y físicas de patinaje de baja fricción (`× 1.45` velocidad máxima + inercia `iceVx`, `iceVz`).
    - **Modo Foto / Captura de Pantalla (`F2` / `K` / `📷 Foto`, `takeGameScreenshot`):** Captura instantáneamente el canvas WebGL en PNG (`toDataURL`), reproduce sonido de obturador (`'shutter'`) y descarga la imagen.
27. ✅ **Punto 27 — Sistema estilo Minecraft: Inventario Manual (`2×2`), Mesa de Crafteo Colocable (`BLOCK.CRAFTING_TABLE`, `3×3`) y Cofres de `27` Ranuras (Completado):**
    - **Inventario del Jugador (`E`):** Incluye vista previa 2D del personaje con 4 ranuras de armadura, **cuadrícula de crafteo manual `2×2`** (para fabricar Tablones, Mesa de Crafteo, Antorchas, Palancas, Escaleras, etc.), **Mochila de 27 ranuras (`3×9`)** y **Barra Rápida de 9 ranuras (`1×9`)**, más **Libro de Recetas (`📖`)** plegable.
    - **Mesa de Crafteo Colocable (`BLOCK.CRAFTING_TABLE`, `openCraftingTable`):** Se fabrica con `4× Tablones de Madera` en la cuadrícula `2×2` (y también se genera en las *Cabañas de Explorador*). Al colocarla en el mundo y hacer **clic derecho** sobre ella, abre la interfaz con la **cuadrícula completa `3×3`** necesaria para fabricar picos, espadas, arcos, pistones, raíles, vagonetas, barcas y cofres.
    - **Cofres de 27 Ranuras (`BLOCK.CHEST`, `#chest-modal`):** Al abrir un cofre se muestran las **27 ranuras (`3×9`) del cofre** arriba y las **27 ranuras de mochila + 9 de barra rápida** del jugador abajo, permitiendo **Clic Izquierdo** (coger/dejar/intercambiar pila en `#mc-cursor-item`), **Clic Derecho** (dividir pila a la mitad o dejar 1 unidad) y **`Shift + Clic` / Botón `⚡ Mover Rápido`** para transferir objetos instantáneamente.

---

## 6. Registro de Coste en FPS por Funcionalidad (PC de Referencia)

Dado que el navegador limita el refresco visual a **60 FPS (VSync = `16.67 ms` por frame)**, el impacto de cada funcionalidad se mide en este PC de referencia usando tres métricas complementarias:
1. **Tiempo real por frame (`ms` / `µs`).**
2. **Coste en FPS sobre el presupuesto de 60 Hz (`(ms / 16.67) × 60`)**: indica cuántos "FPS de los 60 disponibles" consume cada subsistema. Mientras la suma total sea inferior a `60.00 FPS` (`16.67 ms`), el juego se mantiene clavado a **60 FPS reales (0 FPS perdidos en pantalla)**.
3. **% del presupuesto de 16.67 ms** y **FPS teóricos sin límite VSync (`1000 / ms`)**.

### Hardware del PC de Referencia Actual
- **CPU:** `AMD Ryzen 7 5800X 8-Core Processor` (`16` hilos lógicos, `navigator.hardwareConcurrency = 16`)
- **GPU (WebGL):** `ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x0000220A) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **Escena estándar:** Distancia de render 5 (`~81-145 chunks`, `~50% descartados por Frustum Culling`, `~22-41 draw calls`)
- *(Nota histórica: En sesiones anteriores se midió sobre un portátil Linux con GPU integrada Intel MTL donde el total de los Puntos 1–20 era `0.140 ms` / `0.39 ms` Worker; a continuación se registran de forma homogénea los 16 subsistemas por frame y 5 operaciones bajo demanda de los **Puntos 1–26** medidos directamente en este PC con Ryzen 7 5800X + RTX 3080).*

### A. Coste por Frame (Subsistemas que se ejecutan cada frame a 60 Hz)

| Funcionalidad / Subsistema | Etapa | Tiempo / Frame | Coste sobre 60 FPS | % de 16.67 ms | Impacto en FPS Reales (VSync) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **Render WebGL + Shaders GPU** *(Viento en vegetación/nenúfares, olas 3D, lava, vórtice en portales, hielo, amatista, hongos bio)* | Base + Puntos 2, 6, 13, 21, 24 y 26 | `134.2 µs` (`0.134 ms`) | **`-0.483 FPS`** (de 60) | `0.80 %` | **0 FPS** (60 FPS clavados) |
| **Clima Dinámico (`InstancedMesh` 180 trazas)** *(Lluvia/Nieve por bioma + chequeo techo `sunLight`)* | Punto 7 | `30.8 µs` (`0.031 ms`) | **`-0.111 FPS`** (de 60) | `0.18 %` | **0 FPS** (60 FPS clavados) |
| **Criaturas (Mobs)** *(IA, colisión AABB, iluminación y animación de Ovejas, Cerdos, Zombis, Esqueletos Arqueros, Creepers y Gólems)* | Puntos 1, 19 y 25 | `18.5 µs` (`0.0185 ms`) | **`-0.067 FPS`** (de 60) | `0.11 %` | **0 FPS** (60 FPS clavados) |
| **Minimapa Radar 2D + Balizas GPS (Amortizado a 10 Hz)** *(Copia `Uint32Array` $O(1)$ `ch.mapColors` + radar mobs + brújula 360°)* | Puntos 9 y 20 | `12.8 µs` (`0.0128 ms`) | **`-0.046 FPS`** (de 60) | `0.08 %` | **0 FPS** (60 FPS clavados) |
| **Drops 3D Flotantes e Imantados (`InstancedMesh`)** *(Gravedad, giro, bobbing e imán de 8-64 drops)* | Punto 3 | `8.0 µs` (`0.008 ms`) | **`-0.029 FPS`** (de 60) | `0.05 %` | **0 FPS** (60 FPS clavados) |
| **Smart Frustum Culling 3D (`Box3` vs `Frustum`)** *(Oculta ~50% de chunks y mobs traseros)* | Punto 11 | `6.6 µs` (`0.0066 ms`) | **`-0.024 FPS`** (de 60) | `0.04 %` | **0 FPS** (ahorra ~50% draw calls GPU) |
| **Físicas del Jugador + Escudo + Hielo (`ICE`) + Escalada (`LADDER`) + Avatar 3ªP + Slime Bounce** | Base + Puntos 14, 15, 16, 25 y 26 | `4.2 µs` (`0.0042 ms`) | **`-0.015 FPS`** (de 60) | `0.03 %` | **0 FPS** (60 FPS clavados) |
| **Barcas Navegables 3D (`updateBoats`, `BLOCK.ITEM_BOAT`)** *(Física de navegación sobre agua y balanceo)* | Punto 21 | `1.8 µs` (`0.0018 ms`) | **`-0.006 FPS`** (de 60) | `0.011 %` | **0 FPS** (60 FPS clavados) |
| **Flechas Balísticas 3D y Gancho de Agarre (`arrowInstanced`)** *(Trayectoria parabólica, rebote en escudo y tracción elástica)* | Puntos 8, 23 y 25 | `1.6 µs` (`0.0016 ms`) | **`-0.006 FPS`** (de 60) | `0.010 %` | **0 FPS** (60 FPS clavados) |
| **Pool de Partículas `InstancedMesh`** *(120 instancias en 1 draw call)* | Base | `1.6 µs` (`0.0016 ms`) | **`-0.006 FPS`** (de 60) | `0.010 %` | **0 FPS** (60 FPS clavados) |
| **Raycast Vóxel 3D (DDA)** *(Selección de bloque a 6.5m)* | Base | `1.3 µs` (`0.0013 ms`) | **`-0.005 FPS`** (de 60) | `0.008 %` | **0 FPS** (60 FPS clavados) |
| **Música Generativa C418 FM + Paisaje Sonoro (`Web Audio API`)** *(DSP en hilo nativo de audio)* | Punto 4 | `1.0 µs` (`0.0010 ms`) | **`-0.004 FPS`** (de 60) | `0.006 %` | **0 FPS** (60 FPS clavados) |
| **Cielo Dinámico** *(Sol y Luna redondos `SphereGeometry`, órbita continua, color atmosférico de Sol/Cielo/Nubes y `uSunLightColor` en GPU)* | Punto 1 | `1.3 µs` (`0.0013 ms`) | **`-0.005 FPS`** (de 60) | `0.008 %` | **0 FPS** (60 FPS clavados) |
| **Actualización CPU de Shaders GPU + Detección Subacuática/Lava** | Puntos 2 y 6 | `0.5 µs` (`0.0005 ms`) | **`-0.002 FPS`** (de 60) | `0.003 %` | **0 FPS** (60 FPS clavados) |
| **Cola de Simulación Vóxel (`Tick Queue`) + Cultivos + Redstone** *(Árboles, Trigo, Arena, Agua, Lava, TNT, Pistones, Puertas, Trampillas)* | Puntos 1, 6, 10, 12, 14, 16 y 22 | `0.5 µs` (`0.0005 ms`) | **`-0.002 FPS`** (de 60) | `0.003 %` | **0 FPS** (60 FPS clavados) |
| **Vagonetas 3D y Físicas de Vías (`BLOCK.RAIL`)** *(Avance en rectas, giro 90° en curvas y pendientes)* | Punto 17 | `0.2 µs` (`0.0002 ms`) | **`-0.001 FPS`** (de 60) | `0.001 %` | **0 FPS** (60 FPS clavados) |
| **TOTAL ACUMULADO POR FRAME (16 subsistemas)** | **Puntos 1–27** | **`0.207 ms`** | **`-0.74 FPS` (de 60)** | **`1.24 %`** | **60 FPS fijos (sobra >98.7% del frame · ~4,839 FPS sin VSync)** |

### B. Coste de Operaciones Puntuales (Bajo Demanda / Al Cargar o Modificar un Chunk)

| Operación Puntual | Tiempo Medio en este PC | % de 1 Frame (16.67 ms) | Notas de Optimización |
| :--- | ---: | ---: | :--- |
| **Generar Datos de 1 Chunk** *(Terreno + Biomas + Hielo/Nenúfares + Cuevas 3D Trilineales $4\times4\times4$ + Lava + Pirámides/Cabañas)* | `0.12 ms` | `0.7 %` | La interpolación trilineal $4\times4\times4$ evalúa el ruido 3D solo 425 veces en lugar de $16\,384$. |
| **Iluminación Vóxel Flood-Fill BFS (1 Chunk)** *(Sol + Antorchas/Lava/Redstone/Portales en 1 byte + Caché Minimapa `ch.mapColors`)* | `0.46 ms` | `2.8 %` | Cola tipada estática `Int32Array` sin asignaciones en el *Garbage Collector* y pre-cálculo simultáneo del color topográfico de superficie. |
| **Meshing de Chunk vía `Web Worker` (`Blob` + `Transferable`)** *(Coste en Hilo Principal: pack + subir a GPU)* | **`0.34 ms`** | **`2.1 %`** | **Reducción del 91.2% (`11.4×` más rápido en hilo principal)** frente al meshing síncrono (`3.90 ms`) gracias a copia por filas contiguas de `1,024` bytes y transferencia *Zero-Copy* de `Float32Array` / `Uint32Array`. |
| **Construcción Síncrona de Malla de 1 Chunk (`buildChunkMeshArrays`)** *(Edición instantánea de bloque por el jugador)* | `3.90 ms` | `23.4 %` | Se usa de forma síncrona solo al picar/colocar un bloque para respuesta visual en `0 frames` de latencia. |
| **Pistón Mecánico Redstone (`triggerVoxelPiston`)** *(Empuje de fila de hasta 4 bloques en lote)* | `0.037 ms` (`36.7 µs`) | `0.2 %` | Desplaza toda la cadena de bloques con `setVoxelRawNoRebuild` y reconstruye una sola vez al final. |
| **Detonación de TNT (`explodeAt`)** *(Cráter + Onda expansiva + Reconstrucción por lotes)* | `~2.8 ms` (1 sola vez al explotar) | `16.8 %` | Gracias a `setVoxelRawNoRebuild` + `rebuildAffectedChunksSet`, reconstruye el cráter entero en una única pasada en vez de 180 veces. |
