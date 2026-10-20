import * as THREE from 'three';

export const BLOCKS = 18;
export const BLOCK = 64;
export const STREET = 30;
export const PITCH = BLOCK + STREET;
export const HALF = (BLOCKS * PITCH) / 2;
export const CEILING = 420;

// Window texture tile covers 8 columns x 16 floors
const TILE_W = 32;
const TILE_H = 72;

const PIZZERIA_NAMES = ['SLICE STATION', 'CRUST CORP', "MAMA BYTE'S", 'NEO NAPOLI', 'PIE-O-TRON'];
const SIGN_WORDS = ['PIZZA', 'ACE', 'CRUST', 'SYNTH', '24/7', 'ZAP', 'OPEN', 'BUY', 'NEON', 'DRINK', 'HACK', 'LOVE'];
const SIGN_GLYPHS = ['ネオン', '拉麺', '鬼', '寿司', '電気', '夢', 'ピザ', '酒'];
const NEON = ['#00ffff', '#ff00ff', '#ffff00', '#00ff66', '#ff6b6b', '#ff9900', '#aa96da'];

// Seeded RNG so the city is the same every run
export function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function streetCoord(k) {
  return -HALF + k * PITCH;
}

export class City {
  constructor(G) {
    this.G = G;
    this.rand = mulberry32(2087);
    this.buildings = [];
    this.blocks = [];
    this.cells = Array.from({ length: BLOCKS * BLOCKS }, () => []);
    this.pizzerias = [];
    this._near = [];
    this._near2 = [];
    this._res = { hit: false, normal: new THREE.Vector3(), clearance: Infinity };

    this.generate();
    this.buildMeshes();
  }

  cellIndex(v) {
    return clamp(Math.floor((v + HALF) / PITCH), 0, BLOCKS - 1);
  }

  generate() {
    const r = this.rand;
    const pizzeriaAt = new Set(['4,4', '13,4', '4,13', '13,13', '9,8']);

    for (let i = 0; i < BLOCKS; i++) {
      for (let j = 0; j < BLOCKS; j++) {
        const x0 = -HALF + STREET / 2 + i * PITCH;
        const z0 = -HALF + STREET / 2 + j * PITCH;
        const x1 = x0 + BLOCK;
        const z1 = z0 + BLOCK;
        const block = { i, j, x0, x1, z0, z1, type: 'normal' };
        this.blocks.push(block);

        if (pizzeriaAt.has(`${i},${j}`)) {
          block.type = 'pizzeria';
          const b = this.addBuilding(block, x0 + 4, x1 - 4, z0 + 4, z1 - 4, 12, 'pizzeria');
          this.pizzerias.push({
            name: PIZZERIA_NAMES[this.pizzerias.length],
            block,
            building: b,
            ringPos: new THREE.Vector3(x1 + STREET / 2, 24, (z0 + z1) / 2),
          });
          continue;
        }
        if (r() < 0.08) {
          block.type = 'plaza';
          continue;
        }

        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        const downtown = Math.exp(-((cx * cx + cz * cz) / (HALF * HALF * 0.3)));
        const baseH = 28 + 230 * downtown;

        const lots = [];
        const roll = r();
        if (roll < 0.25) {
          lots.push([x0, x1, z0, z1]);
        } else if (roll < 0.6) {
          const m = 0.35 + r() * 0.3;
          if (r() < 0.5) {
            const mx = x0 + BLOCK * m;
            lots.push([x0, mx - 3, z0, z1], [mx + 3, x1, z0, z1]);
          } else {
            const mz = z0 + BLOCK * m;
            lots.push([x0, x1, z0, mz - 3], [x0, x1, mz + 3, z1]);
          }
        } else {
          const mx = x0 + BLOCK * (0.35 + r() * 0.3);
          const mz = z0 + BLOCK * (0.35 + r() * 0.3);
          lots.push(
            [x0, mx - 3, z0, mz - 3], [mx + 3, x1, z0, mz - 3],
            [x0, mx - 3, mz + 3, z1], [mx + 3, x1, mz + 3, z1],
          );
        }

        for (const [lx0, lx1, lz0, lz1] of lots) {
          let h = baseH * (0.45 + r() * 1.1);
          if (r() < 0.05) h *= 1.6;
          h = Math.max(16, Math.min(h, CEILING - 40));
          this.addBuilding(block, lx0 + 1, lx1 - 1, lz0 + 1, lz1 - 1, h, 'tower');
        }
      }
    }
  }

  addBuilding(block, x0, x1, z0, z1, h, kind) {
    const b = { x0, x1, z0, z1, h, kind, block, mat: Math.floor(this.rand() * 3) };
    this.buildings.push(b);
    this.cells[block.i * BLOCKS + block.j].push(b);
    return b;
  }

