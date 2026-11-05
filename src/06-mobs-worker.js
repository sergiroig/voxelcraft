// VoxelCraft HTML5 — 06-mobs-worker.js (8D. OPTIMIZED MOB ENGINE, MESH UPLOAD & ZERO-COPY INLINE WEB WORKER)
'use strict';

// ============================================================================
// 8D. OPTIMIZED MOB ENGINE (SHEEP, PIGS & DARKNESS-SPAWNING ZOMBIES)
// ============================================================================
const MAX_MOBS = 14;
const mobs = [];
let mobSpawnTimer = 0;

// Shared geometries across all mobs (zero per-mob geometry allocation!)
const mobGeos = {
  head:        new THREE.BoxGeometry(0.46, 0.46, 0.46),
  bodyQuad:    new THREE.BoxGeometry(0.62, 0.52, 0.92),
  legQuad:     new THREE.BoxGeometry(0.20, 0.42, 0.20),
  bodyBiped:   new THREE.BoxGeometry(0.50, 0.72, 0.28),
  limbBiped:   new THREE.BoxGeometry(0.22, 0.68, 0.22),
  armZombie:   new THREE.BoxGeometry(0.20, 0.20, 0.64),
  bodyCreeper: new THREE.BoxGeometry(0.46, 0.82, 0.28),
  legCreeper:  new THREE.BoxGeometry(0.22, 0.36, 0.22),
  bodyGolem:   new THREE.BoxGeometry(0.82, 0.94, 0.46),
  armGolem:    new THREE.BoxGeometry(0.24, 1.12, 0.24)
};

function createMobMesh(type) {
  const root = new THREE.Group();
  const mats = [];
  const mkMat = (hex) => {
    const m = new THREE.MeshBasicMaterial({ color: hex });
    mats.push({ mat: m, baseHex: hex });
    return m;
  };

  if (type === 'zombie') {
    const skinMat  = mkMat(0x4d7c43);
    const shirtMat = mkMat(0x0e7490);
    const pantsMat = mkMat(0x312e81);

    const body = new THREE.Mesh(mobGeos.bodyBiped, shirtMat);
    body.position.set(0, 0.98, 0);
    root.add(body);

    const head = new THREE.Mesh(mobGeos.head, skinMat);
    head.position.set(0, 1.56, 0);
    root.add(head);

    const armL = new THREE.Mesh(mobGeos.armZombie, skinMat);
    armL.position.set(-0.36, 1.22, 0.26);
    root.add(armL);

    const armR = new THREE.Mesh(mobGeos.armZombie, skinMat);
    armR.position.set(0.36, 1.22, 0.26);
    root.add(armR);

    const legL = new THREE.Mesh(mobGeos.limbBiped, pantsMat);
    legL.position.set(-0.14, 0.34, 0);
    root.add(legL);

    const legR = new THREE.Mesh(mobGeos.limbBiped, pantsMat);
    legR.position.set(0.14, 0.34, 0);
    root.add(legR);

    return { root, head, legs: [legL, legR], mats, height: 1.8, radius: 0.35 };
  } else if (type === 'creeper') {
    const skinMat = mkMat(0x22c55e);
    const footMat = mkMat(0x15803d);

    const body = new THREE.Mesh(mobGeos.bodyCreeper, skinMat);
    body.position.set(0, 0.77, 0);
    root.add(body);

    const head = new THREE.Mesh(mobGeos.head, skinMat);
    head.position.set(0, 1.41, 0);
    root.add(head);

    const legOffsets = [
      [-0.15, 0.18,  0.22],
      [ 0.15, 0.18,  0.22],
      [-0.15, 0.18, -0.22],
      [ 0.15, 0.18, -0.22]
    ];
    const legs = legOffsets.map(([lx, ly, lz]) => {
      const l = new THREE.Mesh(mobGeos.legCreeper, footMat);
      l.position.set(lx, ly, lz);
      root.add(l);
      return l;
    });

    return { root, head, legs, mats, height: 1.7, radius: 0.35 };
  } else if (type === 'golem') {
    const ironMat = mkMat(0xe2e8f0);
    const vineMat = mkMat(0x65a30d);

    const body = new THREE.Mesh(mobGeos.bodyGolem, ironMat);
    body.position.set(0, 1.15, 0);
    root.add(body);

    const head = new THREE.Mesh(mobGeos.head, vineMat);
    head.position.set(0, 1.86, 0.08);
    root.add(head);

    const armL = new THREE.Mesh(mobGeos.armGolem, ironMat);
    armL.position.set(-0.55, 1.10, 0);
    root.add(armL);

    const armR = new THREE.Mesh(mobGeos.armGolem, ironMat);
    armR.position.set(0.55, 1.10, 0);
    root.add(armR);

    const legL = new THREE.Mesh(mobGeos.limbBiped, ironMat);
    legL.position.set(-0.22, 0.34, 0);
    root.add(legL);

    const legR = new THREE.Mesh(mobGeos.limbBiped, ironMat);
    legR.position.set(0.22, 0.34, 0);
    root.add(legR);

    return { root, head, legs: [legL, legR, armL, armR], mats, height: 2.2, radius: 0.45 };
  } else {
    const isSheep = type === 'sheep';
    const coatMat = mkMat(isSheep ? 0xf1f5f9 : 0xf49cbb);
    const skinMat = mkMat(isSheep ? 0xd6bfa3 : 0xf49cbb);

    const body = new THREE.Mesh(mobGeos.bodyQuad, coatMat);
    body.position.set(0, 0.64, 0);
    root.add(body);

    const head = new THREE.Mesh(mobGeos.head, skinMat);
    head.position.set(0, 0.88, 0.52);
    root.add(head);

    const legOffsets = [
      [-0.18, 0.21,  0.30],
      [ 0.18, 0.21,  0.30],
      [-0.18, 0.21, -0.30],
      [ 0.18, 0.21, -0.30]
    ];
    const legs = legOffsets.map(([lx, ly, lz]) => {
      const l = new THREE.Mesh(mobGeos.legQuad, skinMat);
      l.position.set(lx, ly, lz);
      root.add(l);
      return l;
    });

    return { root, head, legs, mats, height: 1.15, radius: 0.4 };
  }
}

