import * as THREE from 'three'

/** Orbit around the vase at a constant radius; never mutate the configured base. */
export function createPointerLight(root, light, basePosition, settings) {
  const pointer = new THREE.Vector2()
  let angleOffset = 0
  let heightOffset = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  function center() { pointer.set(0, 0) }
  function onMove(event) {
    if (event.pointerType !== 'mouse' || !settings.enabled) return
    if (event.target.closest?.('dialog, input, textarea, select, .lil-gui')) return
    const bounds = root.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    pointer.set(
      THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1),
      THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height * 2, -1, 1),
    )
  }
  root.addEventListener('pointermove', onMove, { passive: true })
  root.addEventListener('pointerleave', center)
  window.addEventListener('blur', center)
  reducedMotion.addEventListener('change', center)

  function update(deltaSeconds) {
    const active = settings.enabled && !(settings.respectReducedMotion && reducedMotion.matches)
    const desiredAngle = active ? pointer.x * THREE.MathUtils.degToRad(settings.sweepDegrees / 2) : 0
    const desiredHeight = active ? pointer.y * settings.amplitudeY : 0
    // Damp the angle, not XYZ: interpolation along a chord would shrink the radius.
    const alpha = settings.smoothing <= 0 ? 1 : -Math.expm1(-deltaSeconds / settings.smoothing)
    angleOffset = THREE.MathUtils.lerp(angleOffset, desiredAngle, alpha)
    heightOffset = THREE.MathUtils.lerp(heightOffset, desiredHeight, alpha)
    if (Math.abs(angleOffset - desiredAngle) < settings.settleEpsilon) angleOffset = desiredAngle
    if (Math.abs(heightOffset - desiredHeight) < settings.settleEpsilon) heightOffset = desiredHeight
    const dx = basePosition.x - settings.pivot.x
    const dz = basePosition.z - settings.pivot.z
    const radius = Math.hypot(dx, dz)
    const angle = Math.atan2(dx, dz) + angleOffset
    light.position.set(
      settings.pivot.x + Math.sin(angle) * radius,
      Math.max(settings.minHeight, basePosition.y + heightOffset),
      settings.pivot.z + Math.cos(angle) * radius,
    )
  }
  function reset() {
    center()
    angleOffset = heightOffset = 0
    light.position.copy(basePosition)
  }
  return {
    update, center, reset,
    dispose() {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', center)
      window.removeEventListener('blur', center)
      reducedMotion.removeEventListener('change', center)
    },
  }
}
