<script setup lang="ts">
const router = useRouter()
const route = useRoute()

const { signedIn, displayName, loadMe, signOut } = useAccount()
// Sign-up pop-up (the same flow as the /signup page).
const showForm = ref(false)
function openForm() {
  // Signed-in contributors go straight to recording.
  if (signedIn.value) return router.push('/record')
  showForm.value = true
}

// Older links to /?join=1 still open the pop-up, even when already on this page.
watch(() => route.query.join, v => { if (v) openForm() })

onMounted(() => {
  loadMe()
  if (route.query.join) openForm()
})

const REASONS = [
  { icon: 'speech', title: 'Built for local languages', text: 'Most speech technology only understands a handful of global languages. Your recordings help close that gap.' },
  { icon: 'globe', title: 'Every accent counts', text: 'Voices from different regions, ages and dialects teach models to understand everyone, not just a few.' },
  { icon: 'open', title: 'Open for everyone', text: 'Recordings become part of an open dataset that researchers and builders can use to create speech tools.' },
]

const PRIVACY = [
  { title: 'Anonymous in the dataset', text: 'Recordings carry an ID like spk001. Your name, email and photo are never included.' },
  { title: 'You choose what to share', text: 'Answer "Prefer not to say" for gender and age. A photo is optional.' },
  { title: 'Your consent comes first', text: 'Nothing is recorded until you agree, and you can skip any sentence.' },
  { title: 'Only what is needed', text: 'Clips are saved as 16 kHz mono audio, trimmed of silence at both ends.' },
]

const FAQS = [
  { q: 'How long does it take?', a: 'Each sentence takes a few seconds to read. Record as many or as few as you like, and come back any time.' },
  { q: 'Do I need an account?', a: 'Yes, a free one with your email and a password. It lets you play, re-record or delete your recordings at any time.' },
  { q: 'What do I need?', a: 'A phone or computer with a microphone and a modern browser. A quiet room gives the best recordings.' },
  { q: 'Can I redo a recording?', a: 'Yes. Listen back to every clip before you submit it, and re-record or skip as often as you need.' },
  { q: 'How is my voice used?', a: 'Clips are reviewed and added to an open dataset used to train and test speech recognition models.' },
]

</script>

