import * as THREE from 'three'
import { PLAYGROUND_SETTINGS } from './playgroundSettings.js'
// A repeatable, seamless clay height field and a Voronoi crack mask.
export function createClayTextures() {
  const {width:w,height:h}=PLAYGROUND_SETTINGS.textures
  const count=w*h
  const grain=new Float32Array(count),cracks=new Float32Array(count)
  let seed=PLAYGROUND_SETTINGS.textures.seed
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const cells=Array.from({length:PLAYGROUND_SETTINGS.textures.crackCells},()=>[random(),random()])
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const u=x/w,v=y/h,i=y*w+x
    let first=10,second=10
    for(const [cx,cy] of cells) {
      const dx=Math.min(Math.abs(u-cx),1-Math.abs(u-cx))*2
      const dy=Math.min(Math.abs(v-cy),1-Math.abs(v-cy))
      const d=Math.hypot(dx,dy)
      if(d<first){second=first;first=d}else if(d<second)second=d
    }
    cracks[i]=Math.exp(-(second-first)*650)
    grain[i]=.5+.14*Math.sin(u*2*Math.PI*13+Math.sin(v*2*Math.PI*5))*Math.cos(v*2*Math.PI*17+Math.sin(u*2*Math.PI*7))+.045*(random()-.5)
  }
  const heightCanvas=document.createElement('canvas'),colorCanvas=document.createElement('canvas')
  for(const c of [heightCanvas,colorCanvas]){c.width=w;c.height=h}
  const heightContext=heightCanvas.getContext('2d'),colorContext=colorCanvas.getContext('2d')
  const bump=new THREE.CanvasTexture(heightCanvas),color=new THREE.CanvasTexture(colorCanvas)
  color.colorSpace=THREE.SRGBColorSpace
  for(const t of [bump,color]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4}
  function update(settings) {
    const heights=heightContext.createImageData(w,h),colors=colorContext.createImageData(w,h)
    const values=new Float32Array(count)
    for(let i=0;i<count;i++) {
      const value=Math.max(0,Math.min(255,128+(grain[i]-.5)*255*settings.bumps-cracks[i]*100*settings.cracks))
      values[i]=value/255
      const shade=255-cracks[i]*135*settings.cracks
      for(let c=0;c<3;c++){heights.data[i*4+c]=value;colors.data[i*4+c]=shade}
      heights.data[i*4+3]=colors.data[i*4+3]=255
    }
    // Tangent-space normals are supported by GLB, unlike a shader bump map.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const i=y*w+x
      const dx=(values[y*w+(x+w-1)%w]-values[y*w+(x+1)%w])*5
      const dy=(values[((y+1)%h)*w+x]-values[((y+h-1)%h)*w+x])*5
      const length=Math.hypot(dx,dy,1)
      heights.data[i*4]=(dx/length*.5+.5)*255
      heights.data[i*4+1]=(dy/length*.5+.5)*255
      heights.data[i*4+2]=(1/length*.5+.5)*255
    }
    heightContext.putImageData(heights,0,0);colorContext.putImageData(colors,0,0)
    bump.needsUpdate=color.needsUpdate=true
  }
  return {bump,color,update,dispose(){bump.dispose();color.dispose()}}
}
