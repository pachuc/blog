import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { input } from './input.js';
import { City } from './city.js';
import { FX } from './fx.js';
import { Player } from './player.js';
import { Traffic, Peds, Cops } from './npcs.js';
import { Weapons } from './weapons.js';
import { Jobs } from './jobs.js';
import { HUD } from './hud.js';

const KILL_CASH = { ped: 8, car: 30, cop: 120 };
const KILL_HEAT = { ped: 1, car: 2, cop: 5 };
const KILL_WORDS = {
  ped: ['SPLAT', 'BONK', 'YEET', 'JAYWALKER', 'ROADKILL', 'OOPS'],
  car: ['TAKEDOWN', 'WRECKED', 'SPLASH ONE', 'SCRAPPED'],
  cop: ['COP DOWN', 'BADGE CLAIMED', 'SPLASH ONE', 'NO WARRANT'],
};
const HEAT_STARS = [4, 12, 28, 55, 95];
const COMBO_TIME = 4;
const COUNTDOWN = 3;
const PERFECT_LAUNCH = [2.55, 3.0];
const SAVE_KEY = 'aceCrust';
const STILL = new THREE.Vector3();

const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
const persist = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));

// ------------------------------------------------------------------- setup

const container = document.getElementById('game');
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const scene = new THREE.Scene();
const FOG = 0x160b2c;
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.0019);
scene.add(new THREE.HemisphereLight(0x6a5aaa, 0x0a0a20, 1.4));
const moon = new THREE.DirectionalLight(0x99aaff, 0.9);
moon.position.set(-300, 500, 200);
scene.add(moon);

