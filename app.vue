<script setup lang="ts">
// The theme is set on <html> before the app loads (see nuxt.config.ts), so read it back from there.
const dark = ref(document.documentElement.dataset.theme === 'dark')
const { signedIn } = useAccount()
const route = useRoute()
const year = new Date().getFullYear()

function toggleTheme() {
  dark.value = !dark.value
  const theme = dark.value ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('theme', theme) } catch {}
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <NuxtLink to="/" class="brand">NZERU AI</NuxtLink>
      <div class="header-actions">
        <NuxtLink :to="signedIn ? '/record' : '/signup'" class="btn gold sm header-cta">Contribute dataset <AppIcon name="arrow-right" /></NuxtLink>
        <NuxtLink v-if="signedIn" to="/account" class="btn ghost sm sign-in">My account <AppIcon name="user" /></NuxtLink>
        <!-- On the sign-in page, offer the other way in. -->
        <NuxtLink v-else-if="route.path === '/login'" to="/signup" class="btn ghost sm sign-in">Create account <AppIcon name="user" /></NuxtLink>
        <NuxtLink v-else to="/login" class="btn ghost sm sign-in">Sign in <AppIcon name="sign-in" /></NuxtLink>
        <button
          type="button" class="theme-toggle" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="dark ? 'Light mode' : 'Dark mode'" @click="toggleTheme"
        >
          <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
  <main class="container" style="padding-top: 28px; padding-bottom: 56px">
    <NuxtPage />
  </main>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-about">
        <NuxtLink to="/" class="brand">NZERU AI</NuxtLink>
        <p class="muted small">
          An open speech dataset for African languages, built one voice at a time.
        </p>
      </div>
      <nav class="footer-links">
        <b>Contribute</b>
        <NuxtLink :to="signedIn ? '/record' : '/signup'">Contribute dataset</NuxtLink>
        <NuxtLink v-if="!signedIn" to="/signup">Create account</NuxtLink>
        <NuxtLink to="/record">Record</NuxtLink>
      </nav>
      <nav class="footer-links">
        <b>Explore</b>
        <a :href="MODELS_URL" target="_blank" rel="noopener" class="footer-ext">Models <AppIcon name="external" /></a>
        <NuxtLink :to="signedIn ? '/account' : '/login'">{{ signedIn ? 'My account' : 'Sign in' }}</NuxtLink>
        <NuxtLink to="/admin">Admin</NuxtLink>
        <NuxtLink to="/terms">Terms</NuxtLink>
      </nav>
    </div>
    <div class="container footer-bottom faint small">
      <span>© {{ year }} Nzeru AI</span>
      <span>Recordings are saved as 16 kHz mono WAV with anonymous speaker IDs.</span>
    </div>
  </footer>
</template>
