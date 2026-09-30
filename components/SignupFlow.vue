<script setup lang="ts">
// A short "create account" form: email, password and agreement. The rest of the profile is
// filled in on the dashboard straight after. Used in the home page's pop-up (`modal`) and on /signup.
defineProps<{ modal?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { api } = useApi()
const { signIn } = useAccount()
const router = useRouter()

const email = ref('')
const password = ref('')
const agreed = ref(false)
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const { token } = await api('/api/speakers', {
      json: { email: email.value, password: password.value, consent: agreed.value },
    })
    if (!token) throw new Error('The server is out of date. Restart the backend and try again.')
    await signIn(token)
    router.push('/account')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="card auth-card" :class="{ 'in-modal': modal }" @submit.prevent="submit">
    <button v-if="modal" type="button" class="close" aria-label="Close" @click="emit('close')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
    <h1>Create account</h1>
    <p class="muted small">Create an account to record, and to play, re-record or delete your recordings.</p>

    <label for="s-email">Email</label>
    <input id="s-email" v-model="email" type="email" required autocomplete="email" placeholder="you@example.com">

    <label for="s-password" style="margin-top: 12px">Password</label>
    <input id="s-password" v-model="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters">

    <label class="check agree">
      <input v-model="agreed" type="checkbox" required>
      <span>I accept the <NuxtLink to="/terms" target="_blank" class="inline-link">terms and conditions</NuxtLink></span>
    </label>

    <button class="btn block" style="margin-top: 18px" :disabled="busy || !agreed">
      {{ busy ? 'Creating account…' : 'Create account' }}
    </button>
    <div v-if="error" class="alert error">{{ error }}</div>

    <p class="muted small" style="margin: 18px 0 0; text-align: center">
      Already have an account? <NuxtLink to="/login" class="inline-link">Sign in</NuxtLink>
    </p>
  </form>
</template>

<style scoped>
/* Matches the sign-in card (pages/login.vue). */
.auth-card { position: relative; width: 100%; max-width: 400px; padding: 28px; box-shadow: none; }
.auth-card .btn, .auth-card .btn:hover:not(:disabled) { box-shadow: none; transform: none; }
.auth-card.in-modal { box-shadow: 0 24px 60px -20px rgba(12, 14, 28, 0.45); }
.auth-card h1 { font-size: 24px; margin: 0 0 4px; }
.auth-card p { margin: 0 0 18px; }
.auth-card label { font-size: 13px; margin-bottom: 4px; }
.auth-card input:not([type="checkbox"]) { font-size: 14px; padding: 9px 12px; border-radius: 8px; }
.inline-link { color: var(--link); text-decoration: underline; }
.agree { margin-top: 16px; font-size: 13px; line-height: 1.5; color: var(--muted); }
.agree input { width: 16px; height: 16px; margin-top: 1px; }
.close {
  position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; display: grid; place-items: center;
  border: 0; border-radius: 8px; background: none; color: var(--faint); cursor: pointer;
}
.close:hover { background: var(--soft); color: var(--text); }
.close svg { width: 16px; height: 16px; }
</style>