<template>
  <div class="split hero home-split">
    <section class="home-left">
      <h1 class="display headline">
        <template v-for="(w, i) in ['Speech', 'AI', 'built', 'for']" :key="w">
          <span class="word" :style="{ animationDelay: `${i * 80}ms` }">{{ w }}</span>{{ ' ' }}
        </template>
        <br>
        <span class="word shimmer" style="animation-delay: 360ms">African languages</span>
      </h1>
      <p class="muted" style="max-width: 420px; font-size: 14px">
        Read a few sentences aloud in your language. Each recording helps AI
        understand how we really speak.
      </p>

      <div class="cta">
        <button class="btn cta-main" @click="openForm">Contribute dataset <AppIcon name="arrow-right" /></button>
        <a :href="MODELS_URL" target="_blank" rel="noopener" class="btn ghost">Explore models <AppIcon name="external" /></a>
        <NuxtLink v-if="signedIn && displayName" to="/record" class="btn gold">Continue as {{ displayName }} <AppIcon name="arrow-right" /></NuxtLink>
      </div>
      <p v-if="signedIn && displayName" class="faint small" style="margin: 10px 0 0">
        Not {{ displayName }}? <a href="#" style="text-decoration: underline" @click.prevent="signOut">Sign out</a>
      </p>

      <div class="steps">
        <div class="step"><span>1</span><div><b>Create an account</b><span class="muted small">Then add a few details about you</span></div></div>
        <div class="step"><span>2</span><div><b>Read aloud</b><span class="muted small">Short sentences in your language</span></div></div>
        <div class="step"><span>3</span><div><b>Review and send</b><span class="muted small">Listen back and re-record if needed</span></div></div>
      </div>
    </section>

    <div class="home-right">
      <div class="hero-figure">
        <img src="~/assets/images/hero-speaker.webp" alt="A woman wearing headphones, speaking into a microphone" class="hero-img">
      </div>
      <div class="card speech-card mic-card">
        <SpeechAnimation />
      </div>
      <div class="card speech-card lang-card">
        <LanguagesMarquee />
      </div>
    </div>
  </div>

  <section class="section band first">
    <div class="section-head">
      <h2 class="section-title">Why your <span class="accent-text">voice</span> matters</h2>
      <p class="muted">Speech AI only works for the languages it has heard. Help it hear yours.</p>
    </div>
    <div class="reasons">
      <div v-for="r in REASONS" :key="r.title" class="card reason">
        <span class="reason-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="r.icon === 'speech'">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /><path d="M9 11v2M12 9v6M15 11v2" />
            </template>
            <template v-else-if="r.icon === 'globe'">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </template>
            <template v-else>
              <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
            </template>
          </svg>
        </span>
        <h3>{{ r.title }}</h3>
        <p class="muted small">{{ r.text }}</p>
      </div>
    </div>
  </section>

  <section class="section split even privacy">
    <div>
      <h2 class="section-title">Your privacy, <span class="accent-text">protected</span></h2>
      <p class="muted">
        The dataset is about how languages sound, not about who you are.
        Everything you share is anonymous.
      </p>
    </div>
    <ul class="privacy-list">
      <li v-for="item in PRIVACY" :key="item.title">
        <span class="tick">✓</span>
        <div><b>{{ item.title }}</b><span class="muted small">{{ item.text }}</span></div>
      </li>
    </ul>
  </section>

  <section class="section band">
    <div class="faq">
    <div class="section-head">
      <h2 class="section-title">Questions</h2>
    </div>
    <details v-for="f in FAQS" :key="f.q" class="card faq-item">
      <summary>{{ f.q }}</summary>
      <p class="muted small">{{ f.a }}</p>
    </details>
    </div>
  </section>

  <section class="cta-band">
    <h2 class="section-title">Ready to lend your voice?</h2>
    <p>It takes a few seconds per sentence, and every clip makes a difference.</p>
    <button class="btn gold" @click="openForm">Contribute dataset <AppIcon name="arrow-right" /></button>
  </section>

  <!-- Sign-up pop-up; closes only from its ✕ button -->
  <Transition name="modal">
    <div v-if="showForm" class="overlay">
      <SignupFlow modal class="modal" @close="showForm = false" />
    </div>
  </Transition>
</template>

<style scoped>
.steps { display: grid; gap: 12px; margin-top: 30px; }
.step { display: flex; gap: 14px; align-items: center; }
.step > span {
  font-size: 17px; font-weight: 800; width: 40px; height: 40px; flex: none;
  display: grid; place-items: center; border-radius: 12px;
  background: var(--primary); color: white;
}
.step div { display: flex; flex-direction: column; }

.home-split { align-items: stretch; }

/* Headline: words rise in one by one, then the gold phrase keeps shimmering.
   This and the line under the hero image are the only gradients, kept on purpose. */
