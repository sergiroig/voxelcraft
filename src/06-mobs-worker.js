// VoxelCraft HTML5 — 06-mobs-worker.js (8D. OPTIMIZED MOB ENGINE, MESH UPLOAD & ZERO-COPY INLINE WEB WORKER)
'use strict';

// ============================================================================
// 8D. OPTIMIZED MOB ENGINE (12 MOB TYPES: SHEEP, PIG, COW, CHICKEN, WOLF, ZOMBIE, SKELETON, CREEPER, SPIDER, ENDERMAN, SLIME & GOLEM)
// ============================================================================
const MAX_MOBS = 16;
const mobs = [];
let mobSpawnTimer = 0;

// Procedural 35-tile Pixel-Art Mob Atlas (280x8 px, 0 external assets, 0 extra draw calls)
const MOB_ATLAS_TILES = 69, MOB_ATLAS_W = MOB_ATLAS_TILES * 8;
const mobAtlasCanvas = document.createElement('canvas');
mobAtlasCanvas.width = MOB_ATLAS_W;
mobAtlasCanvas.height = 8;
const mobCtx = mobAtlasCanvas.getContext('2d');
const paintMobTile = (t, base, alt, fn) => {
  const x0 = t * 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      mobCtx.fillStyle = ((x * 7 + y * 13 + t * 5) % 5 === 0) ? alt : base;
      mobCtx.fillRect(x0 + x, y, 1, 1);
    }
  }
  if (fn) fn((x, y, w, h, c) => { mobCtx.fillStyle = c; mobCtx.fillRect(x0 + x, y, w, h); });
};
// 0..5: Zombie (Face, HeadSide, CleanSkin, HairTop, Shirt, Pants/Shoes)
paintMobTile(0, '#4d7c43', '#3f6837', (r) => { r(0,0,8,2,'#273b22'); r(1,3,2,2,'#111827'); r(5,3,2,2,'#111827'); r(3,4,2,1,'#2e4f28'); r(2,6,4,1,'#1e293b'); });
paintMobTile(1, '#4d7c43', '#3f6837', (r) => { r(0,0,8,2,'#273b22'); });
paintMobTile(2, '#4d7c43', '#3f6837');
paintMobTile(3, '#273b22', '#1f351b');
paintMobTile(4, '#0e7490', '#0891b2', (r) => { r(3,0,2,2,'#3f6837'); r(2,1,4,1,'#164e63'); r(0,6,8,2,'#155e75'); });
paintMobTile(5, '#312e81', '#3730a3', (r) => { r(3,0,2,6,'#1e1b4b'); r(0,6,8,2,'#1e293b'); });
// 6..9: Skeleton (Skull Face, Ribcage, Bone, Wooden Bow)
paintMobTile(6, '#e2e8f0', '#cbd5e1', (r) => { r(1,3,2,2,'#0f172a'); r(5,3,2,2,'#0f172a'); r(3,5,2,1,'#1e293b'); r(1,6,6,1,'#334155'); r(2,6,1,1,'#f8fafc'); r(4,6,1,1,'#f8fafc'); r(6,6,1,1,'#f8fafc'); });
paintMobTile(7, '#1e293b', '#0f172a', (r) => { r(3,0,2,8,'#e2e8f0'); r(1,1,6,1,'#cbd5e1'); r(1,3,6,1,'#cbd5e1'); r(1,5,6,1,'#cbd5e1'); r(1,7,6,1,'#94a3b8'); });
paintMobTile(8, '#cbd5e1', '#94a3b8', (r) => { r(2,0,4,8,'#e2e8f0'); });
paintMobTile(9, '#92400e', '#78350f', (r) => { r(6,0,1,8,'#e2e8f0'); });
// 10..12: Creeper (Iconic Face, Clean Camo, Toed Foot)
paintMobTile(10, '#22c55e', '#16a34a', (r) => { r(0,1,2,1,'#4ade80'); r(6,0,2,2,'#4ade80'); r(1,2,2,2,'#090d0a'); r(5,2,2,2,'#090d0a'); r(3,4,2,3,'#090d0a'); r(2,5,1,3,'#090d0a'); r(5,5,1,3,'#090d0a'); });
paintMobTile(11, '#22c55e', '#15803d', (r) => { r(1,2,2,2,'#4ade80'); r(5,4,2,2,'#4ade80'); });
paintMobTile(12, '#22c55e', '#15803d', (r) => { r(1,7,2,1,'#0f172a'); r(5,7,2,1,'#0f172a'); });
// 13..15: Iron Golem (Red-Eyed Face, Vine-Clad Iron Chest, Clean Weathered Iron)
paintMobTile(13, '#cbd5e1', '#94a3b8', (r) => { r(1,2,6,1,'#334155'); r(1,3,2,1,'#dc2626'); r(5,3,2,1,'#dc2626'); r(2,3,1,1,'#facc15'); r(5,3,1,1,'#facc15'); });
paintMobTile(14, '#e2e8f0', '#cbd5e1', (r) => { r(0,0,8,1,'#94a3b8'); r(1,1,2,6,'#65a30d'); r(2,2,2,5,'#4d7c0f'); r(5,3,2,5,'#65a30d'); });
paintMobTile(15, '#cbd5e1', '#94a3b8', (r) => { r(0,0,8,1,'#e2e8f0'); });
// 16..18: Sheep (Face, Fluffy Wool, Hoofed Leg)
paintMobTile(16, '#e3e4e5', '#d5d6d8', (r) => { r(0,0,8,2,'#f8fafc'); r(1,3,1,1,'#111827'); r(2,3,1,1,'#ffffff'); r(5,3,1,1,'#ffffff'); r(6,3,1,1,'#111827'); r(3,5,2,2,'#f472b6'); });
paintMobTile(17, '#f8fafc', '#e2e8f0', (r) => { r(1,1,2,2,'#cbd5e1'); r(5,4,2,2,'#cbd5e1'); });
paintMobTile(18, '#d6bfa3', '#c4a98b', (r) => { r(0,0,8,3,'#f8fafc'); r(0,6,8,2,'#475569'); });
// 19..22: Pig (Face with Eyes Only, 3D Snout Front with Nostrils Only, Clean Pink Skin, Hoofed Leg)
paintMobTile(19, '#f49cbb', '#ec83a8', (r) => { r(0,3,1,1,'#111827'); r(1,3,1,1,'#ffffff'); r(6,3,1,1,'#ffffff'); r(7,3,1,1,'#111827'); });
paintMobTile(20, '#f0a5a0', '#e0928d', (r) => { r(1,3,2,2,'#831843'); r(5,3,2,2,'#831843'); });
paintMobTile(21, '#f49cbb', '#ec83a8');
paintMobTile(22, '#f49cbb', '#ec83a8', (r) => { r(0,6,8,2,'#9d174d'); });
// 23..25: Cow (Face with White Blaze & Pink Muzzle, Spotted Brown/White Hide, Hoofed Leg)
paintMobTile(23, '#451a03', '#3b1502', (r) => { r(3,0,2,4,'#f8fafc'); r(0,2,2,1,'#94a3b8'); r(6,2,2,1,'#94a3b8'); r(0,3,1,1,'#111827'); r(1,3,1,1,'#ffffff'); r(6,3,1,1,'#ffffff'); r(7,3,1,1,'#111827'); r(1,5,6,3,'#fda4af'); r(2,6,1,1,'#881337'); r(5,6,1,1,'#881337'); });
paintMobTile(24, '#451a03', '#3b1502', (r) => { r(1,1,3,3,'#f8fafc'); r(5,4,2,3,'#e2e8f0'); });
paintMobTile(25, '#451a03', '#3b1502', (r) => { r(0,0,8,2,'#f8fafc'); r(0,6,8,2,'#1e293b'); });
// 26..27: Chicken (Face with Yellow Beak & Red Wattle, White Feathers / Yellow Leg)
paintMobTile(26, '#f8fafc', '#e2e8f0', (r) => { r(3,0,2,2,'#ef4444'); r(1,2,1,1,'#111827'); r(6,2,1,1,'#111827'); r(2,3,4,2,'#facc15'); r(3,5,2,2,'#ef4444'); });
paintMobTile(27, '#f8fafc', '#e2e8f0', (r) => { r(2,5,4,3,'#facc15'); });
// 28..29: Spider (Face with 6 Glowing Red Eyes, Dark Chitin Body/Legs)
paintMobTile(28, '#1c1917', '#0c0a09', (r) => { r(1,2,2,2,'#ef4444'); r(5,2,2,2,'#ef4444'); r(0,4,1,1,'#dc2626'); r(7,4,1,1,'#dc2626'); r(2,5,1,1,'#f87171'); r(5,5,1,1,'#f87171'); });
paintMobTile(29, '#292524', '#1c1917', (r) => { r(0,3,8,1,'#44403c'); });
// 30..31: Enderman (Obsidian Face with Glowing Violet Eyes, Slender Dark Limbs)
paintMobTile(30, '#09090b', '#18181b', (r) => { r(0,4,3,1,'#d946ef'); r(1,4,1,1,'#f0abfc'); r(5,4,3,1,'#d946ef'); r(6,4,1,1,'#f0abfc'); });
paintMobTile(31, '#09090b', '#18181b', (r) => { r(2,1,1,1,'#a855f7'); r(5,5,1,1,'#a855f7'); });
// 32..33: Wolf / Dog (Face with Snout, Alert Ears & Red Collar, Silver Fur Body)
paintMobTile(32, '#cbd5e1', '#94a3b8', (r) => { r(0,0,2,2,'#475569'); r(6,0,2,2,'#475569'); r(1,3,2,1,'#0f172a'); r(5,3,2,1,'#0f172a'); r(2,4,4,2,'#e2e8f0'); r(3,4,2,1,'#0f172a'); r(0,7,8,1,'#ef4444'); });
paintMobTile(33, '#cbd5e1', '#94a3b8', (r) => { r(0,0,8,2,'#64748b'); });
// 34: Slime (Gelatinous Green Cube Face & Body)
paintMobTile(34, '#4ade80', '#22c55e', (r) => { r(1,2,2,2,'#14532d'); r(5,2,2,2,'#14532d'); r(3,5,2,2,'#14532d'); r(2,1,4,4,'#86efac'); r(1,2,2,2,'#14532d'); r(5,2,2,2,'#14532d'); });
for (let t = 35; t < MOB_ATLAS_TILES; t++) paintMobTile(t, '#94a3b8', '#64748b');

