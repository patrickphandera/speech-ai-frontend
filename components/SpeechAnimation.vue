<script setup lang="ts">
// A speaker's voice, drawn as a mic sending out a waveform.
const BARS = [0.35, 0.6, 0.9, 0.5, 1, 0.7, 0.4, 0.85, 0.55, 0.3, 0.75, 0.45]
</script>

<template>
  <div class="speech" aria-hidden="true">
    <div class="mic">
      <i class="ring" /><i class="ring" style="animation-delay: 0.8s" />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </div>
    <div class="wave">
      <i v-for="(h, i) in BARS" :key="i" :style="{ '--h': h, animationDelay: `${i * -0.11}s` }" />
    </div>
  </div>
</template>

<style scoped>
.speech { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 4px 0; }

.mic {
  position: relative; width: 24px; height: 24px; flex: none; border-radius: 50%;
  display: grid; place-items: center; background: var(--primary); color: white;
  box-shadow: 0 10px 24px -10px rgba(10, 31, 92, 0.5);
}
.mic svg { width: 12px; height: 12px; position: relative; }
.ring {
  position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--blue-500);
  animation: ring 1.6s ease-out infinite;
}
@keyframes ring { from { transform: scale(1); opacity: 0.5; } to { transform: scale(1.8); opacity: 0; } }

.wave { display: flex; align-items: center; gap: 2px; height: 22px; }
.wave i {
  width: 3px; height: calc(var(--h) * 100%); border-radius: 999px; background: var(--accent);
  transform-origin: center; animation: talk 1.1s ease-in-out infinite;
}
.wave i:nth-child(odd) { background: var(--primary); }
@keyframes talk { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }

@media (prefers-reduced-motion: reduce) {
  .ring, .wave i { animation: none; }
}
</style>
