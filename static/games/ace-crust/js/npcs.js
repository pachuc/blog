import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS, HALF, PITCH, STREET, streetCoord } from './city.js';

const CAR_COLORS = [0x2b2d42, 0x8d99ae, 0xd62839, 0x3a86ff, 0xffbe0b, 0x8338ec, 0x06d6a0, 0xeeeeee, 0x444455, 0xff5d8f];
const NEON = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff66, 0xff6b6b, 0xff9900];
const PED_COLORS = [0xff4d6d, 0x4cc9f0, 0xf9c74f, 0x90be6d, 0xf8961e, 0xb5179e, 0xffffff, 0x43aa8b, 0x7209b7, 0xffd6a5];
const X_LANE_ALTS = [28, 64, 100, 140];
const Z_LANE_ALTS = [46, 82, 120, 160];
const WRAP = HALF + 40;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _ahead = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3(0, 0, 0);
const ONE = new THREE.Vector3(1, 1, 1);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ------------------------------------------------------------------ traffic

export class Traffic {
  constructor(G, count = 260) {
    this.G = G;
    const body = mergeGeometries([
      new THREE.BoxGeometry(3.2, 1.2, 6.4),
      new THREE.BoxGeometry(2.6, 0.8, 2.8).translate(0, 0.9, 0.4),
    ]);
    this.body = new THREE.InstancedMesh(body, new THREE.MeshLambertMaterial(), count);
    this.tail = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.8, 0.3, 0.15).translate(0, 0.1, 3.25),
      new THREE.MeshBasicMaterial({ color: 0xff2040 }), count);
    this.head = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.8, 0.25, 0.15).translate(0, 0.1, -3.25),
      new THREE.MeshBasicMaterial({ color: 0xddffff }), count);
    this.glow = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.4, 0.12, 5.4).translate(0, -0.66, 0),
      new THREE.MeshBasicMaterial(), count);
    this.meshes = [this.body, this.tail, this.head, this.glow];
    const color = new THREE.Color();
    this.cars = [];
    for (let i = 0; i < count; i++) {
      this.body.setColorAt(i, color.setHex(pick(CAR_COLORS)));
      this.glow.setColorAt(i, color.setHex(pick(NEON)));
      const car = {
        type: 'car', owner: this, index: i, radius: 3.4, hp: 3, alive: true, respawn: 0,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, baseY: 0, phase: Math.random() * 6,
        nearMissed: false,
      };
      this.placeInLane(car, false);
      this.cars.push(car);
    }
    for (const m of this.meshes) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      G.scene.add(m);
    }
  }

  placeInLane(car, awayFromPlayer) {
    const p = this.G.player?.pos;
    for (let tries = 0; tries < 10; tries++) {
      const alongX = Math.random() < 0.5;
      const k = Math.floor(Math.random() * (BLOCKS + 1));
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = (32 + Math.random() * 28) * dir;
      const along = (Math.random() * 2 - 1) * HALF;
      if (alongX) {
        car.baseY = pick(X_LANE_ALTS);
        car.pos.set(along, car.baseY, streetCoord(k) + dir * 6);
        car.vel.set(speed, 0, 0);
        car.yaw = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        car.baseY = pick(Z_LANE_ALTS);
        car.pos.set(streetCoord(k) - dir * 6, car.baseY, along);
        car.vel.set(0, 0, speed);
        car.yaw = dir > 0 ? Math.PI : 0;
      }
      if (!awayFromPlayer || !p || car.pos.distanceTo(p) > 250) break;
    }
    car.alive = true;
    car.hp = 3;
    car.nearMissed = false;
  }

  kill(car) {
    if (!car.alive) return;
    car.alive = false;
    car.respawn = 6;
    this.G.fx.explosion(car.pos, 1);
    this.G.onKill('car', car.pos);
  }

  checkPlayer(car, player) {
    const d2 = car.pos.distanceToSquared(player.pos);
    const hitR = car.radius + 2.4;
    if (d2 < hitR * hitR) {
      if (!player.ramming) {
        player.damage(15);
        player.speed *= 0.7;
      }
      this.kill(car);
    } else if (d2 < 81 && !car.nearMissed && player.speed > 70) {
      car.nearMissed = true;
      player.boost = Math.min(1, player.boost + 0.12);
      this.G.callout('CLOSE CALL', { color: '#00ffff', size: 'small' });
    }
  }

  update(dt) {
    const t = this.G.time;
    const player = this.G.player;
    const playing = this.G.state === 'play';
    for (const car of this.cars) {
      if (!car.alive) {
        car.respawn -= dt;
        if (car.respawn <= 0) this.placeInLane(car, true);
        _m.compose(car.pos, _q, ZERO);
      } else {
        car.pos.addScaledVector(car.vel, dt);
        if (car.pos.x > WRAP) car.pos.x -= 2 * WRAP;
        if (car.pos.x < -WRAP) car.pos.x += 2 * WRAP;
        if (car.pos.z > WRAP) car.pos.z -= 2 * WRAP;
        if (car.pos.z < -WRAP) car.pos.z += 2 * WRAP;
        car.pos.y = car.baseY + Math.sin(t * 1.3 + car.phase) * 0.5;
        _q.setFromAxisAngle(_up, car.yaw);
        _m.compose(car.pos, _q, ONE);
        if (playing && player.alive) this.checkPlayer(car, player);
      }
      for (const m of this.meshes) m.setMatrixAt(car.index, _m);
    }
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
  }
}