function spawnMob(type, x, y, z) {
  const built = createMobMesh(type);
  built.root.position.set(x, y, z);
  scene.add(built.root);
  const mobObj = {
    type,
    x, y, z,
    vx: 0, vy: 0, vz: 0,
    yaw: Math.random() * Math.PI * 2,
    targetYaw: Math.random() * Math.PI * 2,
    aiTimer: 1 + Math.random() * 2,
    moving: true,
    hp: type === 'golem' ? 24 : (type === 'zombie' ? 7 : (type === 'creeper' ? 6 : 4)),
    allied: type === 'golem',
    fuseTimer: 0,
    hurtTimer: 0,
    attackCooldown: 0,
    animTime: Math.random() * 10,
    ...built
  };
  mobs.push(mobObj);
  return mobObj;
}

function trySummonIronGolem(wx, wy, wz) {
  if (getVoxelGlobal(wx, wy, wz) !== BLOCK.GLOWSTONE) return null;
  if (getVoxelGlobal(wx, wy - 1, wz) !== BLOCK.IRON_ORE) return null;
  if (getVoxelGlobal(wx, wy - 2, wz) !== BLOCK.IRON_ORE) return null;

  setVoxelGlobal(wx, wy, wz, BLOCK.AIR);
  setVoxelGlobal(wx, wy - 1, wz, BLOCK.AIR);
  setVoxelGlobal(wx, wy - 2, wz, BLOCK.AIR);
  spawnBlockParticles(wx, wy - 1, wz, BLOCK.IRON_ORE, 24);
  sfx.play('golem');
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

function damageMob(mob, dmg, kdx, kdz) {
  mob.hp -= dmg;
  mob.hurtTimer = 0.28;
  for (const entry of mob.mats) entry.mat.color.setHex(0xff3b3b);
  sfx.play('mobHit');

  const kLen = Math.hypot(kdx, kdz) || 1;
  mob.vx = (kdx / kLen) * 6.5;
  mob.vz = (kdz / kLen) * 6.5;
  mob.vy = 5.2;

  if (mob.hp <= 0) {
    const pBlock = (mob.type === 'zombie' || mob.type === 'creeper') ? BLOCK.LEAVES : (mob.type === 'golem' ? BLOCK.IRON_ORE : (mob.type === 'sheep' ? BLOCK.SNOW : BLOCK.BRICK));
    const lootId = mob.type === 'creeper' ? BLOCK.TNT : (mob.type === 'golem' ? BLOCK.IRON_ORE : (mob.type === 'zombie' ? BLOCK.COAL_ORE : (mob.type === 'sheep' ? BLOCK.SNOW : BLOCK.DIRT)));
    spawnBlockParticles(mob.x - 0.5, mob.y + 0.4, mob.z - 0.5, pBlock, 22);
    spawnItemDrop(mob.x - 0.5, mob.y + 0.2, mob.z - 0.5, lootId, 2);
    const idx = mobs.indexOf(mob);
    if (idx !== -1) removeMobAt(idx);
  }
}

function raycastMob(ox, oy, oz, dx, dy, dz, maxDist = 4.2) {
  let bestMob = null;
  let bestDist = maxDist;

  for (let i = 0; i < mobs.length; i++) {
    const m = mobs[i];
    const cx = m.x;
    const cy = m.y + m.height * 0.5;
    const cz = m.z;
    const vx = cx - ox;
    const vy = cy - oy;
    const vz = cz - oz;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0 || t > bestDist) continue;
    const px = ox + dx * t - cx;
    const py = oy + dy * t - cy;
    const pz = oz + dz * t - cz;
    if (Math.abs(px) < m.radius + 0.25 && Math.abs(py) < m.height * 0.55 && Math.abs(pz) < m.radius + 0.25) {
      bestDist = t;
      bestMob = m;
    }
  }
  return bestMob;
}

