const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const fieldShader = {
  vertexShader: fullscreenVertex,
  fragmentShader: /* glsl */ `
    uniform float uTime, uCell, uScale, uLevels, uWarp, uMode;
    uniform vec2 uCells;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
    float terrain(vec2 p, vec2 drift) {
      float warp = fbm(p * 0.8 + drift * 0.6);
      return smoothstep(0.36, 0.76, fbm(p + drift + warp * uWarp));
    }
    float contours(vec2 p, vec2 drift) {
      float h = fbm(p * 0.9 + drift * 0.5);
      float d = abs(fract(h * 9.0 - uTime * 0.04) - 0.5);
      return smoothstep(0.36, 0.5, d) * (0.55 + 0.45 * h);
    }
    float breathingGrid(vec2 c) {
      vec2 mid = uCells * 0.5;
      float w = sin(c.x * 0.07 + c.y * 0.045 - uTime * 0.7) + sin(length(c - mid) * 0.09 - uTime * 0.9);
      return 0.45 + 0.55 * max(0.0, w * 0.5);
    }
    float stars(vec2 c) {
      vec2 cell = floor(c + vec2(uTime * 1.5, 0.0));
      float h = hash(cell);
      float twinkle = 0.5 + 0.5 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
      return step(0.982, h) * (0.35 + 0.65 * twinkle);
    }
    float rain(vec2 c) {
      float col = floor(c.x);
      float speed = 0.6 + hash(vec2(col, 1.0)) * 1.6;
      float y = fract(c.y / uCells.y * 1.6 + uTime * speed * 0.12 + hash(vec2(col, 2.0)) * 10.0);
      float trail = smoothstep(0.55, 1.0, y) * step(0.55, hash(vec2(col, 3.0)));
      return trail * trail;
    }
    float pulse(vec2 c) {
      float r = length((c - uCells * 0.5) / uCells.y);
      float ring = smoothstep(0.8, 1.0, fract(r * 5.0 - uTime * 0.22));
      return ring * exp(-r * 1.6) + 0.04;
    }
    float scan(vec2 c, vec2 p) {
      float y = c.y / uCells.y;
      float band = smoothstep(0.75, 1.0, fract(y * 2.0 - uTime * 0.07));
      return band * 0.7 + fbm(p * 1.5 + uTime * 0.02) * 0.12;
    }
    void main() {
      vec2 c = vUv * uCells;
      vec2 p = c * uCell * uScale;
      vec2 drift = vec2(uTime * 0.035, uTime * 0.012);
      float v;
      if (uMode < 0.5) v = 0.0;
      else if (uMode < 1.5) v = terrain(p, drift);
      else if (uMode < 2.5) v = contours(p, drift);
      else if (uMode < 3.5) v = breathingGrid(c);
      else if (uMode < 4.5) v = stars(c);
      else if (uMode < 5.5) v = rain(c);
      else if (uMode < 6.5) v = pulse(c);
      else if (uMode < 7.5) v = scan(c, p);
      else v = 0.0;
      v = floor(clamp(v, 0.0, 1.0) * uLevels + 0.5) / uLevels;
      gl_FragColor = vec4(vec3(v), 1.0);
    }
  `,
};

