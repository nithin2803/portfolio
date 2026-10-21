import * as THREE from 'three';
import { SCENE_BG, type SceneParams } from './config';
import type { Piece } from './geometry';
import { gridShader } from './shaders';

function gridMaterial(axes: [number, number]) {
  return new THREE.ShaderMaterial({
    ...gridShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uBright: { value: 0.5 },
      uSize: { value: 1 },
      uMajor: { value: 5 },
      uLine: { value: 1 },
      uCam: { value: new THREE.Vector3() },
      uAxes: { value: new THREE.Vector2(...axes) },
    },
  });
}

export function createBlueprintGrid(pieces: Piece[]) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);

  const floorMat = gridMaterial([0, 2]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.2;
  scene.add(floor);

  const wallMat = gridMaterial([0, 1]);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), wallMat);
  wall.position.set(0, 27.8, -9);
  scene.add(wall);

  const occluderMat = new THREE.MeshBasicMaterial({ color: SCENE_BG });
  const occluders = pieces.map((piece) => {
    const o = new THREE.Mesh(piece.geometry, occluderMat);
    o.matrixAutoUpdate = false;
    scene.add(o);
    return o;
  });

  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });

  return {
    texture: target.texture,
    setSize(width: number, height: number) {
      target.setSize(width, height);
    },
    render(renderer: THREE.WebGLRenderer, camera: THREE.Camera, p: SceneParams) {
      wall.visible = p.gridWall;
      for (const m of [floorMat, wallMat]) {
        m.uniforms.uBright.value = p.gridBrightness;
        m.uniforms.uSize.value = p.gridSize;
        m.uniforms.uMajor.value = p.gridMajorEvery;
        m.uniforms.uLine.value = p.gridLine;
        m.uniforms.uCam.value.copy(camera.position);
      }
      // pieces' world matrices must be current (caller updates the glyph group first)
      occluders.forEach((o, i) => o.matrix.copy(pieces[i].matrixWorld));
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
    },
    dispose() {
      floor.geometry.dispose();
      wall.geometry.dispose();
      floorMat.dispose();
      wallMat.dispose();
      occluderMat.dispose(); // occluders share the pieces' geometry — the pieces dispose it
      target.dispose();
    },
  };
}

export type BlueprintGrid = ReturnType<typeof createBlueprintGrid>;