// --------------------------------------------------------------- pedestrians

export class Peds {
  constructor(G, count = 700) {
    this.G = G;
    const geo = mergeGeometries([
      new THREE.CapsuleGeometry(0.5, 1.0, 3, 6).translate(0, 1.0, 0),
      new THREE.SphereGeometry(0.4, 6, 5).translate(0, 2.1, 0),
    ]);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.walkable = G.city.blocks.filter((b) => b.type !== 'pizzeria');
    const color = new THREE.Color();
    this.peds = [];
    for (let i = 0; i < count; i++) {
      const c = pick(PED_COLORS);
      this.mesh.setColorAt(i, color.setHex(c));
      const ped = {
        type: 'ped', owner: this, index: i, radius: 1.4, hp: 1, alive: true, respawn: 0, color: c,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), rect: null, t: 0, speed: 0, dir: 1,
        phase: Math.random() * 6,
      };
      this.place(ped, false);
      this.peds.push(ped);
    }
    G.scene.add(this.mesh);
  }

  place(ped, awayFromPlayer) {
    const p = this.G.player?.pos;
    let block;
    for (let tries = 0; tries < 10; tries++) {
      block = pick(this.walkable);
      if (!awayFromPlayer || !p || Math.hypot(block.x0 + 32 - p.x, block.z0 + 32 - p.z) > 220) break;
    }
    // Walk the sidewalk loop around the block (inside it for plazas)
    const off = block.type === 'plaza' ? -6 - Math.random() * 20 : 3 + Math.random() * 2.5;
    ped.rect = { x0: block.x0 - off, x1: block.x1 + off, z0: block.z0 - off, z1: block.z1 + off };
    ped.t = Math.random();
    ped.speed = 1.2 + Math.random() * 1.8;
    ped.dir = Math.random() < 0.5 ? 1 : -1;
    ped.alive = true;
    ped.hp = 1;
  }

  kill(ped) {
    if (!ped.alive) return;
    ped.alive = false;
    ped.respawn = 8;
    this.G.fx.pop(_v.copy(ped.pos).setY(1.2), ped.color);
    this.G.onKill('ped', ped.pos);
  }

  update(dt) {
    const G = this.G;
    const player = G.player;
    const playing = G.state === 'play';
    for (const ped of this.peds) {
      if (!ped.alive) {
        ped.respawn -= dt;
        if (ped.respawn <= 0) this.place(ped, true);
        _m.compose(ped.pos, _q.identity(), ZERO);
        this.mesh.setMatrixAt(ped.index, _m);
        continue;
      }
      const r = ped.rect;
      const w = r.x1 - r.x0, h = r.z1 - r.z0;
      const perim = 2 * (w + h);
      const dx = player.pos.x - ped.pos.x, dz = player.pos.z - ped.pos.z;
      const close2 = dx * dx + dz * dz;
      // Scatter when a car buzzes the street
      const panic = playing && close2 < 35 * 35 && player.pos.y < 22;
      const speed = ped.speed * (panic ? 4 : 1);
      ped.t = (ped.t + (ped.dir * speed * dt) / perim + 1) % 1;

      const prevX = ped.pos.x, prevZ = ped.pos.z;
      let s = ped.t * perim;
      if (s < w) ped.pos.set(r.x0 + s, 0, r.z0);
      else if ((s -= w) < h) ped.pos.set(r.x1, 0, r.z0 + s);
      else if ((s -= h) < w) ped.pos.set(r.x1 - s, 0, r.z1);
      else ped.pos.set(r.x0, 0, r.z1 - (s - w));
      ped.vel.set((ped.pos.x - prevX) / Math.max(dt, 1e-4), 0, (ped.pos.z - prevZ) / Math.max(dt, 1e-4));
      ped.pos.y = Math.abs(Math.sin(G.time * (panic ? 18 : 8) + ped.phase)) * 0.25;

      // Squish: player skimming the street runs them over
      if (playing && player.alive && player.pos.y < 4.8 && close2 < 3.6 * 3.6) {
        this.kill(ped);
        continue;
      }
      _m.makeTranslation(ped.pos.x, ped.pos.y, ped.pos.z);
      this.mesh.setMatrixAt(ped.index, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// --------------------------------------------------------------------- cops

const MAX_COPS = 12;
const COPS_FOR_STARS = [0, 1, 2, 4, 7, 10];

export class Cops {
  constructor(G) {
    this.G = G;
    this.cops = [];
    this.spawnT = 0;
    const bodyGeo = mergeGeometries([
      new THREE.BoxGeometry(3.4, 1.3, 6.4),
      new THREE.BoxGeometry(2.6, 0.8, 2.6).translate(0, 1.0, 0.3),
    ]);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x14204a });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
    this.redMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    this.blueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    for (let i = 0; i < MAX_COPS; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bodyGeo, bodyMat));
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.2, 6.45), stripeMat);
      stripe.position.y = -0.1;
      g.add(stripe);
      const red = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.6), this.redMat);
      red.position.set(-0.65, 1.6, 0.3);
      const blue = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.6), this.blueMat);
      blue.position.set(0.65, 1.6, 0.3);
      g.add(red, blue);
      g.visible = false;
      G.scene.add(g);
      this.cops.push({
        type: 'cop', owner: this, mesh: g, red, blue, radius: 3.2, hp: 10, alive: false,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), fireCd: 2, offset: new THREE.Vector3(),
      });
    }
  }

  clear() {
    for (const c of this.cops) {
      c.alive = false;
      c.mesh.visible = false;
    }
  }

  activeCount() {
    let n = 0;
    for (const c of this.cops) if (c.alive) n++;
    return n;
  }

  spawn() {
    const G = this.G;
    const cop = this.cops.find((c) => !c.alive);
    if (!cop) return;
    const p = G.player.pos;
    // Drop in from the nearest open intersection a few hundred units away
    const a = Math.random() * Math.PI * 2;
    const dist = 280 + Math.random() * 120;
    const k = (v) => Math.round((v + HALF) / PITCH);
    const clampK = (v) => Math.max(0, Math.min(BLOCKS, v));
    const x = streetCoord(clampK(k(p.x + Math.cos(a) * dist)));
    const z = streetCoord(clampK(k(p.z + Math.sin(a) * dist)));
    cop.pos.set(x, Math.max(40, p.y + 20), z);
    cop.vel.set(0, 0, 0);
    cop.hp = 10;
    cop.alive = true;
    cop.fireCd = 1.5 + Math.random() * 1.5;
    cop.offset.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5).setLength(16 + Math.random() * 14);
    cop.mesh.visible = true;
  }

  kill(cop) {
    if (!cop.alive) return;
    cop.alive = false;
    cop.mesh.visible = false;
    this.G.fx.explosion(cop.pos, 1.4);
    this.G.onKill('cop', cop.pos);
  }

  update(dt) {
    const G = this.G;
    const player = G.player;
    const stars = G.stars;
    const want = COPS_FOR_STARS[stars];
    const blink = Math.floor(G.time * 8) % 2 === 0;
    this.redMat.color.setHex(blink ? 0xff0033 : 0x220008);
    this.blueMat.color.setHex(blink ? 0x000a22 : 0x0066ff);

    this.spawnT -= dt;
    if (G.state === 'play' && this.activeCount() < want && this.spawnT <= 0) {
      this.spawn();
      this.spawnT = 1.6;
    }

    const maxSpeed = 80 + stars * 8;
    let surplus = this.activeCount() - want;
    for (const cop of this.cops) {
      if (!cop.alive) continue;
      const toP = _v.copy(player.pos).sub(cop.pos);
      const dist = toP.length();
      if (surplus > 0 && dist > 420) {
        cop.alive = false;
        cop.mesh.visible = false;
        surplus--;
        continue;
      }

      // Pursue a point offset around the player's predicted position
      const aim = _s.copy(player.pos).addScaledVector(player.vel, 0.6).add(cop.offset);
      const desired = aim.sub(cop.pos);
      const speed = maxSpeed * (dist > 500 ? 1.7 : 1);
      desired.setLength(speed);
      // Climb over anything directly ahead
      _ahead.copy(cop.pos).addScaledVector(cop.vel, 0.7);
      if (G.city.pointInside(_ahead, 5)) desired.y += 90;
      cop.vel.lerp(desired, 1 - Math.exp(-2.5 * dt));
      cop.pos.addScaledVector(cop.vel, dt);
      const res = G.city.resolveSphere(cop.pos, 2.6);
      if (res.hit) cop.vel.y = Math.abs(cop.vel.y) + 15;
      if (cop.pos.y < 6) cop.pos.y = 6;

      const yaw = Math.atan2(-cop.vel.x, -cop.vel.z);
      const hs = Math.hypot(cop.vel.x, cop.vel.z);
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.set(Math.atan2(cop.vel.y, hs) * 0.6, yaw, 0, 'YXZ');

      // Shoot with lead
      cop.fireCd -= dt;
      if (G.state === 'play' && player.alive && cop.fireCd <= 0 && dist < 300) {
        const missile = stars >= 4 && Math.random() < 0.3;
        G.weapons.fireBolt(cop.pos, player, missile);
        cop.fireCd = Math.max(0.7, 2.4 - stars * 0.3) + Math.random() * 0.8;
      }

      // Ramming
      if (G.state === 'play' && player.alive && dist < cop.radius + 2.6) {
        if (!player.ramming) player.damage(12);
        this.kill(cop);
      }
    }
  }
}
