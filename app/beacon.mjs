// The status beacon: a small industrial signal tower (stack light) beside the verdict.
// Only the segment for the mission's status glows, like an andon light on a factory floor:
// red = stopped or bad proof, amber = waiting for a limit or working, green = complete and
// proven, blue = waiting for a person; nothing lit = undetermined or not started.
// three.js (saved in app/vendor) draws it when WebGL works; otherwise the flat tower drawn
// in CSS stays. It slowly turns and pulses, and stands still for reduced motion.
// spec.md > Look and Feel · prd.md > Look and Feel

const ORDER = ['teal', 'green', 'amber', 'red']; // bottom to top, as on a real tower
const SEG_H = 0.44;
const RING_H = 0.04;
const STACK_Y = 0.6;

let THREE = null;
let state = null; // renderer, scene, camera, parts, current host and colour
let loading = null;
let disabled = false;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglWorks() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch {
    return false;
  }
}

function saveData() {
  return Boolean(typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData);
}

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function build() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 0.6, 0.1, 50);
  camera.position.set(0, 1.75, 6.6);
  camera.lookAt(0, 1.38, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4652, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2.5, 4, 5);
  scene.add(key);

  const tower = new THREE.Group();
  scene.add(tower);
  const housing = new THREE.MeshStandardMaterial({ color: 0x2c343b, roughness: 0.45, metalness: 0.25 });
  const pole = new THREE.MeshStandardMaterial({ color: 0x46525c, roughness: 0.35, metalness: 0.4 });
  const add = (geometry, material, y) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    tower.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(0.5, 0.56, 0.1, 48), housing, 0.05);
  add(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 20), pole, 0.31);
  add(new THREE.CylinderGeometry(0.39, 0.39, 0.08, 48), housing, STACK_Y - 0.04);

  const segments = {};
  ORDER.forEach((name, i) => {
    const y = STACK_Y + i * (SEG_H + RING_H) + SEG_H / 2;
    const lens = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.22, metalness: 0,
      transparent: true, opacity: 0.55, flatShading: true,
    });
    const core = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.9 });
    add(new THREE.CylinderGeometry(0.36, 0.36, SEG_H, 28), lens, y);
    add(new THREE.CylinderGeometry(0.2, 0.2, SEG_H * 0.78, 20), core, y);
    if (i < ORDER.length - 1) add(new THREE.CylinderGeometry(0.375, 0.375, RING_H, 48), housing, y + SEG_H / 2 + RING_H / 2);
    segments[name] = { y, lens, core, level: 0 };
  });
  const top = STACK_Y + ORDER.length * (SEG_H + RING_H) - RING_H;
  add(new THREE.CylinderGeometry(0.33, 0.375, 0.1, 48), housing, top + 0.05);
  const dome = add(new THREE.SphereGeometry(0.33, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), housing, top + 0.1);
  dome.scale.y = 0.32;

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, opacity: 0 }));
  halo.scale.set(2.1, 1.35, 1);
  halo.position.set(0, STACK_Y, -0.55);
  scene.add(halo);
  const glow = new THREE.PointLight(0xffffff, 0, 2.6, 2);
  glow.position.set(0, STACK_Y, 0.55);
  scene.add(glow);

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    disabled = true;
    if (state && state.host) state.host.classList.remove('beacon--3d');
    stop();
  });

  return { renderer, scene, camera, tower, segments, halo, glow, host: null, color: 'grey', time: 0, last: 0, raf: 0, visible: true, colors: {} };
}

function readColors() {
  state.colors = {
    red: new THREE.Color(cssColor('--red-lamp', '#e5372b')),
    amber: new THREE.Color(cssColor('--amber-lamp', '#f2a516')),
    green: new THREE.Color(cssColor('--green-lamp', '#1fa45a')),
    teal: new THREE.Color(cssColor('--teal-lamp', '#2f7bf0')),
  };
  for (const name of ORDER) {
    const seg = state.segments[name];
    seg.color = state.colors[name];
    // An unlit lens is dark tinted plastic; only the lit one shows its full colour.
    seg.dim = new THREE.Color(0x2a3036).lerp(state.colors[name], 0.42);
    seg.dark = new THREE.Color(0x1f2428).lerp(state.colors[name], 0.12);
    seg.lens.emissive.copy(state.colors[name]);
  }
}