const mobAtlasTexture = new THREE.CanvasTexture(mobAtlasCanvas);
mobAtlasTexture.magFilter = THREE.NearestFilter;
mobAtlasTexture.minFilter = THREE.NearestFilter;

function makeMobBox(w, h, d, fFront, fSide, fTop = fSide, fBot = fSide, extra = null) {
  const buildPart = (pw, ph, pd, ox, oy, oz, tiles) => {
    const g = new THREE.BoxGeometry(pw, ph, pd);
    if (ox || oy || oz) g.translate(ox, oy, oz);
    const uv = g.attributes.uv.array;
    const sh = [0.82, 0.82, 1.0, 0.62, 0.95, 0.76];
    const col = new Float32Array(24 * 3);
    for (let f = 0; f < 6; f++) {
      const t = tiles[f], u0 = (t * 8 + 0.15) / MOB_ATLAS_W, u1 = ((t + 1) * 8 - 0.15) / MOB_ATLAS_W;
      const b = f * 8;
      uv[b] = u0; uv[b + 1] = 0.98; uv[b + 2] = u1; uv[b + 3] = 0.98;
      uv[b + 4] = u0; uv[b + 5] = 0.02; uv[b + 6] = u1; uv[b + 7] = 0.02;
      for (let v = 0; v < 4; v++) {
        const ci = (f * 4 + v) * 3;
        col[ci] = sh[f]; col[ci + 1] = sh[f]; col[ci + 2] = sh[f];
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const main = buildPart(w, h, d, 0, 0, 0, [fSide, fSide, fTop, fBot, fFront, fSide]);
  if (!extra) return main;
  const eFront = extra[6], eSide = extra[7] !== undefined ? extra[7] : eFront;
  const sub = buildPart(extra[0], extra[1], extra[2], extra[3], extra[4], extra[5], [eSide, eSide, eSide, eSide, eFront, eSide]);
  const merged = new THREE.BufferGeometry();
  for (const attr of ['position', 'normal', 'uv', 'color']) {
    const a = main.attributes[attr].array, b = sub.attributes[attr].array, itemSize = main.attributes[attr].itemSize;
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    merged.setAttribute(attr, new THREE.BufferAttribute(out, itemSize));
  }
  const ia = main.index.array, ib = sub.index.array, idxOut = new Uint16Array(ia.length + ib.length);
  idxOut.set(ia, 0);
  for (let i = 0; i < ib.length; i++) idxOut[ia.length + i] = ib[i] + 24;
  merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
  return merged;
}

// Shared detailed geometries across all mobs (zero per-mob geometry allocation & zero extra draw calls!)
const mobGeos = {
  headZombie:  makeMobBox(0.46, 0.46, 0.46, 0, 1, 3, 2),
  bodyZombie:  makeMobBox(0.50, 0.72, 0.28, 4, 4, 4, 4),
  armZombie:   makeMobBox(0.20, 0.20, 0.64, 2, 2, 2, 2),
  legZombie:   makeMobBox(0.22, 0.68, 0.22, 5, 5, 5, 5),
  headSkel:    makeMobBox(0.46, 0.46, 0.46, 6, 8, 8, 8),
  bodySkel:    makeMobBox(0.46, 0.72, 0.24, 7, 7, 8, 8),
  armSkelL:    makeMobBox(0.16, 0.16, 0.64, 8, 8, 8, 8),
  armSkelR:    makeMobBox(0.16, 0.16, 0.64, 8, 8, 8, 8, [0.07, 0.50, 0.10, 0, 0, 0.34, 9, 9]),
  legSkel:     makeMobBox(0.16, 0.68, 0.16, 8, 8, 8, 8),
  headCreeper: makeMobBox(0.46, 0.46, 0.46, 10, 11, 11, 11),
  bodyCreeper: makeMobBox(0.46, 0.82, 0.28, 11, 11, 11, 11),
  legCreeper:  makeMobBox(0.22, 0.36, 0.22, 12, 12, 11, 12),
  headGolem:   makeMobBox(0.46, 0.50, 0.46, 13, 15, 15, 15, [0.12, 0.22, 0.09, 0, -0.09, 0.25, 15, 15]),
  bodyGolem:   makeMobBox(0.82, 0.94, 0.46, 14, 15, 15, 15),
  armGolem:    makeMobBox(0.24, 1.12, 0.24, 14, 15, 15, 15),
  legGolem:    makeMobBox(0.24, 0.68, 0.24, 15, 15, 15, 15),
  headSheep:   makeMobBox(0.44, 0.44, 0.46, 16, 17, 17, 17),
  bodySheep:   makeMobBox(0.64, 0.54, 0.92, 17, 17, 17, 17),
  legSheep:    makeMobBox(0.20, 0.42, 0.20, 18, 18, 17, 18),
  headPig:      makeMobBox(0.46, 0.46, 0.46, 19, 21, 21, 21, [0.22, 0.15, 0.09, 0, -0.07, 0.25, 20, 21]),
  bodyPig:      makeMobBox(0.62, 0.52, 0.92, 21, 21, 21, 21),
  legPig:       makeMobBox(0.20, 0.42, 0.20, 22, 22, 21, 22),
  headCow:      makeMobBox(0.46, 0.46, 0.46, 23, 24, 24, 24, [0.58, 0.14, 0.08, 0, 0.14, -0.06, 8, 8]),
  bodyCow:      makeMobBox(0.68, 0.58, 0.98, 24, 24, 24, 24),
  legCow:       makeMobBox(0.20, 0.48, 0.20, 25, 25, 24, 25),
  headChicken:  makeMobBox(0.28, 0.34, 0.28, 26, 27, 27, 27, [0.16, 0.10, 0.12, 0, -0.02, 0.18, 26, 26]),
  bodyChicken:  makeMobBox(0.38, 0.34, 0.48, 27, 27, 27, 27),
  legChicken:   makeMobBox(0.08, 0.26, 0.08, 27, 27, 27, 27),
  headSpider:   makeMobBox(0.42, 0.36, 0.42, 28, 29, 29, 29),
  bodySpider:   makeMobBox(0.64, 0.40, 0.86, 29, 29, 29, 29),
  legSpider:    makeMobBox(0.52, 0.10, 0.10, 29, 29, 29, 29),
  headEnderman: makeMobBox(0.44, 0.44, 0.44, 30, 31, 31, 31),
  bodyEnderman: makeMobBox(0.42, 0.84, 0.22, 31, 31, 31, 31),
  limbEnderman: makeMobBox(0.12, 1.25, 0.12, 31, 31, 31, 31),
  headWolf:     makeMobBox(0.38, 0.38, 0.40, 32, 33, 33, 33, [0.18, 0.14, 0.16, 0, -0.06, 0.24, 32, 33]),
  bodyWolf:     makeMobBox(0.46, 0.42, 0.82, 33, 33, 33, 33),
  legWolf:      makeMobBox(0.14, 0.36, 0.14, 33, 33, 33, 33),
  bodySlime:    makeMobBox(0.76, 0.76, 0.76, 34, 34, 34, 34)
};

function createMobMesh(type) {
  const root = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: mobAtlasTexture, vertexColors: true, color: 0xffffff });
  const mats = [{ mat, baseHex: 0xffffff }];
  const addPart = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };

  if (type === 'zombie' || type === 'skeleton') {
    const isSkel = type === 'skeleton';
    addPart(isSkel ? mobGeos.bodySkel : mobGeos.bodyZombie, 0, 0.98, 0);
    const head = addPart(isSkel ? mobGeos.headSkel : mobGeos.headZombie, 0, 1.56, 0);
    addPart(isSkel ? mobGeos.armSkelL : mobGeos.armZombie, -0.36, 1.22, 0.26);
    addPart(isSkel ? mobGeos.armSkelR : mobGeos.armZombie, 0.36, 1.22, 0.26);
    const legGeo = isSkel ? mobGeos.legSkel : mobGeos.legZombie;
    return { root, head, legs: [addPart(legGeo, -0.14, 0.34, 0), addPart(legGeo, 0.14, 0.34, 0)], mats, height: 1.8, radius: 0.35 };
  } else if (type === 'enderman') {
    addPart(mobGeos.bodyEnderman, 0, 1.58, 0);
    const head = addPart(mobGeos.headEnderman, 0, 2.22, 0);
    const armL = addPart(mobGeos.limbEnderman, -0.28, 1.38, 0), armR = addPart(mobGeos.limbEnderman, 0.28, 1.38, 0);
    const legL = addPart(mobGeos.limbEnderman, -0.12, 0.62, 0), legR = addPart(mobGeos.limbEnderman, 0.12, 0.62, 0);
    return { root, head, legs: [legL, legR, armL, armR], mats, height: 2.5, radius: 0.35 };
  } else if (type === 'creeper') {
    addPart(mobGeos.bodyCreeper, 0, 0.77, 0);
    const head = addPart(mobGeos.headCreeper, 0, 1.41, 0);
    const legs = [[-0.15, 0.18, 0.22], [0.15, 0.18, 0.22], [-0.15, 0.18, -0.22], [0.15, 0.18, -0.22]].map(([lx, ly, lz]) => addPart(mobGeos.legCreeper, lx, ly, lz));
    return { root, head, legs, mats, height: 1.7, radius: 0.35 };
  } else if (type === 'golem') {
    addPart(mobGeos.bodyGolem, 0, 1.15, 0);
    const head = addPart(mobGeos.headGolem, 0, 1.86, 0.08);
    const armL = addPart(mobGeos.armGolem, -0.55, 1.10, 0), armR = addPart(mobGeos.armGolem, 0.55, 1.10, 0);
    const legL = addPart(mobGeos.legGolem, -0.22, 0.34, 0), legR = addPart(mobGeos.legGolem, 0.22, 0.34, 0);
    return { root, head, legs: [legL, legR, armL, armR], mats, height: 2.2, radius: 0.45 };
  } else if (type === 'spider') {
    addPart(mobGeos.bodySpider, 0, 0.36, -0.14);
    const head = addPart(mobGeos.headSpider, 0, 0.38, 0.42);
    const legs = [[-0.46, 0.22, 0.22], [0.46, 0.22, 0.22], [-0.46, 0.22, -0.22], [0.46, 0.22, -0.22]].map(([lx, ly, lz]) => addPart(mobGeos.legSpider, lx, ly, lz));
    return { root, head, legs, mats, height: 0.85, radius: 0.48 };
  } else if (type === 'chicken') {
    addPart(mobGeos.bodyChicken, 0, 0.38, 0);
    const head = addPart(mobGeos.headChicken, 0, 0.62, 0.22);
    const legs = [addPart(mobGeos.legChicken, -0.10, 0.13, 0), addPart(mobGeos.legChicken, 0.10, 0.13, 0)];
    return { root, head, legs, mats, height: 0.78, radius: 0.28 };
  } else if (type === 'slime') {
    const head = addPart(mobGeos.bodySlime, 0, 0.38, 0);
    return { root, head, legs: [], mats, height: 0.82, radius: 0.40 };
  } else if (type === 'wolf') {
    addPart(mobGeos.bodyWolf, 0, 0.52, 0);
    const head = addPart(mobGeos.headWolf, 0, 0.68, 0.44);
    const legs = [[-0.14, 0.18, 0.28], [0.14, 0.18, 0.28], [-0.14, 0.18, -0.28], [0.14, 0.18, -0.28]].map(([lx, ly, lz]) => addPart(mobGeos.legWolf, lx, ly, lz));
    return { root, head, legs, mats, height: 0.95, radius: 0.35 };
  } else {
    const isSheep = type === 'sheep', isCow = type === 'cow';
    addPart(isCow ? mobGeos.bodyCow : (isSheep ? mobGeos.bodySheep : mobGeos.bodyPig), 0, isCow ? 0.70 : 0.64, 0);
    const head = addPart(isCow ? mobGeos.headCow : (isSheep ? mobGeos.headSheep : mobGeos.headPig), 0, isCow ? 0.96 : 0.88, 0.52);
    const legGeo = isCow ? mobGeos.legCow : (isSheep ? mobGeos.legSheep : mobGeos.legPig);
    const legs = [[-0.18, 0.21, 0.30], [0.18, 0.21, 0.30], [-0.18, 0.21, -0.30], [0.18, 0.21, -0.30]].map(([lx, ly, lz]) => addPart(legGeo, lx, ly, lz));
    return { root, head, legs, mats, height: isCow ? 1.25 : 1.15, radius: 0.4 };
  }
}

