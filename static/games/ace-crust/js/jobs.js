import * as THREE from 'three';

const CUSTOMERS = ['Tanaka', 'Okafor', 'Nguyen', 'Volkov', 'Ramirez', 'Chen', 'Kowalski', 'Haddad', 'Reyes', 'Ito', 'Unit 734', 'Mx. Byte', 'Dr. Flux', 'Ghost', 'Okonkwo', 'Moreau'];
const PIZZAS = ['pepperoni', 'quattro formaggi', 'kelp & tofu', 'synth-ham pineapple', 'plasma margherita', 'double anchovy', 'meat lovers 2.0', 'nano-basil pesto'];
const RING_RADIUS = 9;
const CATCH_RADIUS = 11;
const BULLSEYE = 4.5;
const MAX_STRIKES = 3;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Jobs {
  constructor(G) {
    this.G = G;
    this.pickupRing = this.makeRing(0xffaa00);
    this.deliverRing = this.makeRing(0x00ff66);
    this.reset(G.city.pizzerias[0]);
  }

  makeRing(color) {
    const g = new THREE.Group();
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.6, 10, 48),
      new THREE.MeshBasicMaterial({ color })));
    ring.add(new THREE.Mesh(
      new THREE.TorusGeometry(BULLSEYE, 0.22, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })));
    ring.add(new THREE.Mesh(
      new THREE.CircleGeometry(RING_RADIUS, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })));
    g.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
    g.add(beam);
    g.userData = { ring, beam };
    this.G.scene.add(g);
    return g;
  }

  placeRing(group, pos) {
    group.position.copy(pos);
    const top = 320;
    group.userData.beam.scale.y = pos.y + top;
    group.userData.beam.position.y = (top - pos.y) / 2;
    group.visible = true;
  }

  reset(pizzeria) {
    this.strikes = 0;
    this.queue = [];
    this.current = null;
    this.carrying = 0;
    this.timer = 0;
    this.goPickup(pizzeria);
  }

  nearestPizzeria() {
    const p = this.G.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const pz of this.G.city.pizzerias) {
      const d = pz.ringPos.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = pz;
      }
    }
    return best;
  }

  goPickup(pizzeria) {
    this.state = 'pickup';
    this.pizzeria = pizzeria || this.nearestPizzeria();
    this.placeRing(this.pickupRing, this.pizzeria.ringPos);
    this.deliverRing.visible = false;
  }

  makeOrder(from) {
    const city = this.G.city;
    const towers = city.buildings.filter((b) => b.kind === 'tower' && b.h > 30);
    let b = null;
    let pos = null;
    for (let tries = 0; tries < 60; tries++) {
      b = pick(towers);
      pos = city.deliverySpot(b);
      const d = pos.distanceTo(from);
      if (d > 350 && d < 1150) break;
    }
    const dist = pos.distanceTo(from);
    const floor = Math.max(1, Math.round(pos.y / 4.5));
    return {
      pos,
      customer: pick(CUSTOMERS),
      pizza: pick(PIZZAS),
      address: `${String.fromCharCode(65 + b.block.i)}-${b.block.j + 1} FL ${floor}`,
      time: 10 + dist / 50,
    };
  }

  collect() {
    const G = this.G;
    const n = Math.min(3, 1 + Math.floor(G.stats.deliveries / 3));
    let from = this.pizzeria.ringPos;
    this.queue = [];
    for (let k = 0; k < n; k++) {
      const order = this.makeOrder(from);
      this.queue.push(order);
      from = order.pos;
    }
    this.carrying = n;
    G.player.hp = Math.min(100, G.player.hp + 20);
    G.fx.burst(this.pizzeria.ringPos, 30, 40, 0.6, 1.5, 0.2, [0xffaa00, 0xffff66, 0xffffff], 0, 2);
    G.callout(n > 1 ? `PIZZA UP x${n}` : 'PIZZA UP', { color: '#ffaa00', size: 'huge' });
    G.callout('+20 HULL', { color: '#00ff00', size: 'small' });
    this.nextOrder();
  }

  nextOrder() {
    if (this.queue.length === 0) {
      this.current = null;
      this.goPickup();
      return;
    }
    this.current = this.queue.shift();
    this.timer = this.current.time;
    this.state = 'deliver';
    this.pickupRing.visible = false;
    this.placeRing(this.deliverRing, this.current.pos);
  }

  deliver(dist) {
    const G = this.G;
    const bullseye = dist < BULLSEYE;
    const tip = Math.round(this.timer * 4);
    const pay = 40 + tip + (bullseye ? 35 : 0);
    G.stats.cash += pay;
    G.stats.deliveries++;
    this.carrying--;
    G.fx.burst(this.current.pos, 40, 50, 0.8, 1.6, 0.2, [0x00ff66, 0xffff00, 0xff00ff, 0x00ffff], 20, 1.5);
    G.callout('DELIVERED', { cash: pay, color: '#00ff66', size: 'huge' });
    if (bullseye) {
      G.callout('BULLSEYE +$35', { color: '#ffffff' });
      G.slowmo(0.2);
    }
    this.nextOrder();
  }

  fail() {
    const G = this.G;
    this.strikes++;
    this.carrying--;
    G.callout(`COLD PIZZA — STRIKE ${this.strikes}`, { color: '#ff6b6b', size: 'huge' });
    if (this.strikes >= MAX_STRIKES) {
      G.endGame('FIRED');
      return;
    }
    this.nextOrder();
  }

  objective() {
    if (this.state === 'pickup') return { pos: this.pizzeria.ringPos, kind: 'pickup' };
    return { pos: this.current.pos, kind: 'deliver' };
  }

  update(dt) {
    const G = this.G;
    const spin = G.time * 1.2;
    this.pickupRing.userData.ring.rotation.y = spin;
    this.deliverRing.userData.ring.rotation.y = spin;
    if (G.state !== 'play' || !G.player.alive) return;

    const p = G.player.pos;
    if (this.state === 'pickup') {
      if (p.distanceTo(this.pizzeria.ringPos) < CATCH_RADIUS) this.collect();
    } else {
      this.timer -= dt;
      const d = p.distanceTo(this.current.pos);
      if (d < CATCH_RADIUS) this.deliver(d);
      else if (this.timer <= 0) this.fail();
    }
  }
}
