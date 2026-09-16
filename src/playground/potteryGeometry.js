import * as THREE from 'three'
import { PLAYGROUND_SETTINGS as config } from './playgroundSettings.js'
import { LATITUDES, SEGMENTS, directions } from './potteryModel.js'
export function createPotteryGeometry(piece) {
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array((LATITUDES+1)*(SEGMENTS+1)*3),uvs=new Float32Array((LATITUDES+1)*(SEGMENTS+1)*2),indices=[]
  for(let row=0;row<=LATITUDES;row++)for(let col=0;col<=SEGMENTS;col++) {
    const i=row*(SEGMENTS+1)+col
    uvs[i*2]=col/SEGMENTS;uvs[i*2+1]=1-row/LATITUDES
    if(row<LATITUDES&&col<SEGMENTS){const a=i,b=i+1,c=i+SEGMENTS+1,d=c+1;if(row>0)indices.push(a,c,b);if(row<LATITUDES-1)indices.push(b,c,d)}
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(indices)
  updatePotteryGeometry(geometry,piece);return geometry
}
export function updatePotteryGeometry(geometry,piece) {
  const positions=geometry.attributes.position
  for(let row=0;row<=LATITUDES;row++)for(let col=0;col<=SEGMENTS;col++) {
    const source=row*SEGMENTS+(col%SEGMENTS),k=source*3,r=piece.radii[source],target=row*(SEGMENTS+1)+col
    positions.setXYZ(target,directions[k]*r,Math.max(config.geometry.floor,config.geometry.centerY+directions[k+1]*r),directions[k+2]*r)
  }
  positions.needsUpdate=true;geometry.computeVertexNormals()
  // Weld shading across the UV seam, without changing UV coordinates.
  const normals=geometry.attributes.normal
  for(let row=1;row<LATITUDES;row++) {
    const a=row*(SEGMENTS+1),b=a+SEGMENTS
    const x=normals.getX(a)+normals.getX(b),y=normals.getY(a)+normals.getY(b),z=normals.getZ(a)+normals.getZ(b),n=Math.hypot(x,y,z)||1
    normals.setXYZ(a,x/n,y/n,z/n);normals.setXYZ(b,x/n,y/n,z/n)
  }
  for(let col=0;col<=SEGMENTS;col++){normals.setXYZ(col,0,1,0);normals.setXYZ(LATITUDES*(SEGMENTS+1)+col,0,-1,0)}
  normals.needsUpdate=true;geometry.computeBoundingSphere();geometry.computeBoundingBox()
}