  // Buildings whose footprint overlaps the square around (x, z)
  near(x, z, r, out = this._near) {
    out.length = 0;
    const i0 = this.cellIndex(x - r), i1 = this.cellIndex(x + r);
    const j0 = this.cellIndex(z - r), j1 = this.cellIndex(z + r);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const b of this.cells[i * BLOCKS + j]) {
          if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1) out.push(b);
        }
      }
    }
    return out;
  }

  pointInside(p, pad = 0) {
    if (p.y < 0) return true;
    for (const b of this.near(p.x, p.z, pad, this._near2)) {
      if (p.y < b.h + pad && p.x > b.x0 - pad && p.x < b.x1 + pad && p.z > b.z0 - pad && p.z < b.z1 + pad) {
        return b;
      }
    }
    return null;
  }

  // Push a sphere out of any buildings it overlaps. Also reports the closest
  // clearance to nearby walls (within `probe`) for near-miss detection.
  resolveSphere(pos, radius, probe = 0) {
    const res = this._res;
    res.hit = false;
    res.clearance = Infinity;
    res.normal.set(0, 0, 0);

    for (const b of this.near(pos.x, pos.z, radius + probe, this._near2)) {
      const cx = clamp(pos.x, b.x0, b.x1);
      const cy = Math.min(pos.y, b.h);
      const cz = clamp(pos.z, b.z0, b.z1);
      const dx = pos.x - cx, dy = pos.y - cy, dz = pos.z - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= radius * radius) {
        res.clearance = Math.min(res.clearance, Math.sqrt(d2) - radius);
        continue;
      }

      let nx, ny, nz, pen;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = dx / d; ny = dy / d; nz = dz / d;
        pen = radius - d;
      } else {
        // Centre is inside the box: leave through the nearest face
        const exits = [
          [pos.x - b.x0, -1, 0, 0], [b.x1 - pos.x, 1, 0, 0],
          [pos.z - b.z0, 0, 0, -1], [b.z1 - pos.z, 0, 0, 1],
          [b.h - pos.y, 0, 1, 0],
        ];
        exits.sort((a, c) => a[0] - c[0]);
        [pen, nx, ny, nz] = exits[0];
        pen += radius;
      }
      pos.x += nx * pen;
      pos.y += ny * pen;
      pos.z += nz * pen;
      res.normal.x += nx;
      res.normal.y += ny;
      res.normal.z += nz;
      res.hit = true;
      res.clearance = 0;
    }
    if (res.hit) res.normal.normalize();
    return res;
  }

  // A spot hovering in the street beside a tower, at some floor
  deliverySpot(b, rand = Math.random) {
    const blk = b.block;
    const sides = [];
    if (b.x0 - blk.x0 < 2) sides.push('-x');
    if (blk.x1 - b.x1 < 2) sides.push('+x');
    if (b.z0 - blk.z0 < 2) sides.push('-z');
    if (blk.z1 - b.z1 < 2) sides.push('+z');
    const side = sides[Math.floor(rand() * sides.length)] || '+x';
    const y = 16 + rand() * Math.max(4, Math.min(b.h, 190) - 24);
    const mx = clamp((b.x0 + b.x1) / 2, blk.x0 + 10, blk.x1 - 10);
    const mz = clamp((b.z0 + b.z1) / 2, blk.z0 + 10, blk.z1 - 10);
    switch (side) {
      case '-x': return new THREE.Vector3(blk.x0 - STREET / 2, y, mz);
      case '+x': return new THREE.Vector3(blk.x1 + STREET / 2, y, mz);
      case '-z': return new THREE.Vector3(mx, y, blk.z0 - STREET / 2);
      default: return new THREE.Vector3(mx, y, blk.z1 + STREET / 2);
    }
  }

  // ---------------------------------------------------------------- meshes

  buildMeshes() {
    const scene = this.G.scene;
    const r = this.rand;
    const anisotropy = this.G.renderer.capabilities.getMaxAnisotropy();

    const palettes = [
      ['#bff6ff', '#00e5ff', '#ffffff', '#5ad1ff'],
      ['#ff9cf0', '#ff00ff', '#ffd6f5', '#b967ff'],
      ['#ffd27a', '#ff9900', '#fff1c9', '#ff6b6b'],
    ];
    const sideMats = palettes.map((pal, idx) => {
      const tex = windowTexture(r, pal, 0.32 + idx * 0.04);
      tex.anisotropy = anisotropy;
      return new THREE.MeshLambertMaterial({
        color: 0x1a1d33,
        emissive: 0xffffff,
        emissiveMap: tex,
      });
    });

    const sides = [[], [], []];
    const tops = [];
    const edgePos = [];
    const edgeCol = [];
    const beacons = [];
    const color = new THREE.Color();

    for (const b of this.buildings) {
      const offU = Math.floor(r() * 8) / 8;
      const offV = Math.floor(r() * 16) / 16;
      if (b.kind === 'pizzeria') {
        pushBoxSides(sides[2], b.x0, b.x1, 0, b.h, b.z0, b.z1, offU, offV);
      } else {
        pushBoxSides(sides[b.mat], b.x0, b.x1, 0, b.h, b.z0, b.z1, offU, offV);
      }
      pushTop(tops, b.x0, b.x1, b.h, b.z0, b.z1);

      if (r() < 0.45 || b.kind === 'pizzeria') {
        color.set(b.kind === 'pizzeria' ? '#ff9900' : NEON[Math.floor(r() * NEON.length)]);
        const y = b.h + 0.3;
        const corners = [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]];
        for (let k = 0; k < 4; k++) {
          const [ax, az] = corners[k];
          const [bx, bz] = corners[(k + 1) % 4];
          edgePos.push(ax, y, az, bx, y, bz);
          edgeCol.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }

      if (b.h > 170) {
        const ax = (b.x0 + b.x1) / 2, az = (b.z0 + b.z1) / 2;
        pushBoxSides(tops, ax - 0.6, ax + 0.6, b.h, b.h + 22, az - 0.6, az + 0.6, 0, 0);
        beacons.push(ax, b.h + 23, az);
      }
    }

    sides.forEach((positions, idx) => {
      scene.add(new THREE.Mesh(quadGeometry(positions), sideMats[idx]));
    });
    scene.add(new THREE.Mesh(quadGeometry(tops), new THREE.MeshLambertMaterial({ color: 0x10121e })));

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeCol, 3));
    scene.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ vertexColors: true })));

    const beaconGeo = new THREE.BufferGeometry();
    beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(beacons, 3));
    this.beaconMat = new THREE.PointsMaterial({ color: 0xff2030, size: 5, transparent: true });
    scene.add(new THREE.Points(beaconGeo, this.beaconMat));

    this.buildSkyline(sideMats);
    this.buildGround(anisotropy);
    this.buildSigns();
  }

  // Unreachable towers past the edge of the playable city
  buildSkyline(sideMats) {
    const r = this.rand;
    const sides = [[], [], []];
    for (let n = 0; n < 220; n++) {
      const a = r() * Math.PI * 2;
      const dist = HALF + 180 + r() * 700;
      const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
      const w = 30 + r() * 60, d = 30 + r() * 60, h = 60 + r() * 380;
      pushBoxSides(sides[n % 3], x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, r(), r());
    }
    sides.forEach((positions, idx) => {
      this.G.scene.add(new THREE.Mesh(quadGeometry(positions), sideMats[idx]));
    });
  }

  buildGround(anisotropy) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const s = Math.round((STREET / 2 / PITCH) * size);
    g.fillStyle = '#0a0a12';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#1c1c2a';
    g.fillRect(s - 6, s - 6, size - 2 * s + 12, size - 2 * s + 12);
    g.fillStyle = '#111119';
    g.fillRect(s, s, size - 2 * s, size - 2 * s);
    // Dashed lane lines along the street centres (texture edges)
    g.fillStyle = 'rgba(0, 255, 255, 0.7)';
    for (let k = 0; k < size; k += 16) {
      g.fillRect(k, 0, 8, 1);
      g.fillRect(k, size - 1, 8, 1);
      g.fillRect(0, k, 1, 8);
      g.fillRect(size - 1, k, 1, 8);
    }
    // Curb glow
    g.strokeStyle = 'rgba(255, 0, 255, 0.35)';
    g.lineWidth = 1;
    g.strokeRect(s - 6.5, s - 6.5, size - 2 * s + 13, size - 2 * s + 13);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(BLOCKS, BLOCKS);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(BLOCKS * PITCH, BLOCKS * PITCH),
      new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0x555577 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.G.scene.add(ground);

    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(8000, 8000),
      new THREE.MeshLambertMaterial({ color: 0x07070d }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.1;
    this.G.scene.add(outer);
  }

  buildSigns() {
    const r = this.rand;
    const scene = this.G.scene;
    const wordMats = SIGN_WORDS.map((w, k) => signMaterial(w, NEON[k % NEON.length], false));
    const glyphMats = SIGN_GLYPHS.map((w, k) => signMaterial(w, NEON[(k + 3) % NEON.length], true));
    const wide = new THREE.PlaneGeometry(26, 11);
    const tall = new THREE.PlaneGeometry(9, 30);

    const towers = this.buildings.filter((b) => b.kind === 'tower' && b.h > 50);
    for (let n = 0; n < 90 && towers.length; n++) {
      const b = towers[Math.floor(r() * towers.length)];
      const vertical = r() < 0.45;
      const geo = vertical ? tall : wide;
      const mat = vertical
        ? glyphMats[Math.floor(r() * glyphMats.length)]
        : wordMats[Math.floor(r() * wordMats.length)];
      const halfW = vertical ? 4.5 : 13;
      const halfH = vertical ? 15 : 5.5;
      const y = halfH + 8 + r() * Math.max(1, b.h - 2 * halfH - 16);
      const sign = new THREE.Mesh(geo, mat);
      const side = Math.floor(r() * 4);
      const along = (lo, hi) => lo + halfW + r() * Math.max(0, hi - lo - 2 * halfW);
      if (side === 0) { sign.position.set(b.x1 + 0.4, y, along(b.z0, b.z1)); sign.rotation.y = Math.PI / 2; }
      if (side === 1) { sign.position.set(b.x0 - 0.4, y, along(b.z0, b.z1)); sign.rotation.y = -Math.PI / 2; }
      if (side === 2) { sign.position.set(along(b.x0, b.x1), y, b.z1 + 0.4); }
      if (side === 3) { sign.position.set(along(b.x0, b.x1), y, b.z0 - 0.4); sign.rotation.y = Math.PI; }
      scene.add(sign);
    }

    // Giant rotating pizza signs over every pizzeria
    const pizzaMat = signMaterial('PIZZA', '#ff9900', false);
    pizzaMat.side = THREE.DoubleSide;
    this.pizzaSigns = this.pizzerias.map((p) => {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(44, 18), pizzaMat);
      const b = p.building;
      sign.position.set((b.x0 + b.x1) / 2, b.h + 22, (b.z0 + b.z1) / 2);
      scene.add(sign);
      return sign;
    });
  }

  update(t) {
    this.beaconMat.opacity = Math.sin(t * 3) > 0 ? 1 : 0.1;
    for (const s of this.pizzaSigns) s.rotation.y = t * 0.6;
  }
}