const MOB_HP_MAP = { golem: 24, enderman: 14, zombie: 7, creeper: 6, skeleton: 6, spider: 6, wolf: 6, slime: 5, cow: 5, sheep: 4, pig: 4, chicken: 3 };
const isHostileMob = (m) => m && (m.type === 'zombie' || m.type === 'skeleton' || m.type === 'creeper' || m.type === 'spider' || m.type === 'slime' || (m.type === 'enderman' && m.provoked));

function spawnMob(type, x, y, z) {
  const built = createMobMesh(type);
  built.root.position.set(x, y, z);
  scene.add(built.root);
  const mobObj = {
    type, x, y, z, vx: 0, vy: 0, vz: 0,
    yaw: Math.random() * Math.PI * 2, targetYaw: Math.random() * Math.PI * 2,
    aiTimer: 1 + Math.random() * 2, moving: true,
    hp: MOB_HP_MAP[type] || 4, allied: type === 'golem', provoked: false,
    fuseTimer: 0, hurtTimer: 0, attackCooldown: 0, jumpTimer: 0, animTime: Math.random() * 10,
    ...built
  };
  mobs.push(mobObj);
  return mobObj;
}

function tameWolf(mob) {
  if (!mob || mob.type !== 'wolf' || mob.allied) return false;
  if (gameMode === 'survival' && (inventoryCounts[BLOCK.ITEM_BONE] || 0) <= 0) return false;
  if (gameMode === 'survival') {
    if (selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_BONE && hotbarCounts[selectedSlot] > 0) hotbarCounts[selectedSlot]--;
    inventoryCounts[BLOCK.ITEM_BONE] = Math.max(0, (inventoryCounts[BLOCK.ITEM_BONE] || 1) - 1);
    if (inventoryCounts[BLOCK.ITEM_BONE] <= 0 && selectedSlot >= 0 && hotbarSlots[selectedSlot] === BLOCK.ITEM_BONE) hotbarSlots[selectedSlot] = BLOCK.AIR;
  }
  mob.allied = true; mob.hp = 12;
  spawnBlockParticles(mob.x, mob.y + 0.6, mob.z, BLOCK.AMETHYST, 18);
  sfx.play('chime');
  if (typeof refreshInventoryCountsUI === 'function') refreshInventoryCountsUI();
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '🐺 ¡Lobo domesticado! Ahora es tu Perro Guardián Aliado';
  return true;
}