function trySpawnMobsAroundPlayer() {
  if (mobs.length >= MAX_MOBS) return;
  const angle = Math.random() * Math.PI * 2;
  const dist = 14 + Math.random() * 18;
  const wx = Math.floor(player.x + Math.cos(angle) * dist);
  const wz = Math.floor(player.z + Math.sin(angle) * dist);

  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  if (!chunks.has(chunkKey(cx, cz))) return;

  // Decide whether to attempt cave/night zombie or surface animal
  const tryCaveOrNight = isNight || Math.random() < 0.45;
  if (tryCaveOrNight) {
    const minY = isNight ? SEA_LEVEL : 5;
    const maxY = isNight ? CHUNK_HEIGHT - 4 : Math.max(10, Math.floor(player.y + 8));
    for (let attempt = 0; attempt < 6; attempt++) {
      const y = minY + Math.floor(Math.random() * (maxY - minY));
      const ground = getVoxelGlobal(wx, y - 1, wz);
      const b0 = getVoxelGlobal(wx, y, wz);
      const b1 = getVoxelGlobal(wx, y + 1, wz);
      if (BLOCK_DEFS[ground].solid && b0 === BLOCK.AIR && b1 === BLOCK.AIR) {
        const packed = getLightGlobal(wx, y, wz);
        const effSun = Math.round((packed >> 4) * sunFactor);
        const blkL = packed & 15;
        const effLight = Math.max(effSun, blkL);
        if (effLight < 7) {
          const hType = Math.random() < 0.35 ? 'creeper' : 'zombie';
          spawnMob(hType, wx + 0.5, y, wz + 0.5);
          return;
        }
      }
    }
  } else {
    // Find surface grass/snow for sheep or pig
    for (let y = CHUNK_HEIGHT - 3; y > SEA_LEVEL; y--) {
      const b = getVoxelGlobal(wx, y, wz);
      if (b === BLOCK.AIR) continue;
      if ((b === BLOCK.GRASS || b === BLOCK.SNOW) && getVoxelGlobal(wx, y + 1, wz) === BLOCK.AIR) {
        const type = Math.random() < 0.55 ? 'sheep' : 'pig';
        spawnMob(type, wx + 0.5, y + 1, wz + 0.5);
      }
      break;
    }
  }
}

