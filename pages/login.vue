<script setup lang="ts">
useHead({ title: 'Sign in · Nzeru AI' })
const { api } = useApi()
const { signIn, signedIn } = useAccount()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

// Only follow same-site paths after signing in.
const next = computed(() => {
  const n = String(route.query.next || '')
  return n.startsWith('/') && !n.startsWith('//') ? n : '/account'
})

// Already signed in: go straight on.
onMounted(() => { if (signedIn.value) router.replace(next.value) })

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const { token } = await api('/api/auth/login', { json: { email: email.value, password: password.value } })
    await signIn(token)
    router.push(next.value)
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <form class="card auth-card" @submit.prevent="submit">
      <h1>Sign in</h1>
      <p class="muted small">Sign in to record, and to play, re-record or delete your recordings.</p>

      <label for="l-email">Email</label>
      <input id="l-email" v-model="email" type="email" required autocomplete="email" placeholder="you@example.com">

      <label for="l-password" style="margin-top: 12px">Password</label>
      <input id="l-password" v-model="password" type="password" required autocomplete="current-password">

      <button class="btn block" style="margin-top: 18px" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      <div v-if="error" class="alert error">{{ error }}</div>

      <p class="muted small" style="margin: 18px 0 0; text-align: center">
        New here? <NuxtLink to="/signup" class="inline-link">Create an account</NuxtLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.auth { display: grid; place-items: center; padding: 32px 0; }
.auth-card { width: 100%; max-width: 400px; padding: 28px; box-shadow: none; }
.auth-card .btn, .auth-card .btn:hover:not(:disabled) { box-shadow: none; transform: none; }
.auth-card h1 { font-size: 24px; margin: 0 0 4px; }
.auth-card p { margin: 0 0 18px; }
.auth-card label { font-size: 13px; margin-bottom: 4px; }
.auth-card input { font-size: 14px; padding: 9px 12px; border-radius: 8px; }
.inline-link { color: var(--link); text-decoration: underline; }
</style>