function teleportEnderman(mob) {
  if (!mob) return false;
  spawnBlockParticles(mob.x, mob.y + 1.0, mob.z, BLOCK.PORTAL, 16);
  let moved = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const ang = Math.random() * Math.PI * 2, dist = 3.5 + Math.random() * 5.0;
    const tx = Math.floor(mob.x + Math.cos(ang) * dist), tz = Math.floor(mob.z + Math.sin(ang) * dist);
    for (let dy = 3; dy >= -4; dy--) {
      const ty = Math.max(2, Math.min(CHUNK_HEIGHT - 4, Math.floor(mob.y) + dy));
      if (BLOCK_DEFS[getVoxelGlobal(tx, ty - 1, tz)].solid && getVoxelGlobal(tx, ty, tz) === BLOCK.AIR && getVoxelGlobal(tx, ty + 1, tz) === BLOCK.AIR) {
        mob.x = tx + 0.5; mob.y = ty; mob.z = tz + 0.5; moved = true; break;
      }
    }
    if (moved) break;
  }
  if (!moved) {
    const ang = Math.random() * Math.PI * 2;
    const tx = Math.floor(mob.x + Math.cos(ang) * 4.0), tz = Math.floor(mob.z + Math.sin(ang) * 4.0), ty = Math.floor(mob.y);
    mob.x = tx + 0.5; mob.z = tz + 0.5;
  }
  mob.root.position.set(mob.x, mob.y, mob.z);
  spawnBlockParticles(mob.x, mob.y + 1.0, mob.z, BLOCK.PORTAL, 16);
  sfx.play('portal');
  return true;
}

function trySummonIronGolem(wx, wy, wz) {
  if (getVoxelGlobal(wx, wy, wz) !== BLOCK.GLOWSTONE) return null;
  const b1 = getVoxelGlobal(wx, wy - 1, wz), b2 = getVoxelGlobal(wx, wy - 2, wz);
  if ((b1 !== BLOCK.IRON_ORE && b1 !== BLOCK.IRON_BLOCK) || (b2 !== BLOCK.IRON_ORE && b2 !== BLOCK.IRON_BLOCK)) return null;
  setVoxelGlobal(wx, wy, wz, BLOCK.AIR); setVoxelGlobal(wx, wy - 1, wz, BLOCK.AIR); setVoxelGlobal(wx, wy - 2, wz, BLOCK.AIR);
  spawnBlockParticles(wx, wy - 1, wz, BLOCK.IRON_ORE, 24); sfx.play('golem');
  const golem = spawnMob('golem', wx + 0.5, wy - 2, wz + 0.5);
  const lbl = document.getElementById('block-label');
  if (lbl) lbl.textContent = '🛡 ¡Gólem de Hierro Aliado Invocado!';
  return golem;
}

