import * as THREE from 'three';
import { clamp, clamp01, damp, easeOutCubic } from '@/lib/math';
import { CAMERA, GLYPH_MAX_X, GLYPH_MAX_Y, INTRO_POSE, SCENE_BG, resolveParams } from './config';
import { createPieces } from './geometry';
import { createBlueprintGrid } from './grid';
import { bindHeroControls, bindPointer, type HudAction, type InputState } from './input';
import { createPost } from './post';

export type SceneStats = {
  camera: [number, number, number];
  zoom: number;
  rotation: [number, number];
  cursor: [number, number]; // −1..1, y up
  fps: number;
  glitching: boolean;
};

export type SceneOptions = {
  reducedMotion?: boolean;
  onStats?: (stats: SceneStats) => void;
  onActiveChange?: (active: boolean) => void;
  onHud?: (action: HudAction) => void;
  hudRect?: () => DOMRect | null;
};

export type NScene = { dispose(): void };

const STATS_HZ = 15;

// how far a point is from a box on screen (0 inside it)
const distanceTo = (x: number, y: number, r: DOMRect) =>
  Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
const MAX_DPR = 2;

export function createNScene(host: HTMLElement, opts: SceneOptions): NScene {
  const { reducedMotion = false } = opts;
  const p = resolveParams(reducedMotion);
  const abort = new AbortController();
  const { signal } = abort;

  const canvas = document.createElement('canvas');
  canvas.className = 'block size-full';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(SCENE_BG, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 100);
  camera.position.set(...CAMERA.position);
  const camTarget = new THREE.Vector3(...CAMERA.target);
  camera.lookAt(camTarget);
  const camRadius = camera.position.distanceTo(camTarget);
  const camPitch0 = Math.asin((camera.position.y - camTarget.y) / camRadius);

  const key = new THREE.DirectionalLight(0xffffff, p.keyLight);
  key.position.set(-4, 6, 7);
  const fill = new THREE.DirectionalLight(0xffffff, p.fillLight);
  fill.position.set(5, -2, 4);
  const amb = new THREE.AmbientLight(0xffffff, p.ambient);
  scene.add(key, fill, amb);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: p.roughness,
    metalness: 0.1,
    flatShading: true,
  });
  const glyph = new THREE.Group();
  const letter = new THREE.Group();
  const pieces = createPieces(p, material);
  letter.add(...pieces);
  letter.rotation.z = p.lean;
  glyph.add(letter);
  glyph.position.y = 0.3;
  glyph.scale.setScalar(p.scale);
  scene.add(glyph);

  const grid = p.bgMode === 'blueprint' ? createBlueprintGrid(pieces) : null;
  const post = createPost(renderer, scene, camera);

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const dpr = Math.min(devicePixelRatio, MAX_DPR);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h, dpr, p.cell);
    grid?.setSize(w * dpr, h * dpr);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  window.addEventListener('resize', resize, { signal }); // devicePixelRatio changes

  const input: InputState = {
    mouse: { x: 0, y: 0, inside: false },
    view: { zoomT: 1, yawT: 0, pitchT: 0 },
  };
  const view = { zoom: 1, yaw: 0, pitch: 0 };
  const smooth = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let overGlyph = false;
  // the intro's scatter follows its target a touch behind, so a replay mid-intro glides out instead of
  // snapping; spinCarry is leftover rotation from the intro a replay interrupted, unwound as it plays
  let scatter = p.introScatter;
  let spinCarry = 0;
  let glitch = 0;
  let glitchKick = 0.8;
  let ripple = 0;
  let fps = 60;
  let lastStatsTick = -1;

  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  let lastFrame = now();
  let introStart = reducedMotion ? -p.introDuration : 0;
  const scheduleIdle = (t: number) => t + p.idleMin + Math.random() * Math.max(0, p.idleMax - p.idleMin);
  let nextIdleGlitch = scheduleIdle(p.introDuration);

  // re-centre the cursor so the N settles front-on until the pointer moves again
  function resetPose() {
    Object.assign(input.view, { zoomT: 1, yawT: 0, pitchT: 0 });
    Object.assign(input.mouse, { x: 0, y: 0, inside: false });
    overGlyph = false;
  }
  const introSpinAt = (t: number) => {
    const ip = easeOutCubic(clamp01((t - introStart) / p.introDuration));
    return (1 - ip) * (Math.PI * 2 * p.introSpins + spinCarry);
  };
  // a click plays the intro again where the N is, leaving the camera alone
  function replay() {
    const t = now();
    if (!reducedMotion) {
      // whole turns look the same, so only the leftover angle needs carrying into the new intro
      const left = introSpinAt(t) % (Math.PI * 2);
      spinCarry = left > Math.PI ? left - Math.PI * 2 : left;
      introStart = t;
    }
    glitchKick = Math.max(glitchKick, p.clickGlitch);
    nextIdleGlitch = scheduleIdle(t + p.introDuration);
  }
  // the N's centre in page coordinates
  const glyphOnScreen = () => {
    const at = glyph.getWorldPosition(new THREE.Vector3()).project(camera);
    const box = host.getBoundingClientRect();
    return { x: box.left + ((at.x + 1) / 2) * box.width, y: box.top + ((1 - at.y) / 2) * box.height };
  };
  // R: back to the starting view, then the intro
  function reset() {
    resetPose();
    replay();
  }

  let onScreen = false;
  const isActive = () => onScreen && scrollY < innerHeight * 0.5;
  const isPaused = () => !onScreen || scrollY > innerHeight * 1.4;
  let hudShown: boolean | null = null;
  let wasActive = true;
  const syncHud = (shown: boolean) => {
    if (shown === hudShown) return;
    hudShown = shown;
    opts.onActiveChange?.(shown);
  };

  bindPointer(
    host,
    {
      onMove(x, y, u, v) {
        if (!isActive()) return;
        input.mouse.x = x;
        input.mouse.y = y;
        input.mouse.inside = true;
        post.mouse.set(u, v);
        ndc.set(x, -y);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(pieces, false).length > 0;
        if (hit && !overGlyph) glitchKick = Math.max(glitchKick, p.hoverGlitch);
        overGlyph = hit;
      },
      onLeave() {
        input.mouse.inside = false;
        overGlyph = false;
      },
    },
    signal,
  );
  bindHeroControls(
    {
      state: input,
      params: p,
      isActive,
      // with the panel open, a click nearer the panel than the N closes it; nearer the N plays the intro
      click: (x, y) => {
        const panel = opts.hudRect?.();
        const n = glyphOnScreen();
        if (panel && distanceTo(x, y, panel) < Math.hypot(x - n.x, y - n.y)) opts.onHud?.('close');
        else replay();
      },
      reset,
      onHud: (a) => opts.onHud?.(a),
    },
    signal,
  );

  function frame() {
    const tNow = now();
    const dt = Math.min(tNow - lastFrame, 0.05);
    lastFrame = tNow;
    const t = tNow;
    if (isPaused()) {
      syncHud(false);
      wasActive = false;
      return;
    }
    const active = isActive();
    if (active && !wasActive) resetPose();
    wasActive = active;
    syncHud(active);
    const k = (rate: number) => damp(rate, dt);

    const it = t - introStart;
    const ip = easeOutCubic(clamp01(it / p.introDuration));
    const introSpin = introSpinAt(t);
    scatter += (p.introScatter * (1 - ip) - scatter) * k(8);

    if (t > nextIdleGlitch) {
      glitchKick = Math.max(glitchKick, p.idleStrength * (0.6 + Math.random() * 0.4));
      nextIdleGlitch = scheduleIdle(t);
    }
    glitchKick *= Math.exp(-(it < p.introDuration ? 1.5 : 6) * dt);
    const target = Math.max(glitchKick, (1 - ip) * 0.7, p.baseGlitch);
    glitch += (target - glitch) * k(18);

    const { mouse } = input;
    smooth.x += (mouse.x - smooth.x) * k(3);
    smooth.y += (mouse.y - smooth.y) * k(3);
    ripple += ((mouse.inside ? 1 : 0) - ripple) * k(3);

    view.zoom += (input.view.zoomT - view.zoom) * k(8);
    view.yaw += (input.view.yawT - view.yaw) * k(10);
    view.pitch += (input.view.pitchT - view.pitch) * k(10);

    glyph.rotation.set(
      clamp(p.restRotX + smooth.y * p.tiltX + view.pitch, -GLYPH_MAX_X, GLYPH_MAX_X),
      clamp(p.restRotY + smooth.x * p.tiltY + view.yaw, -GLYPH_MAX_Y, GLYPH_MAX_Y) + introSpin,
      0,
    );

    pieces.forEach((m, i) => {
      const b = m.userData.base;
      const s = INTRO_POSE[i];
      const bob = Math.sin(t * 0.8 + i * 2.1) * p.bob;
      m.position.set(b[0] + s.pos[0] * scatter, b[1] + s.pos[1] * scatter + bob, b[2] + s.pos[2] * scatter);
      m.rotation.set(s.rot[0] * scatter, s.rot[1] * scatter, s.rot[2] * scatter);
    });

    const yaw = -smooth.x * p.camOrbit;
    const pitch = camPitch0 + smooth.y * p.camOrbit * 0.35;
    const radius = camRadius * view.zoom;
    camera.position.set(
      camTarget.x + radius * Math.cos(pitch) * Math.sin(yaw),
      camTarget.y + radius * Math.sin(pitch),
      camTarget.z + radius * Math.cos(pitch) * Math.cos(yaw),
    );
    camera.lookAt(camTarget);

    if (grid) {
      glyph.updateMatrixWorld(true);
      grid.render(renderer, camera, p);
    }

    fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
    const statsTick = Math.floor(t * STATS_HZ);
    if (opts.onStats && statsTick !== lastStatsTick) {
      lastStatsTick = statsTick;
      opts.onStats({
        camera: [camera.position.x, camera.position.y, camera.position.z],
        zoom: 1 / view.zoom,
        rotation: [THREE.MathUtils.radToDeg(glyph.rotation.y), THREE.MathUtils.radToDeg(glyph.rotation.x)],
        cursor: [mouse.x, -mouse.y],
        fps,
        glitching: glitch > 0.35,
      });
    }

    post.render(p, {
      time: t,
      glitch,
      ripple,
      intro: clamp01(t / 0.4),
      gridTexture: grid?.texture ?? null,
    });
  }

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    frame();
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen && !raf) {
      lastFrame = now();
      raf = requestAnimationFrame(loop);
    } else if (!onScreen && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      syncHud(false);
    }
  });
  io.observe(host);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      abort.abort();
      ro.disconnect();
      io.disconnect();
      pieces.forEach((m) => m.geometry.dispose());
      material.dispose();
      grid?.dispose();
      post.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
