import * as THREE from 'three'

/** A circle with real depth, reflected to swap its front and rear arcs. */
export function createOrbitRing(settings, referenceCamera) {
  const { segments } = settings
  const points = []
  const tilt = THREE.MathUtils.degToRad(settings.tiltDegrees)
  const rotation = THREE.MathUtils.degToRad(settings.rotationDegrees)
  const startAngle = THREE.MathUtils.degToRad(settings.startAngleDegrees)
  const cameraNormal = new THREE.Vector3().copy(referenceCamera.position)
    .sub(referenceCamera.target).normalize()
  const zAxis = new THREE.Vector3(0, 0, 1)
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (i / segments) * Math.PI * 2
    const point = new THREE.Vector3(
      Math.cos(angle), Math.sin(angle) * Math.sin(tilt), Math.sin(angle) * Math.cos(tilt),
    ).applyAxisAngle(zAxis, rotation)
    // Reflection reverses camera-space depth without moving the projected point.
    if (settings.reverseDepth) point.reflect(cameraNormal)
    points.push(point)
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setDrawRange(0, 0)
  const material = new THREE.LineBasicMaterial({
    color: settings.color, opacity: settings.opacity, transparent: true,
    depthTest: true, depthWrite: false, toneMapped: false,
  })
  const line = new THREE.Line(geometry, material)
  line.name = 'Amphoria · orbit ring'
  line.position.copy(settings.position)
  line.scale.setScalar(settings.radius)
  const draw = { progress: 0 }
  function updateDraw() {
    const progress = THREE.MathUtils.clamp(draw.progress, 0, 1)
    geometry.setDrawRange(0, progress === 0 ? 0 : Math.floor(progress * segments) + 1)
  }
  function resize(viewWidth) {
    line.scale.setScalar(THREE.MathUtils.clamp(
      viewWidth * settings.viewportWidthRatio, settings.minRadius, settings.radius,
    ))
  }
  return { line, draw, updateDraw, resize }
}