function removeMobAt(idx) {
  const m = mobs[idx];
  scene.remove(m.root);
  for (const entry of m.mats) entry.mat.dispose();
  mobs.splice(idx, 1);
}

const MOB_LOOT_MAP = {
  creeper: BLOCK.TNT, golem: BLOCK.IRON_ORE, skeleton: BLOCK.ITEM_BONE, zombie: BLOCK.COAL_ORE,
  sheep: BLOCK.WOOL, pig: BLOCK.ITEM_RAW_PORKCHOP, cow: BLOCK.ITEM_RAW_PORKCHOP, chicken: BLOCK.ITEM_APPLE,
  spider: BLOCK.TALL_GRASS, enderman: BLOCK.ITEM_ENDER_PEARL, slime: BLOCK.SLIME, wolf: BLOCK.ITEM_BONE
};

function damageMob(mob, dmg, kdx, kdz) {
  mob.hp -= dmg; mob.hurtTimer = 0.28;
  if (mob.type === 'enderman') mob.provoked = true;
  for (const entry of mob.mats) entry.mat.color.setHex(0xff3b3b);
  sfx.play('mobHit');

  const kLen = Math.hypot(kdx, kdz) || 1;
  mob.vx = (kdx / kLen) * 6.5; mob.vz = (kdz / kLen) * 6.5; mob.vy = 5.2;

  if (mob.hp <= 0) {
    const pBlock = (mob.type === 'zombie' || mob.type === 'creeper' || mob.type === 'slime') ? BLOCK.SLIME : (mob.type === 'enderman' ? BLOCK.PORTAL : (mob.type === 'golem' || mob.type === 'skeleton' ? BLOCK.IRON_ORE : (mob.type === 'sheep' || mob.type === 'chicken' ? BLOCK.WOOL : BLOCK.BRICK)));
    const lootId = MOB_LOOT_MAP[mob.type] || BLOCK.ITEM_RAW_PORKCHOP;
    spawnBlockParticles(mob.x - 0.5, mob.y + 0.4, mob.z - 0.5, pBlock, 22);
    spawnItemDrop(mob.x - 0.5, mob.y + 0.2, mob.z - 0.5, lootId, 2);
    const idx = mobs.indexOf(mob);
    if (idx !== -1) removeMobAt(idx);
  } else if (mob.type === 'enderman') {
    teleportEnderman(mob);
  }
}

function raycastMob(ox, oy, oz, dx, dy, dz, maxDist = 4.2) {
  let bestMob = null, bestDist = maxDist;
  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i], cx = m.x, cy = m.y + m.height * 0.5, cz = m.z;
    const vx = cx - ox, vy = cy - oy, vz = cz - oz, t = vx * dx + vy * dy + vz * dz;
    if (t < 0 || t > bestDist) continue;
    const px = ox + dx * t - cx, py = oy + dy * t - cy, pz = oz + dz * t - cz;
    if (Math.abs(px) < m.radius + 0.25 && Math.abs(py) < m.height * 0.55 && Math.abs(pz) < m.radius + 0.25) {
      bestDist = t; bestMob = m;
    }
  }
  return bestMob;
}

function trySpawnMobsAroundPlayer() {
  if (mobs.length >= MAX_MOBS) return;
  const angle = Math.random() * Math.PI * 2, dist = 14 + Math.random() * 18;
  const wx = Math.floor(player.x + Math.cos(angle) * dist), wz = Math.floor(player.z + Math.sin(angle) * dist);
  const cx = Math.floor(wx / CHUNK_SIZE), cz = Math.floor(wz / CHUNK_SIZE);
  if (!chunks.has(chunkKey(cx, cz))) return;
  const biome = typeof generator !== 'undefined' && generator.getBiomeAt ? generator.getBiomeAt(wx, wz) : 'Llanura';

  if (isNight || Math.random() < 0.45) {
    const minY = isNight ? SEA_LEVEL : 5, maxY = isNight ? CHUNK_HEIGHT - 4 : Math.max(10, Math.floor(player.y + 8));
    for (let attempt = 0; attempt < 6; attempt++) {
      const y = minY + Math.floor(Math.random() * (maxY - minY));
      if (BLOCK_DEFS[getVoxelGlobal(wx, y - 1, wz)].solid && getVoxelGlobal(wx, y, wz) === BLOCK.AIR && getVoxelGlobal(wx, y + 1, wz) === BLOCK.AIR) {
        const packed = getLightGlobal(wx, y, wz), effLight = Math.max(Math.round((packed >> 4) * sunFactor), packed & 15);
        if (effLight < 7) {
          const r = Math.random();
          const hType = (biome === 'Pantano' && r < 0.25) ? 'slime' : (r < 0.22 ? 'creeper' : (r < 0.44 ? 'skeleton' : (r < 0.66 ? 'spider' : (r < 0.78 ? 'enderman' : (r < 0.88 ? 'slime' : 'zombie')))));
          spawnMob(hType, wx + 0.5, y, wz + 0.5);
          return;
        }
      }
    }
  } else {
    for (let y = CHUNK_HEIGHT - 3; y > SEA_LEVEL; y--) {
      const b = getVoxelGlobal(wx, y, wz);
      if (b === BLOCK.AIR) continue;
      if ((b === BLOCK.GRASS || b === BLOCK.SNOW) && getVoxelGlobal(wx, y + 1, wz) === BLOCK.AIR) {
        const r = Math.random();
        const type = (biome === 'Taiga Nevada' || biome === 'Bosque') && r < 0.28 ? 'wolf' : (biome === 'Pantano' && r < 0.35 ? 'slime' : (r < 0.28 ? 'sheep' : (r < 0.54 ? 'pig' : (r < 0.78 ? 'cow' : 'chicken'))));
        spawnMob(type, wx + 0.5, y + 1, wz + 0.5);
      }
      break;
    }
  }
}

