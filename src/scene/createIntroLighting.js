/** Lighting state driven by the GSAP intro; timing belongs to introTimeline.js. */
export function createIntroLighting({ settings, lights, scene, root, contact, shadows, pointers }) {
  const state = { key: 0, overhead: 0, ambient: 0, angle: 0 }
  let active = true

  function apply() {
    lights.key.intensity = settings.lights.key.intensity * state.key
    lights.overhead.intensity = settings.lights.overhead.intensity * state.overhead
    for (const name of ['hemisphere', 'bounce', 'fill']) {
      lights[name].intensity = settings.lights[name].intensity * state.ambient
    }
    // Rotate X/Z around the same pivot as the cursor, retaining each light's height.
    const pivot = settings.pointerLight.pivot
    const sin = Math.sin(state.angle)
    const cos = Math.cos(state.angle)
    for (const name of ['key', 'overhead', 'fill']) {
      const base = settings.lights[name].position
      const dx = base.x - pivot.x
      const dz = base.z - pivot.z
      lights[name].position.set(pivot.x + dx * cos + dz * sin, base.y, pivot.z + dz * cos - dx * sin)
    }
    scene.background.set(settings.background.color).multiplyScalar(state.ambient)
    root.style.backgroundColor = active ? '#000000' : settings.background.color
    contact.material.opacity = state.key
    shadows.key.opacity.value = settings.shadow.opacity * state.key
    shadows.overhead.opacity.value = settings.overheadShadow.opacity * state.overhead
  }

  function begin(angle) {
    active = true
    for (const pointer of pointers) pointer.reset()
    Object.assign(state, { key: 0, overhead: 0, ambient: 0, angle })
    apply()
  }

  function finish() {
    active = false
    Object.assign(state, { key: 1, overhead: 1, ambient: 1, angle: 0 })
    apply()
    // Discard mouse input collected during the reveal: no jump at the handoff.
    for (const pointer of pointers) pointer.reset()
  }

  apply() // Keep the studio dark while the GLB and fonts load.
  return { state, apply, begin, finish, get active() { return active } }
}
