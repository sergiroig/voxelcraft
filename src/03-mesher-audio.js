// VoxelCraft HTML5 — 03-mesher-audio.js (5. CHUNK MESHER (FACE CULLING, AO, X-MESH) & 6. WEB AUDIO C418 SYNTHESIZER)
'use strict';

// ============================================================================
// 5. CHUNK MESHER (HIDDEN FACE CULLING + AO + SUN/TORCH LIGHT + CROSS QUADS)
// ============================================================================
const FACES = [
  { // 0: TOP (+Y)
    dir: [0, 1, 0], shade: 1.0,
    corners: [[0,1,1,0,1], [1,1,1,1,1], [1,1,0,1,0], [0,1,0,0,0]],
    ao: [
      [[-1,1,0],[0,1,1],[-1,1,1]],
      [[ 1,1,0],[0,1,1],[ 1,1,1]],
      [[ 1,1,0],[0,1,-1],[ 1,1,-1]],
      [[-1,1,0],[0,1,-1],[-1,1,-1]]
    ]
  },
  { // 1: BOTTOM (-Y)
    dir: [0, -1, 0], shade: 0.55,
    corners: [[0,0,0,0,0], [1,0,0,1,0], [1,0,1,1,1], [0,0,1,0,1]],
    ao: [
      [[-1,-1,0],[0,-1,-1],[-1,-1,-1]],
      [[ 1,-1,0],[0,-1,-1],[ 1,-1,-1]],
      [[ 1,-1,0],[0,-1, 1],[ 1,-1, 1]],
      [[-1,-1,0],[0,-1, 1],[-1,-1, 1]]
    ]
  },
  { // 2: NORTH (+Z)
    dir: [0, 0, 1], shade: 0.86,
    corners: [[0,0,1,0,1], [1,0,1,1,1], [1,1,1,1,0], [0,1,1,0,0]],
    ao: [
      [[-1,0,1],[0,-1,1],[-1,-1,1]],
      [[ 1,0,1],[0,-1,1],[ 1,-1,1]],
      [[ 1,0,1],[0, 1,1],[ 1, 1,1]],
      [[-1,0,1],[0, 1,1],[-1, 1,1]]
    ]
  },
  { // 3: SOUTH (-Z)
    dir: [0, 0, -1], shade: 0.86,
    corners: [[1,0,0,0,1], [0,0,0,1,1], [0,1,0,1,0], [1,1,0,0,0]],
    ao: [
      [[ 1,0,-1],[0,-1,-1],[ 1,-1,-1]],
      [[-1,0,-1],[0,-1,-1],[-1,-1,-1]],
      [[-1,0,-1],[0, 1,-1],[-1, 1,-1]],
      [[ 1,0,-1],[0, 1,-1],[ 1, 1,-1]]
    ]
  },
  { // 4: EAST (+X)
    dir: [1, 0, 0], shade: 0.74,
    corners: [[1,0,1,0,1], [1,0,0,1,1], [1,1,0,1,0], [1,1,1,0,0]],
    ao: [
      [[1,0, 1],[1,-1,0],[1,-1, 1]],
      [[1,0,-1],[1,-1,0],[1,-1,-1]],
      [[1,0,-1],[1, 1,0],[1, 1,-1]],
      [[1,0, 1],[1, 1,0],[1, 1, 1]]
    ]
  },
  { // 5: WEST (-X)
    dir: [-1, 0, 0], shade: 0.74,
    corners: [[0,0,0,0,1], [0,0,1,1,1], [0,1,1,1,0], [0,1,0,0,0]],
    ao: [
      [[-1,0,-1],[-1,-1,0],[-1,-1,-1]],
      [[-1,0, 1],[-1,-1,0],[-1,-1, 1]],
      [[-1,0, 1],[-1, 1,0],[-1, 1, 1]],
      [[-1,0,-1],[-1, 1,0],[-1, 1,-1]]
    ]
  }
];

