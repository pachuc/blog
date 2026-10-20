import * as THREE from 'three';

const MAX_BULLETS = 160;
const MAX_BOLTS = 60;
const MAX_MISSILES = 10;
const BULLET_SPEED = 720;
const FIRE_INTERVAL = 1 / 16;
const MISSILE_MAX = 2;
const MISSILE_RELOAD = 2.2;
const LOCK_TIME = 0.35;
const LOCK_RANGE = 460;
const SPLASH = 17;
const BOLT_SPEED = 170;

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

// Distance² from point c to segment p0→p1
function segDist2(p0, p1, c) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  let t = len2 > 0 ? ((c.x - p0.x) * dx + (c.y - p0.y) * dy + (c.z - p0.z) * dz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = p0.x + dx * t - c.x, y = p0.y + dy * t - c.y, z = p0.z + dz * t - c.z;
  return x * x + y * y + z * z;
}

export class Weapons {
  constructor(G) {
    this.G = G;

    this.bullets = Array.from({ length: MAX_BULLETS }, () => ({
      alive: false, pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0,
    }));
    this.bulletMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 0.22, 7),
      new THREE.MeshBasicMaterial({ color: 0xffee88 }), MAX_BULLETS);

    this.bolts = Array.from({ length: MAX_BOLTS }, () => ({
      alive: false, pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(),
      life: 0, homing: false, dodged: false,
    }));
    this.boltMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1.1, 8, 6),
      new THREE.MeshBasicMaterial(), MAX_BOLTS);
    this.boltMesh.setColorAt(0, new THREE.Color());

    const missileGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.6, 8).rotateX(Math.PI / 2);
    const missileMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.missiles = Array.from({ length: MAX_MISSILES }, () => {
      const mesh = new THREE.Mesh(missileGeo, missileMat);
      mesh.visible = false;
      G.scene.add(mesh);
      return { alive: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0, life: 0, target: null, mesh };
    });

    for (const m of [this.bulletMesh, this.boltMesh]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      G.scene.add(m);
    }

    this.lock = { candidate: null, target: null, t: 0 };
    this.clear();
  }

  clear() {
    for (const b of this.bullets) b.alive = false;
    for (const b of this.bolts) b.alive = false;
    for (const m of this.missiles) {
      m.alive = false;
      m.mesh.visible = false;
    }
    this.gunCd = 0;
    this.gunSide = 1;
    this.ammo = MISSILE_MAX;
    this.reload = 0;
    this.incoming = false;
    this.lock.candidate = this.lock.target = null;
    this.lock.t = 0;
  }

  // Cops first so they win ties when locking on
  get lists() {
    const G = this.G;
    return (this._lists ??= [G.cops.cops, G.traffic.cars, G.peds.peds]);
  }

  update(dt, input) {
    const G = this.G;
    const player = G.player;
    const active = G.state === 'play' && player.alive;

    if (active) {
      this.updateLock(dt);

      this.gunCd -= dt;
      if (input.down('guns') && this.gunCd <= 0) {
        this.gunCd = FIRE_INTERVAL;
        this.fireGun();
      }

      if (this.ammo < MISSILE_MAX) {
        this.reload += dt;
        if (this.reload >= MISSILE_RELOAD) {
          this.reload = 0;
          this.ammo++;
        }
      }
      if (input.pressed('missile') && this.ammo > 0) {
        this.ammo--;
        this.fireMissile();
      }
    }

    this.updateBullets(dt);
    this.updateMissiles(dt);
    this.updateBolts(dt);
  }

  updateLock(dt) {
    const player = this.G.player;
    let best = null;
    let bestScore = Infinity;
    for (const list of this.lists) for (const t of list) {
      if (!t.alive) continue;
      _v.copy(t.pos).sub(player.pos);
      const d = _v.length();
      if (d > LOCK_RANGE || d < 8) continue;
      const cos = _v.dot(player.fwd) / d;
      if (cos < 0.93) continue;
      const score = (1 - cos) * 10 + d / LOCK_RANGE - (t.type === 'cop' ? 0.6 : t.type === 'car' ? 0.2 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }

    const lock = this.lock;
    if (lock.target && (!lock.target.alive || !this.inCone(lock.target, 0.85))) lock.target = null;
    if (best && best === lock.candidate) {
      lock.t += dt;
      if (lock.t >= LOCK_TIME) lock.target = best;
    } else {
      lock.candidate = best;
      lock.t = 0;
    }
  }

  inCone(t, minCos) {
    const player = this.G.player;
    _w.copy(t.pos).sub(player.pos);
    const d = _w.length();
    return d < LOCK_RANGE * 1.2 && _w.dot(player.fwd) / d > minCos;
  }

  fireGun() {
    const player = this.G.player;
    const b = this.bullets.find((x) => !x.alive);
    if (!b) return;
    this.gunSide = -this.gunSide;
    b.pos.copy(player.pos).addScaledVector(player.right, this.gunSide * 1.6).addScaledVector(player.fwd, 3);
    b.prev.copy(b.pos);

    // Aim assist: bend shots toward the target near the reticle
    const t = this.lock.target || this.lock.candidate;
    _d.copy(player.fwd);
    if (t && this.inCone(t, 0.96)) {
      const dist = t.pos.distanceTo(b.pos);
      _v.copy(t.pos).addScaledVector(t.vel, dist / BULLET_SPEED).sub(b.pos).normalize();
      _d.copy(_v);
    }
    _d.x += (Math.random() - 0.5) * 0.012;
    _d.y += (Math.random() - 0.5) * 0.012;
    _d.z += (Math.random() - 0.5) * 0.012;
    b.vel.copy(_d).normalize().multiplyScalar(BULLET_SPEED).add(player.vel);
    b.life = 0.9;
    b.alive = true;
    this.G.fx.trail(b.pos, player.vel.x, player.vel.y, player.vel.z, 0xffcc66, 2.5, 0.05);
  }

  fireMissile() {
    const player = this.G.player;
    const m = this.missiles.find((x) => !x.alive);
    if (!m) return;
    this.gunSide = -this.gunSide;
    m.pos.copy(player.pos).addScaledVector(player.right, this.gunSide * 2).addScaledVector(player.fwd, 2);
    m.pos.y -= 0.8;
    m.dir.copy(player.fwd);
    m.speed = player.speed + 30;
    m.life = 4;
    m.target = this.lock.target;
    m.alive = true;
    m.mesh.visible = true;
    this.G.callout(m.target ? 'FOX TWO' : 'FOX TWO (DUMB)', { color: '#ffff00', size: 'small' });
  }

  fireBolt(from, player, homing) {
    const b = this.bolts.find((x) => !x.alive);
    if (!b) return;
    b.pos.copy(from);
    b.prev.copy(from);
    const speed = homing ? 120 : BOLT_SPEED;
    const dist = player.pos.distanceTo(from);
    _v.copy(player.pos).addScaledVector(player.vel, dist / speed).sub(from).normalize();
    b.vel.copy(_v).multiplyScalar(speed);
    b.life = homing ? 5 : 3;
    b.homing = homing;
    b.dodged = false;
    b.alive = true;
  }

  hitTargets(p0, p1, damage) {
    for (const list of this.lists) {
      for (const t of list) {
        if (!t.alive) continue;
        // Cheap reject before the segment test
        const dx = t.pos.x - p1.x, dz = t.pos.z - p1.z;
        if (dx * dx + dz * dz > 900) continue;
        if (segDist2(p0, p1, t.pos) < t.radius * t.radius) {
          t.hp -= damage;
          if (t.hp <= 0) t.owner.kill(t);
          else this.G.fx.sparks(t.pos, 4, 0xffffff, 30);
          return true;
        }
      }
    }
    return false;
  }

  updateBullets(dt) {
    const G = this.G;
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = this.bullets[i];
      if (b.alive) {
        b.prev.copy(b.pos);
        b.pos.addScaledVector(b.vel, dt);
        b.life -= dt;
        if (b.life <= 0) {
          b.alive = false;
        } else if (this.hitTargets(b.prev, b.pos, 1)) {
          b.alive = false;
        } else if (G.city.pointInside(b.pos)) {
          b.alive = false;
          G.fx.sparks(b.pos, 3, 0xffdd88, 25);
        }
      }
      if (b.alive) {
        _q.setFromUnitVectors(Z, _v.copy(b.vel).normalize());
        _m.compose(b.pos, _q, ONE);
      } else {
        _m.compose(b.pos, _q.identity(), ZERO);
      }
      this.bulletMesh.setMatrixAt(i, _m);
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
  }

  updateMissiles(dt) {
    const G = this.G;
    for (const m of this.missiles) {
      if (!m.alive) continue;
      m.life -= dt;
      m.speed = Math.min(m.speed + 320 * dt, 320);
      const t = m.target;
      if (t && t.alive) {
        const dist = t.pos.distanceTo(m.pos);
        _v.copy(t.pos).addScaledVector(t.vel, dist / m.speed * 0.5).sub(m.pos).normalize();
        const angle = m.dir.angleTo(_v);
        const maxTurn = 4.5 * dt;
        if (angle > 1e-4) m.dir.lerp(_v, Math.min(1, maxTurn / angle)).normalize();
        if (dist < 6) {
          this.explode(m);
          continue;
        }
      }
      m.pos.addScaledVector(m.dir, m.speed * dt);
      if (m.life <= 0 || m.pos.y < 0.5 || G.city.pointInside(m.pos)) {
        this.explode(m);
        continue;
      }
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(Z, m.dir);
      G.fx.trail(m.pos, 0, 2, 0, 0xffffff, 2.2, 0.5);
      G.fx.trail(m.pos, 0, 0, 0, 0xff8800, 1.4, 0.12);
    }
  }

  explode(m) {
    const G = this.G;
    m.alive = false;
    m.mesh.visible = false;
    G.fx.explosion(m.pos, 1.3);
    for (const list of this.lists) {
      for (const t of list) {
        if (t.alive && t.pos.distanceToSquared(m.pos) < SPLASH * SPLASH) {
          t.hp = 0;
          t.owner.kill(t);
        }
      }
    }
  }

  updateBolts(dt) {
    const G = this.G;
    const player = G.player;
    const color = new THREE.Color();
    let incoming = false;
    for (let i = 0; i < MAX_BOLTS; i++) {
      const b = this.bolts[i];
      if (b.alive) {
        if (b.homing && player.alive) {
          _v.copy(player.pos).sub(b.pos).normalize();
          const speed = b.vel.length();
          _w.copy(b.vel).divideScalar(speed);
          const angle = _w.angleTo(_v);
          const maxTurn = 1.6 * dt;
          if (angle > 1e-4) _w.lerp(_v, Math.min(1, maxTurn / angle)).normalize();
          b.vel.copy(_w).multiplyScalar(speed);
          G.fx.trail(b.pos, 0, 0, 0, 0xff6600, 1.6, 0.3);
        }
        b.prev.copy(b.pos);
        b.pos.addScaledVector(b.vel, dt);
        b.life -= dt;

        if (player.alive && G.state === 'play') {
          const d2 = segDist2(b.prev, b.pos, player.pos);
          if (player.iframes > 0 && d2 < 14 * 14) {
            // Rolling through fire: missiles lose track, everything is a perfect dodge
            if (!b.dodged) {
              b.dodged = true;
              if (b.homing) {
                b.homing = false;
                G.callout('MISSILE EVADED', { color: '#ff9900', size: 'small' });
              }
              player.perfectDodge();
            }
          } else if (d2 < 3 * 3 && player.iframes <= 0) {
            player.damage(b.homing ? 18 : 7);
            G.fx.sparks(b.pos, 10, 0xff3355, 40);
            b.alive = false;
          }
          // Warn when something is about to hit
          if (b.alive) {
            _v.copy(player.pos).sub(b.pos);
            const closing = -_v.dot(_w.copy(b.vel).sub(player.vel)) / Math.max(1, _v.length());
            if (closing < 0 && _v.length() < 120 && _v.length() / -closing < 0.9) incoming = true;
          }
        }
        if (b.alive && (b.life <= 0 || G.city.pointInside(b.pos))) {
          b.alive = false;
          G.fx.sparks(b.pos, 5, 0xff3355, 25);
        }
      }
      if (b.alive) {
        _m.compose(b.pos, _q.identity(), _s.setScalar(b.homing ? 1.5 : 1));
        color.setHex(b.homing ? 0xff7700 : 0xff2244);
      } else {
        _m.compose(b.pos, _q.identity(), ZERO);
      }
      this.boltMesh.setMatrixAt(i, _m);
      this.boltMesh.setColorAt(i, color);
    }
    this.incoming = incoming;
    this.boltMesh.instanceMatrix.needsUpdate = true;
    this.boltMesh.instanceColor.needsUpdate = true;
  }
}
