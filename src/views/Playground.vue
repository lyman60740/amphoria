<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import logo from '../assets/amphoria.svg'
import shoppingBag from '../assets/Icon/Shopping-Bag.svg'
import ToolIcon from '../playground/ToolIcon.vue'
import { PLAYGROUND_SETTINGS } from '../playground/playgroundSettings'
import { createPotteryStudio } from '../playground/createPotteryStudio'
import { createPiece, createHistory, validatePiece, STORAGE_KEY } from '../playground/potteryModel'
import '../playground/playground.css'
import '../playground/sculpting.css'

const canvas=ref(null),piece=ref(createPiece()),drawer=ref(''),selectedTool=ref('palm'),ready=ref(false),error=ref('')
const canUndo=ref(false),canRedo=ref(false),status=ref('Votre atelier personnel'),busy=ref(false),resetDialog=ref(null),infoDialog=ref(null),info=ref('')
const options=reactive({...PLAYGROUND_SETTINGS.tools})
const brushes=[{id:'palm',label:'Paume',icon:'palm',description:'Une empreinte large et douce pour déplacer la masse.'},{id:'finger',label:'Doigt',icon:'finger',description:'Un contact précis pour creuser et tirer une zone.'},{id:'blade',label:'Tranche',icon:'blade',description:'Une empreinte fine pour inciser un sillon net.'}]
const tools=[{id:'material',label:'Matière',icon:'material'},{id:'studio',label:'Lumière',icon:'studio'},{id:'save',label:'Exporter',icon:'save'}]
const clays=[['Charbon','#626568'],['Terre cuite','#a65d43'],['Sable','#bda88c'],['Craie','#ded9ce']]
let studio,history,timer,saveTimer,disposed=false
const copy=value=>JSON.parse(JSON.stringify(value))
function message(text){status.value=text;clearTimeout(timer);timer=setTimeout(()=>{if(!disposed)status.value='Sauvegarde locale automatique'},3500)}
function save(){
  clearTimeout(saveTimer)
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(piece.value));message('Pièce enregistrée sur cet appareil')}
  catch{message('Sauvegarde indisponible · exportez votre pièce')}
}
function updateHistory(){canUndo.value=history.canUndo;canRedo.value=history.canRedo}
function commit(){if(!history)return;history.commit(copy(piece.value));updateHistory();save()}
function updatePiece(){studio?.setPiece(copy(piece.value))}
function changeMaterial(){updatePiece();clearTimeout(saveTimer);saveTimer=setTimeout(commit,350)}
function applyOptions(){studio?.setOptions({...options})}
function chooseBrush(id){selectedTool.value=id;options.tool=id;options.orbit=false;applyOptions()}
function toggleWheel(){options.spinning=!options.spinning;applyOptions()}
function undo(){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;history?.commit(copy(piece.value))}const previous=history?.undo();if(previous){piece.value=previous;updatePiece();updateHistory();save()}}
function redo(){const next=history?.redo();if(next){piece.value=next;updatePiece();updateHistory();save()}}
function reset(){const material=copy(piece.value.material);piece.value=createPiece();piece.value.material=material;updatePiece();commit();resetDialog.value.close();message('Une nouvelle boule d’argile · le geste reste à inventer')}
function setClay(color){piece.value.material.color=color;changeMaterial()}
function openInfo(name){info.value=name;infoDialog.value.showModal()}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function exportFile(type){
  if(!studio||busy.value)return
  busy.value=true
  try{const blob=type==='photo'?await studio.photo():await studio.exportGLB();if(!disposed){download(blob,`amphoria-${piece.value.preset}.${type==='photo'?'png':'glb'}`);message(type==='photo'?'Photographie téléchargée':'Votre pièce 3D est prête')}}
  catch{message('Export impossible. Réessayez.')}finally{busy.value=false}
}
function onKey(event){
  if(event.target.closest('input,select,textarea,dialog'))return
  if(event.code==='Space'&&!event.target.closest('button,a')){event.preventDefault();toggleWheel();return}
  if(!(event.metaKey||event.ctrlKey))return
  if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo()}
  else if(event.key.toLowerCase()==='y'){event.preventDefault();redo()}
}
onMounted(()=>{
  try{const stored=localStorage.getItem(STORAGE_KEY);if(stored){const parsed=validatePiece(JSON.parse(stored));if(parsed){piece.value=parsed;status.value='Votre dernière pièce, retrouvée.'}}}catch{status.value='Nouvel atelier · sauvegarde locale indisponible'}
  history=createHistory(copy(piece.value))
  try{
    studio=createPotteryStudio(canvas.value,copy(piece.value),{
      onStrokeStart(){commit()},onStrokeEnd(next){piece.value=copy(next);commit()},
    });ready.value=true
  }catch(e){error.value='L’atelier 3D n’a pas pu démarrer. Vérifiez que WebGL est activé, puis rechargez la page.';console.error(e)}
  window.addEventListener('keydown',onKey)
})
onBeforeUnmount(()=>{if(studio)piece.value=studio.getPiece();disposed=true;clearTimeout(timer);clearTimeout(saveTimer);if(ready.value){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(piece.value))}catch{}}studio?.dispose();window.removeEventListener('keydown',onKey)})
</script>

