<script setup>
import { ref, defineAsyncComponent, onBeforeUnmount } from 'vue'
import Home from './views/Home.vue'
const Playground=defineAsyncComponent(()=>import('./views/Playground.vue'))
const route=ref(window.location.hash.startsWith('#/playground')?'playground':'home')
function navigate(){route.value=window.location.hash.startsWith('#/playground')?'playground':'home';window.scrollTo(0,0)}
window.addEventListener('hashchange',navigate)
onBeforeUnmount(()=>window.removeEventListener('hashchange',navigate))
</script>
<template><Playground v-if="route==='playground'"/><Home v-else/></template>
