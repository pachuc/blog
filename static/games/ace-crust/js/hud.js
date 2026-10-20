import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const RADAR_RANGE = 700;
const MAX_TGT_BOXES = 12;

const CONTROLS = `
  <div class="controls">
    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span class="desc">climb · turn · dive</span>
    <span><kbd>SHIFT</kbd></span><span class="desc">boost</span>
    <span><kbd>SPACE</kbd> hold + release</span><span class="desc">drift → turbo (release on the white flash = PERFECT)</span>
    <span><kbd>Q</kbd> <kbd>E</kbd> / double-tap turn</span><span class="desc">barrel roll — roll through fire = PERFECT DODGE</span>
    <span><kbd>J</kbd> / <kbd>Z</kbd></span><span class="desc">guns</span>
    <span><kbd>K</kbd> / <kbd>X</kbd></span><span class="desc">missile (auto lock-on)</span>
    <span><kbd>P</kbd> / <kbd>ESC</kbd></span><span class="desc">pause · <kbd>I</kbd> invert pitch · <kbd>B</kbd> bloom</span>
  </div>`;

export class HUD {
  constructor(G) {
    this.G = G;
    this.root = $('hud');
    this.screen = $('screen');
    this.el = {
      cash: $('cash'), combo: $('combo'), comboBar: $('combo-bar'), wanted: $('wanted'),
      jobLabel: $('job-label'), jobTimer: $('job-timer'), jobDetail: $('job-detail'), strikes: $('strikes'),
      speed: $('speed'), alt: $('alt'), boostBar: $('boost-bar'), drift: $('drift'),
      hullNum: $('hull-num'), hullBar: $('hull-bar'), missiles: $('missiles'),
      lock: $('lock'), objective: $('objective'), callouts: $('callouts'), center: $('center-msg'),
      flash: $('flash'), speedfx: $('speedfx'),
    };
    this.lockLabel = this.el.lock.querySelector('span');
    this.objLabel = this.el.objective.querySelector('span');
    this.driftPips = [...this.el.drift.querySelectorAll('i')];
    this.radar = $('radar').getContext('2d');
    this.cache = {};
    this.flashV = 0;

    this.warning = document.createElement('div');
    this.warning.id = 'warning';
    this.warning.textContent = '◆ INCOMING ◆';
    this.root.appendChild(this.warning);

    this.oob = document.createElement('div');
    this.oob.id = 'oob';
    this.oob.textContent = 'LEAVING DELIVERY ZONE';
    this.root.appendChild(this.oob);

    this.tgtBoxes = Array.from({ length: MAX_TGT_BOXES }, () => {
      const d = document.createElement('div');
      d.className = 'tgt hidden';
      this.root.appendChild(d);
      return d;
    });
  }

  set(key, el, value, prop = 'textContent') {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    if (prop === 'width') el.style.width = value;
    else if (prop === 'className') el.className = value;
    else el[prop] = value;
  }

  show(visible) {
    this.root.classList.toggle('hidden', !visible);
  }