const AO_CURVE = [0.48, 0.68, 0.84, 1.0];

// Pre-allocated static buffers for meshing (zero GC allocation)
const MAX_VERTS = 55000;
const scratchPos = new Float32Array(MAX_VERTS * 3);
const scratchUV  = new Float32Array(MAX_VERTS * 2);
const scratchCol = new Float32Array(MAX_VERTS * 3);
const scratchIdx = new Uint32Array((MAX_VERTS / 4) * 6);

const scratchWPos = new Float32Array(12000 * 3);
const scratchWUV  = new Float32Array(12000 * 2);
const scratchWCol = new Float32Array(12000 * 3);
const scratchWIdx = new Uint32Array((12000 / 4) * 6);

function buildChunkMeshArrays(cx, cz, getVoxelGlobal, getLightGlobal, sunFactor, lodLevel = 0) {
  let vCount = 0, iCount = 0;
  let wvCount = 0, wiCount = 0;

  const wx0 = cx * CHUNK_SIZE;
  const wz0 = cz * CHUNK_SIZE;
  const uvStep = 1.0 / ATLAS_COLS;
  const uvPad = 0.0015 / ATLAS_COLS;
  const yStart = lodLevel > 0 ? Math.max(0, SEA_LEVEL - 4) : 0;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    const wz = wz0 + lz;
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = wx0 + lx;
      for (let y = yStart; y < CHUNK_HEIGHT; y++) {
        const blockId = getVoxelGlobal(wx, y, wz);
        if (blockId === BLOCK.AIR) continue;

        const def = BLOCK_DEFS[blockId];

        // Cross-Quad Geometry (Torches, Tall Grass, Flowers, Lily Pads)
        if (def.shape === 'cross') {
          if (lodLevel > 0 && blockId !== BLOCK.TORCH) continue;
          const tileIdx = def.tiles[0];
          const u0 = tileIdx * uvStep + uvPad;
          const u1 = (tileIdx + 1) * uvStep - uvPad;

          const packedL = getLightGlobal(wx, y, wz);
          const sL = ((packedL >> 4) / 15) * sunFactor;
          const bL = (packedL & 15) / 15;
          const rL = Math.min(1.0, Math.max(0.08, Math.max(sL, bL * 1.05)));
          const gL = Math.min(1.0, Math.max(0.08, Math.max(sL * (1.0 - bL * 0.10), bL * 0.92)));
          const blL = Math.min(1.0, Math.max(0.08, Math.max(sL * (1.0 - bL * 0.30), bL * 0.70)));

          const diagQuads = blockId === BLOCK.LILY_PAD ? [
            [[0.05, -0.09, 0.95, u0, 0], [0.95, -0.09, 0.95, u1, 0], [0.95, -0.09, 0.05, u1, 1], [0.05, -0.09, 0.05, u0, 1]],
            [[0.05, -0.09, 0.05, u0, 1], [0.95, -0.09, 0.05, u1, 1], [0.95, -0.09, 0.95, u1, 0], [0.05, -0.09, 0.95, u0, 0]]
          ] : [
            [[0.15, 0, 0.15, u0, 0], [0.85, 0, 0.85, u1, 0], [0.85, 1, 0.85, u1, 1], [0.15, 1, 0.15, u0, 1]],
            [[0.85, 0, 0.85, u0, 0], [0.15, 0, 0.15, u1, 0], [0.15, 1, 0.15, u1, 1], [0.85, 1, 0.85, u0, 1]],
            [[0.15, 0, 0.85, u0, 0], [0.85, 0, 0.15, u1, 0], [0.85, 1, 0.15, u1, 1], [0.15, 1, 0.85, u0, 1]],
            [[0.85, 0, 0.15, u0, 0], [0.15, 0, 0.85, u1, 0], [0.15, 1, 0.85, u1, 1], [0.85, 1, 0.15, u0, 1]]
          ];

          for (let q = 0; q < diagQuads.length; q++) {
            const baseV = vCount;
            const quad = diagQuads[q];
            for (let c = 0; c < 4; c++) {
              const pt = quad[c];
              const pIdx = (baseV + c) * 3;
              scratchPos[pIdx]     = lx + pt[0];
              scratchPos[pIdx + 1] = y + pt[1];
              scratchPos[pIdx + 2] = lz + pt[2];

              const uvIdx = (baseV + c) * 2;
              scratchUV[uvIdx]     = pt[3];
              scratchUV[uvIdx + 1] = pt[4];

              scratchCol[pIdx]     = rL;
              scratchCol[pIdx + 1] = gL;
              scratchCol[pIdx + 2] = blL;
            }
            scratchIdx[iCount++] = baseV;
            scratchIdx[iCount++] = baseV + 1;
            scratchIdx[iCount++] = baseV + 2;
            scratchIdx[iCount++] = baseV;
            scratchIdx[iCount++] = baseV + 2;
            scratchIdx[iCount++] = baseV + 3;
            vCount += 4;
          }
          continue;
        }

        const isWater = blockId === BLOCK.WATER;
        const isGlow = def.light > 5;

        for (let f = 0; f < 6; f++) {
          if (lodLevel > 0 && f === 1 && y <= SEA_LEVEL + 2) continue;
          const face = FACES[f];
          const nx = wx + face.dir[0];
          const ny = y + face.dir[1];
          const nz = wz + face.dir[2];

          const neighborId = ny < 0 ? BLOCK.BEDROCK : (ny >= CHUNK_HEIGHT ? BLOCK.AIR : getVoxelGlobal(nx, ny, nz));
          const nDef = BLOCK_DEFS[neighborId];

          // Hidden Face Culling (do not cull between swaying leaves and stationary blocks)
          const isLeaves = blockId === BLOCK.LEAVES || blockId === BLOCK.SNOW_LEAVES;
          const neighborIsLeaves = neighborId === BLOCK.LEAVES || neighborId === BLOCK.SNOW_LEAVES;
          if (isLeaves) { if (neighborId === blockId) continue; }
          else if (neighborIsLeaves) { /* keep face against swaying leaves */ }
          else if (isWater) {
            if (neighborId === BLOCK.WATER || nDef.opaque) continue;
          } else if (blockId === BLOCK.GLASS || blockId === BLOCK.ICE || blockId === BLOCK.PORTAL) {
            if (neighborId === blockId || nDef.opaque) continue;
          } else {
            if (nDef.opaque) continue;
          }

          const tileIdx = def.tiles[f];
          const u0 = tileIdx * uvStep + uvPad;
          const u1 = (tileIdx + 1) * uvStep - uvPad;

          const rawL = isGlow ? 0xFF : getLightGlobal(nx, ny, nz);
          const packedL = (rawL === 0 && nDef.opaque) ? (getLightGlobal(nx, Math.max(0, ny - 1), nz) || 0x90) : rawL;
          const sunLevel = ((packedL >> 4) / 15) * sunFactor;
          const blkLevel = (packedL & 15) / 15;

          // Combine sunlight (white-blue) & block/torch light (warm golden)
          const baseR = Math.min(1.0, Math.max(0.07, Math.max(sunLevel, blkLevel * 1.04)));
          const baseG = Math.min(1.0, Math.max(0.07, Math.max(sunLevel * (1.0 - blkLevel * 0.10), blkLevel * 0.90)));
          const baseB = Math.min(1.0, Math.max(0.08, Math.max(sunLevel * (1.0 - blkLevel * 0.30), blkLevel * 0.68)));

          if (isWater) {
            const baseV = wvCount;
            const yDrop = f === 0 ? -0.12 : 0;
            for (let c = 0; c < 4; c++) {
              const corner = face.corners[c];
              const pIdx = (baseV + c) * 3;
              scratchWPos[pIdx]     = lx + corner[0];
              scratchWPos[pIdx + 1] = y + corner[1] + (corner[1] === 1 ? yDrop : 0);
              scratchWPos[pIdx + 2] = lz + corner[2];

              const uvIdx = (baseV + c) * 2;
              scratchWUV[uvIdx]     = corner[3] === 0 ? u0 : u1;
              scratchWUV[uvIdx + 1] = 1.0 - corner[4];

              scratchWCol[pIdx]     = face.shade * baseR;
              scratchWCol[pIdx + 1] = face.shade * baseG;
              scratchWCol[pIdx + 2] = face.shade * baseB;
            }
            scratchWIdx[wiCount++] = baseV;
            scratchWIdx[wiCount++] = baseV + 1;
            scratchWIdx[wiCount++] = baseV + 2;
            scratchWIdx[wiCount++] = baseV;
            scratchWIdx[wiCount++] = baseV + 2;
            scratchWIdx[wiCount++] = baseV + 3;
            wvCount += 4;
          } else {
            const baseV = vCount;
            const aoScores = [3, 3, 3, 3];

            for (let c = 0; c < 4; c++) {
              const corner = face.corners[c];
              const pIdx = (baseV + c) * 3;
              scratchPos[pIdx]     = lx + corner[0];
              scratchPos[pIdx + 1] = y + corner[1];
              scratchPos[pIdx + 2] = lz + corner[2];

              const uvIdx = (baseV + c) * 2;
              scratchUV[uvIdx]     = corner[3] === 0 ? u0 : u1;
              scratchUV[uvIdx + 1] = 1.0 - corner[4];

              let aoFactor = 1.0, touchesWood = false;
              if (lodLevel > 0) {
                aoFactor = isGlow ? 1.0 : face.shade * 0.92;
              } else {
                if (!isGlow) {
                  const aoOff = face.ao[c];
                  const s1 = BLOCK_DEFS[getVoxelGlobal(wx + aoOff[0][0], y + aoOff[0][1], wz + aoOff[0][2])].opaque ? 1 : 0;
                  const s2 = BLOCK_DEFS[getVoxelGlobal(wx + aoOff[1][0], y + aoOff[1][1], wz + aoOff[1][2])].opaque ? 1 : 0;
                  const sc = BLOCK_DEFS[getVoxelGlobal(wx + aoOff[2][0], y + aoOff[2][1], wz + aoOff[2][2])].opaque ? 1 : 0;
                  const aoLevel = (s1 && s2) ? 0 : (3 - (s1 + s2 + sc));
                  aoScores[c] = aoLevel;
                  aoFactor = face.shade * AO_CURVE[aoLevel];
                }
                if (isLeaves) {
                  const vx = wx + corner[0], vy = y + corner[1], vz = wz + corner[2];
                  touchesWood = (
                    getVoxelGlobal(vx - 1, vy - 1, vz - 1) === BLOCK.WOOD || getVoxelGlobal(vx, vy - 1, vz - 1) === BLOCK.WOOD ||
                    getVoxelGlobal(vx - 1, vy,     vz - 1) === BLOCK.WOOD || getVoxelGlobal(vx, vy,     vz - 1) === BLOCK.WOOD ||
                    getVoxelGlobal(vx - 1, vy - 1, vz)     === BLOCK.WOOD || getVoxelGlobal(vx, vy - 1, vz)     === BLOCK.WOOD ||
                    getVoxelGlobal(vx - 1, vy,     vz)     === BLOCK.WOOD || getVoxelGlobal(vx, vy,     vz)     === BLOCK.WOOD
                  );
                }
              }
              scratchCol[pIdx]     = (touchesWood ? -1 : 1) * aoFactor * baseR;
              scratchCol[pIdx + 1] = aoFactor * baseG;
              scratchCol[pIdx + 2] = aoFactor * baseB;
            }

            if (aoScores[0] + aoScores[2] > aoScores[1] + aoScores[3]) {
              scratchIdx[iCount++] = baseV;
              scratchIdx[iCount++] = baseV + 1;
              scratchIdx[iCount++] = baseV + 2;
              scratchIdx[iCount++] = baseV;
              scratchIdx[iCount++] = baseV + 2;
              scratchIdx[iCount++] = baseV + 3;
            } else {
              scratchIdx[iCount++] = baseV + 1;
              scratchIdx[iCount++] = baseV + 2;
              scratchIdx[iCount++] = baseV + 3;
              scratchIdx[iCount++] = baseV + 1;
              scratchIdx[iCount++] = baseV + 3;
              scratchIdx[iCount++] = baseV;
            }
            vCount += 4;
          }
        }
      }
    }
  }

  return {
    solid: {
      pos: scratchPos.slice(0, vCount * 3),
      uv:  scratchUV.slice(0, vCount * 2),
      col: scratchCol.slice(0, vCount * 3),
      idx: scratchIdx.slice(0, iCount)
    },
    water: {
      pos: scratchWPos.slice(0, wvCount * 3),
      uv:  scratchWUV.slice(0, wvCount * 2),
      col: scratchWCol.slice(0, wvCount * 3),
      idx: scratchWIdx.slice(0, wiCount)
    }
  };
}

