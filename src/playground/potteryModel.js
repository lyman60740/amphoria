import { PLAYGROUND_SETTINGS as config } from './playgroundSettings.js'
// Separate storage: the first atelier's saved vase is retained, never overwritten.
export const STORAGE_KEY = 'amphoria.pottery.v2'
export const LATITUDES = config.geometry.latitudeSegments
export const SEGMENTS = config.geometry.radialSegments
export const VERTEX_COUNT = (LATITUDES+1)*SEGMENTS
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
export const directions=new Float32Array(VERTEX_COUNT*3)
for(let row=0;row<=LATITUDES;row++)for(let col=0;col<SEGMENTS;col++) {
  const phi=row/LATITUDES*Math.PI,theta=col/SEGMENTS*Math.PI*2,k=(row*SEGMENTS+col)*3
  directions[k]=Math.sin(phi)*Math.sin(theta);directions[k+1]=Math.cos(phi);directions[k+2]=Math.sin(phi)*Math.cos(theta)
}
export function createPiece() {
  const {color,roughness,bumps,cracks}=config.material
  return {version:2,preset:'clay',radii:Array(VERTEX_COUNT).fill(config.geometry.radius),material:{color,roughness,bumps,cracks}}
}
export function validatePiece(value) {
  if(!value||value.version!==2||value.preset!=='clay'||!Array.isArray(value.radii)||value.radii.length!==VERTEX_COUNT)return null
  if(!value.radii.every(r=>Number.isFinite(r)&&r>=config.geometry.minRadius&&r<=config.geometry.maxRadius))return null
  // The duplicated poles represent one vertex and must remain coincident.
  for(const start of [0,LATITUDES*SEGMENTS])for(let i=1;i<SEGMENTS;i++)if(Math.abs(value.radii[start+i]-value.radii[start])>1e-6)return null
  const m=value.material
  if(!m||typeof m.color!=='string'||!/^#[0-9a-f]{6}$/i.test(m.color)||!['roughness','bumps','cracks'].every(k=>Number.isFinite(m[k])&&m[k]>=0&&m[k]<=1))return null
  return JSON.parse(JSON.stringify(value))
}
export function brushDimensions(tool,size) {
  const profile=config.brushes[tool]||config.brushes.palm
  return {width:profile.radius*size,height:Math.max(.05,profile.radius*size*profile.aspect)}
}
/** Local brush in the rotating object's coordinates. A stroke never edits an entire ring. */
export function sculpt(piece,{point,tool='palm',size=1,pressure=.5,mode='push',seconds=1/60,angle=0}) {
  if(!point||pressure<=0||seconds<=0)return false
  const {width,height}=brushDimensions(tool,size)
  const cx=point[0],cy=point[1]-config.geometry.centerY,cz=point[2]
  const length=Math.hypot(cx,cy,cz)||1,nx=cx/length,ny=cy/length,nz=cz/length
  // Horizontal tangent, with a stable basis at the poles.
  const horizontal=Math.hypot(nx,nz)
  const ux=horizontal>.001?nz/horizontal:1,uy=0,uz=horizontal>.001?-nx/horizontal:0
  const vx=ny*uz,vy=nz*ux-nx*uz,vz=-ny*ux
  const c=Math.cos(angle),s=Math.sin(angle)
  const tx=ux*c+vx*s,ty=uy*c+vy*s,tz=uz*c+vz*s
  const bx=vx*c-ux*s,by=vy*c-uy*s,bz=vz*c-uz*s
  const old=mode==='smooth'?[...piece.radii]:piece.radii
  const rate=(config.brushes[tool]||config.brushes.palm).rate
  const amount=rate*clamp(pressure,0,1)*Math.min(seconds,.05)*(mode==='pull'?1:-1)
  let changed=false
  // Keep the bottom contact stable; all other surface regions, including the crown, are editable.
  for(let row=0;row<LATITUDES-2;row++)for(let col=0;col<SEGMENTS;col++) {
    const i=row*SEGMENTS+col,k=i*3,r=old[i]
    const dx=directions[k]*r-cx,dy=directions[k+1]*r-cy,dz=directions[k+2]*r-cz
    const a=(dx*tx+dy*ty+dz*tz)/width,b=(dx*bx+dy*by+dz*bz)/height,depth=(dx*nx+dy*ny+dz*nz)/Math.max(width,height)
    const d=a*a+b*b+depth*depth
    if(d>=1)continue
    const weight=(1-d)**2
    let next
    if(mode==='smooth') {
      const up=Math.max(0,row-1)*SEGMENTS+col,down=Math.min(LATITUDES,row+1)*SEGMENTS+col
      const left=row*SEGMENTS+(col+SEGMENTS-1)%SEGMENTS,right=row*SEGMENTS+(col+1)%SEGMENTS
      const average=(old[up]+old[down]+old[left]+old[right])/4
      const alpha=1-Math.exp(-35*pressure*seconds*weight)
      next=r+(average-r)*alpha
    }else next=r+amount*weight
    next=clamp(next,config.geometry.minRadius,config.geometry.maxRadius)
    if(Math.abs(next-r)>1e-10){piece.radii[i]=next;changed=true}
  }
  if(changed){const mean=piece.radii.slice(0,SEGMENTS).reduce((sum,v)=>sum+v,0)/SEGMENTS;piece.radii.fill(mean,0,SEGMENTS)}
  return changed
}
export function createHistory(initial,limit=config.historyLimit) {
  const clone=x=>JSON.parse(JSON.stringify(x));let entries=[clone(initial)],cursor=0
  return {
    commit(piece){if(JSON.stringify(piece)===JSON.stringify(entries[cursor]))return false;entries=entries.slice(0,cursor+1);entries.push(clone(piece));if(entries.length>limit)entries.shift();cursor=entries.length-1;return true},
    undo(){return cursor>0?clone(entries[--cursor]):null},redo(){return cursor<entries.length-1?clone(entries[++cursor]):null},
    get canUndo(){return cursor>0},get canRedo(){return cursor<entries.length-1},
  }
}
