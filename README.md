# VoxelCraft HTML5

Motor de vóxeles estilo Minecraft contenido íntegramente en un único archivo [`index.html`](index.html), optimizado para funcionar en **PC (teclado y ratón)** y **Móvil/Tablet (controles multitáctiles)** sin recursos externos.

🎮 **Jugar ahora:** [https://sergiroig.github.io/voxelcraft/](https://sergiroig.github.io/voxelcraft/)

## Características principales

- **Hidden Face Culling + Oclusión Ambiental por Vértice (AO):** Genera 1 sola malla (`BufferGeometry`) por chunk para bloques sólidos y 1 para agua.
- **Iluminación Vóxel Real (Flood-Fill BFS en 1 byte):** 4 bits de luz solar + 4 bits de luz cálida de bloques (antorchas y piedra luminosa) horneados en vértices sin luces dinámicas en GPU.
- **Cuevas 3D con Interpolación Trilineal $4\times4\times4$:** Excavación procedural de cavernas, 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada*) y vetas de minerales por profundidad (*Carbón, Hierro, Oro, Diamante*).
- **Rotura Progresiva + Partículas (`InstancedMesh`):** 8 fases de grietas según la dureza del bloque, multiplicador de velocidad con el Pico de Diamante y *pool* estático de 120 partículas en 1 sola llamada de dibujo.
- **Mundo Vivo, Físicas Vóxel y TNT:** Criaturas optimizadas con geometría compartida (*Ovejas, Cerdos y Zombis nocturnos*), cola de simulación (`Tick Queue`) para caída de arena y expansión de agua, bloques de **TNT** con encendido y reacciones en cadena, y cielo dinámico con Sol/Luna cúbicos, estrellas y nubes 3D en 1 *draw call*.
- **Shaders en GPU (Coste 0 en CPU):** Viento en tiempo real sobre hojas, flores y hierba alta (manteniendo las raíces ancladas al bloque), parpadeo cálido en antorchas/piedra luminosa, destellos en menas de oro y diamante, olas 3D con espuma/cáusticas en el agua y atmósfera subacuática al sumergirse.
- **Drops 3D Imantados, Supervivencia y Crafteo:** Mini-bloques 3D flotantes (`InstancedMesh` de 64 instancias en 1 *draw call*) con atracción magnética al jugador, modos Supervivencia y Creativo (`G` / `⚒`) y Mesa de Crafteo Rápido (`E`) con 8 recetas.
- **Controles Híbridos (PC + Móvil):** Captura de ratón (`Pointer Lock`) en escritorio y joystick virtual analógico + cámara multitáctil + botones de acción en pantallas táctiles.
- **Persistencia Delta:** Guarda automáticamente en `localStorage` únicamente la semilla y los bloques modificados, con opción de exportar el mundo en `.json`.
- **Suite de Tests Automatizados + Benchmark de FPS ([`test.html`](test.html)):** Batería de 26 tests E2E/unitarios y profiler de coste en FPS por subsistema en tiempo real (`window.__VOXELCRAFT__`).