// ============================================================================
// 6. WEB AUDIO SYNTHESIZER + C418 GENERATIVE MUSIC & AMBIENT SOUNDSCAPE
// ============================================================================
const C418_SCALE_HZ = [
  146.83, 196.00, 220.00, 246.94, // D3, G3, A3, B3
  293.66, 329.63, 369.99, 392.00, // D4, E4, F#4, G4
  440.00, 493.88, 554.37, 587.33, 659.25 // A4, B4, C#5, D5, E5
];
const C418_CHORDS = [
  [0, 4, 6, 8],  // Dmaj7
  [1, 4, 7, 9],  // Gadd9
  [2, 5, 8, 10], // A6
  [3, 6, 8, 11]  // Bm7
];

class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.reverbNode = null;
    this.windFilter = null;
    this.windGain = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicVolume = 0.80;
    this.sfxVolume = 0.80;
    this.envMode = 'surface'; // 'surface', 'cave', 'underwater'
    this.notesPlayedCount = 0;
    this.chordsPlayedCount = 0;
    this.caveEchoCount = 0;
    this.chordCursor = 0;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.35 * this.musicVolume : 0.0, now, 0.08);
    if (this.windGain) this.windGain.gain.setTargetAtTime(this.musicEnabled ? 0.06 * this.musicVolume : 0.0, now, 0.08);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0.0, now, 0.05);
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0.0;
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicEnabled ? 0.35 * this.musicVolume : 0.0;
        this.musicGain.connect(this.masterGain);

        const sr = this.ctx.sampleRate;
        const len = Math.floor(sr * 2.0);
        const irBuf = this.ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuf.getChannelData(ch);
          let prev = 0;
          for (let i = 0; i < len; i++) {
            const decay = Math.pow(1 - i / len, 2.6);
            const white = Math.random() * 2 - 1;
            prev = prev * 0.78 + white * 0.22;
            data[i] = prev * decay * 0.45;
          }
        }
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = irBuf;
        this.reverbNode.connect(this.musicGain);

        const nLen = Math.floor(sr * 2.0);
        const nBuf = this.ctx.createBuffer(1, nLen, sr);
        const nData = nBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < nLen; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.997 * b0 + w * 0.029;
          b1 = 0.985 * b1 + w * 0.032;
          b2 = 0.950 * b2 + w * 0.048;
          nData[i] = (b0 + b1 + b2) * 0.22;
        }
        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = nBuf;
        windSrc.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 340;
        this.windFilter.Q.value = 1.8;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = this.musicEnabled ? 0.05 : 0.0;

        windSrc.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        windSrc.start(0);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
  playMusicNote(freqHz, delaySec = 0, durationSec = 3.4, velocity = 0.18) {
    this.init();
    if (!this.ctx || !this.musicEnabled) return false;
    const start = this.ctx.currentTime + delaySec;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freqHz, start);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freqHz * 2.0, start);
    osc2.detune.setValueAtTime(4, start);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.14, start);
    harmGain.gain.exponentialRampToValueAtTime(0.01, start + durationSec * 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, start);
    filter.frequency.exponentialRampToValueAtTime(280, start + durationSec);

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(velocity, start + 0.055);
    env.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

    osc1.connect(filter);
    osc2.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(env);

    env.connect(this.musicGain);
    if (this.reverbNode) env.connect(this.reverbNode);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + durationSec + 0.05);
    osc2.stop(start + durationSec + 0.05);

    this.notesPlayedCount++;
    return true;
  }
  triggerMusicChord(chordIdx) {
    this.init();
    if (!this.ctx || !this.musicEnabled) return false;
    const idx = typeof chordIdx === 'number'
      ? (chordIdx % C418_CHORDS.length)
      : (this.chordCursor++ % C418_CHORDS.length);
    const chord = C418_CHORDS[idx];
    for (let i = 0; i < chord.length; i++) {
      const freq = C418_SCALE_HZ[chord[i]];
      this.playMusicNote(freq, i * 0.42, 3.6, 0.14);
    }
    const topFreq = C418_SCALE_HZ[8 + (idx % 5)];
    this.playMusicNote(topFreq, 1.85, 3.2, 0.12);
    this.chordsPlayedCount++;
    return true;
  }
  playCaveEcho() {
    this.init();
    if (!this.ctx || !this.musicEnabled) return false;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    const baseF = 880 + (this.caveEchoCount % 3) * 146;
    osc.frequency.setValueAtTime(baseF, now);
    osc.frequency.exponentialRampToValueAtTime(baseF * 0.72, now + 0.45);
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.08, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
    osc.connect(env);
    if (this.reverbNode) env.connect(this.reverbNode);
    else env.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.55);
    this.caveEchoCount++;
    return true;
  }
  play(type) {
    if (!this.ctx || !this.sfxEnabled || this.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain || this.ctx.destination);

    if (type === 'break') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.095);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.start(now); osc.stop(now + 0.095);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.065);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.start(now); osc.stop(now + 0.065);
    } else if (type === 'step') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95 + Math.random() * 25, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.045);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now); osc.stop(now + 0.045);
    } else if (type === 'hurt') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now); osc.stop(now + 0.16);
    } else if (type === 'fuse') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'boom') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.45);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now); osc.stop(now + 0.45);
    } else if (type === 'mobHit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(290 + Math.random() * 60, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.11);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now); osc.stop(now + 0.11);
    } else if (type === 'zombie') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.linearRampToValueAtTime(64, now + 0.24);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now); osc.stop(now + 0.24);
    } else if (type === 'pickup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.075);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.start(now); osc.stop(now + 0.075);
    } else if (type === 'craft') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'hiss') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'thunder') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(82, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 0.75);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      if (this.reverbNode) gain.connect(this.reverbNode);
      osc.start(now); osc.stop(now + 0.75);
    } else if (type === 'bow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(590, now + 0.085);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.start(now); osc.stop(now + 0.085);
    } else if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(390, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now); osc.stop(now + 0.14);
    } else if (type === 'lever') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'boing') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(185, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'chime') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.28);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      if (this.reverbNode) gain.connect(this.reverbNode);
      osc.start(now); osc.stop(now + 0.28);
    } else if (type === 'door') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'climb') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.start(now); osc.stop(now + 0.055);
    } else if (type === 'rail') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.045);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now); osc.stop(now + 0.045);
    } else if (type === 'chest') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now); osc.stop(now + 0.16);
    } else if (type === 'golem') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.26);
      gain.gain.setValueAtTime(0.19, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now); osc.stop(now + 0.26);
    } else if (type === 'waypoint') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(990, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now); osc.stop(now + 0.14);
    } else if (type === 'splash') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === 'piston') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(295, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now); osc.stop(now + 0.11);
    } else if (type === 'grapple') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.18);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.18);
    } else if (type === 'portal') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(784, now + 0.34);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      if (this.reverbNode) gain.connect(this.reverbNode);
      osc.start(now); osc.stop(now + 0.34);
    } else if (type === 'shield') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'shutter') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    }
  }
}
const sfx = new SoundFX();

