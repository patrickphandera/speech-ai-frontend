export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Recording needs the microphone and localStorage, so render in the browser only.
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE
      apiBase: 'http://localhost:5000',
    },
  },
  app: {
    head: {
      title: 'Nzeru AI',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      // Apply the saved (or system) theme before first paint, to avoid a white flash.
      script: [{
        innerHTML: `try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}`,
      }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap' },
      ],
    },
  },
})