.headline .word { display: inline-block; animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.headline .shimmer {
  background: linear-gradient(100deg, var(--gold-700) 0%, var(--gold-500) 30%, var(--gold-300) 45%, #fff3c4 50%,
    var(--gold-300) 55%, var(--gold-500) 70%, var(--gold-700) 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both, shimmer 4s ease-in-out 1s infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -150% 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(0.4em); } }
@media (prefers-reduced-motion: reduce) {
  .headline .word, .headline .shimmer { animation: none; }
}
.home-left { display: flex; flex-direction: column; justify-content: center; }
.home-right {
  display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 18px;
  width: 100%; max-width: 520px; justify-self: end;
}
@media (max-width: 900px) { .home-right { max-width: none; justify-self: stretch; } }
/* Transparent cut-out; the source is 452px wide, so don't scale it past that. */
.hero-figure { width: 100%; max-width: 300px; }
.speech-card {
  width: 100%; max-width: 300px; /* same as .hero-figure */
  padding: 10px 16px; border-radius: 16px;
  /* Neutral, like the secondary button: white with a soft grey shadow. */
  box-shadow: 0 10px 24px -10px rgba(22, 19, 43, 0.25), 0 2px 6px rgba(22, 19, 43, 0.08);
  /* Animated border: a solid blue edge that gently pulses. */
  border: 1.5px solid var(--primary);
  animation: border-pulse 2.5s ease-in-out infinite;
}
/* Offset the second card so the two borders don't pulse in lockstep. */
.speech-card + .speech-card { animation-delay: -1.25s; }
@keyframes border-pulse { 50% { border-color: var(--card-border); } }
@media (prefers-reduced-motion: reduce) { .speech-card { animation: none; } }
.mic-card { padding: 4px 14px; border-radius: 0; }
.lang-card {
  transform: translateY(-2px);
  /* Same blue lift as the primary button. */
  box-shadow: 0 10px 24px -8px rgba(19, 52, 143, 0.5), 0 2px 6px rgba(19, 52, 143, 0.15);
}
.hero-img { display: block; width: 100%; height: auto; }
/* A colour line to ground the cropped bottom edge of the cut-out. */
.hero-figure::after {
  content: ''; display: block; height: 4px; border-radius: 999px;
  background: linear-gradient(90deg, var(--blue-700), var(--blue-500) 45%, var(--gold-500) 75%, var(--gold-300));
}
.cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.cta .btn {
  padding: 10px 18px; font-size: 14px; border-radius: 12px;
  box-shadow: 0 10px 24px -8px rgba(19, 52, 143, 0.5), 0 2px 6px rgba(19, 52, 143, 0.15);
}
.cta .btn.ghost { box-shadow: 0 10px 24px -10px rgba(22, 19, 43, 0.25), 0 2px 6px rgba(22, 19, 43, 0.08); }
.cta .btn.gold { box-shadow: 0 10px 24px -8px rgba(212, 160, 23, 0.55), 0 2px 6px rgba(212, 160, 23, 0.2); }
.cta .btn:hover:not(:disabled) { transform: translateY(-2px); }
/* ------------------------------------------------------ content sections */
/* Sections are separated by padding, with every other one on a full-width tinted band. */
.section { padding: 72px 0; }
.section.first { margin-top: 64px; }
.band {
  position: relative; background: var(--soft);
  /* Paint the band edge to edge, past the page container. */
  box-shadow: 0 0 0 100vmax var(--soft); clip-path: inset(0 -100vmax);
}
.section-head { text-align: center; max-width: 560px; margin: 0 auto 28px; }
.section-head p { margin: 8px 0 0; }
.section-title {
  font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif; font-weight: 900;
  font-size: clamp(24px, 3vw, 32px); line-height: 1.15; letter-spacing: -0.02em; margin: 0;
}


.reasons { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.reason { padding: 24px; transition: transform 0.2s, box-shadow 0.2s; }
.reason:hover { transform: translateY(-4px); box-shadow: 0 22px 40px -18px rgba(19, 52, 143, 0.35); }
.reason h3 { margin: 14px 0 6px; }
.reason p { margin: 0; }
.reason-icon {
  width: 44px; height: 44px; display: grid; place-items: center; color: white;
  border-radius: 12px; background: var(--primary); box-shadow: 0 8px 18px -8px rgba(19, 52, 143, 0.55);
}
.reason-icon svg { width: 22px; height: 22px; }

.privacy { align-items: center; }
.privacy p { max-width: 440px; }
.privacy-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.privacy-list li { display: flex; gap: 12px; align-items: flex-start; }
.privacy-list li div { display: flex; flex-direction: column; gap: 2px; }
.tick {
  width: 26px; height: 26px; flex: none; display: grid; place-items: center; border-radius: 50%;
  font-size: 13px; font-weight: 800; color: white; background: var(--primary);
}

.faq { max-width: 720px; margin-left: auto; margin-right: auto; }
.faq-item { padding: 0; margin-bottom: 10px; box-shadow: none; }
.faq-item summary {
  list-style: none; cursor: pointer; padding: 16px 20px; font-weight: 700; font-size: 15px;
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after { content: '+'; font-size: 20px; color: var(--muted); transition: transform 0.2s; }
.faq-item[open] summary::after { transform: rotate(45deg); }
.faq-item p { margin: 0; padding: 0 20px 16px; }

.cta-band {
  margin-top: 72px; text-align: center; padding: 44px 24px; border-radius: var(--radius);
  background: var(--primary); color: white; box-shadow: 0 24px 48px -24px rgba(10, 31, 92, 0.6);
}
.cta-band p { margin: 8px auto 20px; max-width: 420px; opacity: 0.85; }

@media (max-width: 900px) {
  .reasons { grid-template-columns: 1fr; }
  .section { padding: 56px 0; }
}

.overlay {
  position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px 16px;
  background: rgba(12, 14, 28, 0.6);
}
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(12px) scale(0.98); }
</style>
