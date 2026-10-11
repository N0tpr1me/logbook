// The page material: a plane bent by a vertex shader and shaded without
// shadow maps. Plan: What makes the paper feel real.
//
// Vertex: the bend from bend.ts (an arc whose tangent swings by `bend`
// radians from root to tip), tilted by uTilt about the grab row so a corner
// grab curls diagonally. The rigid rotation about the spine is applied on
// the mesh (so raycasts hit flat pages exactly); uTurn here only scales the
// bend envelope and tells the shadow logic which side the sheet lies on.
//
// Fragment: paper colour with a procedural 5 mm grid, ink from a texture
// (a greyscale ink mask coloured as ink so small text stays sharp, or a
// plain RGBA texture), a soft shadow on the stack beneath the turning page,
// brightening as the page faces the lamp, and a gutter shade at the spine.
// Double-sided: the back face shows the next page's content, mirrored.

import * as THREE from 'three'
import { BEND_MAX } from './bend'

export const PAPER_COLOUR = '#E6ECDF'
export const GRID_COLOUR = '#BFCDB8'
export const INK_COLOUR = '#1E2633'
export const COVER_COLOUR = '#23402F'
export const FOIL_COLOUR = '#C9B26A'
/** 5 mm grid, in world units. */
export const GRID_STEP = 0.005

/** Default lamp: warm, upper left, in front of the page (book frame). */
export const DEFAULT_LAMP_DIRECTION: readonly [number, number, number] = [-0.6, 0.35, 0.72]

export interface PageSide {
  texture: THREE.Texture
  /** True when the texture is a greyscale ink mask (white paper, dark ink). */
  inkMask: boolean
}

export interface PageMaterialUniforms {
  [uniform: string]: THREE.IUniform
  uTurn: THREE.IUniform<number>
  uCurl: THREE.IUniform<number>
  uTilt: THREE.IUniform<number>
  uGrab: THREE.IUniform<number>
  uSize: THREE.IUniform<THREE.Vector2>
  uFront: THREE.IUniform<THREE.Texture | null>
  uBack: THREE.IUniform<THREE.Texture | null>
  uFrontInk: THREE.IUniform<number>
  uBackInk: THREE.IUniform<number>
  uPaper: THREE.IUniform<THREE.Color>
  uGrid: THREE.IUniform<THREE.Color>
  uInk: THREE.IUniform<THREE.Color>
  uGridStep: THREE.IUniform<number>
  uGridOpacity: THREE.IUniform<number>
  /** 1 when the front face's texture is rotated half a turn (an endpaper mounted face-in). */
  uFlipFront: THREE.IUniform<number>
  /** Shared across sheets: the turning sheet's angle in radians, or -1 when none turns. */
  uShadow: THREE.IUniform<number>
  /** Shared across sheets: lamp direction in world space. */
  uLampDir: THREE.IUniform<THREE.Vector3>
  uAmbient: THREE.IUniform<number>
  uLamp: THREE.IUniform<number>
}

/** Uniforms every sheet shares, so one update reaches all of them. */
export interface SharedPageUniforms {
  uShadow: THREE.IUniform<number>
  uLampDir: THREE.IUniform<THREE.Vector3>
  uAmbient: THREE.IUniform<number>
  uLamp: THREE.IUniform<number>
}

export function createSharedPageUniforms(): SharedPageUniforms {
  return {
    uShadow: { value: -1 },
    uLampDir: { value: new THREE.Vector3(...DEFAULT_LAMP_DIRECTION).normalize() },
    uAmbient: { value: 0.42 },
    uLamp: { value: 0.66 },
  }
}