function updateMobs(dt) {
  mobSpawnTimer += dt;
  if (mobSpawnTimer > 1.8) { mobSpawnTimer = 0; trySpawnMobsAroundPlayer(); }

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    if (!m) continue;
    const dxP = player.x - m.x, dyP = player.y - m.y, dzP = player.z - m.z, distP = Math.hypot(dxP, dyP, dzP);
    if (distP > (m.allied ? 80 : 54)) { removeMobAt(i); continue; }

    const packedL = getLightGlobal(Math.floor(m.x), Math.floor(m.y + 0.8), Math.floor(m.z));
    const shade = Math.max(0.14, Math.min(1.0, Math.max(((packedL >> 4) / 15) * sunFactor, (packedL & 15) / 15)));

    if (m.hurtTimer > 0) m.hurtTimer -= dt;
    else if (m.onFireTimer > 0 && Math.floor(m.onFireTimer * 10) % 2 === 0) {
      for (const entry of m.mats) entry.mat.color.setHex(0xf97316);
    } else if (m.type === 'creeper' && m.fuseTimer > 0 && Math.floor(m.fuseTimer * 12) % 2 === 0) {
      for (const entry of m.mats) entry.mat.color.setHex(0xffffff);
    } else {
      for (const entry of m.mats) entry.mat.color.setHex(entry.baseHex).multiplyScalar(shade);
    }

    if (m.onFireTimer > 0) {
      if (getVoxelGlobal(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)) === BLOCK.WATER) {
        m.onFireTimer = 0;
      } else {
        m.onFireTimer = Math.max(0, m.onFireTimer - dt);
        m.fireTick = (m.fireTick || 0) + dt;
        if (m.fireTick >= 0.85) { m.fireTick = 0; spawnBlockParticles(m.x, m.y + 0.5, m.z, BLOCK.LAVA, 6); damageMob(m, 1, 0, 0); if (!mobs.includes(m)) continue; }
      }
    }
    if (m.type === 'sheep' && m.sheared) {
      m.regrowTimer = (m.regrowTimer || 20) - dt;
      if (m.regrowTimer <= 0 && getVoxelGlobal(Math.floor(m.x), Math.floor(m.y - 0.2), Math.floor(m.z)) === BLOCK.GRASS) {
        m.sheared = false; if (m.root && m.root.children[0]) m.root.children[0].scale.set(1, 1, 1);
        for (const entry of m.mats) entry.baseHex = 0xffffff;
      }
    }
    if ((m.type === 'zombie' || m.type === 'skeleton') && sunFactor > 0.8 && (packedL >> 4) >= 14) {
      m.burnTimer = (m.burnTimer || 0) + dt;
      if (m.burnTimer > 1.2) { m.burnTimer = 0; damageMob(m, 1, 0, 0); if (!mobs.includes(m)) continue; }
    }
    if (m.type === 'enderman' && getVoxelGlobal(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z)) === BLOCK.WATER) {
      teleportEnderman(m);
    }

    // AI Decision
    if ((m.type === 'zombie' || m.type === 'spider' || m.type === 'slime' || (m.type === 'enderman' && m.provoked)) && distP < 16) {
      m.targetYaw = Math.atan2(dxP, dzP); m.moving = true;
      if (m.type === 'slime' && m.onGround) {
        m.jumpTimer = (m.jumpTimer || 0) - dt;
        if (m.jumpTimer <= 0) { m.jumpTimer = 0.75; m.vy = 7.6; sfx.play('boing'); }
      }
      if (distP < 1.25 && Math.abs(dyP) < 1.8) {
        m.attackCooldown += dt;
        if (m.attackCooldown > 0.90) {
          m.attackCooldown = 0; sfx.play(m.type === 'slime' ? 'boing' : 'zombie');
          damagePlayer(m.type === 'enderman' ? 3 : (m.type === 'slime' ? 1 : 2));
        }
      }
    } else if (m.type === 'skeleton' && distP < 18) {
      m.targetYaw = Math.atan2(dxP, dzP); m.moving = distP > 6.5;
      m.attackCooldown += dt;
      if (m.attackCooldown >= 1.6) { m.attackCooldown = 0; shootArrow(m.x, m.y + 1.35, m.z, dxP, dyP + 0.25, dzP, { fromMob: true }); }
    } else if (m.type === 'creeper' && distP < 16) {
      m.targetYaw = Math.atan2(dxP, dzP);
      if (distP < 2.5 && Math.abs(dyP) < 2.0) {
        m.moving = false; if (m.fuseTimer === 0) sfx.play('hiss');
        m.fuseTimer += dt; const swell = 1.0 + m.fuseTimer * 0.28; m.root.scale.set(swell, swell, swell);
        if (m.fuseTimer >= 1.3) { const ex = m.x, ey = m.y + 0.6, ez = m.z; removeMobAt(i); explodeAt(ex, ey, ez, 3.1); continue; }
      } else {
        m.moving = true;
        if (distP > 3.6 && m.fuseTimer > 0) { m.fuseTimer = Math.max(0, m.fuseTimer - dt * 1.6); const swell = 1.0 + m.fuseTimer * 0.28; m.root.scale.set(swell, swell, swell); }
      }
    } else if (m.type === 'golem' || (m.type === 'wolf' && m.allied)) {
      let nearestHostile = null, bestHDist = 20.0;
      for (let j = 0; j < mobs.length; j++) {
        const other = mobs[j];
        if (!isHostileMob(other)) continue;
        const hd = Math.hypot(other.x - m.x, other.y - m.y, other.z - m.z);
        if (hd < bestHDist) { bestHDist = hd; nearestHostile = other; }
      }
      if (nearestHostile) {
        const hdx = nearestHostile.x - m.x, hdz = nearestHostile.z - m.z;
        m.targetYaw = Math.atan2(hdx, hdz); m.moving = bestHDist > 1.3;
        if (m.attackCooldown > 0) m.attackCooldown -= dt;
        if (bestHDist < 2.2 && m.attackCooldown <= 0) {
          m.attackCooldown = 0.75; sfx.play(m.type === 'golem' ? 'golem' : 'hit');
          damageMob(nearestHostile, m.type === 'golem' ? 6 : 4, hdx, hdz);
          if (m.type === 'golem' && mobs.includes(nearestHostile)) nearestHostile.vy = 9.2;
        }
      } else if (m.type === 'wolf' && distP > 3.2) {
        m.targetYaw = Math.atan2(dxP, dzP); m.moving = true;
      } else {
        m.aiTimer -= dt;
        if (m.aiTimer <= 0) { m.aiTimer = 2.0 + Math.random() * 2.5; m.moving = Math.random() < 0.55; if (m.moving) m.targetYaw += (Math.random() - 0.5) * 1.8; }
      }
    } else {
      m.aiTimer -= dt;
      if (m.aiTimer <= 0) { m.aiTimer = 1.5 + Math.random() * 3.0; m.moving = Math.random() < 0.68; if (m.moving) m.targetYaw += (Math.random() - 0.5) * 2.2; }
    }

    const diffYaw = Math.atan2(Math.sin(m.targetYaw - m.yaw), Math.cos(m.targetYaw - m.yaw));
    m.yaw += diffYaw * Math.min(1, dt * 6);
    m.root.rotation.y = m.yaw;

    const moveSpeed = m.type === 'enderman' && m.provoked ? 3.8 : (m.type === 'spider' ? 3.3 : ((m.type === 'golem' || (m.type === 'wolf' && m.allied)) ? 3.1 : (isHostileMob(m) ? 2.65 : (m.hurtTimer > 0 ? 4.2 : 1.55))));
    if (m.hurtTimer <= 0) {
      m.vx = m.moving ? Math.sin(m.yaw) * moveSpeed : 0;
      m.vz = m.moving ? Math.cos(m.yaw) * moveSpeed : 0;
    } else { m.vx *= 0.88; m.vz *= 0.88; }

    m.vy -= 24.0 * dt;
    if (m.type === 'chicken' && m.vy < -2.2) m.vy = -2.2;
    else if (m.vy < -30) m.vy = -30;

    const nx = m.x + m.vx * dt, nz = m.z + m.vz * dt, footY = Math.floor(m.y + 0.05);
    const blockedX = BLOCK_DEFS[getVoxelGlobal(Math.floor(nx + Math.sign(m.vx) * m.radius), footY, Math.floor(m.z))].solid;
    const blockedZ = BLOCK_DEFS[getVoxelGlobal(Math.floor(m.x), footY, Math.floor(nz + Math.sign(m.vz) * m.radius))].solid;
    if (!blockedX) m.x = nx;
    if (!blockedZ) m.z = nz;

    if (blockedX || blockedZ) {
      if (m.type === 'spider') {
        m.vy = 4.8; m.onGround = false;
      } else if (m.onGround) {
        const stepClear = !BLOCK_DEFS[getVoxelGlobal(Math.floor(nx + Math.sign(m.vx) * m.radius), footY + 1, Math.floor(nz + Math.sign(m.vz) * m.radius))].solid;
        if (stepClear) { m.vy = 7.4; m.onGround = false; }
        else m.targetYaw += Math.PI * 0.7;
      }
    }

    const ny = m.y + m.vy * dt;
    if (!BLOCK_DEFS[getVoxelGlobal(Math.floor(m.x), Math.floor(ny), Math.floor(m.z))].solid) {
      m.y = ny; m.onGround = false;
    } else {
      if (m.vy < 0) { m.y = Math.floor(ny) + 1; m.onGround = true; }
      m.vy = 0;
    }

    m.root.position.set(m.x, m.y, m.z);
    if (m.type === 'slime') {
      const sy = m.onGround ? 0.92 : 1.12, sxz = m.onGround ? 1.06 : 0.92;
      m.root.scale.set(sxz, sy, sxz);
    }

    if (m.moving) {
      m.animTime += dt * moveSpeed * 4.2;
      const a = Math.sin(m.animTime) * 0.55;
      if (m.legs.length === 2) { m.legs[0].rotation.x = a; m.legs[1].rotation.x = -a; }
      else if (m.legs.length === 4) { m.legs[0].rotation.x = a; m.legs[1].rotation.x = -a; m.legs[2].rotation.x = -a; m.legs[3].rotation.x = a; }
    } else {
      for (const l of m.legs) l.rotation.x *= 0.8;
    }
  }
}

