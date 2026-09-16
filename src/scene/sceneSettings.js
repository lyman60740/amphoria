/**
 * SINGLE SOURCE OF TRUTH for the 3D studio (no animation settings here).
 * Edit these defaults, then reload. lil-gui edits an independent live copy.
 * Intro timings remain in src/animations/introTimeline.js.
 * Colors are sRGB hex unless explicitly marked as linear RGB.
 */
export const SCENE_SETTINGS = {
  renderer: {
    antialias: true,
    powerPreference: 'high-performance',
    maxPixelRatio: 1.75,
    exposure: 0.92,
    toneMapping: 'ACESFilmicToneMapping',
    outputColorSpace: 'srgb',
  },

  background: {
    // Shared by the clear background and the visible studio floor.
    color: '#8c8c8c',
  },
  floor: {
    size: 200,
    // Seamless studio sweep behind the vase; all dimensions are scene units.
    curveStartZ: -1.8,
    curveRadius: 4.9,
    curveSegments: 96,
    wallHeight: 8,
    height: -0.008,
    roughness: 1,
    metalness: 0,
    gradient: { leftBrightness: 1.0, rightBrightness: 0.72, startX: -7, endX: 7 },
  },

  model: {
    path: 'models/amphoria-vase.draco.glb',
    height: 3.92,
    dracoPath: 'draco/',
    decoderWorkers: 2,
  },
  material: {
    // null = use the color embedded in the GLB, multiplied by colorLift.
    // Set a hex string to choose an explicit color instead (no lift applied).
    color: "#646568",
    colorLift: 2.15,
    roughness: 0.92,
    specularIntensity: 0.25,
  },

  camera: {
    position: { x: 0, y: 4.38, z: 20 },
    target: { x: 0, y: 1.8, z: 0 },
    zoom: 1,
    near: 0.1,
    far: 80,
    viewHeight: 7.1,
    narrowViewHeight: 7.8,
    narrowAspect: 0.7,
  },
  controls: {
    enabled: false,
    enableDamping: true,
    dampingFactor: 0.08,
    minDistance: 5,
    maxDistance: 30,
    minZoom: 0.6,
    maxZoom: 2.4,
    maxPolarAngle: Math.PI * 0.49,
  },

  lights: {
    hemisphere: { skyColor: '#eeece9', groundColor: '#77716c', intensity: 1.5 },
    bounce: { color: '#ffffff', intensity: 0.7 },
    key: {
      color: '#fff8ef', intensity: 2.6,
      position: { x: -8, y: 2.9, z: 16.9 },
      target: { x: 0, y: 0, z: 0 },
    },
    overhead: {
      enabled: true, color: '#fff8ef', intensity: 2.45,
      position: { x: -6.8, y: 5.9, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    },
    fill: { color: '#dde1e5', intensity: 0.3, position: { x: 4, y: 3, z: -3 } },
  },

  pointerLight: {
    enabled: true,
    // Full left-to-right arc, centered on lights.key.position.
    sweepDegrees: 180,
    pivot: { x: 0, z: 0 },
    amplitudeY: 1.2,
    // Time constant in seconds: higher = softer/slower; 0 = immediate.
    smoothing: 0.45,
    minHeight: 0.3,
    respectReducedMotion: true,
    maxDeltaSeconds: 0.1,
    settleEpsilon: 0.0001,
    // Update shadows every moving frame, including the final damping steps.
    shadowPositionEpsilon: 0.000001,
  },

  ring: {
    color: '#353532',
    opacity: 0.75,
    segments: 1536,
    tiltDegrees: 21,
    rotationDegrees: 17,
    // Start on the rear arc, centered behind the vase (projected X = 0).
    startAngleDegrees: 83.74738059888892,
    position: { x: 0, y: 1.9, z: 0 },
    radius: 3.65,
    minRadius: 1.8,
    viewportWidthRatio: 0.55,
    // Reflect depth relative to the reference camera: swap front/back arcs
    // while keeping exactly the same projected ellipse from that camera.
    reverseDepth: true,
  },

  shadow: {
    resolution: 512,
    opacity: 0.8,
    softness: 1.55,
    // The curved receiver now provides the vertical spread naturally.
    spread: { x: 1.95, z: 1.15 },
    colorLinear: [0.12, 0.105, 0.09],
    surfaceOffset: 0.002,
    cameraExtent: 7,
    cameraNear: 0.1,
    cameraFar: 30,
    target: { x: 0, y: 1.2, z: 0 },
    blurRadius: 32,
    blurSigma: 14,
  },
  overheadShadow: {
    resolution: 512, opacity: 0.22, softness: 1.65,
    spread: { x: 1, z: 1 },
    colorLinear: [0.12, 0.105, 0.09], surfaceOffset: 0.004,
    cameraExtent: 5, cameraNear: 0.1, cameraFar: 50,
    target: { x: 0, y: 0, z: 0 },
    blurRadius: 32, blurSigma: 14,
  },
  contactShadow: {
    resolution: 128,
    innerRadius: 5,
    size: [1.8, 1.3],
    position: { x: 0.12, y: 0.003, z: -0.06 },
    stops: [
      [0, 'rgba(20,18,16,0.5)'],
      [0.3, 'rgba(20,18,16,0.24)'],
      [1, 'rgba(20,18,16,0)'],
    ],
  },

  gui: {
    title: 'Amphoria · Studio',
    ranges: {
      exposure: [0.4, 1.6, 0.01],
      keyIntensity: [0, 6, 0.05],
      ambientIntensity: [0, 3, 0.05],
      lightHorizontal: [-8, 20, 0.1],
      lightHeight: [2, 10, 0.1],
      shadowSoftness: [0.2, 4, 0.05],
      shadowSpread: [0.5, 5, 0.05],
      shadowOpacity: [0, 0.8, 0.01],
      curveStart: [-10, -0.5, 0.05],
      curveRadius: [1, 6, 0.05],
      wallHeight: [8, 40, 1],
      pointerSweep: [0, 360, 1],
      overheadHeight: [4, 25, 0.1],
      pointerAmplitude: [0, 20, 0.1],
      pointerSmoothing: [0, 20, 0.01],
    },
  },
}
