import * as THREE from 'three'

/** One continuous floor → quarter-circle cove → vertical wall, with analytic normals. */
export function createCycloramaGeometry(settings) {
  const { size, curveStartZ, curveRadius, curveSegments, wallHeight } = settings
  const profile = [{ z: size / 2, y: 0, ny: 1, nz: 0 }]
  for (let i = 0; i <= curveSegments; i++) {
    const angle = (i / curveSegments) * Math.PI / 2
    profile.push({
      z: curveStartZ - curveRadius * Math.sin(angle),
      y: curveRadius * (1 - Math.cos(angle)),
      ny: Math.cos(angle), nz: Math.sin(angle),
    })
  }
  profile.push({ z: curveStartZ - curveRadius, y: Math.max(wallHeight, curveRadius), ny: 0, nz: 1 })
  const positions = [], normals = [], uvs = [], indices = []
  for (let row = 0; row < profile.length; row++) {
    const point = profile[row]
    for (const side of [-1, 1]) {
      positions.push(side * size / 2, point.y, point.z)
      normals.push(0, point.ny, point.nz)
      uvs.push((side + 1) / 2, row / (profile.length - 1))
    }
    if (row < profile.length - 1) {
      const a = row * 2
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}
