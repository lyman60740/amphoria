<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import GUI from 'lil-gui'

const canvas = ref(null)

let scene, camera, renderer, gui, animationId

function init() {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  )
  camera.position.z = 3

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  gui = new GUI()

  window.addEventListener('resize', onResize)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function tick() {
  renderer.render(scene, camera)
  animationId = requestAnimationFrame(tick)
}

onMounted(() => {
  init()
  tick()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  gui.destroy()
  renderer.dispose()
})
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