let ambientStepAccum = 0;
let musicChordAccum = 6.5;

function toggleMusic(forceVal) {
  sfx.musicEnabled = typeof forceVal === 'boolean' ? forceVal : !sfx.musicEnabled;
  sfx.applyVolumes();
  const btn = document.getElementById('tbtn-music');
  if (btn) btn.classList.toggle('toggled', sfx.musicEnabled);
  if (typeof userSettings !== 'undefined') { userSettings.musicEnabled = sfx.musicEnabled; if (typeof applyUserSettingsToUI === 'function') applyUserSettingsToUI(); if (typeof saveUserSettings === 'function') saveUserSettings(); }
  return sfx.musicEnabled;
}

function toggleSfx(forceVal) {
  sfx.sfxEnabled = typeof forceVal === 'boolean' ? forceVal : !sfx.sfxEnabled;
  sfx.applyVolumes();
  if (typeof userSettings !== 'undefined') { userSettings.sfxEnabled = sfx.sfxEnabled; if (typeof applyUserSettingsToUI === 'function') applyUserSettingsToUI(); if (typeof saveUserSettings === 'function') saveUserSettings(); }
  return sfx.sfxEnabled;
}

function updateAmbientAudio(dt) {
  ambientStepAccum += dt;
  if (ambientStepAccum < 0.45) return;
  const elapsed = ambientStepAccum;
  ambientStepAccum = 0;

  const px = Math.floor(player.x), py = Math.floor(player.y + 1), pz = Math.floor(player.z);
  const sunL = getLightGlobal(px, py, pz) >> 4;
  sfx.envMode = isCameraUnderwater ? 'underwater' : ((py < 28 && sunL <= 2) ? 'cave' : 'surface');

  if (sfx.ctx && sfx.musicEnabled && sfx.windFilter && sfx.windGain) {
    const now = sfx.ctx.currentTime, mv = sfx.musicVolume;
    if (sfx.envMode === 'underwater') {
      sfx.windFilter.type = 'lowpass'; sfx.windFilter.frequency.setTargetAtTime(135, now, 0.25); sfx.windGain.gain.setTargetAtTime(0.08 * mv, now, 0.25);
    } else if (sfx.envMode === 'cave') {
      sfx.windFilter.type = 'lowpass'; sfx.windFilter.frequency.setTargetAtTime(110, now, 0.25); sfx.windGain.gain.setTargetAtTime(0.065 * mv, now, 0.25);
      if (Math.random() < 0.18) sfx.playCaveEcho();
    } else {
      sfx.windFilter.type = 'bandpass'; sfx.windFilter.frequency.setTargetAtTime(240 + Math.min(260, Math.max(0, (player.y - 20) * 6)), now, 0.3); sfx.windGain.gain.setTargetAtTime(0.045 * mv, now, 0.3);
    }
  }
  if (sfx.ctx && sfx.musicEnabled && sfx.musicVolume > 0) {
    musicChordAccum += elapsed;
    if (musicChordAccum >= 9.0) { musicChordAccum = 0; sfx.triggerMusicChord(); }
  }
}