// ------------------------------------------------------------------ helpers

function windowTexture(rand, palette, litChance) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#04050a';
  g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 8; col++) {
      if (rand() < litChance) {
        g.globalAlpha = 0.35 + rand() * 0.65;
        g.fillStyle = palette[Math.floor(rand() * palette.length)];
      } else {
        g.globalAlpha = 1;
        g.fillStyle = '#0c1024';
      }
      g.fillRect(col * 16 + 3, row * 16 + 4, 10, 9);
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signMaterial(text, color, vertical) {
  const c = document.createElement('canvas');
  c.width = vertical ? 96 : 256;
  c.height = vertical ? 320 : 108;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8, 4, 20, 0.92)';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.shadowColor = color;
  g.shadowBlur = 14;
  g.strokeRect(6, 6, c.width - 12, c.height - 12);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowBlur = 18;
  if (vertical) {
    const chars = [...text];
    const step = (c.height - 40) / chars.length;
    g.font = `bold ${Math.min(64, step * 0.85)}px sans-serif`;
    chars.forEach((ch, k) => g.fillText(ch, c.width / 2, 20 + step * (k + 0.5)));
  } else {
    g.font = 'bold 64px monospace';
    g.fillText(text, c.width / 2, c.height / 2 + 2, c.width - 30);
  }
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.globalAlpha = 0.55;
  g.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex });
}

