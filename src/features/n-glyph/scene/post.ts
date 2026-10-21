import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BG_MODES, type SceneParams } from './config';
import { ditherGlitchShader, fieldShader } from './shaders';

export type PostFrame = {
  time: number;
  glitch: number;
  ripple: number;
  intro: number;
  gridTexture: THREE.Texture | null;
};

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const fieldTarget = new THREE.WebGLRenderTarget(1, 1, {
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
  });
  const fieldMat = new THREE.ShaderMaterial({
    ...fieldShader,
    uniforms: {
      uTime: { value: 0 },
      uCells: { value: new THREE.Vector2(1, 1) },
      uCell: { value: 6 },
      uScale: { value: 0.0035 },
      uLevels: { value: 4 },
      uWarp: { value: 0.9 },
      uMode: { value: 0 },
    },
  });
  const fieldQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fieldMat);
  const fieldScene = new THREE.Scene().add(fieldQuad);
  const fieldCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const pass = new ShaderPass({
    ...ditherGlitchShader,
    uniforms: {
      tDiffuse: { value: null },
      tField: { value: null }, // render-target textures can't be cloned — assigned below
      tGrid: { value: null },
      uGridOn: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-10, -10) },
      uIntro: { value: 0 },
      uCell: { value: 6 },
      uDotScale: { value: 0.62 },
      uMinLum: { value: 0.035 },
      uBright: { value: 1 },
      uBgStrength: { value: 0.3 },
      uRipple: { value: 0 },
      uRippleRadius: { value: 14 },
      uRippleFreq: { value: 90 },
      uGlitch: { value: 0 },
      uSlices: { value: 46 },
      uSliceShift: { value: 0.12 },
      uSplit: { value: 1 },
      uBlocks: { value: 0.6 },
      uScan: { value: 0.25 },
    },
  });
  composer.addPass(pass);
  const u = pass.uniforms;
  u.tField.value = fieldTarget.texture;
  // 'blueprint' and 'none' produce an empty field: bake it once per resize instead of every frame
  let fieldDirty = true;

  return {
    mouse: u.uMouse.value as THREE.Vector2,

    setSize(width: number, height: number, dpr: number, cell: number) {
      composer.setPixelRatio(dpr);
      composer.setSize(width, height);
      u.uRes.value.set(width * dpr, height * dpr);
      u.uDpr.value = dpr;
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      fieldTarget.setSize(cols, rows);
      fieldMat.uniforms.uCells.value.set(cols, rows);
      fieldDirty = true;
    },

    render(p: SceneParams, f: PostFrame) {
      const fu = fieldMat.uniforms;
      fu.uTime.value = f.time * p.bgSpeed;
      fu.uCell.value = p.cell;
      fu.uScale.value = p.bgScale;
      fu.uLevels.value = p.bgLevels;
      fu.uWarp.value = p.bgWarp;
      fu.uMode.value = Math.max(0, BG_MODES.indexOf(p.bgMode));
      const animated = p.bgMode !== 'blueprint' && p.bgMode !== 'none';
      if (animated || fieldDirty) {
        renderer.setRenderTarget(fieldTarget);
        renderer.render(fieldScene, fieldCam);
        renderer.setRenderTarget(null);
        fieldDirty = false;
      }

      u.tGrid.value = f.gridTexture;
      u.uGridOn.value = f.gridTexture ? 1 : 0;
      u.uTime.value = f.time;
      u.uGlitch.value = f.glitch;
      u.uRipple.value = f.ripple * p.rippleStrength;
      u.uRippleRadius.value = p.rippleRadius;
      u.uRippleFreq.value = p.rippleFreq;
      u.uCell.value = p.cell;
      u.uDotScale.value = p.dotScale;
      u.uMinLum.value = p.minLum;
      u.uBright.value = p.brightness;
      u.uBgStrength.value = p.bgStrength;
      u.uSlices.value = p.slices;
      u.uSliceShift.value = p.sliceShift;
      u.uSplit.value = p.rgbSplit;
      u.uBlocks.value = p.blocks;
      u.uScan.value = p.scanlines;
      u.uIntro.value = f.intro;
      composer.render();
    },

    dispose() {
      renderPass.dispose();
      pass.dispose();
      composer.dispose();
      fieldQuad.geometry.dispose();
      fieldMat.dispose();
      fieldTarget.dispose();
    },
  };
}

export type Post = ReturnType<typeof createPost>;
