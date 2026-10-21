// Takes the game's 2D frame and finishes it on the GPU: bloom, chromatic aberration, scanlines, grain, vignette

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const BRIGHT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D src;
void main() {
  vec3 c = texture2D(src, uv).rgb;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(0.1, 0.65, l), 1.0);
}`;

const BLUR = `
precision mediump float;
varying vec2 uv;
uniform sampler2D src;
uniform vec2 dir;
void main() {
  vec3 c = texture2D(src, uv).rgb * 0.227027;
  c += (texture2D(src, uv + dir * 1.3846).rgb + texture2D(src, uv - dir * 1.3846).rgb) * 0.3162162;
  c += (texture2D(src, uv + dir * 3.2308).rgb + texture2D(src, uv - dir * 3.2308).rgb) * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE = `
precision mediump float;
varying vec2 uv;
uniform sampler2D scene;
uniform sampler2D bloom;
uniform vec2 res;
uniform float time;
uniform float split;
uniform float presence;
uniform float glitch;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // glitch: some horizontal bands slide sideways and the colour split jumps
  float tick = floor(time * 24.0);
  float band = floor(uv.y * 28.0);
  float torn = step(1.0 - glitch * 0.45, hash(vec2(band, tick)));
  vec2 st = uv + vec2((hash(vec2(tick, band)) - 0.5) * 0.12 * glitch * torn, 0.0);
  vec2 d = st - 0.5;
  vec2 off = d * split * (0.45 + dot(d, d) * 3.0) + vec2(0.012 * glitch * torn, 0.0);
  vec3 c = vec3(texture2D(scene, st - off).r, texture2D(scene, st).g, texture2D(scene, st + off).b);
  c += vec3(
    texture2D(bloom, st - off * 2.5).r,
    texture2D(bloom, st).g,
    texture2D(bloom, st + off * 2.5).b
  ) * 1.5;
  c *= 0.95 + 0.05 * sin(uv.y * res.y * 1.5708);
  // a faint darkening, only in the far corners
  float vignette = smoothstep(1.4, 0.7, length(d * vec2(res.x / res.y, 1.0)));
  c *= mix(1.0, vignette, presence * 0.25);
  c += (hash(uv * res + fract(time) * 97.0) - 0.5) * 0.06 * presence;
  c = clamp(c, 0.0, 1.0);
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
}`;

const BLOOM_DOWNSCALE = 4;
const BLUR_PASSES = [1, 2, 3.5];

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture };

export type Post = ReturnType<typeof createPost>;

export function createPost(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vert = shader(gl.VERTEX_SHADER, VERT);
  const program = (frag: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vert);
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    return p;
  };
  const bright = program(BRIGHT);
  const blur = program(BLUR);
  const composite = program(COMPOSITE);
  if (![bright, blur, composite].every((p) => gl.getProgramParameter(p, gl.LINK_STATUS))) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = () => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const scene = texture();
  const targets: Target[] = [0, 1].map(() => ({ fb: gl.createFramebuffer()!, tex: texture() }));
  let bw = 1;
  let bh = 1;

  const pass = (p: WebGLProgram, target: Target | null, uniforms: Record<string, number[]>) => {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fb ?? null);
    gl.viewport(0, 0, target ? bw : canvas.width, target ? bh : canvas.height);
    for (const [name, v] of Object.entries(uniforms)) {
      const at = gl.getUniformLocation(p, name);
      if (v.length === 1) gl.uniform1f(at, v[0]);
      else gl.uniform2f(at, v[0], v[1]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const sampler = (p: WebGLProgram, name: string, unit: number, tex: WebGLTexture) => {
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(p, name), unit);
  };

  return {
    resize(width: number, height: number) {
      canvas.width = width;
      canvas.height = height;
      bw = Math.max(1, Math.round(width / BLOOM_DOWNSCALE));
      bh = Math.max(1, Math.round(height / BLOOM_DOWNSCALE));
      for (const t of targets) {
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      }
    },
    render(
      frame: HTMLCanvasElement,
      { time, split, presence, glitch }: { time: number; split: number; presence: number; glitch: number },
    ) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);

      const [a, b] = targets;
      sampler(bright, 'src', 0, scene);
      pass(bright, a, {});
      for (const spread of BLUR_PASSES) {
        sampler(blur, 'src', 0, a.tex);
        pass(blur, b, { dir: [spread / bw, 0] });
        sampler(blur, 'src', 0, b.tex);
        pass(blur, a, { dir: [0, spread / bh] });
      }
      sampler(composite, 'scene', 0, scene);
      sampler(composite, 'bloom', 1, a.tex);
      pass(composite, null, {
        res: [canvas.width, canvas.height],
        time: [time],
        split: [split],
        presence: [presence],
        glitch: [glitch],
      });
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
