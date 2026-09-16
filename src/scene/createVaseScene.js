import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { createSoftShadow } from './softShadow'
import { createOrbitRing } from './createOrbitRing'
import { createCycloramaGeometry } from './createCycloramaGeometry'
import { createIntroLighting } from './createIntroLighting'
import { createPointerLight } from './createPointerLight'
import { SCENE_SETTINGS } from './sceneSettings'

const BASE = import.meta.env.BASE_URL
// Explicit lookup keeps unused Three.js exports out of the production bundle.
const TONE_MAPPINGS = {
  ACESFilmicToneMapping: THREE.ACESFilmicToneMapping,
  AgXToneMapping: THREE.AgXToneMapping,
  NeutralToneMapping: THREE.NeutralToneMapping,
  NoToneMapping: THREE.NoToneMapping,
}

export function createVaseScene(canvas, { onReady, onError, onReplayIntro }) {
  // GUI edits this copy, so reloads and new scenes start from the declared defaults.
  const settings = structuredClone(SCENE_SETTINGS)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(settings.background.color)
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: settings.renderer.antialias,
    powerPreference: settings.renderer.powerPreference,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.renderer.maxPixelRatio))
  renderer.outputColorSpace = settings.renderer.outputColorSpace
  renderer.toneMapping = TONE_MAPPINGS[settings.renderer.toneMapping] ?? THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = settings.renderer.exposure

  const halfHeight = settings.camera.viewHeight / 2
  const camera = new THREE.OrthographicCamera(-halfHeight, halfHeight, halfHeight, -halfHeight, settings.camera.near, settings.camera.far)
  const controls = new OrbitControls(camera, canvas)
  Object.assign(controls, settings.controls)
  controls.target.copy(settings.camera.target)
  canvas.style.touchAction = settings.controls.enabled ? 'none' : 'pan-y'

  const hemi = new THREE.HemisphereLight(settings.lights.hemisphere.skyColor, settings.lights.hemisphere.groundColor, settings.lights.hemisphere.intensity)
  const bounce = new THREE.AmbientLight(settings.lights.bounce.color, settings.lights.bounce.intensity)
  const key = new THREE.DirectionalLight(settings.lights.key.color, settings.lights.key.intensity)
  key.position.copy(settings.lights.key.position)
  key.target.position.copy(settings.lights.key.target)
  const fill = new THREE.DirectionalLight(settings.lights.fill.color, settings.lights.fill.intensity)
  fill.position.copy(settings.lights.fill.position)
  const overhead = new THREE.DirectionalLight(settings.lights.overhead.color, settings.lights.overhead.intensity)
  overhead.position.copy(settings.lights.overhead.position)
  overhead.target.position.copy(settings.lights.overhead.target)
  overhead.visible = settings.lights.overhead.enabled
  scene.add(hemi, bounce, key, key.target, fill, overhead, overhead.target)

  const floor = new THREE.Mesh(
    createCycloramaGeometry(settings.floor),
    new THREE.MeshStandardMaterial({ color: settings.background.color, roughness: settings.floor.roughness, metalness: settings.floor.metalness }),
  )
  floor.material.onBeforeCompile = shader => {
    const gradient = settings.floor.gradient
    shader.uniforms.studioGradient = { value: new THREE.Vector4(gradient.leftBrightness, gradient.rightBrightness, gradient.startX, gradient.endX) }
    shader.vertexShader = 'varying vec3 studioPosition;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nstudioPosition = (modelMatrix * vec4(position, 1.0)).xyz;')
    shader.fragmentShader = 'varying vec3 studioPosition;\nuniform vec4 studioGradient;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(studioGradient.x, studioGradient.y, smoothstep(studioGradient.z, studioGradient.w, studioPosition.x));')
  }
  floor.position.y = settings.floor.height
  scene.add(floor)

  const root = canvas.parentElement
  const originalBackground = root.style.backgroundColor
  function applyBackground() {
    // The studio floor fills the frame: update it as well as scene.background.
    scene.background.setStyle(settings.background.color, THREE.SRGBColorSpace)
    floor.material.color.setStyle(settings.background.color, THREE.SRGBColorSpace)
    root.style.backgroundColor = settings.background.color
  }
  applyBackground()

  const shadowCanvas = document.createElement('canvas')
  const contactSettings = settings.contactShadow
  shadowCanvas.width = shadowCanvas.height = contactSettings.resolution
  const ctx = shadowCanvas.getContext('2d')
  const midpoint = contactSettings.resolution / 2
  const gradient = ctx.createRadialGradient(midpoint, midpoint, contactSettings.innerRadius, midpoint, midpoint, midpoint)
  for (const [position, color] of contactSettings.stops) gradient.addColorStop(position, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, contactSettings.resolution, contactSettings.resolution)
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(...contactSettings.size),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false }),
  )
  contact.rotation.x = -Math.PI / 2
  contact.position.copy(contactSettings.position)
  scene.add(contact)

  const orbit = createOrbitRing(settings.ring, settings.camera)
  scene.add(orbit.line)
  // Both captures exclude every receiver so shadows never cast shadows themselves.
  const shadowExclusions = [floor, contact, orbit.line]
  const softShadow = createSoftShadow(renderer, scene, key, shadowExclusions, settings.shadow, floor)
  const overheadShadow = createSoftShadow(renderer, scene, overhead, shadowExclusions, settings.overheadShadow, floor)
  shadowExclusions.push(softShadow.mesh, overheadShadow.mesh)
  overheadShadow.mesh.visible = settings.lights.overhead.enabled && overhead.intensity > 0
  const pointerLight = createPointerLight(root, key, settings.lights.key.position, settings.pointerLight)
  const overheadPointerLight = createPointerLight(root, overhead, settings.lights.overhead.position, settings.pointerLight)
  function centerPointerLights() {
    pointerLight.center()
    overheadPointerLight.center()
  }
  const lighting = createIntroLighting({
    settings, scene, root, contact,
    lights: { key, overhead, fill, hemisphere: hemi, bounce },
    shadows: { key: softShadow, overhead: overheadShadow },
    pointers: [pointerLight, overheadPointerLight],
  })
  let vaseLoaded = false
  let lastFrameTime = performance.now()
  const shadowPosition = key.position.clone()
  const overheadShadowPosition = overhead.position.clone()
  function refreshShadow() {
    softShadow.update()
    if (overheadShadow.mesh.visible) overheadShadow.update()
    overheadShadowPosition.copy(overhead.position)
    shadowPosition.copy(key.position)
  }
  const draco = new DRACOLoader()
  draco.setDecoderPath(`${BASE}${settings.model.dracoPath}`)
  draco.setWorkerLimit(settings.model.decoderWorkers)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  let disposed = false
  let frame
  let visible = true
  let gui
  const vaseMaterials = new Map()

  function disposeObject(rootObject) {
    const textures = new Set()
    const materials = new Set()
    rootObject.traverse(object => {
      object.geometry?.dispose()
      if (object.material) for (const material of [].concat(object.material)) materials.add(material)
    })
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
      material.dispose()
    }
    for (const texture of textures) texture.dispose()
  }
  loader.load(`${BASE}${settings.model.path}`, gltf => {
    if (disposed) { disposeObject(gltf.scene); return }
    const vase = gltf.scene
    const bounds = new THREE.Box3().setFromObject(vase)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const scale = settings.model.height / size.y
    vase.scale.multiplyScalar(scale)
    vase.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    vase.traverse(object => {
      if (!object.isMesh) return
      for (const material of [].concat(object.material)) {
        if (vaseMaterials.has(material)) continue
        if (settings.material.color === null) material.color.multiplyScalar(settings.material.colorLift)
        else material.color.setStyle(settings.material.color, THREE.SRGBColorSpace)
        vaseMaterials.set(material, material.color.clone())
        material.roughness = settings.material.roughness
        if ('specularIntensity' in material) material.specularIntensity = settings.material.specularIntensity
      }
    })
    scene.add(vase)
    settings.material.color = `#${vaseMaterials.values().next().value.getHexString(THREE.SRGBColorSpace)}`
    vaseLoaded = true
    refreshShadow()
    // initGui()
    onReady?.()
  }, undefined, error => { if (!disposed) onError?.(error) })

  function resetCamera() {
    camera.position.copy(settings.camera.position)
    camera.zoom = settings.camera.zoom
    controls.target.copy(settings.camera.target)
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()
    controls.update()
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    const aspect = width / height
    const viewHeight = aspect < settings.camera.narrowAspect ? settings.camera.narrowViewHeight : settings.camera.viewHeight
    orbit.resize(viewHeight * aspect)
    camera.left = -viewHeight * aspect / 2
    camera.right = viewHeight * aspect / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resetCamera()
  resize()
  function animate(now = performance.now()) {
    if (disposed || !visible) return
    const delta = Math.min(Math.max((now - lastFrameTime) / 1000, 0), settings.pointerLight.maxDeltaSeconds)
    lastFrameTime = now
    if (lighting.active) lighting.apply()
    else {
      pointerLight.update(delta)
      overheadPointerLight.update(delta)
    }
    const shadowMoved = key.position.distanceToSquared(shadowPosition) > settings.pointerLight.shadowPositionEpsilon ** 2
    const overheadShadowMoved = overheadShadow.mesh.visible && overhead.position.distanceToSquared(overheadShadowPosition) > settings.pointerLight.shadowPositionEpsilon ** 2
    // Capture after light damping, before rendering: no 24 Hz stepping at 120 FPS.
    // Each shadow stops updating independently once its light has settled.
    if (vaseLoaded && shadowMoved) {
      softShadow.update()
      shadowPosition.copy(key.position)
    }
    if (vaseLoaded && overheadShadowMoved) {
      overheadShadow.update()
      overheadShadowPosition.copy(overhead.position)
    }
    controls.update()
    renderer.render(scene, camera)
    frame = requestAnimationFrame(animate)
  }
  function visibilityChange() {
    visible = !document.hidden
    cancelAnimationFrame(frame)
    lastFrameTime = performance.now()
    if (!visible) centerPointerLights()
    if (visible) animate()
  }
  document.addEventListener('visibilitychange', visibilityChange)
  animate()

  function setOrbit(enabled) {
    settings.controls.enabled = enabled
    controls.enabled = enabled
    canvas.style.touchAction = enabled ? 'none' : 'pan-y'
  }
  function updateKeyPosition() {
    pointerLight.reset()
    refreshShadow()
  }
  function rebuildCyclorama() {
    const previousGeometry = floor.geometry
    floor.geometry = createCycloramaGeometry(settings.floor)
    softShadow.setReceiverGeometry(floor)
    overheadShadow.setReceiverGeometry(floor)
    previousGeometry.dispose()
  }
  async function initGui() {
    const { default: GUI } = await import('lil-gui')
    if (disposed || gui) return
    gui = new GUI({ title: settings.gui.title })
    const ranges = settings.gui.ranges
    const materialFolder = gui.addFolder('Material')
    const colorController = materialFolder.addColor(settings.material, 'color').name('Vase color').onChange(value => {
      for (const material of vaseMaterials.keys()) material.color.setStyle(value, THREE.SRGBColorSpace)
    })
    materialFolder.add({ resetColor() {
      for (const [material, initialColor] of vaseMaterials) material.color.copy(initialColor)
      settings.material.color = `#${vaseMaterials.values().next().value.getHexString(THREE.SRGBColorSpace)}`
      colorController.updateDisplay()
    } }, 'resetColor').name('Reset color')
    gui.addColor(settings.background, 'color').name('Background color').onChange(applyBackground)
    const pointerFolder = gui.addFolder('Cursor light')
    pointerFolder.add(settings.pointerLight, 'enabled').name('Enable interaction').onChange(centerPointerLights)
    pointerFolder.add(settings.pointerLight, 'sweepDegrees', ...ranges.pointerSweep).name('Sweep (degrees)')
    pointerFolder.add(settings.pointerLight, 'amplitudeY', ...ranges.pointerAmplitude).name('Amplitude Y')
    pointerFolder.add(settings.pointerLight, 'smoothing', ...ranges.pointerSmoothing).name('Smoothing (s)')
    gui.add(settings.controls, 'enabled').name('Orbit controls').listen().onChange(setOrbit)
    gui.add(settings.renderer, 'exposure', ...ranges.exposure).name('Exposure').onChange(value => { renderer.toneMappingExposure = value })
    gui.add(settings.lights.key, 'intensity', ...ranges.keyIntensity).name('Key light').onChange(value => { key.intensity = value })
    gui.add(settings.lights.hemisphere, 'intensity', ...ranges.ambientIntensity).name('Ambient light').onChange(value => { hemi.intensity = value })
    gui.add(settings.lights.key.position, 'x', ...ranges.lightHorizontal).name('Light · X').onChange(updateKeyPosition)
    gui.add(settings.lights.key.position, 'y', ...ranges.lightHeight).name('Light · height').onChange(updateKeyPosition)
    gui.add(settings.lights.key.position, 'z', ...ranges.lightHorizontal).name('Light · Z').onChange(updateKeyPosition)
    gui.add(settings.shadow, 'softness', ...ranges.shadowSoftness).name('Shadow softness').onChange(value => {
      softShadow.softness.value = value
      softShadow.update()
    })
    gui.add(settings.shadow.spread, 'x', ...ranges.shadowSpread).name('Shadow width').onChange(value => { softShadow.spread.value.x = value })
    gui.add(settings.shadow.spread, 'z', ...ranges.shadowSpread).name('Shadow depth').onChange(value => { softShadow.spread.value.y = value })
    gui.add(settings.shadow, 'opacity', ...ranges.shadowOpacity).name('Shadow density').onChange(value => { softShadow.opacity.value = value })
    const overheadFolder = gui.addFolder('Overhead light')
    function updateOverhead() {
      overhead.visible = settings.lights.overhead.enabled
      overhead.intensity = settings.lights.overhead.intensity
      overheadPointerLight.reset()
      overheadShadow.mesh.visible = overhead.visible && overhead.intensity > 0
      overheadShadow.update()
    }
    overheadFolder.add(settings.lights.overhead, 'enabled').name('Enabled').onChange(updateOverhead)
    overheadFolder.add(settings.lights.overhead, 'intensity', ...ranges.keyIntensity).name('Intensity').onChange(updateOverhead)
    overheadFolder.add(settings.lights.overhead.position, 'x', ...ranges.lightHorizontal).name('Position X').onChange(updateOverhead)
    overheadFolder.add(settings.lights.overhead.position, 'y', ...ranges.overheadHeight).name('Height').onChange(updateOverhead)
    overheadFolder.add(settings.lights.overhead.position, 'z', ...ranges.lightHorizontal).name('Position Z').onChange(updateOverhead)
    overheadFolder.add(settings.overheadShadow, 'opacity', ...ranges.shadowOpacity).name('Shadow density').onChange(value => { overheadShadow.opacity.value = value })
    overheadFolder.add(settings.overheadShadow, 'softness', ...ranges.shadowSoftness).name('Shadow softness').onChange(value => {
      overheadShadow.softness.value = value
      overheadShadow.update()
    })
    overheadFolder.close()
    const cycloramaFolder = gui.addFolder('Cyclorama')
    cycloramaFolder.add(settings.floor, 'curveStartZ', ...ranges.curveStart).name('Curve start · Z').onChange(rebuildCyclorama)
    cycloramaFolder.add(settings.floor, 'curveRadius', ...ranges.curveRadius).name('Curve radius').onChange(rebuildCyclorama)
    cycloramaFolder.add(settings.floor, 'wallHeight', ...ranges.wallHeight).name('Wall height').onChange(rebuildCyclorama)
    cycloramaFolder.close()
    gui.add({ resetCamera }, 'resetCamera').name('Reset camera')
    gui.add({ replayIntro: () => onReplayIntro?.() }, 'replayIntro').name('Replay intro')
  }
  return {
    settings, orbit, lighting, setOrbit, resetCamera,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibilityChange)
      pointerLight.dispose()
      overheadPointerLight.dispose()
      controls.dispose()
      gui?.destroy()
      draco.dispose()
      softShadow.dispose()
      overheadShadow.dispose()
      disposeObject(scene)
      renderer.dispose()
      root.style.backgroundColor = originalBackground
    },
  }
}