export const ditherGlitchShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tField, tGrid;
    uniform float uGridOn;
    uniform vec2 uRes, uMouse;
    uniform float uDpr, uTime, uIntro, uCell, uDotScale, uMinLum, uBright, uBgStrength;
    uniform float uRipple, uRippleRadius, uRippleFreq;
    uniform float uGlitch, uSlices, uSliceShift, uSplit, uBlocks, uScan;
    varying vec2 vUv;

    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

    float cellLum(vec2 centerPx) {
      vec2 uv = clamp(centerPx / uRes, 0.0, 1.0);
      float lum = dot(texture2D(tDiffuse, uv).rgb, vec3(0.299, 0.587, 0.114));
      return max(lum, texture2D(tField, uv).r * uBgStrength);
    }

    void main() {
      vec2 px = vUv * uRes;
      float tick = floor(uTime * 18.0);

      float band = floor(vUv.y * uSlices);
      float sliceOn = step(1.0 - 0.35 * uGlitch, hash(vec2(band, tick)));
      px.x += (hash(vec2(band * 1.7, tick + 3.0)) - 0.5) * uSliceShift * uGlitch * sliceOn * uRes.x;

      vec2 grid = vec2(9.0, 6.0) + floor(hash(vec2(tick, 1.0)) * 6.0);
      vec2 blockId = floor(vUv * grid + vec2(hash(vec2(tick, 2.0)), hash(vec2(tick, 3.0))));
      float blockOn = step(1.0 - 0.18 * uBlocks * uGlitch, hash(blockId + tick * 0.37));
      px += (vec2(hash(blockId + 4.0), hash(blockId + 5.0)) - 0.5) * vec2(0.25, 0.08) * uRes * blockOn;

      float cell = uCell * uDpr;
      vec2 center = (floor(px / cell) + 0.5) * cell;
      vec2 local = (px - center) / cell;

      float d = length(center - uMouse * uRes) / uRes.y;
      float ripple = uRipple * exp(-d * uRippleRadius) * (0.7 + 0.3 * sin(d * uRippleFreq - uTime * 5.0));

      float split = cell * (1.0 + 2.0 * uGlitch + 3.0 * blockOn) * uSplit * step(0.02, uGlitch);
      vec3 lums = vec3(cellLum(center + vec2(split, 0.0)), cellLum(center), cellLum(center - vec2(split, 0.0)));

      vec3 col;
      for (int c = 0; c < 3; c++) {
        float lum = clamp(lums[c] + ripple * (0.25 + lums[c]), 0.0, 1.0);
        float r = clamp(sqrt(lum) * uDotScale, 0.0, 0.5);
        col[c] = smoothstep(r, r - 0.09, length(local)) * step(uMinLum, lum) * (0.42 + 0.5 * lum);
      }
      col = mix(vec3(col.g), col, step(0.02, uGlitch));

      if (uGridOn > 0.5) {
        vec2 guv = clamp(px / uRes, 0.0, 1.0);
        vec2 gs = vec2(split / uRes.x, 0.0);
        vec3 grid = vec3(texture2D(tGrid, guv + gs).r, texture2D(tGrid, guv).g, texture2D(tGrid, guv - gs).b);
        grid = mix(vec3(grid.g), grid, step(0.02, uGlitch));
        col = max(col, grid);
      }
      col *= 1.0 - uScan * uGlitch * step(0.5, fract(px.y / (3.0 * uDpr)));
      col *= uBright * uIntro;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export const gridShader = {
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uBright, uSize, uMajor, uLine;
    uniform vec3 uCam;
    uniform vec2 uAxes; // which world axes span the plane (0 = x, 1 = y, 2 = z)
    varying vec3 vWorld;
    float axis(vec3 v, float i) { return i < 0.5 ? v.x : (i < 1.5 ? v.y : v.z); }
    float line(float c, float width) {
      float d = abs(fract(c - 0.5) - 0.5) / fwidth(c);
      return 1.0 - min(d / width, 1.0);
    }
    void main() {
      vec2 q = vec2(axis(vWorld, uAxes.x), axis(vWorld, uAxes.y)) / uSize;
      float minor = max(line(q.x, uLine), line(q.y, uLine));
      float major = max(line(q.x / uMajor, uLine * 1.5), line(q.y / uMajor, uLine * 1.5));
      float fade = exp(-length(vWorld - uCam) * 0.045);
      float a = clamp(max(minor * 0.5, major * 0.9) * fade * uBright, 0.0, 1.0);
      gl_FragColor = vec4(vec3(1.0), a);
    }
  `,
};
