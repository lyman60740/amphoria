import * as THREE from 'three'

/** Project the actual sculpture silhouette onto the curved cyclorama through the key light.
 * Blur once when the sculpture or light changes, leaving orbiting inexpensive.
 */
export function createSoftShadow(renderer, scene, light, hiddenObjects, settings, receiver) {
  const size = settings.resolution
  const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true })
  const horizontal = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false })
  const blurred = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false })
  const camera = new THREE.OrthographicCamera(-settings.cameraExtent, settings.cameraExtent, settings.cameraExtent, -settings.cameraExtent, settings.cameraNear, settings.cameraFar)
  const silhouette = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false })
  const shadowMatrix = new THREE.Matrix4()
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { shadowMap: { value: blurred.texture }, shadowMatrix: { value: shadowMatrix }, surfaceOffset: { value: settings.surfaceOffset }, opacity: { value: settings.opacity }, spread: { value: new THREE.Vector2(settings.spread.x, settings.spread.z) }, shadowColor: { value: new THREE.Vector3().fromArray(settings.colorLinear) } },
    vertexShader: `uniform mat4 shadowMatrix; uniform float surfaceOffset; uniform vec2 spread; varying vec4 shadowCoord;
      void main(){ vec4 world = modelMatrix * vec4(position + normal * surfaceOffset,1.0); vec4 shadowPoint=world; shadowPoint.xz/=spread; shadowCoord=shadowMatrix*shadowPoint; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `uniform sampler2D shadowMap; uniform float opacity; uniform vec3 shadowColor; varying vec4 shadowCoord;
      void main(){vec2 uv=shadowCoord.xy/shadowCoord.w*.5+.5;
        float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
        float shade=texture2D(shadowMap,uv).r*inside;
        gl_FragColor=vec4(shadowColor,shade*opacity);
        #include <colorspace_fragment>
      }`,
  })
  // Use the exact receiver geometry, offset along its normals to avoid z-fighting.
  const plane = new THREE.Mesh(receiver.geometry.clone(), material)
  plane.name = 'Cyclorama · projected soft shadow'
  plane.position.copy(receiver.position)
  plane.quaternion.copy(receiver.quaternion)
  plane.scale.copy(receiver.scale)
  scene.add(plane)
  function setReceiverGeometry(nextReceiver) {
    plane.geometry.dispose()
    plane.geometry = nextReceiver.geometry.clone()
    plane.position.copy(nextReceiver.position)
    plane.quaternion.copy(nextReceiver.quaternion)
    plane.scale.copy(nextReceiver.scale)
  }
  const blurMaterial = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { image: { value: target.texture }, direction: { value: new THREE.Vector2(1/size,0) }, softness: { value: settings.softness }, sigma: { value: settings.blurSigma } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `uniform sampler2D image; uniform vec2 direction; uniform float softness; uniform float sigma; varying vec2 vUv;
      void main(){float sum=0.;float weight=0.;for(int i=-${settings.blurRadius};i<=${settings.blurRadius};i++){float x=float(i);float w=exp(-x*x/(2.*sigma*sigma));sum+=texture2D(image,vUv+direction*x*softness).r*w;weight+=w;}gl_FragColor=vec4(vec3(sum/weight),1.);}`,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), blurMaterial)
  const blurScene = new THREE.Scene(); blurScene.add(quad)
  const blurCamera = new THREE.Camera()
  function update() {
    camera.position.copy(light.position)
    camera.lookAt(settings.target.x, settings.target.y, settings.target.z)
    camera.updateMatrixWorld()
    shadowMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
    const background=scene.background, override=scene.overrideMaterial, oldTarget=renderer.getRenderTarget()
    const planeVisible = plane.visible
    const previousVisibility=hiddenObjects.map(object=>object.visible)
    hiddenObjects.forEach(object=>{object.visible=false})
    plane.visible=false
    scene.background=new THREE.Color(0x000000)
    scene.overrideMaterial=silhouette
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera)
    scene.background=background;scene.overrideMaterial=override
    hiddenObjects.forEach((object,index)=>{object.visible=previousVisibility[index]})
    plane.visible=planeVisible
    blurMaterial.uniforms.image.value=target.texture
    blurMaterial.uniforms.direction.value.set(1/size,0)
    renderer.setRenderTarget(horizontal);renderer.render(blurScene,blurCamera)
    blurMaterial.uniforms.image.value=horizontal.texture
    blurMaterial.uniforms.direction.value.set(0,1/size)
    renderer.setRenderTarget(blurred);renderer.render(blurScene,blurCamera)
    renderer.setRenderTarget(oldTarget)
  }
  return { mesh: plane, update, setReceiverGeometry, spread: material.uniforms.spread, softness: blurMaterial.uniforms.softness, opacity: material.uniforms.opacity,
    dispose(){target.dispose();horizontal.dispose();blurred.dispose();silhouette.dispose();quad.geometry.dispose();blurMaterial.dispose()} }
}