// Quads are stored as flat arrays: 4 corners (BL, BR, TR, TL) + normal + uv rect
function pushQuad(out, a, b, c, d, n, u0, u1, v0, v1) {
  out.push({ a, b, c, d, n, u0, u1, v0, v1 });
}

function pushBoxSides(out, x0, x1, y0, y1, z0, z1, offU, offV) {
  const h = y1 - y0;
  const v0 = offV, v1 = offV + h / TILE_H;
  const wx = (x1 - x0) / TILE_W, wz = (z1 - z0) / TILE_W;
  pushQuad(out, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], offU, offU + wx, v0, v1);
  pushQuad(out, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], offU, offU + wx, v0, v1);
  pushQuad(out, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], offU, offU + wz, v0, v1);
  pushQuad(out, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], offU, offU + wz, v0, v1);
}

function pushTop(out, x0, x1, y, z0, z1) {
  pushQuad(out, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], 0, 0, 0, 0);
}

function quadGeometry(quads) {
  const pos = new Float32Array(quads.length * 18);
  const nor = new Float32Array(quads.length * 18);
  const uv = new Float32Array(quads.length * 12);
  quads.forEach((q, k) => {
    const corners = [q.a, q.b, q.c, q.a, q.c, q.d];
    const uvs = [[q.u0, q.v0], [q.u1, q.v0], [q.u1, q.v1], [q.u0, q.v0], [q.u1, q.v1], [q.u0, q.v1]];
    for (let v = 0; v < 6; v++) {
      pos.set(corners[v], k * 18 + v * 3);
      nor.set(q.n, k * 18 + v * 3);
      uv.set(uvs[v], k * 12 + v * 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
