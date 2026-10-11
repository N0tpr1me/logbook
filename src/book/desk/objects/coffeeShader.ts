// The coffee surface: a disc whose shader draws black coffee with a thin
// crema ring and faint streaks, twists them into a swirl while the spoon
// stirs, and spreads a ripple ring when the spoon dips (plan: The coffee mug,
// in detail).

import { Color, type IUniform, ShaderMaterial, Vector2 } from 'three'

export interface CoffeeUniforms {
  [uniform: string]: IUniform
  uSwirl: { value: number }
  uRipple: { value: number }
  uLight: { value: number }
  uLampDir: { value: Vector2 }
  uCoffee: { value: Color }
  uCrema: { value: Color }
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uSwirl;
  uniform float uRipple;
  uniform float uLight;
  uniform vec2 uLampDir;
  uniform vec3 uCoffee;
  uniform vec3 uCrema;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float theta = atan(p.y, p.x);
    // Swirl: the twist is strongest at the centre and fades to the rim.
    float twist = uSwirl * 6.0 * pow(1.0 - r, 1.4);
    float t = theta + twist;
    vec2 q = vec2(cos(t), sin(t)) * r;

    // Crema: a thin ring near the rim, broken up by noise, plus faint streaks.
    float ringNoise = noise(vec2(t * 2.2, r * 9.0)) * 0.08;
    float ring = smoothstep(0.80 + ringNoise, 0.90 + ringNoise, r) * (1.0 - smoothstep(0.96, 1.0, r));
    float streak = noise(q * 7.0 + 3.0) * noise(q * 19.0 - 2.0);
    streak = smoothstep(0.30, 0.52, streak) * 0.55 * (1.0 - smoothstep(0.75, 0.95, r));
    // Streaks gather into spiral arms while stirring.
    float arms = 0.5 + 0.5 * sin(t * 3.0 + r * 9.0);
    streak *= mix(1.0, arms * 1.6, clamp(uSwirl, 0.0, 1.0));
    float crema = clamp(ring * 0.9 + streak, 0.0, 1.0);

    // Ripple ring from the spoon dip.
    float rippleRadius = uRipple;
    float ripple = exp(-pow((r - rippleRadius) / 0.06, 2.0)) * (1.0 - uRipple) * step(0.001, uRipple);

    // Lamp reflection: a soft highlight offset towards the lamp.
    vec2 toLamp = p - uLampDir * 0.45;
    float highlight = exp(-dot(toLamp, toLamp) * 9.0) * (0.22 + 0.18 * uLight);
    highlight += ripple * 0.35;

    vec3 colour = mix(uCoffee, uCrema, crema);
    colour += vec3(1.0, 0.92, 0.8) * highlight;
    colour *= 1.0 - 0.18 * smoothstep(0.86, 1.0, r); // the wall's shadow at the rim
    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function createCoffeeMaterial(): ShaderMaterial & { uniforms: CoffeeUniforms } {
  const uniforms: CoffeeUniforms = {
    uSwirl: { value: 0 },
    uRipple: { value: 0 },
    uLight: { value: 0 },
    uLampDir: { value: new Vector2(-0.6, 0.8) },
    uCoffee: { value: new Color('#120B08') },
    uCrema: { value: new Color('#7A5636') },
  }
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms })
  return material as ShaderMaterial & { uniforms: CoffeeUniforms }
}