  callout(text, { cash, color = '#e0e0e0', size = '' } = {}) {
    const div = document.createElement('div');
    div.className = `callout ${size}`;
    div.style.color = color;
    div.textContent = text;
    if (cash) {
      const c = document.createElement('span');
      c.className = 'cash';
      c.textContent = `+$${cash}`;
      div.appendChild(c);
    }
    const box = this.el.callouts;
    box.appendChild(div);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => div.remove(), 1300);
  }

  flash(amount) {
    this.flashV = Math.max(this.flashV, amount);
  }

  centerMessage(text) {
    this.set('center', this.el.center, text);
  }

  // World → CSS pixels. Returns null when behind the camera.
  project(pos, w, h) {
    _v.copy(pos).project(this.G.camera);
    if (_v.z > 1) return null;
    return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h };
  }

  update(dt) {
    const G = this.G;
    const p = G.player;
    const el = this.el;
    const w = G.width, h = G.height;

    this.set('cash', el.cash, `$${G.stats.cash.toLocaleString()}`);
    this.set('combo', el.combo, `x${Math.floor(G.combo)}`);
    this.set('comboBar', el.comboBar, `${Math.max(0, (G.comboTimer / 4) * 100).toFixed(0)}%`, 'width');
    this.set('wanted', el.wanted, '★'.repeat(G.stars) + '☆'.repeat(5 - G.stars));

    const jobs = G.jobs;
    if (jobs.state === 'pickup') {
      this.set('jobLabel', el.jobLabel, 'PICKUP');
      this.set('jobTimer', el.jobTimer, jobs.pizzeria.name);
      this.set('jobTimerCls', el.jobTimer, 'big', 'className');
      this.set('jobDetail', el.jobDetail, `${Math.round(p.pos.distanceTo(jobs.pizzeria.ringPos))}m · follow the orange beam`);
    } else {
      const c = jobs.current;
      this.set('jobLabel', el.jobLabel, `DELIVER · ${jobs.carrying} IN BAG`);
      this.set('jobTimer', el.jobTimer, Math.max(0, jobs.timer).toFixed(1));
      this.set('jobTimerCls', el.jobTimer, jobs.timer < 8 ? 'big urgent' : 'big', 'className');
      this.set('jobDetail', el.jobDetail, `${c.customer} · ${c.pizza} · ${c.address} · ${Math.round(p.pos.distanceTo(c.pos))}m`);
    }
    this.set('strikes', el.strikes, '✕'.repeat(jobs.strikes) + '·'.repeat(3 - jobs.strikes));

    const speed = p.vel.length();
    this.set('speed', el.speed, Math.round(speed * 3.6));
    this.set('alt', el.alt, `${Math.round(p.pos.y)}m`);
    this.set('boost', el.boostBar, `${(p.boost * 100).toFixed(0)}%`, 'width');
    this.set('boostCls', el.boostBar, p.boost >= 1 ? 'fill cyan full' : 'fill cyan', 'className');
    const d = p.drift;
    const level = d.active ? d.level : 0;
    const perfect = p.driftPerfect;
    this.set('driftCls', el.drift, perfect ? 'pips perfect' : 'pips', 'className');
    this.driftPips.forEach((pip, k) => {
      this.set(`pip${k}`, pip, k < level ? `on${level}` : '', 'className');
    });

    this.set('hull', el.hullNum, Math.ceil(p.hp));
    this.set('hullBar', el.hullBar, `${p.hp}%`, 'width');
    this.set('hullCls', el.hullBar, p.hp < 30 ? 'fill danger' : 'fill green', 'className');
    this.set('msl', el.missiles, '▮'.repeat(G.weapons.ammo) + '▯'.repeat(2 - G.weapons.ammo));

    this.set('warn', this.warning, G.weapons.incoming ? '' : 'hidden', 'className');
    this.set('oob', this.oob, p.outOfBounds ? '' : 'hidden', 'className');

    this.updateLock(w, h);
    this.updateTargets(w, h);
    this.updateObjective(w, h);
    this.drawRadar();

    this.flashV *= Math.exp(-5 * dt);
    el.flash.style.opacity = this.flashV.toFixed(3);
    const rush = Math.min(1, Math.max(0, (speed - 100) / 80));
    el.speedfx.style.opacity = rush.toFixed(3);
  }

  updateLock(w, h) {
    const lock = this.G.weapons.lock;
    const t = lock.target || lock.candidate;
    const el = this.el.lock;
    const s = t && t.alive ? this.project(t.pos, w, h) : null;
    if (!s) {
      this.set('lockVis', el, 'hidden', 'className');
      return;
    }
    const locked = lock.target === t;
    const dist = t.pos.distanceTo(this.G.player.pos);
    const size = Math.max(18, Math.min(70, 1800 / dist));
    this.set('lockVis', el, locked ? 'locked' : '', 'className');
    el.style.transform = `translate(${s.x - size / 2}px, ${s.y - size / 2}px)`;
    el.style.width = el.style.height = `${size}px`;
    this.set('lockLabel', this.lockLabel, locked ? `LOCK ${Math.round(dist)}m` : `${Math.round(dist)}m`);
  }

  updateTargets(w, h) {
    const cops = this.G.cops.cops;
    for (let i = 0; i < MAX_TGT_BOXES; i++) {
      const box = this.tgtBoxes[i];
      const cop = cops[i];
      const s = cop && cop.alive ? this.project(cop.pos, w, h) : null;
      if (!s) {
        this.set(`tgt${i}`, box, 'tgt hidden', 'className');
        continue;
      }
      this.set(`tgt${i}`, box, 'tgt', 'className');
      box.style.transform = `translate(${s.x - 8}px, ${s.y - 8}px)`;
    }
  }

  updateObjective(w, h) {
    const G = this.G;
    const obj = G.jobs.objective();
    const el = this.el.objective;
    this.set('objKind', el, obj.kind === 'deliver' ? 'deliver' : '', 'className');
    const dist = Math.round(obj.pos.distanceTo(G.player.pos));
    this.set('objLabel', this.objLabel, `${obj.kind === 'deliver' ? 'DROP' : 'PIZZA'} ${dist}m`);

    _v.copy(obj.pos).project(G.camera);
    const behind = _v.z > 1;
    let x = (_v.x * 0.5 + 0.5) * w;
    let y = (-_v.y * 0.5 + 0.5) * h;
    const margin = 50;
    const onScreen = !behind && x > margin && x < w - margin && y > margin && y < h - margin;
    el.classList.toggle('offscreen', !onScreen);
    if (onScreen) {
      el.style.transform = `translate(${x - 30}px, ${y - 12}px)`;
      el.style.width = '60px';
      return;
    }
    if (behind) {
      x = w - x;
      y = h - y;
    }
    let dx = x - w / 2, dy = y - h / 2;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) dy = 1;
    const scale = Math.min((w / 2 - margin) / Math.abs(dx || 1e-6), (h / 2 - margin) / Math.abs(dy || 1e-6));
    const ex = w / 2 + dx * scale, ey = h / 2 + dy * scale;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    el.style.setProperty('--angle', `${angle}deg`);
    el.style.transform = `translate(${ex - 30}px, ${ey - 12}px)`;
  }

  drawRadar() {
    const G = this.G;
    const ctx = this.radar;
    const S = ctx.canvas.width;
    const c = S / 2, R = S / 2 - 4;
    const p = G.player;
    const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
    const toRadar = (pos) => {
      const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
      const right = dx * cy - dz * sy;
      const fwd = -dx * sy - dz * cy;
      return [right / RADAR_RANGE * R, -fwd / RADAR_RANGE * R];
    };

    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(5, 5, 15, 0.6)';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, R / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 0, 255, 0.35)';
    for (const ped of G.peds.peds) {
      if (!ped.alive) continue;
      const [x, y] = toRadar(ped.pos);
      if (x * x + y * y < R * R) ctx.fillRect(c + x, c + y, 1, 1);
    }
    ctx.fillStyle = 'rgba(200, 200, 220, 0.6)';
    for (const car of G.traffic.cars) {
      if (!car.alive) continue;
      const [x, y] = toRadar(car.pos);
      if (x * x + y * y < R * R) ctx.fillRect(c + x - 1, c + y - 1, 2, 2);
    }
    ctx.fillStyle = '#ff3355';
    for (const cop of G.cops.cops) {
      if (!cop.alive) continue;
      let [x, y] = toRadar(cop.pos);
      const l = Math.hypot(x, y);
      if (l > R) { x *= R / l; y *= R / l; }
      ctx.fillRect(c + x - 2.5, c + y - 2.5, 5, 5);
    }

    const obj = G.jobs.objective();
    let [ox, oy] = toRadar(obj.pos);
    const ol = Math.hypot(ox, oy);
    if (ol > R - 4) { ox *= (R - 4) / ol; oy *= (R - 4) / ol; }
    ctx.fillStyle = obj.kind === 'deliver' ? '#00ff66' : '#ffaa00';
    ctx.save();
    ctx.translate(c + ox, c + oy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(c, c - 7);
    ctx.lineTo(c - 5, c + 5);
    ctx.lineTo(c + 5, c + 5);
    ctx.closePath();
    ctx.fill();
  }

  // ---------------------------------------------------------------- screens

  showTitle(best) {
    this.screen.innerHTML = `
      <h1>ACE CRUST</h1>
      <div class="tagline">SKY-HIGH PIZZA DELIVERY · NEO-CITY 2087</div>
      ${CONTROLS}
      <div class="prompt">PRESS ENTER</div>
      <div class="note">Grab pizzas at the orange beam, fly them through the green ring before they go cold.
      Everything else is a target: kills pay cash and every kill makes you faster.
      ${best ? `Best shift: $${best.toLocaleString()}` : ''}</div>`;
  }

  showPause() {
    this.screen.innerHTML = `
      <h1>PAUSED</h1>
      <div class="tagline">ENTER to resume · R to restart</div>
      ${CONTROLS}`;
  }

  showGameOver(reason, stats, best, isBest) {
    const why = reason === 'FIRED'
      ? 'Three cold pizzas. Corporate has let you go.'
      : 'Your car is a fireball. The pizza survived.';
    const row = (k, v) => `<span>${k}</span><span class="v">${v}</span>`;
    this.screen.innerHTML = `
      <h2>${reason}</h2>
      <div class="tagline">${why}</div>
      <div class="stats">
        ${row('CASH', `$${stats.cash.toLocaleString()}`)}
        ${row('DELIVERIES', stats.deliveries)}
        ${row('KILLS', stats.kills)}
        ${row('MAX COMBO', `x${stats.maxCombo}`)}
        ${row('TOP SPEED', `${Math.round(stats.topSpeed * 3.6)} km/h`)}
        ${row('PERFECTS', stats.perfects)}
        <span class="best">${isBest ? 'NEW BEST' : 'BEST'}</span><span class="v best">$${best.toLocaleString()}</span>
      </div>
      <div class="prompt">PRESS ENTER TO FLY AGAIN</div>`;
  }

  hideScreen() {
    this.screen.innerHTML = '';
  }
}
