import test from 'node:test'
import assert from 'node:assert/strict'
import {createPiece,sculpt,validatePiece,createHistory,LATITUDES,SEGMENTS,STORAGE_KEY} from '../src/playground/potteryModel.js'
import {createPotteryGeometry,updatePotteryGeometry} from '../src/playground/potteryGeometry.js'
import {PLAYGROUND_SETTINGS as config} from '../src/playground/playgroundSettings.js'
const front=[0,config.geometry.centerY,config.geometry.radius]
const hit=(p,options={})=>sculpt(p,{point:front,tool:'finger',size:1,pressure:.7,mode:'push',seconds:1/60,...options})
test('every new piece is a round clay ball; old saves remain in a different namespace',()=>{
 const p=createPiece('amphora');assert.equal(p.preset,'clay');assert.ok(p.radii.every(r=>r===1.4));assert.ok(validatePiece(p));assert.equal(STORAGE_KEY,'amphoria.pottery.v2')
})
test('a local press deforms the front without changing the back or the whole ring',()=>{
 const p=createPiece(),row=LATITUDES/2
 hit(p)
 assert.ok(p.radii[row*SEGMENTS]<1.4)
 assert.equal(p.radii[row*SEGMENTS+SEGMENTS/2],1.4)
 assert.equal(p.radii[row*SEGMENTS+SEGMENTS/4],1.4)
 assert.ok(validatePiece(p))
})
test('moving contact in object space marks different sides during rotation',()=>{
 const p=createPiece(),row=LATITUDES/2
 for(const angle of [0,Math.PI/2])hit(p,{point:[-Math.sin(angle)*1.4,config.geometry.centerY,Math.cos(angle)*1.4]})
 assert.ok(p.radii[row*SEGMENTS]<1.4);assert.ok(p.radii[row*SEGMENTS+SEGMENTS*3/4]<1.4);assert.equal(p.radii[row*SEGMENTS+SEGMENTS/2],1.4)
})
test('pressure changes depth; pulling adds material and zero pressure leaves it unchanged',()=>{
 const light=createPiece(),heavy=createPiece(),pull=createPiece(),none=createPiece(),index=LATITUDES/2*SEGMENTS
 hit(light,{pressure:.2});hit(heavy,{pressure:.9});hit(pull,{mode:'pull'});hit(none,{pressure:0})
 assert.ok(heavy.radii[index]<light.radii[index]);assert.ok(pull.radii[index]>1.4);assert.deepEqual(none,createPiece())
})
test('blade cuts a thinner imprint than palm; smoothing softens a local dent',()=>{
 const palm=createPiece(),blade=createPiece()
 hit(palm,{tool:'palm'});hit(blade,{tool:'blade'})
 assert.ok(palm.radii.filter(r=>r<1.4).length>blade.radii.filter(r=>r<1.4).length*2)
 const index=LATITUDES/2*SEGMENTS;blade.radii[index]=1
 hit(blade,{mode:'smooth',point:[0,config.geometry.centerY,1]});assert.ok(blade.radii[index]>1)
})
test('time-based strokes are stable at 30 and 120 FPS and bounded at extreme depth',()=>{
 const a=createPiece(),b=createPiece(),index=LATITUDES/2*SEGMENTS
 for(let i=0;i<30;i++)hit(a,{seconds:1/30})
 for(let i=0;i<120;i++)hit(b,{seconds:1/120})
 assert.ok(Math.abs(a.radii[index]-b.radii[index])<.01)
 for(let i=0;i<300;i++)hit(a,{point:[0,config.geometry.centerY,a.radii[index]],seconds:.05,pressure:1})
 assert.ok(validatePiece(a));assert.ok(a.radii[index]>=config.geometry.minRadius)
})
test('geometry is finite, faces outwards, updates in place and closes the UV seam',()=>{
 const p=createPiece(),g=createPotteryGeometry(p),positions=g.attributes.position,oldArray=positions.array
 const i=LATITUDES/2*(SEGMENTS+1)
 assert.ok(g.attributes.normal.getZ(i)>.95)
 hit(p);updatePotteryGeometry(g,p);assert.equal(positions.array,oldArray)
 assert.ok([...positions.array,...g.attributes.normal.array].every(Number.isFinite))
 for(let row=0;row<=LATITUDES;row++){
  const a=row*(SEGMENTS+1),b=a+SEGMENTS
  for(const axis of ['getX','getY','getZ'])assert.ok(Math.abs(positions[axis](a)-positions[axis](b))<1e-6)
 }
 g.dispose()
})
test('undo/redo restores the asymmetric surface and branches correctly',()=>{
 const a=createPiece(),h=createHistory(a,3),b=createPiece();hit(b);h.commit(b)
 assert.deepEqual(h.undo(),a);assert.deepEqual(h.redo(),b);h.undo();const c=createPiece();hit(c,{mode:'pull'});h.commit(c);assert.equal(h.canRedo,false)
})
test('invalid radii, poles and materials are rejected',()=>{
 assert.equal(validatePiece({version:1}),null)
 const p=createPiece();p.radii[12]=NaN;assert.equal(validatePiece(p),null)
 const q=createPiece();q.radii[1]=1;assert.equal(validatePiece(q),null)
 const r=createPiece();r.material.color='bad';assert.equal(validatePiece(r),null)
})