const vertexShader = /* glsl */ `
  uniform float uTurn;
  uniform float uCurl;
  uniform float uTilt;
  uniform float uGrab;
  uniform vec2 uSize;

  varying vec2 vUv;
  varying vec2 vPage;
  varying vec3 vBent;
  varying vec3 vNormalW;

  const float PI = 3.14159265;
  const float BEND_MAX = ${BEND_MAX.toFixed(4)};

  void main() {
    vUv = uv;
    vPage = position.xy;

    float theta = uTurn * PI;
    float bend = uCurl * BEND_MAX * sin(theta);
    float ct = cos(uTilt);
    float st = sin(uTilt);
    float grabY = (uGrab - 0.5) * uSize.y;

    // Tangent angle phi(s) = a + k s: flat at the root (the binding holds it),
    // swung by the bend at the tip, and shifted along y by the tilt.
    float a = bend * st * (position.y - grabY) / uSize.y;
    float k = bend * ct / uSize.x;
    float s = position.x;
    float phi = a + k * s;

    vec3 bent;
    if (abs(k) < 1e-4) {
      bent = vec3(s * cos(a), position.y, s * sin(a));
    } else {
      bent = vec3((sin(phi) - sin(a)) / k, position.y, -(cos(phi) - cos(a)) / k);
    }

    float ay = bend * st / uSize.y;
    vec3 n = normalize(vec3(-sin(phi), -ay * (bent.z * sin(phi) + bent.x * cos(phi)), cos(phi)));

    vBent = bent;
    vNormalW = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(bent, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTurn;
  uniform vec2 uSize;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uFrontInk;
  uniform float uBackInk;
  uniform vec3 uPaper;
  uniform vec3 uGrid;
  uniform vec3 uInk;
  uniform float uGridStep;
  uniform float uGridOpacity;
  uniform float uFlipFront;
  uniform float uShadow;
  uniform vec3 uLampDir;
  uniform float uAmbient;
  uniform float uLamp;

  varying vec2 vUv;
  varying vec2 vPage;
  varying vec3 vBent;
  varying vec3 vNormalW;

  const float HALF_PI = 1.5707963;

  vec3 paperWithGrid() {
    vec2 g = vPage / uGridStep;
    vec2 fw = max(fwidth(g), vec2(1e-5));
    vec2 aa = abs(fract(g - 0.5) - 0.5) / fw;
    float line = 1.0 - min(min(aa.x, aa.y), 1.0);
    // Let the grid fade out as it gets denser than the pixels can show.
    float fade = clamp(1.6 - max(fw.x, fw.y) * 4.0, 0.0, 1.0);
    return mix(uPaper, uGrid, line * uGridOpacity * fade);
  }

  float turningPageShadow() {
    bool isFlat = uTurn <= 0.0005 || uTurn >= 0.9995;
    if (uShadow < 0.0 || !isFlat) return 0.0;
    bool onRight = uTurn < 0.5;
    bool over = onRight ? (uShadow < HALF_PI) : (uShadow > HALF_PI);
    if (!over) return 0.0;
    float height = sin(uShadow);
    float covered = abs(cos(uShadow)) * uSize.x;
    float penumbra = 0.012 + 0.11 * height;
    float edge = 1.0 - smoothstep(covered - 0.3 * penumbra, covered + penumbra, vBent.x);
    return edge * (0.18 + 0.2 * height);
  }

  void main() {
    bool front = gl_FrontFacing;
    vec2 st = front ? (uFlipFront > 0.5 ? vec2(1.0 - vUv.x, 1.0 - vUv.y) : vUv) : vec2(1.0 - vUv.x, vUv.y);

    vec4 texFront = texture2D(uFront, st);
    vec4 texBack = texture2D(uBack, st);
    vec4 tex = front ? texFront : texBack;
    float isInk = front ? uFrontInk : uBackInk;

    vec3 paper = paperWithGrid();
    float coverage = isInk > 0.5 ? (1.0 - tex.r) : tex.a;
    vec3 inkColour = isInk > 0.5 ? uInk : tex.rgb;
    vec3 colour = mix(paper, inkColour, coverage);

    vec3 n = normalize(vNormalW) * (front ? 1.0 : -1.0);
    float wrap = clamp(dot(n, uLampDir) * 0.5 + 0.5, 0.0, 1.0);
    float light = uAmbient + uLamp * wrap;

    float nx = vPage.x / uSize.x;
    light *= 1.0 - 0.12 * (1.0 - smoothstep(0.0, 0.1, nx));
    light *= 1.0 - turningPageShadow();

    gl_FragColor = vec4(colour * light, 1.0);
    #include <colorspace_fragment>
  }
`

export interface PageMaterialOptions {
  width: number
  height: number
  front: PageSide
  back: PageSide
  shared: SharedPageUniforms
  /** Draw the 5 mm grid (off for blank endpapers). */
  grid?: boolean
  /** Rotate the front texture half a turn: for the front endpaper, whose plane faces into the cover. */
  flipFront?: boolean
}

/** Default strength of the grid lines. */
export const GRID_OPACITY = 0.85

let blankTexture: THREE.Texture | null = null

/** A 1x1 transparent texture: plain paper with nothing printed on it. */
export function blankPageSide(): PageSide {
  if (!blankTexture) {
    blankTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat)
    blankTexture.colorSpace = THREE.SRGBColorSpace
    blankTexture.needsUpdate = true
  }
  return { texture: blankTexture, inkMask: false }
}

export type PageMaterial = THREE.ShaderMaterial & { uniforms: PageMaterialUniforms }

/** A page material. Sheets share one geometry; each has its own uniforms. */
export function createPageMaterial(options: PageMaterialOptions): PageMaterial {
  const uniforms: PageMaterialUniforms = {
    uTurn: { value: 0 },
    uCurl: { value: 0 },
    uTilt: { value: 0 },
    uGrab: { value: 0.5 },
    uSize: { value: new THREE.Vector2(options.width, options.height) },
    uFront: { value: options.front.texture },
    uBack: { value: options.back.texture },
    uFrontInk: { value: options.front.inkMask ? 1 : 0 },
    uBackInk: { value: options.back.inkMask ? 1 : 0 },
    uPaper: { value: new THREE.Color(PAPER_COLOUR) },
    uGrid: { value: new THREE.Color(GRID_COLOUR) },
    uInk: { value: new THREE.Color(INK_COLOUR) },
    uGridStep: { value: GRID_STEP },
    uGridOpacity: { value: options.grid === false ? 0 : GRID_OPACITY },
    uFlipFront: { value: options.flipFront ? 1 : 0 },
    uShadow: options.shared.uShadow,
    uLampDir: options.shared.uLampDir,
    uAmbient: options.shared.uAmbient,
    uLamp: options.shared.uLamp,
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: 0,
  })
  return material as PageMaterial
}

/** Draw the turning sheet slightly forward so it never flickers into its neighbours. */
export function setDrawnForward(material: PageMaterial, forward: boolean): void {
  const factor = forward ? -2 : 0
  if (material.polygonOffsetFactor !== factor) {
    material.polygonOffsetFactor = factor
    material.polygonOffsetUnits = factor
  }
}
