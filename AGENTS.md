# AGENTS.md — Guía y Reglas del Proyecto VoxelCraft HTML5

Este documento contiene las reglas de arquitectura, restricciones de rendimiento, flujo de tests y contexto del proyecto para cualquier agente o sesión de chat que trabaje en **VoxelCraft HTML5**.

---

## 1. Información General y Ubicación

- **Ruta local del proyecto:** `/home/sergiroig@TierraZen.local/code/personal/voxelcraft`
- **Repositorio GitHub:** [`https://github.com/sergiroig/voxelcraft`](https://github.com/sergiroig/voxelcraft) (`git@github.com:sergiroig/voxelcraft.git`)
- **URL pública (GitHub Pages):** [`https://sergiroig.github.io/voxelcraft/`](https://sergiroig.github.io/voxelcraft/)
- **URL de la suite de tests:** [`https://sergiroig.github.io/voxelcraft/test.html`](https://sergiroig.github.io/voxelcraft/test.html)
- **Idioma de comunicación:** Español siempre.
- **Archivos del repositorio:**
  - [`index.html`](index.html): Motor completo del juego (HTML + CSS + JS + WebGL/Three.js + Web Audio API).
  - [`test.html`](test.html): Runner de tests E2E y unitarios en tiempo real sobre el motor.
  - [`README.md`](README.md): Descripción general del repositorio.
  - [`AGENTS.md`](AGENTS.md): Este archivo de referencia.

---

## 2. Reglas de Oro del Proyecto (Inquebrantables)

### Regla 1: Archivo Único Autónomo (`index.html`)
- **Todo el juego debe residir en un único archivo [`index.html`](index.html)** sin dependencias de archivos externos (prohibido usar imágenes `.png`/`.jpg` externas, archivos de audio `.mp3`/`.ogg`, hojas `.css` o scripts `.js` separados), con la única excepción del CDN de `Three.js r128`.
- Todas las texturas se generan proceduralmente en memoria mediante Canvas 2D (`createProceduralAtlas`, `createCrackTextures`) y todos los efectos de sonido/música se sintetizan en tiempo real con `Web Audio API` (`SoundFX`).
- Si en el futuro se utilizan `Web Workers`, deben crearse *inline* a partir de un `Blob` (`URL.createObjectURL(new Blob([...]))`) dentro del propio `index.html`.

### Regla 2: Optimización Extrema (Zero-GC y Mínimos Draw Calls)
Cada funcionalidad nueva debe diseñarse bajo la premisa de **máximo rendimiento en CPU, GPU y memoria**:
1. **Datos planos por Chunk:** Cada chunk ($16 \times 64 \times 16 = 16\,384$ vóxeles) almacena sus bloques en un `Uint8Array(16384)` (`chunks`) y su iluminación en otro `Uint8Array(16384)` (`chunkLights`).
2. **Prohibido crear un `Mesh` por bloque:** Cada chunk genera como máximo **1 `BufferGeometry` para bloques opacos/recortados** y **1 `BufferGeometry` para el agua**, descartando caras ocultas (*Hidden Face Culling*).
3. **Cero presión al Garbage Collector (GC):** El *mesher* (`buildChunkMesh`) escribe sobre buffers tipados estáticos pre-asignados (`solidPos`, `solidNorm`, `solidUv`, `solidCol`, `solidIdx`, etc.) y solo recorta la vista exacta al subirla a GPU.
4. **Actualizaciones por lotes (Batching):** Cuando una acción modifique múltiples bloques a la vez (explosiones de TNT, caída de arena, flujo de agua, estructuras), usar **siempre** `setVoxelFast(x, y, z, id, recordDelta, affectedChunks)` y reconstruir los chunks afectados una única vez al final mediante `rebuildAffectedChunksSet(affectedChunks)`.
5. **Geometrías compartidas e Instancing:** Partículas (`InstancedMesh` de 120 instancias), nubes (malla fusionada única `cloudMesh`) y criaturas (`mobGeos` compartidos entre todas las entidades) deben minimizar los *draw calls* y el uso de VRAM.
6. **Aritmética entera de 32 bits en Hashes:** En funciones de hash/ruido determinista como `hash3D`, usar siempre `Math.imul(...)` en lugar del operador `*` antes de desplazamientos bit a bit para no perder precisión en los bits bajos por el límite de 53 bits de `Number` en JavaScript.

### Regla 3: Compatibilidad Híbrida PC + Móvil/Tablet
- El juego debe ser **100% jugable tanto en PC (ratón con `Pointer Lock` + teclado) como en dispositivos móviles/tablets (pantallas multitáctiles)**.
- Cualquier acción o mecánica nueva que añada un atajo de teclado o clic en PC **debe** tener su equivalente accesible desde la interfaz táctil (`#touch-controls`, botones en `#touch-action-col` o `#touch-top-bar`, o controles dentro del modal de inventario `#inventory-modal`).

### Regla 4: Testing, Reproducción de Bugs (TDD) y Benchmark de FPS Obligatorios en Chrome (`test.html`)
- El motor expone su API interna de pruebas en `window.__VOXELCRAFT__` (al final de [`index.html`](index.html)).
- **Toda funcionalidad nueva debe ir acompañada de nuevos tests en [`test.html`](test.html)** y de su entrada en el profiler de rendimiento (`perFrameFeatures` / `onDemandFeatures`).
- **Regla de Bugs (Primero Reproducir en Test, Luego Arreglar):** Siempre que se detecte o reporte un bug, **primero se debe escribir un test automatizado en [`test.html`](test.html) que reproduzca el fallo** (verificando en Chrome que el test falla con el bug presente) y **después implementar la corrección** hasta que toda la suite pase con `failed: 0`.
- **Antes de dar por terminada una tarea o hacer `git push`**, es obligatorio ejecutar [`test.html`](test.html) en Chrome (usando las herramientas MCP de `chrome_devtools`), comprobar que `window.__TEST_RESULTS__` devuelve **`failed: 0`** y **anotar el coste en FPS / tiempo por frame en la Sección 6 de este archivo (`AGENTS.md`)** tomando este PC como referencia.

### Regla 5: Git y Cuenta Personal de GitHub
- **Usar SIEMPRE la cuenta personal `sergiroig`**, **NUNCA** una organización de GitHub.
- Configuración de autor local en el repositorio:
  - `user.name`: `sergiroig`
  - `user.email`: `sergiroig@users.noreply.github.com`
- Hacer `git commit` y `git push origin main` tras verificar que los tests pasan en Chrome para mantener actualizado el despliegue en GitHub Pages.

---

## 3. Arquitectura Interna de `index.html`

| Subsistema | Funciones / Estructuras Clave | Descripción |
| :--- | :--- | :--- |
| **Coordenadas y Chunks** | `chunks`, `chunkLights`, `getChunkKey`, `getVoxel`, `setVoxel`, `setVoxelFast` | Chunks de $16 \times 64 \times 16$ con `RENDER_DISTANCE = 3` (49 chunks en torno al jugador). |
| **Terreno, Biomas, Cuevas 3D y Estructuras** | `generateChunkData`, `getBiomeAt`, `sampleCaveNoiseChunk`, `hash3D` | 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada*), cuevas 3D con interpolación trilineal $4\times4\times4$ (425 muestras por chunk en lugar de $16\,384$), lagos de lava en cuevas profundas (`y <= 11`), vetas de minerales (*Carbón, Hierro, Oro, Diamante*) y estructuras procedurales (*Pirámides del Desierto* con cámara secreta subterránea de tesoros + TNT, y *Cabañas de Explorador*). |
| **Iluminación Vóxel (1 Byte)** | `computeChunkLighting`, `getSunLight`, `getBlockLight`, `getEffectiveLight` | `chunkLights` empaqueta 4 bits altos (`>> 4`) para luz solar y 4 bits bajos (`& 15`) para luz cálida de bloques (antorchas, *Glowstone*, Lava y Lámparas Redstone) propagada por *Flood-Fill BFS* entre chunks, además de precalcular la caché topográfica `ch.mapColors` (`Uint32Array(256)`). |
| **Mesher + AO + X-Mesh** | `buildChunkMesh`, `vertexAO`, `FACE_DEFS` | Genera caras visibles con *Ambient Occlusion* en los 4 vértices (con giro de diagonal anti-artefactos) y geometría cruzada (`X-Mesh`) para flores, hierba alta, antorchas y palancas. |
| **Raycasting y Minado** | `raycastVoxel`, `updateMiningAndPlacement`, `spawnBlockParticles` | Algoritmo DDA 3D rápido, rotura progresiva en 8 fases según `hardness` (con multiplicador $\times 3.5$ usando el Pico de Diamante `ID 20`) y partículas con `InstancedMesh`. |
| **Simulación Vóxel, Lava, Obsidiana y TNT** | `simQueue`, `enqueueSimNeighbors`, `updateVoxelSimulation`, `igniteTNT`, `explodeAt` | Cola de simulación a 10 Hz: gravedad de arena, expansión de agua, flujo viscoso de lava, reacción química **Agua + Lava $\rightarrow$ Obsidiana** (`BLOCK.OBSIDIAN`) y encendido de bloques `BLOCK.TNT` con mecha parpadeante, reacciones en cadena y onda expansiva. |
| **Circuitos Vóxel / Redstone Ligero** | `toggleVoxelLever`, `propagateRedstoneSignal` | Palancas interactivas (`BLOCK.LEVER_OFF` / `BLOCK.LEVER_ON`) con coste 0 en reposo que conmutan Lámparas de Redstone (`BLOCK.REDSTONE_LAMP_OFF` / `ON`, luz BFS 15) y detonan TNT adyacente a distancia. |
| **Criaturas (Mobs), Combate y Proyectiles 3D** | `mobs`, `spawnMob`, `updateMobs`, `raycastMob`, `damageMob`, `arrowInstanced`, `shootArrow`, `updateArrows`, `eatHeldApple` | *Ovejas, Cerdos y Zombis* construidos con geometrías compartidas (`mobGeos`). Combate cuerpo a cuerpo con **Espada de Diamante** (`5 dmg` + *knockback*), disparo balístico parabólico con **Arco y Flechas 3D** (`InstancedMesh` de 24 instancias) y curación (`+4` corazones) con **Manzana Roja**. |
| **Cielo Dinámico y Clima por Bioma** | `sunMesh`, `moonMesh`, `starsPoints`, `cloudMesh`, `updateDynamicSky`, `weatherInstanced`, `setWeatherMode`, `updateWeather` | Ciclo día/noche (`T`), Sol/Luna cúbicos, estrellas y nubes 3D fusionadas. Clima dinámico (`V` / `🌧`: `clear`, `rain`, `storm`) con 180 trazas en 1 solo `InstancedMesh` que alterna automáticamente entre **Lluvia** y **Nieve** según el bioma/altitud, oculta precipitación bajo techo (`sunLight === 0`), incrementa el viento GPU y genera relámpagos con truenos. |
| **Shaders en GPU (Coste 0 CPU)** | `gpuShaderUniforms`, `solidMaterial.onBeforeCompile`, `waterMaterial.onBeforeCompile`, `updateGPUShaders` | Viento orgánico en flores/hierba alta (con raíz anclada `uv.y`) y hojas 3D sin grietas, baile de llama en antorchas, pulso incandescente de magma en `BLOCK.LAVA`, destello en menas de oro/diamante, olas 3D con espuma/cáusticas en el agua y atmósfera subacuática o de lava. |
| **Drops 3D, Supervivencia y Crafteo** | `dropInstanced`, `itemDrops`, `spawnItemDrop`, `updateItemDrops`, `CRAFTING_RECIPES`, `craftRecipe`, `toggleGameMode` | Pool `InstancedMesh` de 64 mini-bloques 3D flotantes e imantados en 1 *draw call*, inventario con cantidades en Supervivencia (`G` para alternar con Creativo `∞`) y 12 recetas de crafteo rápido en el modal `E`. |
| **Minimapa Radar 2D, Semillas y Teletransporte** | `updateMinimap`, `ch.mapColors`, `applyWorldSeed`, `teleportToBiome` | Radar topográfico en tiempo real (`68×68 px` a 10 Hz) con lectura $O(1)$ desde `Uint32Array`, sombreado de altitud, puntos de radar para criaturas/zombis y cono de visión, más selector de semilla personalizada y teletransporte instantáneo a biomas. |
| **Música C418 + Paisaje Sonoro** | `SoundFX`, `C418_SCALE_HZ`, `C418_CHORDS`, `triggerMusicChord`, `playCaveEcho`, `updateAmbientAudio`, `toggleMusic` | Sintetizador FM de piano cálido + *Reverb* algorítmica estéreo (`ConvolverNode` de 2s) + generador continuo de brisa/lluvia/cueva/agua en el hilo de audio nativo (`M` / `🎵` para silenciar). |
| **`Web Worker` Multihilo + Escalado Dinámico** | `meshWorker`, `packChunkPaddedBuffers`, `requestChunkMeshWorker`, `updateDynamicResolution` | Worker *inline* (`Blob URL`) que reutiliza `buildChunkMeshArrays.toString()` con transferencia *Zero-Copy* (`Transferable` `ArrayBuffer`) de una región $18 \times 64 \times 18$ (`20,736` bytes), reduciendo el coste en el hilo principal de `~7.77-9.85 ms` a `~0.70-0.88 ms` (`11.2×` más rápido). Escalado dinámico de `PixelRatio` (`0.65`–`1.5`) si los FPS bajan de 45. |
| **Controles Híbridos** | `updateJoystickFromTouch`, `setTouchPlaying`, `joyX`, `joyY` | Captura de ratón (`Pointer Lock`) en PC y joystick virtual analógico + cámara multitáctil + barra de botones en móvil/tablet. |
| **Persistencia Delta** | `worldDeltas`, `saveWorldState`, `loadWorldState`, `exportWorldJSON` | Guarda en `localStorage` únicamente la semilla (`WORLD_SEED`) y los bloques modificados por el usuario. |

---

## 4. Cómo Ejecutar los Tests Automatizados en Chrome

Para validar cambios con el navegador Chrome mediante `chrome_devtools`:

1. **Iniciar un servidor HTTP local temporal** en el directorio del proyecto:
   ```bash
   python3 -m http.server 8765 --directory "/home/sergiroig@TierraZen.local/code/personal/voxelcraft"
   ```
2. **Abrir o recargar `http://127.0.0.1:8765/test.html`** en Chrome con las herramientas MCP de `chrome_devtools` (`new_page` o `evaluate_script`).
3. **Inspeccionar el resultado automatizado** evaluando en la página:
   ```js
   async () => {
     window.__TEST_RESULTS__ = null;
     document.getElementById('game-frame').src = 'index.html?t=' + Date.now();
     for (let i = 0; i < 60; i++) {
       await new Promise(r => setTimeout(r, 200));
       if (window.__TEST_RESULTS__) return window.__TEST_RESULTS__;
     }
     return { error: 'Timeout waiting for __TEST_RESULTS__' };
   }
   ```
4. **Verificar que `failed === 0`** y detener el servidor HTTP temporal al finalizar.

---

## 5. Hoja de Ruta (Estado de Mejoras Optimizadas)

1. ✅ **Punto 1 — Mundo Vivo y Físicas Vóxel (Completado):**
   - Criaturas optimizadas con geometría compartida (*Ovejas, Cerdos, Zombis*) y combate con *knockback*.
   - Físicas vóxel por cola de eventos (`Tick Queue`): gravedad de arena y expansión de agua.
   - Bloques de **TNT** con mecha, reacciones en cadena y cráteres en 1 sola pasada de reconstrucción.
   - Cielo dinámico: Sol/Luna cúbicos, estrellas y nubes 3D en 1 *draw call*.
2. ✅ **Punto 2 — Shaders en GPU (`Coste 0 en CPU`, Completado):**
   - Inyección en el *Vertex/Fragment Shader* (`onBeforeCompile`) pre-compilada al inicio (`renderer.compile`) para mecer hojas, flores y hierba alta con el viento usando `uTime`, animar llamas de antorchas y añadir destellos en menas de oro/diamante.
   - Olas 3D de doble octava, cáusticas y espuma en las crestas del agua.
   - Niebla y atmósfera subacuática automática al sumergir la cámara (`isCameraUnderwater`).
3. ✅ **Punto 3 — Jugabilidad, Drops 3D y Crafteo (Completado):**
   - **Mini-bloques 3D flotantes e imantados (*Item Drops*):** Al picar un bloque o derrotar un mob, suelta un mini-cubo rotando (`InstancedMesh` de 64 instancias = 1 *draw call*) que es atraído magnéticamente hacia el jugador a `< 2.8m`.
   - **Modo Supervivencia vs. Creativo (`G` / `⚒`):** Cantidades reales de bloques en el inventario al jugar en Supervivencia y bloques infinitos (`∞`) en Creativo.
   - **Sistema de Crafteo Rápido:** 8 recetas directas en el inventario (`E`) para fabricar Madera, Antorchas, Ladrillos, Cristal, Piedra Luminosa, TNT, Piedra Lisa y Pico de Diamante.
4. ✅ **Punto 4 — Audio y Música Ambiental Generativa (Web Audio API, Completado):**
   - Música ambiental estilo *C418* generada proceduralmente con acordes arpegiados en escala de Re Mayor / Sol Lidio (`Dmaj7, Gadd9, A6, Bm7`) en un sintetizador FM de piano cálido + *reverb* algorítmica estéreo (`ConvolverNode`).
   - Paisaje sonoro dinámico que adapta el filtro en tiempo real entre brisa exterior (`surface`), resonancia y ecos cristalinos en cuevas oscuras (`cave`) y sonido subacuático (`underwater`), conmutable con `M` / `🎵`.
5. ✅ **Punto 5 — Rendimiento Extremo (Multihilo y Escalado Dinámico, Completado):**
   - **`Web Worker` inline** (mediante `Blob URL` en el mismo `index.html`) con `Transferable` `ArrayBuffer` (*Zero-Copy*) que empaqueta el chunk $18 \times 64 \times 18$ por filas contiguas y delega el *meshing* (`buildChunkMeshArrays`) fuera del hilo principal (`0.70-0.88 ms` en hilo principal frente a `7.77-9.85 ms` síncrono = **reducción del 91% / 11.2× más rápido**).
   - **Escalado dinámico de resolución (`Dynamic Pixel Ratio`, `updateDynamicResolution`)** que adapta automáticamente `renderer.setPixelRatio` entre `0.65` y `1.5` si los FPS bajan de 45 y lo restaura al recuperar $\ge 56$ FPS.
6. ✅ **Punto 6 — Estructuras Procedurales, Lava Fluida y Reacción Agua + Lava → Obsidiana (Completado):**
   - **Pirámides del Desierto** con cámara secreta subterránea de tesoros (`Gold`, `Diamond`, `Glowstone`, `TNT`) y **Cabañas de Explorador** en bosque/llanura con iluminación real (`BLOCK.TORCH`).
   - **Lava incandescente (`BLOCK.LAVA`)** en cavernas profundas (`y <= 11`) que emite luz máxima (`15`) en el BFS vóxel, tiene animación de magma en el shader GPU, quema en Supervivencia y al entrar en contacto con el agua se solidifica formando **Obsidiana (`BLOCK.OBSIDIAN`, dureza 9.5)**.
7. ✅ **Punto 7 — Clima Dinámico por Bioma (`1 Draw Call`, Completado):**
   - **Lluvia, Nieve y Tormentas Eléctricas (`V` / `🌧`):** Pool `InstancedMesh` de 180 trazas que alterna entre gotas de lluvia y copos de nieve según el bioma (*Taiga Nevada* / alta montaña), oculta precipitación bajo techo (`getSunLight === 0`), incrementa `uWindStrength` en el shader de vegetación y genera relámpagos con truenos reverberados.
8. ✅ **Punto 8 — Herramientas Especializadas, Arco con Flechas 3D y Curación (Completado):**
   - **Espada de Diamante (`BLOCK.TOOL_SWORD`):** `5` de daño cuerpo a cuerpo (derrota zombis de 2 golpes) con *knockback* reforzado.
   - **Arco y Flechas Balísticas 3D (`BLOCK.TOOL_BOW`, `arrowInstanced`):** Proyectiles 3D con trayectoria parabólica, impacto contra criaturas a distancia, detonación remota de bloques `BLOCK.TNT` y clavado en bloques sólidos.
   - **Manzana Roja (`BLOCK.ITEM_APPLE`):** Consumible que restaura `+4` corazones de salud al usar clic derecho o al seleccionarla y pulsar acción.
9. ✅ **Punto 9 — Minimapa Radar 2D Topográfico + Semillas y Teletransporte (Completado):**
   - **Minimapa Radar 2D (`#minimap-canvas`, `68×68 px` a 10 Hz):** Utiliza una caché `Uint32Array(256)` (`ch.mapColors`) precalculada durante el pase de luz solar para copiar el terreno en $O(1)$ por píxel (`0.0148 ms/frame` amortizado), mostrando relieve de alturas, criaturas cercanas y el cono de visión del jugador.
   - **Selector de Semilla Personalizada y Teletransporte a Biomas** integrado en el modal `E`.
10. ✅ **Punto 10 — Circuitos Vóxel / Redstone Ligero (`Coste 0 en Reposo`, Completado):**
    - **Palanca (`BLOCK.LEVER_OFF` / `BLOCK.LEVER_ON`) y Lámpara de Redstone (`BLOCK.REDSTONE_LAMP_OFF` / `BLOCK.REDSTONE_LAMP_ON`):** Conmutación instantánea por eventos (`toggleVoxelLever` + `propagateRedstoneSignal`) que enciende lámparas (luz BFS 15) y activa bloques de TNT a distancia sin ningún bucle por frame.

---

## 6. Registro de Coste en FPS por Funcionalidad (PC de Referencia)

Dado que el navegador limita el refresco visual a **60 FPS (VSync = `16.67 ms` por frame)**, el impacto de cada funcionalidad se mide en este PC de referencia usando tres métricas complementarias:
1. **Tiempo real por frame (`ms` / `µs`).**
2. **Coste en FPS sobre el presupuesto de 60 Hz (`(ms / 16.67) × 60`)**: indica cuántos "FPS de los 60 disponibles" consume cada subsistema. Mientras la suma total sea inferior a `60.00 FPS` (`16.67 ms`), el juego se mantiene clavado a **60 FPS reales (0 FPS perdidos en pantalla)**.
3. **% del presupuesto de 16.67 ms** y **FPS teóricos sin límite VSync (`1000 / ms`)**.

### Hardware del PC de Referencia
- **CPU:** 22 hilos lógicos (`navigator.hardwareConcurrency = 22`, Intel Core Ultra / Meteor Lake)
- **GPU (WebGL):** `ANGLE (Intel, Mesa Intel(R) Graphics (MTL), OpenGL ES 3.2)`
- **Escena estándar:** Distancia de render 5 (`~81-145 chunks`, `~77,700 triángulos`, `~41 draw calls`)

### A. Coste por Frame (Subsistemas que se ejecutan cada frame a 60 Hz)

| Funcionalidad / Subsistema | Etapa | Tiempo / Frame | Coste sobre 60 FPS | % de 16.67 ms | Impacto en FPS Reales (VSync) |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **Render WebGL + Shaders GPU** *(Viento en vegetación, olas 3D, espuma, lava, menas)* | Base + Puntos 2 y 6 | `201.7 µs` (`0.202 ms`) | **`-0.726 FPS`** (de 60) | `1.21 %` | **0 FPS** (60 FPS clavados) |
| **Criaturas (Mobs)** *(IA, colisión AABB, iluminación y animación de 6-10 mobs)* | Punto 1 | `41.0 µs` (`0.041 ms`) | **`-0.148 FPS`** (de 60) | `0.25 %` | **0 FPS** (60 FPS clavados) |
| **Clima Dinámico (`InstancedMesh` 180 trazas)** *(Lluvia/Nieve por bioma + chequeo techo `sunLight`)* | Punto 7 | `33.6 µs` (`0.034 ms`) | **`-0.121 FPS`** (de 60) | `0.20 %` | **0 FPS** (60 FPS clavados) |
| **Drops 3D Flotantes e Imantados (`InstancedMesh`)** *(Gravedad, giro, bobbing e imán de 8-64 drops)* | Punto 3 | `18.8 µs` (`0.019 ms`) | **`-0.068 FPS`** (de 60) | `0.11 %` | **0 FPS** (60 FPS clavados) |
| **Minimapa Radar 2D Topográfico (Amortizado a 10 Hz)** *(Copia `Uint32Array` $O(1)$ `ch.mapColors` + radar mobs)* | Punto 9 | `14.8 µs` (`0.015 ms`) | **`-0.053 FPS`** (de 60) | `0.09 %` | **0 FPS** (60 FPS clavados) |
| **Físicas del Jugador + Colisión AABB** | Base | `2.2 µs` (`0.002 ms`) | **`-0.008 FPS`** (de 60) | `0.01 %` | **0 FPS** (60 FPS clavados) |
| **Música Generativa C418 FM + Paisaje Sonoro (`Web Audio API`)** *(DSP en hilo nativo de audio)* | Punto 4 | `1.7 µs` (`0.002 ms`) | **`-0.006 FPS`** (de 60) | `0.01 %` | **0 FPS** (60 FPS clavados) |
| **Pool de Partículas `InstancedMesh`** *(120 instancias en 1 draw call)* | Base | `1.6 µs` (`0.002 ms`) | **`-0.006 FPS`** (de 60) | `0.01 %` | **0 FPS** (60 FPS clavados) |
| **Flechas Balísticas 3D (`arrowInstanced`)** *(Física parabólica, colisión con mobs/TNT)* | Punto 8 | `1.0 µs` (`0.001 ms`) | **`-0.004 FPS`** (de 60) | `0.006 %` | **0 FPS** (60 FPS clavados) |
| **Raycast Vóxel 3D (DDA)** *(Selección de bloque a 6.5m)* | Base | `0.8 µs` (`0.0008 ms`) | **`-0.003 FPS`** (de 60) | `0.005 %` | **0 FPS** (60 FPS clavados) |
| **Cielo Dinámico** *(Sol/Luna cúbicos, 220 estrellas y nubes 3D en 1 malla)* | Punto 1 | `0.3 µs` (`0.0003 ms`) | **`-0.001 FPS`** (de 60) | `0.002 %` | **0 FPS** (60 FPS clavados) |
| **Actualización CPU de Shaders GPU + Detección Subacuática/Lava** | Puntos 2 y 6 | `0.2 µs` (`0.0002 ms`) | **`-0.001 FPS`** (de 60) | `0.001 %` | **0 FPS** (60 FPS clavados) |
| **Cola de Simulación Vóxel (`Tick Queue`) + Redstone** *(Arena, Agua, Lava, Obsidiana, TNT y Palancas)* | Puntos 1, 6 y 10 | `0.2 µs` (`0.0002 ms`) | **`-0.001 FPS`** (de 60) | `0.001 %` | **0 FPS** (60 FPS clavados) |
| **TOTAL ACUMULADO POR FRAME (13 subsistemas)** | **Puntos 1–10** | **`0.318 ms`** | **`-1.14 FPS` (de 60)** | **`1.91 %`** | **60 FPS fijos (sobra >98% del frame · ~3,146 FPS sin VSync)** |

### B. Coste de Operaciones Puntuales (Bajo Demanda / Al Cargar o Modificar un Chunk)

| Operación Puntual | Tiempo Medio en este PC | % de 1 Frame (16.67 ms) | Notas de Optimización |
| :--- | ---: | ---: | :--- |
| **Generar Datos de 1 Chunk** *(Terreno + Biomas + Cuevas 3D Trilineales $4\times4\times4$ + Lava + Pirámides/Cabañas)* | `0.43 ms` | `2.6 %` | La interpolación trilineal $4\times4\times4$ evalúa el ruido 3D solo 425 veces en lugar de $16\,384$. |
| **Iluminación Vóxel Flood-Fill BFS (1 Chunk)** *(Sol + Antorchas/Lava/Redstone en 1 byte + Caché Minimapa `ch.mapColors`)* | `0.76 ms` | `4.6 %` | Cola tipada estática `Int32Array` sin asignaciones en el *Garbage Collector* y pre-cálculo simultáneo del color topográfico de superficie. |
| **Meshing de Chunk vía `Web Worker` (`Blob` + `Transferable`)** *(Coste en Hilo Principal: pack + subir a GPU)* | **`0.70 - 0.88 ms`** | **`4.2 % - 5.3 %`** | **Reducción del 91% (`11.2×` más rápido en hilo principal)** frente al meshing síncrono gracias a copia por filas contiguas de `1,024` bytes y transferencia *Zero-Copy* de `Float32Array` / `Uint32Array`. |
| **Construcción Síncrona de Malla de 1 Chunk (`buildChunkMeshArrays`)** *(Edición instantánea de bloque por el jugador)* | `7.77 - 9.85 ms` | `46.6 % - 59.1 %` | Se usa de forma síncrona solo al picar/colocar un bloque para respuesta visual en `0 frames` de latencia. |
| **Detonación de TNT (`explodeAt`)** *(Cráter + Onda expansiva + Reconstrucción por lotes)* | `~6.1 ms` (1 sola vez al explotar) | `36.6 %` | Gracias a `setVoxelRawNoRebuild` + `rebuildAffectedChunksSet`, reconstruye el cráter entero en una única pasada en vez de 180 veces. |