function applyArraysToMesh(ch, meshData, lodLevel = 0) {
  if (ch.solidMesh) {
    chunkSolidGroup.remove(ch.solidMesh);
    ch.solidMesh.geometry.dispose();
    ch.solidMesh = null;
  }
  if (ch.waterMesh) {
    scene.remove(ch.waterMesh);
    ch.waterMesh.geometry.dispose();
    ch.waterMesh = null;
  }

  if (!ch.worldBox) {
    ch.worldBox = new THREE.Box3(
      new THREE.Vector3(ch.cx * CHUNK_SIZE - 1, 0, ch.cz * CHUNK_SIZE - 1),
      new THREE.Vector3((ch.cx + 1) * CHUNK_SIZE + 1, CHUNK_HEIGHT, (ch.cz + 1) * CHUNK_SIZE + 1)
    );
  }

  if (meshData.solid.idx.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.solid.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(meshData.solid.uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.solid.col, 3));
    geo.setIndex(new THREE.BufferAttribute(meshData.solid.idx, 1));
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, solidMaterial);
    mesh.position.set(ch.cx * CHUNK_SIZE, 0, ch.cz * CHUNK_SIZE);
    chunkSolidGroup.add(mesh);
    ch.solidMesh = mesh;
  }

  if (meshData.water.idx.length > 0) {
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.BufferAttribute(meshData.water.pos, 3));
    wGeo.setAttribute('uv', new THREE.BufferAttribute(meshData.water.uv, 2));
    wGeo.setAttribute('color', new THREE.BufferAttribute(meshData.water.col, 3));
    wGeo.setIndex(new THREE.BufferAttribute(meshData.water.idx, 1));
    wGeo.computeBoundingSphere();

    const wMesh = new THREE.Mesh(wGeo, waterMaterial);
    wMesh.position.set(ch.cx * CHUNK_SIZE, 0, ch.cz * CHUNK_SIZE);
    wMesh.renderOrder = 1;
    scene.add(wMesh);
    ch.waterMesh = wMesh;
  }

  ch.lodLevel = lodLevel || 0;
  ch.dirty = false;
  ch.queued = false;
}

function rebuildChunkImmediate(cx, cz, lodLevel = 0) {
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch) return;
  ch.meshVersion = (ch.meshVersion || 0) + 1;
  const surfaceOnly = lodLevel > 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nCh = getChunkData(cx + dx, cz + dz);
      if (!nCh.lightReady || (!surfaceOnly && nCh.lightReady === 'surface')) computeChunkLighting(nCh, getChunkIfLoaded, surfaceOnly);
    }
  }
  computeChunkLighting(ch, getChunkIfLoaded, surfaceOnly);
  const meshData = buildChunkMeshArrays(cx, cz, getVoxelGlobal, getLightGlobal, 1.0, lodLevel);
  applyArraysToMesh(ch, meshData, lodLevel);
}

// ============================================================================
// 8B. INLINE WEB WORKER (BLOB URL) FOR ZERO-COPY MULTITHREADED CHUNK MESHING
// ============================================================================
const PADDED_SIZE = CHUNK_SIZE + 2;
const PADDED_VOL  = PADDED_SIZE * PADDED_SIZE * CHUNK_HEIGHT;

