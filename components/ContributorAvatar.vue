<script setup lang="ts">
const props = defineProps<{ seed: number, photo?: string | null }>()
const base = useRuntimeConfig().public.apiBase as string

const COLORS = ['#0a1f5c', '#13348f', '#1f4fd1', '#3b6fe0', '#9a7009', '#d4a017', '#c08a10', '#28449e']
const broken = ref(false)
watch(() => props.photo, () => { broken.value = false })
</script>

<template>
  <span class="avatar" :style="{ background: COLORS[seed % COLORS.length] }">
    <img v-if="photo && !broken" :src="base + photo" alt="" loading="lazy" @error="broken = true">
    <svg v-else viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="9" r="4" /><path d="M4 21a8 8 0 0 1 16 0Z" /></svg>
  </span>
</template>

<style scoped>
img { width: 100%; height: 100%; object-fit: cover; }
svg { width: 66%; height: 66%; margin-top: 18%; }
</style>
