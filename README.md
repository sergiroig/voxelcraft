# VoxelCraft HTML5

Motor de vóxeles estilo Minecraft contenido íntegramente en un único archivo [`index.html`](index.html), optimizado para funcionar en **PC (teclado y ratón)** y **Móvil/Tablet (controles multitáctiles)** sin recursos externos.

🎮 **Jugar ahora:** [https://sergiroig.github.io/voxelcraft/](https://sergiroig.github.io/voxelcraft/)

## Características principales

- **Hidden Face Culling + Oclusión Ambiental por Vértice (AO):** Genera 1 sola malla (`BufferGeometry`) por chunk para bloques sólidos y 1 para agua.
- **Iluminación Vóxel Real (Flood-Fill BFS en 1 byte):** 4 bits de luz solar + 4 bits de luz cálida de bloques (antorchas y piedra luminosa) horneados en vértices sin luces dinámicas en GPU.
- **Cuevas 3D con Interpolación Trilineal $4\times4\times4$ y Estructuras Procedurales:** Excavación procedural de cavernas con lagos de lava profunda, 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada*), vetas de minerales (*Carbón, Hierro, Oro, Diamante*), **Pirámides del Desierto** con cámara secreta subterránea de tesoros y **Cabañas de Explorador**.
- **Rotura Progresiva + Partículas (`InstancedMesh`):** 8 fases de grietas según la dureza del bloque, multiplicador de velocidad con el Pico de Diamante y *pool* estático de 120 partículas en 1 sola llamada de dibujo.
- **Mundo Vivo, Físicas Vóxel, Lava, Obsidiana y TNT:** Criaturas optimizadas con geometría compartida (*Ovejas, Cerdos y Zombis nocturnos*), cola de simulación (`Tick Queue`) para caída de arena, expansión de agua, flujo de **Lava incandescente** (luz 15) y solidificación **Agua + Lava $\rightarrow$ Obsidiana**, bloques de **TNT** con reacciones en cadena, y cielo dinámico con Sol/Luna cúbicos, estrellas y nubes 3D en 1 *draw call*.
- **Clima Dinámico por Bioma (`1 Draw Call`):** Lluvia, Nieve en *Taiga Nevada* y Tormentas Eléctricas (`V` / `🌧`) mediante un único `InstancedMesh` de 180 trazas con detección de techo (`sunLight === 0`), ráfagas de viento en GPU y relámpagos con truenos.
- **Shaders en GPU (Coste 0 en CPU):** Viento en tiempo real sobre hojas, flores y hierba alta (manteniendo las raíces ancladas al bloque), parpadeo cálido en antorchas/piedra luminosa, pulso de magma en la lava, destellos en menas de oro y diamante, olas 3D con espuma/cáusticas en el agua y atmósfera subacuática o de lava al sumergirse.
- **Combate Avanzado, Drops 3D Imantados, Supervivencia y Crafteo:** **Espada de Diamante** (`5 dmg`), **Arco con Flechas Balísticas 3D** (`InstancedMesh`), **Manzana Roja** curativa (`+4 ♥`), mini-bloques 3D flotantes (`InstancedMesh` de 64 instancias) con atracción magnética al jugador, modos Supervivencia y Creativo (`G` / `⚒`) y Mesa de Crafteo Rápido (`E`) con 12 recetas.
- **Circuitos Vóxel / Redstone Ligero (`Coste 0 en Reposo`):** **Palancas** interactivas (`X-Mesh`) y **Lámparas de Redstone** (luz BFS 15) capaces de iluminar estancias o detonar TNT a distancia instantáneamente.
- **Minimapa Radar 2D Topográfico + Selector de Semillas y Teletransporte:** Radar superior (`68×68 px` a 10 Hz, lectura $O(1)$ desde `Uint32Array`) con sombreado de alturas, radar de criaturas/zombis, cono de visión, cambio de semilla (`WORLD_SEED`) y viaje rápido a cualquier bioma.
- **Música Ambiental Generativa (Estilo C418) + Paisaje Sonoro:** Sintetizador FM de piano cálido con *Reverb* algorítmica estéreo (`ConvolverNode`) y sonido ambiental adaptativo (brisa en montañas, lluvia, ecos en cuevas profundas y filtro bajo el agua) procesado en el hilo nativo de Web Audio API (`M` / `🎵`).
- **`Web Worker` Multihilo (`Blob URL` + `Transferable` Zero-Copy) y Escalado Dinámico:** El *meshing* de chunks en streaming se ejecuta en un hilo secundario embebido en el propio `index.html`, reduciendo el tiempo en el hilo principal un **91% (`0.70 ms` vs `7.77 ms`)**, acompañado de ajuste automático de `PixelRatio` para garantizar 60 FPS constantes.
- **Controles Híbridos (PC + Móvil):** Captura de ratón (`Pointer Lock`) en escritorio y joystick virtual analógico + cámara multitáctil + botones de acción en pantallas táctiles.
- **Persistencia Delta:** Guarda automáticamente en `localStorage` únicamente la semilla y los bloques modificados, con opción de exportar el mundo en `.json`.
- **Suite de Tests Automatizados + Benchmark de FPS ([`test.html`](test.html)):** Batería de 42 tests E2E/unitarios (19 suites) y profiler de coste en FPS por subsistema en tiempo real (`window.__VOXELCRAFT__`).