const camera = new THREE.PerspectiveCamera(72, 1, 0.5, 4000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.45, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const G = {
  scene, camera, renderer,
  state: 'title',
  time: 0,
  width: 1,
  height: 1,
  combo: 0,
  comboTimer: 0,
  heat: 0,
  heatCd: 0,
  stars: 0,
  slowmoT: 0,
  stats: newStats(),
  frameKills: [],
  bloomOn: save.bloom !== false,
};

G.city = new City(G);
G.fx = new FX(G);
G.player = new Player(G);
G.player.invert = !!save.invert;
G.player.mesh.visible = false;
G.traffic = new Traffic(G);
G.peds = new Peds(G);
G.cops = new Cops(G);
G.weapons = new Weapons(G);
G.jobs = new Jobs(G);
G.hud = new HUD(G);

G.callout = (text, opts) => G.hud.callout(text, opts);
G.slowmo = (t) => { G.slowmoT = Math.max(G.slowmoT, t); };

G.onKill = (type, pos) => {
  if (G.state !== 'play') return;
  G.stats.kills++;
  G.combo = Math.floor(G.combo) + 1;
  G.comboTimer = COMBO_TIME;
  G.stats.maxCombo = Math.max(G.stats.maxCombo, G.combo);
  const mult = 1 + Math.min(G.combo, 40) * 0.1;
  const cash = Math.round(KILL_CASH[type] * mult);
  G.stats.cash += cash;
  G.heat += KILL_HEAT[type];
  G.heatCd = 7;
  G.player.boost = Math.min(1, G.player.boost + 0.06);
  G.frameKills.push({ type, cash });
};

G.endGame = (reason) => {
  if (G.state !== 'play') return;
  G.state = 'dying';
  G.overReason = reason;
  G.dyingT = 0;
  if (G.player.drift.active) G.player.drift.active = false;
  const best = save.best || 0;
  G.newBest = G.stats.cash > best;
  if (G.newBest) {
    save.best = G.stats.cash;
    persist();
  }
};

function newStats() {
  return { cash: 0, deliveries: 0, kills: 0, maxCombo: 0, topSpeed: 0, perfects: 0 };
}

// --------------------------------------------------------------- game flow

function newGame() {
  const piz = G.city.pizzerias[0];
  G.stats = newStats();
  G.combo = 0;
  G.comboTimer = 0;
  G.heat = 0;
  G.stars = 0;
  G.slowmoT = 0;
  G.frameKills.length = 0;
  G.player.reset(piz.ringPos.clone().add(new THREE.Vector3(0, 0, 90)), 0);
  G.cops.clear();
  G.weapons.clear();
  G.fx.clear();
  G.jobs.reset(piz);
  G.state = 'countdown';
  G.countT = 0;
  G.launchPress = null;
  G.hud.hideScreen();
  G.hud.show(true);
  snapCamera();
}

function pause() {
  G.pausedFrom = G.state;
  G.state = 'paused';
  G.hud.showPause();
}

function resume() {
  G.state = G.pausedFrom;
  G.hud.hideScreen();
}

function flushKills() {
  const kills = G.frameKills;
  if (!kills.length) return;
  const total = kills.reduce((s, k) => s + k.cash, 0);
  if (kills.length > 1) {
    G.callout(`MULTI-KILL x${kills.length}`, { cash: total, color: '#ff00ff', size: 'huge' });
  } else {
    const k = kills[0];
    const words = KILL_WORDS[k.type];
    const color = k.type === 'cop' ? '#ff6b6b' : k.type === 'car' ? '#ffff00' : '#ff00ff';
    G.callout(words[Math.floor(Math.random() * words.length)], { cash: total, color });
  }
  if (G.combo > 0 && G.combo % 10 === 0) G.callout(`BLOODLUST x${G.combo}`, { color: '#ff00ff', size: 'huge' });
  kills.length = 0;
}

function updateEconomy(dt) {
  G.comboTimer -= dt;
  if (G.comboTimer <= 0) G.combo = Math.max(0, G.combo - 6 * dt);
  G.heatCd -= dt;
  if (G.heatCd <= 0) G.heat = Math.max(0, G.heat - 2.5 * dt);
  const prev = G.stars;
  G.stars = HEAT_STARS.filter((t) => G.heat >= t).length;
  if (G.stars > prev) G.callout(`WANTED ${'★'.repeat(G.stars)}`, { color: '#ff6b6b' });
}

// ------------------------------------------------------------------ camera

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const _back = new THREE.Vector3();
const _target = new THREE.Vector3();

function chaseTarget(out) {
  const p = G.player;
  const pitch = p.pitch * 0.7;
  const cp = Math.cos(pitch);
  _back.set(Math.sin(p.yaw) * cp, -Math.sin(pitch), Math.cos(p.yaw) * cp);
  return out.copy(p.pos).addScaledVector(_back, 13).add({ x: 0, y: 3.6, z: 0 });
}

function snapCamera() {
  chaseTarget(camPos);
  camLook.copy(G.player.pos).addScaledVector(G.player.fwd, 22);
}

function updateCamera(dt, realDt) {
  const p = G.player;
  if (G.state === 'title') {
    const a = G.time * 0.05;
    camera.position.set(Math.cos(a) * 760, 280, Math.sin(a) * 760);
    camera.lookAt(0, 60, 0);
    setFov(65, realDt);
    return;
  }
  if (G.state === 'dying' || G.state === 'over') {
    const a = G.time * 0.4;
    camera.position.set(p.pos.x + Math.cos(a) * 45, p.pos.y + 18, p.pos.z + Math.sin(a) * 45);
    camera.lookAt(p.pos);
    return;
  }

  chaseTarget(_target);
  camPos.lerp(_target, 1 - Math.exp(-9 * dt));
  _target.copy(p.pos).addScaledVector(p.fwd, 22).y += 1;
  camLook.lerp(_target, 1 - Math.exp(-14 * dt));

  const s = G.fx.shake;
  camera.position.set(
    camPos.x + (Math.random() - 0.5) * s,
    camPos.y + (Math.random() - 0.5) * s,
    camPos.z + (Math.random() - 0.5) * s,
  );
  camera.lookAt(camLook);
  camera.rotateZ(p.bank * 0.25);

  const speed = p.vel.length();
  setFov(72 + THREE.MathUtils.clamp((speed - 72) * 0.22, 0, 32), realDt);
}

function setFov(target, dt) {
  camera.fov += (target - camera.fov) * (1 - Math.exp(-5 * dt));
  camera.updateProjectionMatrix();
  G.fx.setViewport(G.height * renderer.getPixelRatio(), camera.fov);
}

// -------------------------------------------------------------------- loop

function resize() {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  G.width = w;
  G.height = h;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  G.fx.setViewport(h * renderer.getPixelRatio(), camera.fov);
}
new ResizeObserver(resize).observe(container);
resize();

function handleGlobalKeys() {
  if (input.pressed('invert')) {
    G.player.invert = !G.player.invert;
    save.invert = G.player.invert;
    persist();
    G.callout(G.player.invert ? 'PITCH INVERTED' : 'PITCH NORMAL', { size: 'small' });
  }
  if (input.pressed('bloom')) {
    G.bloomOn = !G.bloomOn;
    save.bloom = G.bloomOn;
    persist();
    G.callout(G.bloomOn ? 'BLOOM ON' : 'BLOOM OFF', { size: 'small' });
  }

  switch (G.state) {
    case 'title':
      if (input.pressed('start')) newGame();
      break;
    case 'countdown':
    case 'play':
      if (input.pressed('pause')) pause();
      break;
    case 'paused':
      if (input.pressed('start') || input.pressed('pause')) resume();
      else if (input.pressed('restart')) newGame();
      break;
    case 'over':
      if (input.pressed('start') || input.pressed('restart')) newGame();
      break;
  }
}

function updateCountdown(dt) {
  G.countT += dt;
  if (input.pressed('boost') && G.launchPress === null) G.launchPress = G.countT;
  const n = COUNTDOWN - Math.floor(G.countT);
  G.hud.centerMessage(n > 0 ? String(n) : '');
  G.player.updateVisual(dt);
  if (G.countT >= COUNTDOWN) {
    G.state = 'play';
    G.hud.centerMessage('');
    G.callout('GO!', { color: '#ffff00', size: 'huge' });
    const t = G.launchPress;
    if (t !== null && t >= PERFECT_LAUNCH[0] && t < PERFECT_LAUNCH[1]) {
      G.player.speed = 60;
      G.player.addTurbo(60);
      G.stats.perfects++;
      G.callout('PERFECT LAUNCH', { color: '#ffffff', size: 'huge' });
    } else {
      G.player.speed = 40;
      if (t !== null) G.callout('TOO EARLY', { color: '#ff6b6b', size: 'small' });
    }
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min((now - last) / 1000, 0.05);
  last = now;

  handleGlobalKeys();

  if (G.state === 'paused') {
    input.endFrame();
    return;
  }

  G.slowmoT -= realDt;
  const dt = realDt * (G.slowmoT > 0 ? 0.35 : 1);
  G.time += dt;

  if (G.state === 'countdown') updateCountdown(dt);
  if (G.state === 'play') {
    G.player.update(dt, input);
    G.stats.topSpeed = Math.max(G.stats.topSpeed, G.player.vel.length());
  }
  if (G.state === 'dying') {
    G.dyingT += realDt;
    if (G.dyingT > 1.8) {
      G.state = 'over';
      G.hud.show(false);
      G.hud.showGameOver(G.overReason, G.stats, save.best || 0, G.newBest);
    }
  }

  G.traffic.update(dt);
  G.peds.update(dt);
  G.cops.update(dt);
  G.weapons.update(dt, input);
  G.jobs.update(dt);
  if (G.state === 'play') updateEconomy(dt);
  flushKills();
  G.fx.update(dt, realDt);
  G.city.update(G.time);

  updateCamera(dt, realDt);
  if (G.state === 'play') G.fx.updateStreaks(G.player.vel);
  else G.fx.updateStreaks(STILL);
  if (G.state === 'play' || G.state === 'countdown') G.hud.update(realDt);

  if (G.bloomOn) composer.render();
  else renderer.render(scene, camera);
  input.endFrame();
}

window.addEventListener('blur', () => {
  if (G.state === 'play' || G.state === 'countdown') pause();
});
container.addEventListener('mousedown', () => {
  window.focus();
  if (G.state === 'title' || G.state === 'over') newGame();
});

// Expose for debugging from the console
window.ACE = G;

G.hud.showTitle(save.best || 0);
requestAnimationFrame(frame);
