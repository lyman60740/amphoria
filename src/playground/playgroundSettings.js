/** Defaults for the free-clay studio. The home scene has its own settings. */
export const PLAYGROUND_SETTINGS = {
  tools: { tool: 'palm', size: 1, strength: .5, mode: 'push', angle: 0, orbit: false, spinning: false, speed: 6, direction: 1, light: 0, exposure: 1.12 },
  brushes: {
    palm: { label: 'Paume', radius: .62, aspect: .85, rate: .62 },
    finger: { label: 'Doigt', radius: .25, aspect: 1, rate: .72 },
    blade: { label: 'Tranche', radius: .52, aspect: .15, rate: .85 },
  },
  renderer: { maxPixelRatio: 1.75, background: '#d3d0c9' },
  camera: { fov: 33, position: [0, 3.0, 8.1], target: [0, 1.5, 0], minDistance: 4.5, maxDistance: 15 },
  material: { color: '#8b7766', roughness: .78, bumps: .2, cracks: 0, normalStrength: .22 },
  geometry: { latitudeSegments: 96, radialSegments: 128, radius: 1.4, centerY: 1.44, minRadius: .24, maxRadius: 2.7, floor: .04 },
  textures: { width: 512, height: 256, crackCells: 70, seed: 42 },
  historyLimit: 40,
}
