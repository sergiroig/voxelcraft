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

### Regla 4: Testing Obligatorio en Chrome (`test.html`)
- El motor expone su API interna de pruebas en `window.__VOXELCRAFT__` (al final de [`index.html`](index.html)).
- **Toda funcionalidad nueva debe ir acompañada de nuevos tests en [`test.html`](test.html)** que verifiquen su comportamiento de extremo a extremo.
- **Antes de dar por terminada una tarea o hacer `git push`**, es obligatorio ejecutar [`test.html`](test.html) en Chrome (usando las herramientas MCP de `chrome_devtools`) y comprobar que `window.__TEST_RESULTS__` devuelve **`failed: 0`** (100% de tests en verde).

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
| **Terreno, Biomas y Cuevas 3D** | `generateChunkData`, `getBiomeAt`, `sampleCaveNoiseChunk`, `hash3D` | 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada*), cuevas 3D con interpolación trilineal $4\times4\times4$ (425 muestras por chunk en lugar de $16\,384$) y vetas de minerales por profundidad (*Carbón, Hierro, Oro, Diamante*). |
| **Iluminación Vóxel (1 Byte)** | `computeChunkLighting`, `getSunLight`, `getBlockLight`, `getEffectiveLight` | `chunkLights` empaqueta 4 bits altos (`>> 4`) para luz solar y 4 bits bajos (`& 15`) para luz cálida de bloques (antorchas y *Glowstone*) propagada por *Flood-Fill BFS* entre chunks. |
| **Mesher + AO + X-Mesh** | `buildChunkMesh`, `vertexAO`, `FACE_DEFS` | Genera caras visibles con *Ambient Occlusion* en los 4 vértices (con giro de diagonal anti-artefactos) y geometría cruzada (`X-Mesh`) para flores, hierba alta y antorchas. |
| **Raycasting y Minado** | `raycastVoxel`, `updateMiningAndPlacement`, `spawnBlockParticles` | Algoritmo DDA 3D rápido, rotura progresiva en 8 fases según `hardness` (con multiplicador $\times 3.5$ usando el Pico de Diamante `ID 20`) y partículas con `InstancedMesh`. |
| **Simulación Vóxel y TNT** | `simQueue`, `enqueueSimNeighbors`, `updateVoxelSimulation`, `igniteTNT`, `explodeAt` | Cola de simulación a 10 Hz: gravedad de arena (1 bloque por tick con `movedThisTick`), expansión de agua y encendido de bloques `BLOCK.TNT` con mecha parpadeante, reacciones en cadena y onda expansiva. |
| **Criaturas (Mobs) y Combate** | `mobs`, `spawnMob`, `updateMobs`, `raycastMob`, `damageMob` | *Ovejas, Cerdos y Zombis* construidos con geometrías compartidas (`mobGeos`). Los zombis aparecen en oscuridad (`effLight < 7`), persiguen al jugador y arden al sol. |
| **Cielo Dinámico** | `sunMesh`, `moonMesh`, `starsPoints`, `cloudMesh`, `updateDynamicSky` | Ciclo día/noche continuo o conmutable (`T`), Sol y Luna cúbicos, estrellas nocturnas y nubes vóxel 3D fusionadas en una única llamada de dibujo. |
| **Shaders en GPU (Coste 0 CPU)** | `gpuShaderUniforms`, `solidMaterial.onBeforeCompile`, `waterMaterial.onBeforeCompile`, `updateGPUShaders` | Viento orgánico en flores/hierba alta (con raíz anclada `uv.y`) y hojas 3D sin grietas, baile de llama en antorchas, destello en menas de oro/diamante, olas 3D con espuma/cáusticas en el agua y atmósfera subacuática. |
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
3. ⏳ **Punto 3 — Jugabilidad, Drops 3D y Crafteo:**
   - **Mini-bloques 3D flotantes e imantados (*Item Drops*):** Al picar un bloque, soltar un mini-cubo rotando que es atraído hacia el jugador al acercarse.
   - **Modo Supervivencia vs. Creativo:** Cantidades reales de bloques en el inventario al jugar en Supervivencia y bloques infinitos + vuelo libre en Creativo.
   - **Sistema de Crafteo Rápido:** Recetas directas en el inventario (`E`) para fabricar tablones, antorchas, picos, espada, TNT, etc. a partir de los recursos recolectados.
4. ⏳ **Punto 4 — Audio y Música Ambiental Generativa (Web Audio API):**
   - Música ambiental estilo *C418* generada proceduralmente con acordes pentatónicos suaves en un sintetizador FM + *reverb* algorítmica.
   - Sonido ambiental dinámico: brisa en exteriores y eco en cuevas profundas.
5. ⏳ **Punto 5 — Rendimiento Extremo (Multihilo y Escalado Dinámico):**
   - **`Web Worker` inline** (mediante `Blob URL` en el mismo `index.html`) para delegar la generación de terreno, iluminación BFS y *meshing* fuera del hilo principal.
   - **Escalado dinámico de resolución (`Dynamic Pixel Ratio`)** para mantener 60 FPS estables en móviles de gama media/baja.