function packChunkPaddedBuffers(cx, cz, lodLevel = 0) {
  const surfaceOnly = lodLevel > 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nCh = getChunkData(cx + dx, cz + dz);
      if (!nCh.lightReady || (!surfaceOnly && nCh.lightReady === 'surface')) computeChunkLighting(nCh, getChunkIfLoaded, surfaceOnly);
    }
  }
  const centerCh = getChunkData(cx, cz);
  if (!surfaceOnly || !centerCh.lightReady) computeChunkLighting(centerCh, getChunkIfLoaded, surfaceOnly);

  const paddedVoxels = new Uint8Array(PADDED_VOL);
  const paddedLight  = new Uint8Array(PADDED_VOL);

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const srcOff = lz * CHUNK_SIZE * CHUNK_HEIGHT;
    const dstOff = ((lz + 1) * PADDED_SIZE + 1) * CHUNK_HEIGHT;
    paddedVoxels.set(centerCh.data.subarray(srcOff, srcOff + CHUNK_SIZE * CHUNK_HEIGHT), dstOff);
    paddedLight.set(centerCh.light.subarray(srcOff, srcOff + CHUNK_SIZE * CHUNK_HEIGHT), dstOff);
  }

  const copyBorderCol = (plx, plz) => {
    const wx = cx * CHUNK_SIZE + (plx - 1);
    const wz = cz * CHUNK_SIZE + (plz - 1);
    const ncx = Math.floor(wx / CHUNK_SIZE);
    const ncz = Math.floor(wz / CHUNK_SIZE);
    const nCh = chunks.get(chunkKey(ncx, ncz));
    if (!nCh) return;
    const nlx = wx - ncx * CHUNK_SIZE;
    const nlz = wz - ncz * CHUNK_SIZE;
    const srcOff = (nlz * CHUNK_SIZE + nlx) * CHUNK_HEIGHT;
    const dstOff = (plz * PADDED_SIZE + plx) * CHUNK_HEIGHT;
    paddedVoxels.set(nCh.data.subarray(srcOff, srcOff + CHUNK_HEIGHT), dstOff);
    paddedLight.set(nCh.light.subarray(srcOff, srcOff + CHUNK_HEIGHT), dstOff);
  };

  for (let plz = 1; plz <= CHUNK_SIZE; plz++) {
    copyBorderCol(0, plz);
    copyBorderCol(CHUNK_SIZE + 1, plz);
  }
  for (let plx = 0; plx < PADDED_SIZE; plx++) {
    copyBorderCol(plx, 0);
    copyBorderCol(plx, CHUNK_SIZE + 1);
  }

  return { paddedVoxels, paddedLight };
}

let meshWorker = null;
let workerJobSeq = 0;
let workerJobsInFlight = 0;
let workerJobsCompleted = 0;
let lastWorkerMainThreadMs = 0;
const pendingWorkerJobs = new Map();

try {
  const workerSource = `
    const CHUNK_SIZE = ${CHUNK_SIZE};
    const CHUNK_HEIGHT = ${CHUNK_HEIGHT};
    const SEA_LEVEL = ${SEA_LEVEL};
    const ATLAS_COLS = ${ATLAS_COLS};
    const PADDED_SIZE = ${PADDED_SIZE};
    const BLOCK = ${JSON.stringify(BLOCK)};
    const BLOCK_DEFS = ${JSON.stringify(BLOCK_DEFS)};
    const FACES = ${JSON.stringify(FACES)};
    const AO_CURVE = ${JSON.stringify(AO_CURVE)};

    const MAX_VERTS = ${MAX_VERTS};
    const scratchPos = new Float32Array(MAX_VERTS * 3);
    const scratchUV  = new Float32Array(MAX_VERTS * 2);
    const scratchCol = new Float32Array(MAX_VERTS * 3);
    const scratchIdx = new Uint32Array((MAX_VERTS / 4) * 6);

    const scratchWPos = new Float32Array(12000 * 3);
    const scratchWUV  = new Float32Array(12000 * 2);
    const scratchWCol = new Float32Array(12000 * 3);
    const scratchWIdx = new Uint32Array((12000 / 4) * 6);

    ${buildChunkMeshArrays.toString()}

    self.onmessage = function(e) {
      const { jobId, cx, cz, sunFactor, lodLevel, maxY, paddedVoxels, paddedLight } = e.data;
      const wx0 = cx * CHUNK_SIZE;
      const wz0 = cz * CHUNK_SIZE;

      const getVoxelLocal = (wx, wy, wz) => {
        if (wy < 0) return BLOCK.BEDROCK;
        if (wy >= CHUNK_HEIGHT) return BLOCK.AIR;
        const plx = wx - wx0 + 1;
        const plz = wz - wz0 + 1;
        return paddedVoxels[(plz * PADDED_SIZE + plx) * CHUNK_HEIGHT + wy];
      };

      const getLightLocal = (wx, wy, wz) => {
        if (wy < 0) return 0;
        if (wy >= CHUNK_HEIGHT) return 0xF0;
        const plx = wx - wx0 + 1;
        const plz = wz - wz0 + 1;
        return paddedLight[(plz * PADDED_SIZE + plx) * CHUNK_HEIGHT + wy];
      };

      const meshData = buildChunkMeshArrays(cx, cz, getVoxelLocal, getLightLocal, sunFactor, lodLevel || 0, maxY);
      self.postMessage(
        { jobId, cx, cz, lodLevel: lodLevel || 0, solid: meshData.solid, water: meshData.water },
        [
          meshData.solid.pos.buffer,
          meshData.solid.uv.buffer,
          meshData.solid.col.buffer,
          meshData.solid.idx.buffer,
          meshData.water.pos.buffer,
          meshData.water.uv.buffer,
          meshData.water.col.buffer,
          meshData.water.idx.buffer
        ]
      );
    };
  `;
  const blob = new Blob([workerSource], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  meshWorker = new Worker(blobUrl);

  meshWorker.onmessage = (e) => {
    const { jobId, cx, cz, lodLevel, solid, water } = e.data;
    const job = pendingWorkerJobs.get(jobId);
    pendingWorkerJobs.delete(jobId);
    workerJobsInFlight = Math.max(0, workerJobsInFlight - 1);
    workerJobsCompleted++;

    const meshData = { solid, water };
    const tApply0 = performance.now();
    const ch = chunks.get(chunkKey(cx, cz)) || (job && job.ch);
    if (ch) {
      if (!job || ch.meshVersion === job.version) {
        applyArraysToMesh(ch, meshData, lodLevel || 0);
      } else {
        ch.queued = false;
      }
    }
    const applyMs = performance.now() - tApply0;
    if (job) {
      lastWorkerMainThreadMs = job.packMs + applyMs;
      job.resolve(meshData);
    }
  };
} catch (_) {
  meshWorker = null;
}

function requestChunkMeshWorker(cx, cz, lodLevel = 0) {
  if (!meshWorker) {
    rebuildChunkImmediate(cx, cz, lodLevel);
    return Promise.resolve(null);
  }
  const tPack0 = performance.now();
  const ch = getChunkData(cx, cz);
  ch.meshVersion = (ch.meshVersion || 0) + 1;
  const version = ch.meshVersion;
  const { paddedVoxels, paddedLight } = packChunkPaddedBuffers(cx, cz, lodLevel);
  const packMs = performance.now() - tPack0;

  const jobId = ++workerJobSeq;
  workerJobsInFlight++;

  return new Promise((resolve) => {
    pendingWorkerJobs.set(jobId, { ch, cx, cz, version, packMs, resolve });
    meshWorker.postMessage(
      { jobId, cx, cz, sunFactor: 1.0, lodLevel, maxY: ch.maxY, paddedVoxels, paddedLight },
      [paddedVoxels.buffer, paddedLight.buffer]
    );
  });
}