<template>
  <main class="playground">
    <header class="header pg-header">
      <nav aria-label="Navigation principale"><button @click="openInfo('About')">About</button><button @click="openInfo('Shop')">Shop</button><a href="#/playground" aria-current="page">Playground</a></nav>
      <a class="wordmark" href="#/" aria-label="Amphoria — accueil"><img :src="logo" alt="Amphoria" /></a>
      <nav class="header__right" aria-label="Compte et panier"><button class="account" @click="openInfo('Account')"><span class="account__dot" />Account</button><button class="bag" aria-label="Cart" @click="openInfo('Cart')"><img :src="shoppingBag" alt=""/><span>Cart</span></button></nav>
    </header>

    <div class="pg-workspace">
      <section class="pg-stage" aria-label="Atelier de modelage">
        <div class="pg-stage-top"><span>THE ART OF MAKING</span><span>ATELIER / 001</span></div>
        <canvas ref="canvas" class="pg-canvas" aria-label="Boule d’argile à modeler. Maintenez le pointeur sur une zone pour la travailler, même pendant la rotation." />
        <p v-if="error" class="pg-error" role="alert">{{ error }}</p>
        <p v-else-if="!ready" class="pg-error" role="status">Préparation de l’argile…</p>
        <div class="pg-instruction"><span class="pg-live-dot"/><span>{{ options.orbit ? 'Glissez pour observer. Molette pour zoomer.' : options.spinning ? 'Maintenez sur l’argile. La terre tourne sous votre main.' : 'Maintenez sur une zone pour la façonner. Espace pour lancer le tour.' }}</span></div>
        <div class="pg-stage-bottom">
          <div class="pg-actions"><button :disabled="!canUndo" @click="undo" aria-label="Annuler" title="Annuler · ⌘ Z">↶</button><button :disabled="!canRedo" @click="redo" aria-label="Rétablir" title="Rétablir · ⌘ ⇧ Z">↷</button><span class="pg-divider"/><button :aria-pressed="options.orbit" @click="options.orbit=!options.orbit;applyOptions()">{{ options.orbit ? 'Vue 360°' : 'Modelage' }}</button><button @click="studio?.resetView()" title="Recentrer la caméra">Recentrer</button></div>
          <span class="pg-dimensions">ARGILE LIBRE <span>·</span> SANS SYMÉTRIE</span>
        </div>
      </section>

      <aside class="pg-tools pg-sculpt-tools" aria-label="Palette de modelage">
        <div class="pg-tools-caption"><span>VOTRE GESTE, VOTRE EMPREINTE.</span><span>01—03</span></div>
        <section class="pg-palette" aria-label="Outils de modelage">
          <div class="pg-brushes"><button v-for="tool in brushes" :key="tool.id" :aria-pressed="selectedTool===tool.id && !options.orbit" :aria-label="tool.label" @click="chooseBrush(tool.id)"><ToolIcon :name="tool.icon"/><span>{{ tool.label }}</span></button></div>
          <p class="pg-brush-description">{{ brushes.find(t=>t.id===selectedTool)?.description }}</p>
          <div class="pg-modes" aria-label="Action du geste"><button v-for="[id,label] in [['push','Creuser'],['pull','Tirer'],['smooth','Lisser']]" :key="id" :aria-pressed="options.mode===id" @click="options.mode=id;options.orbit=false;applyOptions()">{{ label }}</button></div>
          <label>Taille <output>{{ options.size.toFixed(1) }} ×</output><input v-model.number="options.size" aria-label="Taille de l’outil" type="range" min=".4" max="1.8" step=".05" @input="applyOptions"/></label>
          <label>Pression <output>{{ Math.round(options.strength*100) }} %</output><input v-model.number="options.strength" aria-label="Pression de l’outil" type="range" min=".05" max="1" step=".05" @input="applyOptions"/></label>
          <label v-if="selectedTool==='blade'">Angle de la tranche <output>{{ Math.round(options.angle*180/Math.PI) }}°</output><input v-model.number="options.angle" aria-label="Angle de la tranche" type="range" min="-1.57" max="1.57" step=".01" @input="applyOptions"/></label>
          <div class="pg-palette-foot"><span>Pression du stylet prise en compte</span><button @click="studio?.strokeAtCenter()" title="Appliquer une touche au centre visible, sans souris">Une touche au centre ↗</button></div>
        </section>
        <div class="pg-utility-tabs"><button v-for="tool in tools" :key="tool.id" :aria-expanded="drawer===tool.id" @click="drawer=drawer===tool.id?'':tool.id">{{ tool.label }} <span>{{ drawer===tool.id?'−':'+' }}</span></button></div>
        <section v-if="drawer" class="pg-panel pg-secondary-panel" :aria-label="tools.find(t=>t.id===drawer)?.label">
          <h2>{{ tools.find(t=>t.id===drawer)?.label }}</h2>
          <template v-if="drawer==='material'">

            <p>De la terre brute, une couleur, des accidents qui font la pièce.</p>
            <div class="pg-swatches"><button v-for="[name,color] in clays" :key="name" :style="{background:color}" :aria-label="name" :aria-pressed="piece.material.color===color" @click="setClay(color)"/></div>
            <label class="pg-color">Couleur d’argile <input v-model="piece.material.color" type="color" @input="changeMaterial" /></label>
            <label>Matité <output>{{ Math.round(piece.material.roughness*100) }} %</output><input v-model.number="piece.material.roughness" type="range" min=".15" max="1" step=".01" @input="changeMaterial" /></label>
            <label>Irrégularités <output>{{ Math.round(piece.material.bumps*100) }} %</output><input v-model.number="piece.material.bumps" type="range" min="0" max="1" step=".01" @input="changeMaterial" /></label>
            <label>Craquelures <output>{{ Math.round(piece.material.cracks*100) }} %</output><input v-model.number="piece.material.cracks" type="range" min="0" max="1" step=".01" @input="changeMaterial" /></label>
          </template>
          <template v-else-if="drawer==='studio'">
            <p>La lumière révèle les courbes et la matière.</p>
            <label>Position de la lumière <output>{{ options.light.toFixed(1) }}</output><input v-model.number="options.light" type="range" min="-1" max="1" step=".05" @input="applyOptions" /></label>
            <label>Exposition <output>{{ options.exposure.toFixed(2) }}</output><input v-model.number="options.exposure" type="range" min=".6" max="1.8" step=".02" @input="applyOptions" /></label>
            <button class="pg-outline pg-full" @click="options.light=PLAYGROUND_SETTINGS.tools.light;options.exposure=PLAYGROUND_SETTINGS.tools.exposure;applyOptions();studio?.resetView()">Retrouver le studio</button>
          </template>
          <template v-else-if="drawer==='save'">
            <p>Une pièce façonnée par vous. Gardez-en une trace.</p>
            <button class="pg-solid pg-full" :disabled="busy||!ready" @click="exportFile('photo')">Photographier <span>↗</span></button>
            <button class="pg-outline pg-full" :disabled="busy||!ready" @click="exportFile('glb')">Exporter la pièce 3D <span>↓</span></button>
            <button class="pg-outline pg-full" @click="save">Enregistrer sur cet appareil</button>
            <p v-if="busy" role="status">Préparation de votre fichier…</p>
            <p class="pg-note">Photo PNG · Modèle GLB avec sa matière.<br/>Votre travail est aussi enregistré automatiquement dans ce navigateur.</p>
          </template>
        </section>
        <button class="pg-new-clay" @click="resetDialog.showModal()">↺ Une nouvelle boule d’argile</button>
        <p class="pg-save-state" role="status" aria-live="polite">{{ status }}</p>
      </aside>
    </div>
    <section class="pg-player" aria-label="Lecteur du tour de potier">
      <button class="pg-player-toggle" :aria-label="options.spinning?'Mettre le tour en pause':'Lancer la rotation'" :aria-pressed="options.spinning" :disabled="!ready" @click="toggleWheel">{{ options.spinning?'Ⅱ':'▶' }}</button>
      <div class="pg-player-state"><span>LE TOUR</span><strong>{{ options.spinning?'En rotation':'En pause' }}</strong></div>
      <label class="pg-speed"><span>Vitesse <output>{{ options.speed.toFixed(1) }} tr/min</output></span><input v-model.number="options.speed" aria-label="Vitesse du tour" type="range" min="1" max="20" step=".5" @input="applyOptions"/></label>
      <button class="pg-reverse" :aria-label="options.direction===1?'Inverser le sens de rotation':'Rétablir le sens de rotation'" :aria-pressed="options.direction===-1" @click="options.direction*=-1;applyOptions()">{{ options.direction===1?'↻':'↺' }}</button>
    </section>
    <footer class="pg-footer"><h1>Playground</h1><div><span>SHAPE SOMETHING YOUR OWN.</span><span>AN AMPHORIA EXPERIMENT</span></div></footer>

    <dialog ref="resetDialog" class="editorial-dialog"><button class="dialog-close" aria-label="Fermer" @click="resetDialog.close()">×</button><p class="dialog-eyebrow">UN NOUVEAU GESTE</p><h2>Recommencer ?</h2><p>Vous repartirez d’une boule d’argile avec la matière actuelle. Vous pourrez annuler cette action.</p><button class="dialog-action" @click="reset">Créer une nouvelle boule</button></dialog>
    <dialog ref="infoDialog" class="editorial-dialog"><button class="dialog-close" aria-label="Fermer" @click="infoDialog.close()">×</button><p class="dialog-eyebrow">AMPHORIA</p><h2>{{ info==='About'?'The gesture of creation.':info==='Shop'?'The collection.':info==='Account'?'Your own space.':'Your bag.' }}</h2><p>{{ info==='About'?'Un atelier pour explorer la forme, le geste et la matière.':info==='Shop'?'Découvrez la pièce Amphoria sur notre page d’accueil.':info==='Account'?'Votre atelier se sauvegarde sur cet appareil. Les comptes ne sont pas encore ouverts.':'Votre panier est vide.' }}</p><a v-if="info==='Shop'" href="#/" class="dialog-action">Découvrir Amphoria ↗</a></dialog>
  </main>
</template>
