import * as THREE from 'three'
import { PLAYGROUND_SETTINGS as config } from './playgroundSettings.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { createPotteryGeometry, updatePotteryGeometry } from './potteryGeometry'
import { createClayTextures } from './clayTextures'
import { sculpt, brushDimensions } from './potteryModel'

export function createPotteryStudio(canvas, initialPiece, callbacks) {
  let piece=initialPiece,disposed=false,drag=null,frame,lastTime=performance.now(),materialKey='',hover=null
  const scene=new THREE.Scene();scene.background=new THREE.Color(config.renderer.background)
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true})
  renderer.setPixelRatio(Math.min(devicePixelRatio,config.renderer.maxPixelRatio))
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap
  const camera=new THREE.PerspectiveCamera(config.camera.fov,1,.1,60)
  const controls=new OrbitControls(camera,canvas)
  controls.enableDamping=true;controls.enablePan=false;controls.minDistance=config.camera.minDistance;controls.maxDistance=config.camera.maxDistance;controls.maxPolarAngle=Math.PI*.49
  const hemisphere=new THREE.HemisphereLight('#fff8eb','#75716a',2.2);scene.add(hemisphere)
  const key=new THREE.DirectionalLight('#fff5e5',3.2);key.position.set(-4,7,5);key.castShadow=true
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=6;key.shadow.camera.bottom=-4
  key.shadow.normalBias=.035;key.shadow.bias=-.0002;key.shadow.radius=5;key.shadow.blurSamples=8;scene.add(key,key.target)
  const fill=new THREE.DirectionalLight('#e5ecf5',1);fill.position.set(3,4,-3);scene.add(fill)
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#514b42',opacity:.12}))
  floor.rotation.x=-Math.PI/2;floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor)
  const texture=createClayTextures()
  const material=new THREE.MeshStandardMaterial({color:piece.material.color,roughness:piece.material.roughness,map:texture.color,normalMap:texture.bump,normalScale:new THREE.Vector2(config.material.normalStrength,config.material.normalStrength),metalness:0})
  const sculpture=new THREE.Group();sculpture.name='Amphoria — handmade pottery';scene.add(sculpture)
  const body=new THREE.Mesh(createPotteryGeometry(piece),material);body.name='Hand-shaped clay';body.castShadow=body.receiveShadow=true;sculpture.add(body)
  const wheel=new THREE.Group();scene.add(wheel)
  const platter=new THREE.Mesh(new THREE.CylinderGeometry(1.82,1.86,.08,96),new THREE.MeshStandardMaterial({color:'#b4afa5',roughness:.85}))
  platter.position.y=-.005;platter.receiveShadow=true;wheel.add(platter)
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.69,.006,5,96),new THREE.MeshBasicMaterial({color:'#8b877e'}))
  rim.rotation.x=Math.PI/2;rim.position.y=.038;wheel.add(rim)
  const marker=new THREE.Mesh(new THREE.BoxGeometry(.025,.003,.12),new THREE.MeshBasicMaterial({color:'#625f59'}))
  marker.position.set(0,.04,1.7);wheel.add(marker)
  const brush=new THREE.Mesh(new THREE.RingGeometry(.965,1,64),new THREE.MeshBasicMaterial({color:'#fff5e3',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}))
  brush.visible=false;scene.add(brush)
  const localPoint=new THREE.Vector3(),worldNormal=new THREE.Vector3(),localNormal=new THREE.Vector3(),tangent=new THREE.Vector3(),bitangent=new THREE.Vector3(),basis=new THREE.Matrix4()
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2()
  const options={...config.tools}
  function setMaterial() {
    material.color.set(piece.material.color);material.roughness=piece.material.roughness
    const key=JSON.stringify([piece.material.bumps,piece.material.cracks])
    if(key!==materialKey){texture.update(piece.material);materialKey=key}
  }
  function rebuild() {updatePotteryGeometry(body.geometry,piece);setMaterial()}
  function resetView() {camera.position.fromArray(config.camera.position);controls.target.fromArray(config.camera.target);controls.update()}
  function resize() {
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return
    camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false)
  }
  function hit(event) {
    const rect=canvas.getBoundingClientRect()
    pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2)
    scene.updateMatrixWorld();camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera)
    return raycaster.intersectObject(body,false)[0]
  }
  function showBrush(intersection) {
    if(!intersection||options.orbit){brush.visible=false;return}
    const {width,height}=brushDimensions(options.tool,options.size)
    localPoint.copy(intersection.point);sculpture.worldToLocal(localPoint)
    localNormal.copy(localPoint);localNormal.y-=config.geometry.centerY;localNormal.normalize()
    const horizontal=Math.hypot(localNormal.x,localNormal.z)
    tangent.set(horizontal>.001?localNormal.z/horizontal:1,0,horizontal>.001?-localNormal.x/horizontal:0)
    bitangent.crossVectors(localNormal,tangent)
    worldNormal.copy(localNormal).transformDirection(sculpture.matrixWorld)
    tangent.transformDirection(sculpture.matrixWorld);bitangent.transformDirection(sculpture.matrixWorld)
    basis.makeBasis(tangent,bitangent,worldNormal)
    brush.quaternion.setFromRotationMatrix(basis);brush.rotateZ(options.angle)
    brush.visible=true;brush.position.copy(intersection.point).addScaledVector(worldNormal,.018);brush.scale.set(width,height,1)
  }
  function pointerState(event){return {clientX:event.clientX,clientY:event.clientY,pressure:event.pointerType==='pen'?event.pressure:1}}
  function onDown(event) {
    if(options.orbit||event.button!==0||drag)return
    hover=pointerState(event)
    const intersection=hit(event);if(!intersection)return
    event.preventDefault();canvas.setPointerCapture(event.pointerId)
    drag={id:event.pointerId,...hover,changed:false}
    callbacks.onStrokeStart?.();showBrush(intersection)
  }
  function onMove(event) {
    hover=pointerState(event)
    if(drag&&drag.id===event.pointerId)Object.assign(drag,hover)
  }
  function endStroke(event) {
    if(!drag || (event && event.pointerId!==undefined && event.pointerId!==drag.id))return
    const {id,changed}=drag;drag=null
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)
    if(changed)callbacks.onStrokeEnd?.(piece)
  }
  function leave(){if(!drag){hover=null;brush.visible=false}}
  function blur(){endStroke();hover=null;brush.visible=false}
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove)
  canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',endStroke);canvas.addEventListener('lostpointercapture',endStroke)
  canvas.addEventListener('pointerleave',leave);window.addEventListener('blur',blur)
  const observer=new ResizeObserver(resize);observer.observe(canvas)
  function render(now) {
    if(disposed)return
    const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now
    // Play is explicitly requested. Rotation continues underneath a held brush.
    if(options.spinning)sculpture.rotation.y=(sculpture.rotation.y+dt*options.speed*options.direction*Math.PI*2/60)%(Math.PI*2)
    wheel.rotation.y=sculpture.rotation.y
    controls.update()
    if((drag||hover)&&!options.orbit) {
      const intersection=hit(drag||hover)
      showBrush(intersection)
      if(drag&&intersection) {
        localPoint.copy(intersection.point);sculpture.worldToLocal(localPoint)
        const changed=sculpt(piece,{point:localPoint.toArray(),tool:options.tool,size:options.size,pressure:options.strength*drag.pressure,mode:options.mode,seconds:dt,angle:options.angle})
        if(changed){drag.changed=true;updatePotteryGeometry(body.geometry,piece)}
      }
    }
    renderer.render(scene,camera);frame=requestAnimationFrame(render)
  }
  function visibility(){cancelAnimationFrame(frame);if(!document.hidden){lastTime=performance.now();frame=requestAnimationFrame(render)}else blur()}
  document.addEventListener('visibilitychange',visibility)
  function setOptions(next) {
    if(next.orbit && !options.orbit)endStroke()
    Object.assign(options,next);controls.enabled=options.orbit
    canvas.style.cursor=options.orbit?'grab':'crosshair';brush.visible=false
    key.position.x=-4+options.light*7;renderer.toneMappingExposure=options.exposure
  }
  rebuild();resetView();resize();setOptions(options);frame=requestAnimationFrame(render)
  return {
    setPiece(next){endStroke();piece=next;rebuild()},setOptions,resetView,
    getPiece(){return JSON.parse(JSON.stringify(piece))},
    strokeAtCenter(){
      const rect=canvas.getBoundingClientRect(),intersection=hit({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2})
      if(!intersection)return
      localPoint.copy(intersection.point);sculpture.worldToLocal(localPoint)
      sculpt(piece,{point:localPoint.toArray(),tool:options.tool,size:options.size,pressure:options.strength,mode:options.mode,seconds:.05,angle:options.angle})
      updatePotteryGeometry(body.geometry,piece);callbacks.onStrokeEnd?.(piece)
    },
    async photo(){brush.visible=false;renderer.render(scene,camera);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Photo unavailable')),'image/png'))},
    async exportGLB(){
      // Export only the sculpture, in a neutral pose. Camera and studio stay behind.
      const copy=sculpture.clone();copy.rotation.set(0,0,0)
      copy.traverse(object=>{if(object.isMesh){object.geometry=object.geometry.clone();object.material=object.material.clone()}})
      try{const data=await new GLTFExporter().parseAsync(copy,{binary:true,onlyVisible:true});return new Blob([data],{type:'model/gltf-binary'})}
      finally{copy.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose()}})}
    },
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose()
      canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove)
      canvas.removeEventListener('pointerup',endStroke);canvas.removeEventListener('pointercancel',endStroke);canvas.removeEventListener('lostpointercapture',endStroke)
      canvas.removeEventListener('pointerleave',leave);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility)
      texture.dispose();material.dispose();body.geometry.dispose();wheel.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});brush.geometry.dispose();brush.material.dispose();floor.geometry.dispose();floor.material.dispose();key.shadow.dispose();renderer.dispose()
    },
  }
}
