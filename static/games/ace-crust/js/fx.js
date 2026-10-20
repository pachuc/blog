import * as THREE from 'three';

const MAX_PARTICLES = 5000;
const STREAKS = 80;

const VERT = /* glsl */ `
  attribute float size;
  attribute vec4 pcolor;
  uniform float uScale;
  varying vec4 vColor;
  void main() {
    vColor = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(size * uScale / -mv.z, 300.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec4 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor.rgb, vColor.a * smoothstep(0.5, 0.0, d));
  }
`;

const _c = new THREE.Color();
const _v = new THREE.Vector3();

export class FX {
  constructor(G) {
    this.G = G;
    this.shake = 0;

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 4);
    this.sizes = new Float32Array(MAX_PARTICLES);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    G.scene.add(this.points);

    this.pool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 1, s1: 0, r: 1, g: 1, b: 1, grav: 0, drag: 0 });
    }
    this.count = 0;

    // Speed streaks streaming past the camera
    this.streakPos = new Float32Array(STREAKS * 6);
    this.streaks = Array.from({ length: STREAKS }, () => new THREE.Vector3(1e6, 0, 0));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.streakPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.streakMat = new THREE.LineBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streakLines = new THREE.LineSegments(sg, this.streakMat);
    this.streakLines.frustumCulled = false;
    G.scene.add(this.streakLines);
  }

  setViewport(height, fov) {
    this.material.uniforms.uScale.value = height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  }

  clear() {
    this.count = 0;
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, color, grav = 0, drag = 0) {
    if (this.count >= MAX_PARTICLES) return;
    const p = this.pool[this.count++];
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = p.max = life;
    p.s0 = s0; p.s1 = s1;
    _c.set(color);
    p.r = _c.r; p.g = _c.g; p.b = _c.b;
    p.grav = grav; p.drag = drag;
  }

  burst(pos, n, speed, life, s0, s1, colors, grav = 0, drag = 2) {
    for (let i = 0; i < n; i++) {
      randomDir(_v).multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      this.spawn(pos.x, pos.y, pos.z, _v.x, _v.y, _v.z,
        life * (0.5 + Math.random() * 0.5), s0, s1,
        colors[Math.floor(Math.random() * colors.length)], grav, drag);
    }
  }

  explosion(pos, scale = 1) {
    this.spawn(pos.x, pos.y, pos.z, 0, 0, 0, 0.18, 40 * scale, 10 * scale, 0xffffff);
    this.burst(pos, Math.round(40 * scale), 45 * scale, 0.7, 7 * scale, 1, [0xffaa00, 0xff5500, 0xffee66, 0xff2200], -4, 3);
    this.burst(pos, Math.round(25 * scale), 90 * scale, 0.9, 1.2, 0.3, [0xffff99, 0xffcc33], 40, 1);
    this.burst(pos, Math.round(12 * scale), 18 * scale, 1.4, 5 * scale, 9 * scale, [0x3a1a55, 0x2a2040], -6, 1.5);
    this.shakeFrom(pos, 1.2 * scale);
  }

  sparks(pos, n = 6, color = 0xffdd66, speed = 40) {
    this.burst(pos, n, speed, 0.4, 0.8, 0.1, [color, 0xffffff], 30, 2);
  }

  pop(pos, color) {
    this.burst(pos, 18, 22, 0.8, 1.4, 0.4, [color, 0xff2a2a, 0xff2a2a, 0xffffff], 35, 1.5);
  }

  trail(pos, vx, vy, vz, color, size, life = 0.25) {
    this.spawn(pos.x, pos.y, pos.z, vx, vy, vz, life, size, 0, color);
  }

  shakeFrom(pos, amount) {
    const d = pos.distanceTo(this.G.camera.position);
    this.shake = Math.max(this.shake, amount * Math.max(0, 1 - d / 250));
  }

  update(dt, realDt) {
    let i = 0;
    while (i < this.count) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool[i] = this.pool[this.count - 1];
        this.pool[this.count - 1] = p;
        this.count--;
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k - p.grav * dt; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.life / p.max;
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      this.colors[i * 4] = p.r;
      this.colors[i * 4 + 1] = p.g;
      this.colors[i * 4 + 2] = p.b;
      this.colors[i * 4 + 3] = Math.min(1, t * 1.5);
      this.sizes[i] = p.s1 + (p.s0 - p.s1) * t;
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;

    this.shake *= Math.exp(-6 * realDt);
  }

  updateStreaks(vel) {
    const speed = vel.length();
    const intensity = THREE.MathUtils.clamp((speed - 95) / 90, 0, 1);
    this.streakMat.opacity = intensity * 0.55;
    this.streakLines.visible = intensity > 0.01;
    if (!this.streakLines.visible) return;

    const cam = this.G.camera.position;
    const dir = _v.copy(vel).divideScalar(speed);
    const len = speed * 0.07;
    for (let i = 0; i < STREAKS; i++) {
      const s = this.streaks[i];
      const rx = s.x - cam.x, ry = s.y - cam.y, rz = s.z - cam.z;
      const along = rx * dir.x + ry * dir.y + rz * dir.z;
      const off2 = rx * rx + ry * ry + rz * rz - along * along;
      if (along < -4 || along > 260 || off2 > 45 * 45) {
        // Respawn ahead of the camera, offset from the flight path
        const a = Math.random() * Math.PI * 2;
        const rad = 5 + Math.random() * 28;
        const px = -dir.z, pz = dir.x;
        const pl = Math.hypot(px, pz) || 1;
        const ahead = 60 + Math.random() * 180;
        s.set(
          cam.x + dir.x * ahead + (px / pl) * Math.cos(a) * rad,
          cam.y + dir.y * ahead + Math.sin(a) * rad,
          cam.z + dir.z * ahead + (pz / pl) * Math.cos(a) * rad,
        );
      }
      const o = i * 6;
      this.streakPos[o] = s.x;
      this.streakPos[o + 1] = s.y;
      this.streakPos[o + 2] = s.z;
      this.streakPos[o + 3] = s.x - dir.x * len;
      this.streakPos[o + 4] = s.y - dir.y * len;
      this.streakPos[o + 5] = s.z - dir.z * len;
    }
    this.streakLines.geometry.attributes.position.needsUpdate = true;
  }
}

export function randomDir(out) {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(s * Math.cos(a), u, s * Math.sin(a));
}
