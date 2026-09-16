<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { createVaseScene } from '../scene/createVaseScene'
import { createIntroTimeline } from '../animations/introTimeline'
import logo from '../assets/amphoria.svg'
import shoppingBag from '../assets/Icon/Shopping-Bag.svg'

const hero = ref(null)
const canvas = ref(null)
const ready = ref(false)
const failed = ref(false)
const dialog = ref(null)
const panel = ref('')
let scene
let intro
let disposed = false
let previousFocus
const panelContent = {
  about: { eyebrow: 'AMPHORIA', title: 'The gesture of creation.', text: 'The silence of form. A study in clay, light and the passage of time.' },
  shop: { eyebrow: 'THE COLLECTION', title: 'The amphora.', text: 'Discover the form from every angle.', action: 'Explore in 3D' },
  account: { eyebrow: 'YOUR ACCOUNT', title: 'A space of your own.', text: 'Account access is coming soon.' },
  cart: { eyebrow: 'YOUR BAG', title: 'A little room for beauty.', text: 'Your bag is currently empty.', action: 'Explore the amphora' },
}
function openPanel(name) {
  previousFocus = document.activeElement
  panel.value = name
  dialog.value.showModal()
}
function closePanel() {
  dialog.value.close()
  previousFocus?.focus()
}
function retry() { window.location.reload() }
function explore() {
  closePanel()
  scene?.setOrbit(true)
}
async function startIntro() {
  ready.value = true
  await Promise.all([nextTick(), document.fonts.ready])
  if (!disposed) intro?.play()
}
onMounted(() => {
  try {
    scene = createVaseScene(canvas.value, {
      onReady: startIntro,
      onReplayIntro: () => intro?.play(),
      onError: () => { failed.value = true; intro?.finish() },
    })
    intro = createIntroTimeline({ root: hero.value, orbit: scene.orbit, lighting: scene.lighting })
  } catch { failed.value = true; intro?.finish() }
})
onBeforeUnmount(() => {
  disposed = true
  intro?.dispose()
  scene?.dispose()
})
</script>

<template>
  <main ref="hero" class="hero" :class="{ 'is-ready': ready }">
    <canvas ref="canvas" class="hero__canvas" aria-label="Three-dimensional clay amphora" />
    <div v-if="failed" class="scene-status" role="alert">The sculpture couldn’t load. <button @click="retry">Try again</button></div>
    <div v-else-if="!ready" class="scene-status" role="status">Shaping the silence<span class="loading-dot">.</span></div>

    <header class="header">
      <nav class="header__left" aria-label="Main navigation">
        <button @click="openPanel('about')">About</button>
        <button @click="openPanel('shop')">Shop</button>
        <a href="#/playground">Playground</a>
      </nav>
      <a class="wordmark" href="#" aria-label="Amphoria home" @click.prevent="scene?.resetCamera()"><img :src="logo" alt="Amphoria" /></a>
      <nav class="header__right" aria-label="Your account and bag">
        <button class="account" @click="openPanel('account')"><span class="account__dot" aria-hidden="true" />Account</button>
        <button class="bag" aria-label="Cart" @click="openPanel('cart')"><img :src="shoppingBag" alt="" /> <span>Cart</span></button>
      </nav>
    </header>

    <div class="hero__composition">
      <h1 class="hero__title"><span class="title-row title-row--first"><span>The</span><span>Greek</span></span><span class="title-row title-row--middle">Darkness</span><span class="title-row title-row--last"><span>Of</span><span>Dawn</span></span></h1>
      <p class="hero__aside hero__aside--left">The gesture of<br />creation.</p>
      <p class="hero__aside hero__aside--right">The silence of<br />form.</p>
      <button class="shop-now" @click="openPanel('shop')">Shop now</button>
      <span class="scroll-line" aria-hidden="true" />
    </div>

    <dialog ref="dialog" class="editorial-dialog" aria-labelledby="dialog-title" @click="event => { if (event.target === dialog) closePanel() }" @cancel.prevent="closePanel">
      <button class="dialog-close" aria-label="Close" @click="closePanel">×</button>
      <p class="dialog-eyebrow">{{ panelContent[panel]?.eyebrow }}</p>
      <h2 id="dialog-title">{{ panelContent[panel]?.title }}</h2>
      <p>{{ panelContent[panel]?.text }}</p>
      <button v-if="panelContent[panel]?.action" class="dialog-action" @click="explore">{{ panelContent[panel].action }} ↗</button>
    </dialog>
  </main>
</template>
