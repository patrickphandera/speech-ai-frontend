<script setup lang="ts">
// African languages scrolling past in two rows, moving in opposite directions.
const ROWS = [
  ['Chichewa', 'Tumbuka', 'Yao', 'Swahili', 'Zulu', 'Shona', 'Sena', 'Lomwe'],
  ['Yoruba', 'Hausa', 'Igbo', 'Amharic', 'Kinyarwanda', 'Lingala', 'Xhosa', 'Tonga'],
]
</script>

<template>
  <div class="langs" aria-label="African languages">
    <div v-for="(row, r) in ROWS" :key="r" class="track" :class="{ reverse: r % 2 }">
      <!-- The list is repeated so the loop has no visible seam. -->
      <span v-for="(lang, i) in [...row, ...row]" :key="i" class="lang" :aria-hidden="i >= row.length">{{ lang }}</span>
    </div>
  </div>
</template>

<style scoped>
.langs {
  display: grid; gap: 8px; overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.track { display: flex; gap: 6px; width: max-content; animation: scroll 26s linear infinite; }
.track.reverse { animation-direction: reverse; animation-duration: 30s; }
.lang {
  padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap;
  color: var(--muted); background: var(--soft); border: 1px solid var(--card-border);
}
.track .lang:nth-child(3n + 1) { color: var(--link); }
.track .lang:nth-child(3n + 2) { color: var(--gold-text); }
/* Each track holds two copies with a 6px gap between items, so move by half plus half a gap. */
@keyframes scroll { to { transform: translateX(calc(-50% - 3px)); } }

@media (prefers-reduced-motion: reduce) {
  .track { animation: none; }
}
</style>