function updateMobs(dt) {
  mobSpawnTimer += dt;
  if (mobSpawnTimer > 1.8) {
    mobSpawnTimer = 0;
    trySpawnMobsAroundPlayer();
  }

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    if (!m) continue;
    const dxP = player.x - m.x;
    const dyP = player.y - m.y;
    const dzP = player.z - m.z;
    const distP = Math.hypot(dxP, dyP, dzP);

    // Despawn distant mobs to save CPU/GPU (except allied Golems within 80m)
    if (distP > (m.type === 'golem' ? 80 : 54)) {
      removeMobAt(i);
      continue;
    }

    // Recover from red hurt flash & apply local voxel lighting to mob color
    const packedL = getLightGlobal(Math.floor(m.x), Math.floor(m.y + 0.8), Math.floor(m.z));
    const sL = ((packedL >> 4) / 15) * sunFactor;
    const bL = (packedL & 15) / 15;
    const shade = Math.max(0.14, Math.min(1.0, Math.max(sL, bL)));

    if (m.hurtTimer > 0) {
      m.hurtTimer -= dt;
    } else if (m.type === 'creeper' && m.fuseTimer > 0 && Math.floor(m.fuseTimer * 12) % 2 === 0) {
      for (const entry of m.mats) {
        entry.mat.color.setHex(0xffffff);
      }
    } else {
      for (const entry of m.mats) {
        entry.mat.color.setHex(entry.baseHex).multiplyScalar(shade);
      }
    }

    // Zombies burn in bright direct sunlight!
    if (m.type === 'zombie' && sunFactor > 0.8 && (packedL >> 4) >= 14) {
      m.attackCooldown += dt;
      if (m.attackCooldown > 1.2) {
        m.attackCooldown = 0;
        damageMob(m, 1, 0, 0);
        if (!mobs.includes(m)) continue;
      }
    }

    // AI Decision
    if (m.type === 'zombie' && distP < 16) {
      m.targetYaw = Math.atan2(dxP, dzP);
      m.moving = true;
      // Attack player on contact
      if (distP < 1.15 && Math.abs(dyP) < 1.6) {
        m.attackCooldown += dt;
        if (m.attackCooldown > 0.95) {
          m.attackCooldown = 0;
          sfx.play('zombie');
          damagePlayer(2);
        }
      }
    } else if (m.type === 'creeper' && distP < 16) {
      m.targetYaw = Math.atan2(dxP, dzP);
      if (distP < 2.5 && Math.abs(dyP) < 2.0) {
        m.moving = false;
        if (m.fuseTimer === 0) sfx.play('hiss');
        m.fuseTimer += dt;
        const swell = 1.0 + m.fuseTimer * 0.28;
        m.root.scale.set(swell, swell, swell);
        if (m.fuseTimer >= 1.3) {
          const ex = m.x, ey = m.y + 0.6, ez = m.z;
          removeMobAt(i);
          explodeAt(ex, ey, ez, 3.1);
          continue;
        }
      } else {
        m.moving = true;
        if (distP > 3.6 && m.fuseTimer > 0) {
          m.fuseTimer = Math.max(0, m.fuseTimer - dt * 1.6);
          const swell = 1.0 + m.fuseTimer * 0.28;
          m.root.scale.set(swell, swell, swell);
        }
      }
    } else if (m.type === 'golem') {
      // Allied Iron Golem hunts nearest hostile mob (zombie or creeper)
      let nearestHostile = null;
      let bestHDist = 20.0;
      for (let j = 0; j < mobs.length; j++) {
        const other = mobs[j];
        if (!other || (other.type !== 'zombie' && other.type !== 'creeper')) continue;
        const hd = Math.hypot(other.x - m.x, other.y - m.y, other.z - m.z);
        if (hd < bestHDist) {
          bestHDist = hd;
          nearestHostile = other;
        }
      }
      if (nearestHostile) {
        const hdx = nearestHostile.x - m.x;
        const hdz = nearestHostile.z - m.z;
        m.targetYaw = Math.atan2(hdx, hdz);
        m.moving = bestHDist > 1.4;
        if (m.attackCooldown > 0) m.attackCooldown -= dt;
        if (bestHDist < 2.2 && m.attackCooldown <= 0) {
          m.attackCooldown = 0.75;
          sfx.play('golem');
          damageMob(nearestHostile, 6, hdx, hdz);
          if (mobs.includes(nearestHostile)) {
            nearestHostile.vy = 9.2;
          }
        }
      } else {
        m.aiTimer -= dt;
        if (m.aiTimer <= 0) {
          m.aiTimer = 2.0 + Math.random() * 2.5;
          m.moving = Math.random() < 0.55;
          if (m.moving) m.targetYaw += (Math.random() - 0.5) * 1.8;
        }
      }
    } else {
      m.aiTimer -= dt;
      if (m.aiTimer <= 0) {
        m.aiTimer = 1.5 + Math.random() * 3.0;
        m.moving = Math.random() < 0.68;
        if (m.moving) m.targetYaw += (Math.random() - 0.5) * 2.2;
      }
    }

    // Smooth yaw turn
    const diffYaw = Math.atan2(Math.sin(m.targetYaw - m.yaw), Math.cos(m.targetYaw - m.yaw));
    m.yaw += diffYaw * Math.min(1, dt * 6);
    m.root.rotation.y = m.yaw;

    const moveSpeed = m.type === 'golem' ? 3.1 : ((m.type === 'zombie' || m.type === 'creeper') ? 2.65 : (m.hurtTimer > 0 ? 4.2 : 1.55));
    if (m.hurtTimer <= 0) {
      m.vx = m.moving ? Math.sin(m.yaw) * moveSpeed : 0;
      m.vz = m.moving ? Math.cos(m.yaw) * moveSpeed : 0;
    } else {
      m.vx *= 0.88;
      m.vz *= 0.88;
    }

    m.vy -= 24.0 * dt;
    if (m.vy < -30) m.vy = -30;

    // Horizontal movement + auto-jump over 1-block obstacle
    const nx = m.x + m.vx * dt;
    const nz = m.z + m.vz * dt;
    const footY = Math.floor(m.y + 0.05);
    const blockedX = BLOCK_DEFS[getVoxelGlobal(Math.floor(nx + Math.sign(m.vx) * m.radius), footY, Math.floor(m.z))].solid;
    const blockedZ = BLOCK_DEFS[getVoxelGlobal(Math.floor(m.x), footY, Math.floor(nz + Math.sign(m.vz) * m.radius))].solid;

    if (!blockedX) m.x = nx;
    if (!blockedZ) m.z = nz;

    if ((blockedX || blockedZ) && m.onGround) {
      const stepClear = !BLOCK_DEFS[getVoxelGlobal(Math.floor(nx + Math.sign(m.vx) * m.radius), footY + 1, Math.floor(nz + Math.sign(m.vz) * m.radius))].solid;
      if (stepClear) {
        m.vy = 7.4;
        m.onGround = false;
      } else {
        m.targetYaw += Math.PI * 0.7;
      }
    }

    // Vertical collision
    const ny = m.y + m.vy * dt;
    const belowSolid = BLOCK_DEFS[getVoxelGlobal(Math.floor(m.x), Math.floor(ny), Math.floor(m.z))].solid;
    if (!belowSolid) {
      m.y = ny;
      m.onGround = false;
    } else {
      if (m.vy < 0) {
        m.y = Math.floor(ny) + 1;
        m.onGround = true;
      }
      m.vy = 0;
    }

    m.root.position.set(m.x, m.y, m.z);

    // Limb walk animation
    if (m.moving) {
      m.animTime += dt * moveSpeed * 4.2;
      const a = Math.sin(m.animTime) * 0.55;
      if (m.legs.length === 2) {
        m.legs[0].rotation.x =  a;
        m.legs[1].rotation.x = -a;
      } else if (m.legs.length === 4) {
        m.legs[0].rotation.x =  a;
        m.legs[1].rotation.x = -a;
        m.legs[2].rotation.x = -a;
        m.legs[3].rotation.x =  a;
      }
    } else {
      for (const l of m.legs) l.rotation.x *= 0.8;
    }
  }
}

