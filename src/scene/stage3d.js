// One three.js canvas behind the slides: a living agent network (hero) and the
// "brain in a jar" that gains hands (tools), a notebook (memory) and a loop.
import * as THREE from 'three';

const AMBER = 0xf59e0b, INDIGO = 0x6366f1, SLATE = 0x94a3b8;

function textSprite(text, { size = 64, color = '#0f172a', bg = null, border = '#cbd5e1', pad = 18 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  c.width = w; c.height = size + pad * 2;
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
  if (bg) {
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(2, 2, c.width - 4, c.height - 4, 24); ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, pad, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(c.width / c.height * 0.34, 0.34, 1);
  s.renderOrder = 10;
  return s;
}

function glowDot(color = AMBER, r = 0.06) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), new THREE.MeshBasicMaterial({ color }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 2.6, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }));
  m.add(halo);
  return m;
}

// a soft round sprite so network nodes aren't squares
function roundDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#fffc'); g.addColorStop(1, '#fff0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function buildHero() {
  const g = new THREE.Group();
  const N = 150, pts = [];
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(2.2 + Math.random() * 1.6);
    v.y *= 0.6;
    pts.push(v);
  }
  const nodes = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.PointsMaterial({ color: INDIGO, size: 0.09, map: roundDot(), alphaTest: 0.3, transparent: true, opacity: 0.85 }));
  g.add(nodes);
  const seg = [], edges = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    if (pts[i].distanceTo(pts[j]) < 0.95) { seg.push(pts[i], pts[j]); edges.push([pts[i], pts[j]]); }
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg),
    new THREE.LineBasicMaterial({ color: SLATE, transparent: true, opacity: 0.4 })));
  const pulses = Array.from({ length: 14 }, () => {
    const d = glowDot(AMBER, 0.035);
    g.add(d);
    return { d, e: edges[Math.floor(Math.random() * edges.length)], t: Math.random(), v: 0.25 + Math.random() * 0.5 };
  });
  g.userData.tick = (dt) => {
    g.rotation.y += dt * 0.05;
    for (const p of pulses) {
      p.t += dt * p.v;
      if (p.t > 1) { p.t = 0; p.e = edges[Math.floor(Math.random() * edges.length)]; }
      p.d.position.lerpVectors(p.e[0], p.e[1], p.t);
    }
  };
  return g;
}