function pulse(name, t) {
  if (reducedMotion()) return 1.7;
  const wave = (hz) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * hz);
  if (name === 'red') return 1.35 + 0.95 * wave(0.9);
  if (name === 'amber') return 1.45 + 0.5 * wave(0.45);
  if (name === 'teal') return 1.4 + 0.75 * wave(0.7);
  return 1.75;
}

function frame(now) {
  if (!state) return;
  const dt = state.last ? Math.min(0.1, (now - state.last) / 1000) : 0;
  state.last = now;
  state.time += dt;
  const still = reducedMotion();
  if (!still) state.tower.rotation.y += dt * 0.32;
  let haloY = state.halo.position.y;
  let haloLevel = 0;
  for (const name of ORDER) {
    const seg = state.segments[name];
    const target = name === state.color ? 1 : 0;
    seg.level = still ? target : seg.level + (target - seg.level) * Math.min(1, dt * 7);
    const lit = seg.level;
    seg.lens.color.copy(seg.dim).lerp(seg.color, lit);
    seg.lens.emissiveIntensity = 0.02 + lit * pulse(name, state.time);
    seg.lens.opacity = 0.62 + 0.36 * lit;
    seg.core.color.copy(seg.dark).lerp(seg.color, lit);
    if (lit > haloLevel) {
      haloLevel = lit;
      haloY = seg.y;
    }
  }
  const lamp = state.colors[state.color];
  if (lamp) {
    state.halo.material.color.copy(lamp);
    state.glow.color.copy(lamp);
  }
  state.halo.position.y = haloY;
  state.glow.position.y = haloY;
  state.halo.material.opacity = 0.55 * haloLevel;
  state.glow.intensity = 5 * haloLevel;
  state.renderer.render(state.scene, state.camera);
  const settling = ORDER.some((name) => Math.abs(state.segments[name].level - (name === state.color ? 1 : 0)) > 0.01);
  if ((!still || settling) && state.host && state.visible && !document.hidden) state.raf = requestAnimationFrame(frame);
  else state.raf = 0;
}

function start() {
  if (!state || state.raf) return;
  state.last = 0;
  state.raf = requestAnimationFrame(frame);
}

function stop() {
  if (state && state.raf) cancelAnimationFrame(state.raf);
  if (state) state.raf = 0;
}

function resize() {
  if (!state || !state.host) return;
  const canvas = state.renderer.domElement;
  const width = canvas.clientWidth || state.host.clientWidth;
  const height = canvas.clientHeight || state.host.clientHeight;
  if (!width || !height) return;
  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

let observer = null;

function attach(host) {
  const color = host.dataset.color;
  state.color = ORDER.includes(color) ? color : 'grey';
  if (state.host !== host) {
    state.host = host;
    host.appendChild(state.renderer.domElement);
    host.classList.add('beacon--3d');
    if (observer) observer.disconnect();
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        state.visible = entries.some((e) => e.isIntersecting);
        if (state.visible) start();
      });
      observer.observe(host);
    }
  }
  resize();
  start();
}

// Called after every render: moves the one 3D beacon into the page's beacon slot (the page
// is re-rendered often; the WebGL context is kept), or stops it when there is no slot.
export function syncBeacon(root = document) {
  const host = root.querySelector('.beacon[data-color]');
  if (!host) {
    if (state) state.host = null;
    stop();
    return;
  }
  if (disabled) return;
  if (state) {
    attach(host);
    return;
  }
  if (!loading) {
    if (saveData() || !webglWorks()) {
      disabled = true;
      return;
    }
    loading = import('./vendor/three.module.min.js')
      .then((module) => {
        THREE = module;
        state = build();
        readColors();
      })
      .catch(() => {
        disabled = true;
      });
  }
  loading.then(() => {
    if (disabled || !state) return;
    const current = root.querySelector('.beacon[data-color]');
    if (current) attach(current);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state) {
        readColors();
        start();
      }
    });
  }
}

// For checks: whether the 3D beacon is drawing (true) or the flat tower is shown (false).
export function beaconMode() {
  if (disabled) return 'flat';
  return state && state.host ? '3d' : loading ? 'loading' : 'flat';
}
