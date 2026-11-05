# VoxelCraft HTML5

Motor de vóxeles estilo Minecraft contenido íntegramente en un único archivo [`index.html`](index.html), optimizado para funcionar en **PC (teclado y ratón)** y **Móvil/Tablet (controles multitáctiles)** sin recursos externos.

🎮 **Jugar ahora:** [https://sergiroig.github.io/voxelcraft/](https://sergiroig.github.io/voxelcraft/)

## Características principales

- **Hidden Face Culling + Oclusión Ambiental por Vértice (AO):** Genera 1 sola malla (`BufferGeometry`) por chunk para bloques sólidos y 1 para agua.
- **Iluminación Vóxel Real (Flood-Fill BFS en 1 byte):** 4 bits de luz solar + 4 bits de luz cálida de bloques (antorchas y piedra luminosa) horneados en vértices sin luces dinámicas en GPU.
- **Cuevas 3D con Interpolación Trilineal $4\times4\times4$:** Excavación procedural de cavernas, 4 biomas (*Llanura, Bosque, Desierto, Taiga Nevada*) y vetas de minerales por profundidad (*Carbón, Hierro, Oro, Diamante*).
- **Rotura Progresiva + Partículas (`InstancedMesh`):** 8 fases de grietas según la dureza del bloque, multiplicador de velocidad con el Pico de Diamante y *pool* estático de 120 partículas en 1 sola llamada de dibujo.
- **Mundo Vivo, Físicas Vóxel y TNT:** Criaturas optimizadas con geometría compartida (*Ovejas, Cerdos y Zombis nocturnos*), cola de simulación (`Tick Queue`) para caída de arena y expansión de agua, bloques de **TNT** con encendido y reacciones en cadena, y cielo dinámico con Sol/Luna cúbicos, estrellas y nubes 3D en 1 *draw call*.
- **Controles Híbridos (PC + Móvil):** Captura de ratón (`Pointer Lock`) en escritorio y joystick virtual analógico + cámara multitáctil + botones de acción en pantallas táctiles.
- **Persistencia Delta:** Guarda automáticamente en `localStorage` únicamente la semilla y los bloques modificados, con opción de exportar el mundo en `.json`.
- **Suite de Tests Automatizados ([`test.html`](test.html)):** Batería de 22 tests E2E y unitarios en tiempo real sobre el motor WebGL (`window.__VOXELCRAFT__`).