function buildBrain() {
  const g = new THREE.Group();
  g.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.PointLight(0xffffff, 30, 20); key.position.set(2, 3, 4); g.add(key);

  // the brain: a wrinkly blob made by displacing an icosphere
  const geo = new THREE.IcosahedronGeometry(0.8, 24);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9) * Math.sin(v.y * 11) * Math.sin(v.z * 7);
    v.multiplyScalar(1 + 0.07 * n + (Math.abs(v.x) < 0.05 ? -0.08 : 0));
    v.y *= 0.82; v.z *= 1.15;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const brain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe879f9, emissive: 0x7c3aed, emissiveIntensity: 0.25, roughness: 0.6 }));
  brain.position.y = 0.05;
  g.add(brain);

  // the jar
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 2.3, 48, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.14, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  g.add(jar);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.8 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -1.15; g.add(rim);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.15, roughness: 0.6 }));
  lid.position.y = 1.22; g.add(lid);

  // hands: tools around the jar
  const toolDefs = [['Search', -2.45, 1.55], ['Calculate', 2.45, 1.55], ['Write files', 2.45, -1.5], ['Browse the web', -2.45, -1.5]];
  const tools = toolDefs.map(([label, x, y]) => {
    const s = textSprite(label, { bg: '#ffffffee', size: 56 });
    s.position.set(x, y, 0); s.material.opacity = 0; g.add(s);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, 0)]),
      new THREE.LineDashedMaterial({ color: AMBER, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0 }));
    line.computeLineDistances(); g.add(line);
    return { s, line, to: new THREE.Vector3(x, y, 0) };
  });
  const handPulse = glowDot(); handPulse.visible = false; g.add(handPulse);

  // notebook: memory
  const book = textSprite('Memory', { bg: '#fef3c7ee', border: '#f59e0b', size: 60, color: '#78350f' });
  book.position.set(0, -2.05, 0.6); book.material.opacity = 0; g.add(book);
  const bookPulse = glowDot(0xd97706); bookPulse.visible = false; g.add(bookPulse);

  // the loop
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.022, 8, 160), new THREE.MeshBasicMaterial({ color: INDIGO, transparent: true, opacity: 0 }));
  ring.rotation.x = Math.PI / 2.35; g.add(ring);
  const comet = glowDot(AMBER, 0.08); comet.visible = false; g.add(comet);
  const loopLabels = ['think', 'act', 'observe', 'remember'].map((t, i) => {
    const s = textSprite(t, { size: 48, color: '#3730a3', bg: '#eef2ffee', border: '#c7d2fe' });
    // label points on the tilted ring: back, right, front, left
    const a = Math.PI / 2 - (i * Math.PI) / 2;
    s.position.set(Math.cos(a) * 2.3, 0, -Math.sin(a) * 2.3).applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2.35 - Math.PI / 2);
    s.position.y += 0.22;
    s.material.opacity = 0; g.add(s);
    return s;
  });

  g.position.set(2.0, -0.15, 0);
  g.scale.setScalar(0.92);
  let stage = 0, time = 0;
  const fadeTo = (mat, target, dt) => { mat.opacity += (target - mat.opacity) * Math.min(1, dt * 4); if (Math.abs(target - mat.opacity) < 0.02) mat.opacity = target; };

  g.userData.setStage = (n) => { stage = n; };
  g.userData.tick = (dt) => {
    time += dt;
    brain.rotation.y += dt * 0.4;
    brain.scale.setScalar(1 + Math.sin(time * 2) * 0.015);
    lid.position.y += ((stage >= 1 ? 1.9 : 1.22) - lid.position.y) * Math.min(1, dt * 3);
    lid.rotation.z += ((stage >= 1 ? 0.5 : 0) - lid.rotation.z) * Math.min(1, dt * 3);
    tools.forEach((t, i) => {
      fadeTo(t.s.material, stage >= 1 ? 1 : 0, dt);
      fadeTo(t.line.material, stage >= 1 ? (Math.floor(time / 1.2) % 4 === i ? 0.95 : 0.25) : 0, dt);
    });
    handPulse.visible = stage >= 1;
    if (stage >= 1) {
      const t = tools[Math.floor(time / 1.2) % 4], k = (time / 1.2) % 1;
      handPulse.position.lerpVectors(new THREE.Vector3(), t.to, k < 0.5 ? k * 2 : 2 - k * 2);
    }
    fadeTo(book.material, stage >= 2 ? 1 : 0, dt);
    bookPulse.visible = stage >= 2;
    if (stage >= 2) { const k = (time * 0.6) % 1; bookPulse.position.lerpVectors(new THREE.Vector3(), book.position, k < 0.5 ? k * 2 : 2 - k * 2); }
    fadeTo(ring.material, stage >= 3 ? 0.8 : 0, dt);
    loopLabels.forEach((s) => fadeTo(s.material, stage >= 3 ? 1 : 0, dt));
    comet.visible = stage >= 3;
    if (stage >= 3) {
      const a = time * 1.4;
      comet.position.set(Math.cos(a) * 2.05, 0, -Math.sin(a) * 2.05).applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2.35 - Math.PI / 2);
    }
    g.rotation.y = Math.sin(time * 0.25) * 0.25;
  };
  return g;
}

export function createStage3d(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.set(0, 0.3, 7.2);
  const scenes = { hero: buildHero(), brain: buildBrain() };
  let current = null, running = false, last = performance.now();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // rAF time can precede performance.now()
    last = now;
    current?.userData.tick(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  return {
    show(name) {
      if (current) scene.remove(current);
      current = scenes[name] ?? null;
      canvas.classList.toggle('on', Boolean(current));
      canvas.classList.toggle('dim', name === 'hero');
      if (!current) { running = false; return; }
      scene.add(current);
      camera.position.set(0, 0.3, name === 'hero' ? 6 : 7.4);
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    },
    setBrainStage(n) { scenes.brain.userData.setStage(n); },
  };
}