function applyArraysToMesh(ch, meshData) {
  if (ch.solidMesh) {
    scene.remove(ch.solidMesh);
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
    scene.add(mesh);
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

  ch.dirty = false;
  ch.queued = false;
}

function rebuildChunkImmediate(cx, cz) {
  const ch = chunks.get(chunkKey(cx, cz));
  if (!ch) return;
  ch.meshVersion = (ch.meshVersion || 0) + 1;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nCh = getChunkData(cx + dx, cz + dz);
      if (!nCh.lightReady) computeChunkLighting(nCh, getChunkIfLoaded);
    }
  }
  computeChunkLighting(ch, getChunkIfLoaded);
  const meshData = buildChunkMeshArrays(cx, cz, getVoxelGlobal, getLightGlobal, sunFactor);
  applyArraysToMesh(ch, meshData);
}

// ============================================================================
// 8B. INLINE WEB WORKER (BLOB URL) FOR ZERO-COPY MULTITHREADED CHUNK MESHING
// ============================================================================
const PADDED_SIZE = CHUNK_SIZE + 2; // 18 (16 + 1-voxel border on each side)
const PADDED_VOL  = PADDED_SIZE * PADDED_SIZE * CHUNK_HEIGHT; // 20,736 bytes

function packChunkPaddedBuffers(cx, cz) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nCh = getChunkData(cx + dx, cz + dz);
      if (!nCh.lightReady) computeChunkLighting(nCh, getChunkIfLoaded);
    }
  }
  const centerCh = getChunkData(cx, cz);
  computeChunkLighting(centerCh, getChunkIfLoaded);

  const paddedVoxels = new Uint8Array(PADDED_VOL);
  const paddedLight  = new Uint8Array(PADDED_VOL);

  // Fast row-wise bulk copy for center 16x64x16 chunk (16 rows of 1,024 contiguous bytes)
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const srcOff = lz * CHUNK_SIZE * CHUNK_HEIGHT;
    const dstOff = ((lz + 1) * PADDED_SIZE + 1) * CHUNK_HEIGHT;
    paddedVoxels.set(centerCh.data.subarray(srcOff, srcOff + 1024), dstOff);
    paddedLight.set(centerCh.light.subarray(srcOff, srcOff + 1024), dstOff);
  }

  // Copy 1-voxel border columns (plx = 0, plx = 17, plz = 0, plz = 17)
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
      const { jobId, cx, cz, sunFactor, paddedVoxels, paddedLight } = e.data;
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

      const meshData = buildChunkMeshArrays(cx, cz, getVoxelLocal, getLightLocal, sunFactor);
      self.postMessage(
        { jobId, cx, cz, solid: meshData.solid, water: meshData.water },
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
    const { jobId, cx, cz, solid, water } = e.data;
    const job = pendingWorkerJobs.get(jobId);
    pendingWorkerJobs.delete(jobId);
    workerJobsInFlight = Math.max(0, workerJobsInFlight - 1);
    workerJobsCompleted++;

    const meshData = { solid, water };
    const tApply0 = performance.now();
    const ch = chunks.get(chunkKey(cx, cz));
    if (ch) {
      if (!job || ch.meshVersion === job.version) {
        applyArraysToMesh(ch, meshData);
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

function requestChunkMeshWorker(cx, cz) {
  if (!meshWorker) {
    rebuildChunkImmediate(cx, cz);
    return Promise.resolve(null);
  }
  const tPack0 = performance.now();
  const ch = getChunkData(cx, cz);
  ch.meshVersion = (ch.meshVersion || 0) + 1;
  const version = ch.meshVersion;
  const { paddedVoxels, paddedLight } = packChunkPaddedBuffers(cx, cz);
  const packMs = performance.now() - tPack0;

  const jobId = ++workerJobSeq;
  workerJobsInFlight++;

  return new Promise((resolve) => {
    pendingWorkerJobs.set(jobId, { cx, cz, version, packMs, resolve });
    meshWorker.postMessage(
      { jobId, cx, cz, sunFactor, paddedVoxels, paddedLight },
      [paddedVoxels.buffer, paddedLight.buffer]
    );
  });
}

