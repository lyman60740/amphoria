<script setup>
defineProps({name:String})
</script>
<template>
  <svg viewBox="0 0 100 100" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path v-if="name==='palm'" d="M28 50V30c0-8 10-8 10 0v17-29c0-8 10-8 10 0v28-32c0-8 10-8 10 0v33-26c0-8 10-8 10 0v33l8-13c5-7 13-1 9 6L72 78c-5 12-13 15-24 15-12 0-20-5-26-16L11 57c-4-7 5-13 10-6l7 9" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path v-else-if="name==='finger'" d="M42 56V18c0-12 16-12 16 0v31c6-6 16-1 16 6v18c0 13-9 20-21 20-10 0-15-4-21-14L19 58c-5-8 7-14 13-6l10 12" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <g v-else-if="name==='blade'" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M15 78 66 16l21 18-51 58Z"/><path d="m25 68 21 18M55 29l21 18"/><path d="m13 89 11 8"/></g>
    <path v-else-if="name==='shape'" d="M18 28v36c0 18 13 18 13 0V40c0-15 13-15 13 0v24c0 18 13 18 13 0V40c0-15 13-15 13 0v24c0 18 13 18 13 0V28" stroke="currentColor" stroke-width="9"/>
    <path v-else-if="name==='raise'" d="M37 15h26c6 0 7 4 2 8l-6 8c-3 5 12 12 15 25 5 20-12 29-17 32-4 2 9 3 8 6H35c-1-3 12-4 8-6-5-3-22-12-17-32 3-13 18-20 15-25l-6-8c-5-4-4-8 2-8Z" fill="currentColor"/>
    <g v-else-if="name==='amphora'||name==='presets'" fill="currentColor"><path d="M33 12h34l-7 12-3 17c7 5 19 6 19 22 0 12-12 30-18 33H42C36 93 24 75 24 63c0-16 12-17 19-22l-3-17Z"/><path d="M39 23C15 8 16 45 31 47l4-7c-12-3-12-23 4-12Zm22 0c24-15 23 22 8 24l-4-7c12-3 12-23-4-12Z"/></g>
    <path v-else-if="name==='smooth'" d="M50 7c4 26 17 39 43 43-26 4-39 17-43 43C46 67 33 54 7 50 33 46 46 33 50 7Z" fill="currentColor"/>
    <g v-else-if="name==='material'" stroke="currentColor" stroke-width="1.4"><ellipse v-for="i in 14" :key="i" cx="50" cy="50" :rx="i*2.6" :ry="i*3" :transform="`rotate(${i*2} 50 50)`"/></g>
    <g v-else-if="name==='wheel'" stroke="currentColor" stroke-width="1.6"><circle v-for="i in 12" :key="i" cx="50" cy="50" :r="i*3.1"/><path d="m63 8 12 7-12 7M26 78l-9 8 12 5" fill="currentColor"/></g>
    <g v-else-if="name==='studio'" stroke="currentColor" stroke-width="1.5"><circle cx="50" cy="50" r="21" fill="currentColor"/><path v-for="i in 12" :key="i" d="M50 9v10" :transform="`rotate(${i*30} 50 50)`"/></g>
    <g v-else-if="name==='save'" stroke="currentColor" stroke-width="2"><path d="M20 30h60v53H20zM37 30l5-10h16l5 10"/><circle cx="50" cy="55" r="16"/><circle cx="50" cy="55" r="11"/></g>
    <path v-else-if="name==='bowl'" d="M13 38h74c-3 26-18 41-31 44v6H44v-6C31 79 16 64 13 38Z" fill="currentColor"/>
  </svg>
</template>
