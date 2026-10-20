import * as THREE from 'three';
import { HALF, CEILING } from './city.js';

export const BASE_SPEED = 72;
const RADIUS = 2.4;
const DRIFT_LEVELS = [0.45, 1.0, 1.8];
const DRIFT_TURBO = [22, 38, 58];
const PERFECT_WINDOW = 0.2;
const ROLL_TIME = 0.42;
const CRASH_SPEED = 38;
const BOUND = HALF + 60;

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const damp = (k, dt) => 1 - Math.exp(-k * dt);

export class Player {
  constructor(G) {
    this.G = G;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.fwd = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.invert = false;
    this.buildModel();
    this.reset(new THREE.Vector3(0, 30, 0), 0);
  }

  buildModel() {
    const m = new THREE.Group();
    const lam = (color) => new THREE.MeshLambertMaterial({ color });
    const glow = (color) => new THREE.MeshBasicMaterial({ color });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 6.8), lam(0xe8202a));
    m.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.25, 6.85), lam(0xffffff));
    stripe.position.y = 0.1;
    m.add(stripe);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 1.6), lam(0xb8141c));
    nose.position.set(0, -0.15, -3.9);
    m.add(nose);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.9, 3.0),
      new THREE.MeshLambertMaterial({ color: 0x0a2a3a, emissive: 0x0a6a8a }),
    );
    cabin.position.set(0, 0.9, -0.2);
    m.add(cabin);

    // Hover pods with glowing undersides
    const podGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.8, 10);
    const ringGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.12, 10);
    this.podGlowMat = glow(0x00ffff);
    for (const [x, z] of [[-2.0, -2.4], [2.0, -2.4], [-2.0, 2.4], [2.0, 2.4]]) {
      const pod = new THREE.Mesh(podGeo, lam(0x333344));
      pod.position.set(x, -0.4, z);
      m.add(pod);
      const ring = new THREE.Mesh(ringGeo, this.podGlowMat);
      ring.position.set(x, -0.85, z);
      m.add(ring);
    }

    // Rear thrusters
    this.thrusterMat = glow(0x00ffff);
    this.thrusters = [];
    for (const x of [-1.0, 1.0]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.0, 10), lam(0x222230));
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 0.1, 3.6);
      m.add(t);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.4, 10), this.thrusterMat);
      flame.rotation.x = Math.PI / 2;
      flame.position.set(x, 0.1, 5.2);
      m.add(flame);
      this.thrusters.push(flame);
    }

    // Delivery topper
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 48;
    const g = c.getContext('2d');
    g.fillStyle = '#ffcc00';
    g.fillRect(0, 0, 128, 48);
    g.fillStyle = '#c4000c';
    g.font = 'bold 34px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('PIZZA', 64, 26);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const topper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.3), new THREE.MeshBasicMaterial({ map: tex }));
    topper.position.set(0, 1.75, 0.6);
    m.add(topper);

    // Stack of pizza boxes on the rear deck while carrying
    this.boxes = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 2.0), lam(0xf0e0c0));
      box.position.set(0, 0.65 + k * 0.3, 2.3);
      box.rotation.y = (k - 1) * 0.15;
      this.boxes.add(box);
    }
    m.add(this.boxes);

    this.mesh = m;
    this.G.scene.add(m);
  }

  reset(pos, yaw) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.bank = 0;
    this.speed = 0;
    this.hp = 100;
    this.boost = 0.6;
    this.turbo = 0;
    this.boosting = false;
    this.iframes = 0;
    this.drift = { active: false, t: 0, dir: 1, level: 0, levelT: 0 };
    this.roll = { t: 0, dir: 0, cd: 0, perfect: false };
    this.nearMissT = 0;
    this.grindT = 0;
    this.calloutCd = 0;
    this.alive = true;
    this.mesh.visible = true;
    this.updateBasis();
    this.updateVisual(0);
  }

  get ramming() {
    return this.boosting || this.turbo > 12 || this.roll.t > 0;
  }

  get driftPerfect() {
    const d = this.drift;
    return d.active && d.level > 0 && d.levelT < PERFECT_WINDOW;
  }

  updateBasis() {
    const cp = Math.cos(this.pitch);
    this.fwd.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  update(dt, input) {
    const G = this.G;
    const d = this.drift;
    const rs = this.roll;
    const turnIn = input.axis('right', 'left');
    let pitchIn = input.axis('down', 'up');
    if (this.invert) pitchIn = -pitchIn;

    // Barrel roll dodge
    rs.cd -= dt;
    let rollDir = 0;
    if (input.pressed('rollLeft') || input.doubleTap('left')) rollDir = -1;
    if (input.pressed('rollRight') || input.doubleTap('right')) rollDir = 1;
    if (rollDir && rs.cd <= 0) {
      rs.t = ROLL_TIME;
      rs.dir = rollDir;
      rs.cd = 0.5;
      rs.perfect = false;
      this.iframes = ROLL_TIME;
      this.vel.addScaledVector(this.right, rollDir * 55);
    }
    rs.t = Math.max(0, rs.t - dt);
    this.iframes = Math.max(0, this.iframes - dt);

    // Drift: hold to charge, release for turbo. Releasing right as a new
    // level lights up is a PERFECT.
    if (input.pressed('drift') && this.speed > 35) {
      d.active = true;
      d.t = 0;
      d.level = 0;
      d.levelT = 0;
      d.dir = turnIn || (this.yawVel >= 0 ? 1 : -1);
    }
    if (d.active) {
      if (turnIn) d.dir = turnIn;
      d.t += dt * (turnIn ? 1 : 0.35);
      d.levelT += dt;
      while (d.level < 3 && d.t >= DRIFT_LEVELS[d.level]) {
        d.level++;
        d.levelT = 0;
      }
      if (!input.down('drift')) this.releaseDrift();
    }

    // Steering
    const turnRate = d.active ? 2.9 : 1.85;
    this.yawVel += (turnIn * turnRate - this.yawVel) * damp(12, dt);
    this.yaw += this.yawVel * dt;
    this.pitchVel += (pitchIn * 1.5 - this.pitchVel) * damp(12, dt);
    this.pitch += this.pitchVel * dt;
    if (!pitchIn) this.pitch *= Math.exp(-1.8 * dt);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.2, 1.2);

    // Speed: base * combo bloodlust * boost + decaying turbo
    const comboMult = 1 + Math.min(G.combo, 40) * 0.015;
    this.boosting = input.down('boost') && this.boost > 0;
    if (this.boosting) this.boost = Math.max(0, this.boost - 0.3 * dt);
    this.turbo *= Math.exp(-1.1 * dt);
    let target = BASE_SPEED * comboMult * (this.boosting ? 1.55 : 1) * (d.active ? 0.93 : 1);
    target += this.turbo;
    this.speed += (target - this.speed) * damp(target > this.speed ? 3 : 1.5, dt);

    this.updateBasis();
    const grip = d.active ? 1.4 : 6.5;
    _v.copy(this.fwd).multiplyScalar(this.speed);
    this.vel.lerp(_v, damp(grip, dt));
    this.pos.addScaledVector(this.vel, dt);

    this.collide(dt);
    this.calloutCd -= dt;
    this.updateVisual(dt);
    this.emitTrails(dt);
  }

  releaseDrift() {
    const d = this.drift;
    if (d.level > 0) {
      const perfect = d.levelT < PERFECT_WINDOW;
      const amount = DRIFT_TURBO[d.level - 1] * (perfect ? 1.5 : 1);
      this.addTurbo(amount);
      if (perfect) {
        this.G.callout('PERFECT DRIFT', { color: '#ffffff', size: 'huge' });
        this.G.slowmo(0.22);
        this.G.stats.perfects++;
      } else {
        this.G.callout(`DRIFT ${'I'.repeat(d.level)}`, { color: ['#00ffff', '#ff9900', '#ff00ff'][d.level - 1], size: 'small' });
      }
    }
    d.active = false;
  }

  addTurbo(amount) {
    this.turbo += amount;
    this.speed += amount * 0.6;
    this.G.fx.shake = Math.max(this.G.fx.shake, 0.35);
  }

  perfectDodge() {
    if (this.roll.perfect) return;
    this.roll.perfect = true;
    this.boost = Math.min(1, this.boost + 0.35);
    this.addTurbo(20);
    this.G.slowmo(0.4);
    this.G.stats.perfects++;
    this.G.callout('PERFECT DODGE', { color: '#ff00ff', size: 'huge' });
  }

  collide(dt) {
    const G = this.G;
    const res = G.city.resolveSphere(this.pos, RADIUS, 6);
    if (res.hit) {
      const n = res.normal;
      const vn = this.vel.dot(n);
      if (vn < 0) {
        const impact = -vn;
        if (impact > CRASH_SPEED && this.iframes <= 0) {
          this.vel.addScaledVector(n, -vn * 1.4);
          this.speed *= 0.55;
          this.turbo = 0;
          if (Math.abs(n.y) < 0.5) {
            const vx = this.vel.x, vz = this.vel.z;
            if (vx * vx + vz * vz > 1) this.yaw = Math.atan2(-vx, -vz);
          }
          G.fx.sparks(this.pos, 30, 0xffaa33, 70);
          G.fx.shake = Math.max(G.fx.shake, 1.3);
          G.callout('CRASH', { color: '#ff6b6b', size: 'small' });
          this.damage((impact - CRASH_SPEED) * 0.55 + 6);
        } else {
          // Glancing contact: slide along the wall and charge boost
          this.vel.addScaledVector(n, -vn);
          if (this.speed > 50) {
            this.boost = Math.min(1, this.boost + 0.5 * dt);
            this.grindT += dt;
            _w.copy(this.pos).addScaledVector(n, -RADIUS);
            if (Math.random() < 0.7) G.fx.sparks(_w, 2, 0xffdd66, 25);
            if (this.grindT > 0.35 && this.calloutCd <= 0) {
              G.callout('WALL GRIND', { color: '#ffff00', size: 'small' });
              this.calloutCd = 1.5;
            }
          }
        }
      }
    } else {
      this.grindT = 0;
    }

    // Threading close to walls without touching fills the boost meter
    if (!res.hit && res.clearance < 4.5 && this.speed > 80) {
      this.boost = Math.min(1, this.boost + 0.35 * dt);
      this.nearMissT += dt;
      if (this.nearMissT > 0.25 && this.calloutCd <= 0) {
        G.callout('NEAR MISS', { color: '#00ffff', size: 'small' });
        this.calloutCd = 1.5;
      }
    } else {
      this.nearMissT = 0;
    }

    if (this.pos.y < RADIUS) {
      this.pos.y = RADIUS;
      if (this.vel.y < -35 && this.iframes <= 0) {
        this.damage((-this.vel.y - 35) * 0.4);
        G.fx.shake = Math.max(G.fx.shake, 0.8);
      }
      if (this.vel.y < 0) this.vel.y = 0;
      if (this.pitch < 0) this.pitch *= 0.8;
      if (this.speed > 60 && Math.random() < 0.5) {
        _w.set(this.pos.x, 0.3, this.pos.z);
        G.fx.sparks(_w, 2, 0xffaa33, 20);
      }
    }
    if (this.pos.y > CEILING) {
      this.pos.y = CEILING;
      this.vel.y = Math.min(0, this.vel.y);
      this.pitch = Math.min(this.pitch, 0);
    }
    this.outOfBounds = Math.abs(this.pos.x) > BOUND - 40 || Math.abs(this.pos.z) > BOUND - 40;
    for (const axis of ['x', 'z']) {
      if (Math.abs(this.pos[axis]) > BOUND) {
        this.pos[axis] = Math.sign(this.pos[axis]) * BOUND;
        this.vel[axis] = 0;
      }
    }
  }

  damage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.G.hud.flash(Math.min(1, amount / 20));
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.mesh.visible = false;
      this.G.fx.explosion(this.pos, 2.2);
      this.G.endGame('TOTALED');
    }
  }

  updateVisual(dt) {
    const d = this.drift;
    const rs = this.roll;
    this.bank += (this.yawVel * 0.38 - this.bank) * damp(8, dt);
    let spin = 0;
    if (rs.t > 0) {
      const p = 1 - rs.t / ROLL_TIME;
      spin = -rs.dir * (1 - Math.pow(1 - p, 3)) * Math.PI * 2;
    }
    const driftYaw = d.active ? d.dir * 0.35 : 0;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.pitch, this.yaw + driftYaw, this.bank + spin, 'YXZ');
    this.boxes.visible = this.G.jobs ? this.G.jobs.carrying > 0 : false;

    const color = this.boosting ? 0xff8800 : this.turbo > 10 ? 0xff00ff : 0x00ffff;
    this.thrusterMat.color.setHex(color);
    const flameLen = 0.6 + Math.min(1.8, this.speed / 90) + (this.boosting ? 0.6 : 0);
    for (const t of this.thrusters) t.scale.set(1, flameLen, 1);
  }

  emitTrails() {
    const fx = this.G.fx;
    const color = this.boosting ? 0xff7700 : this.turbo > 10 ? 0xff00ff : 0x00ccff;
    for (const x of [-1.0, 1.0]) {
      _w.set(x, 0.1, 4.2).applyEuler(this.mesh.rotation).add(this.pos);
      fx.trail(_w, this.vel.x * 0.2, this.vel.y * 0.2, this.vel.z * 0.2, color, this.boosting ? 2.2 : 1.4, 0.22);
    }
    if (this.drift.active && this.drift.level > 0) {
      const c = this.driftPerfect ? 0xffffff : [0x00ffff, 0xff9900, 0xff00ff][this.drift.level - 1];
      for (const x of [-1.9, 1.9]) {
        _w.set(x, -0.8, 2.6).applyEuler(this.mesh.rotation).add(this.pos);
        fx.spawn(_w.x, _w.y, _w.z,
          (Math.random() - 0.5) * 30, Math.random() * 15, (Math.random() - 0.5) * 30,
          0.3, 0.9, 0.1, c, 30, 2);
      }
    }
  }
}
