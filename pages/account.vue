<script setup lang="ts">
useHead({ title: 'My account · Nzeru AI' })
const { api, authUrl } = useApi()
const { me, signedIn, displayName, loadMe, signOut } = useAccount()
const router = useRouter()

type Recording = {
  id: number, prompt_id: string, transcript: string, language: string,
  duration_sec: number, recorded_at: string, status: 'pending' | 'validated' | 'rejected',
  origin: 'prompt' | 'own',
}
const recordings = ref<Recording[]>([])
const loading = ref(true)
const error = ref('')
const flash = ref('')

// Profile editing
const form = reactive({
  preferred_name: '', country: '', region: '', dialect: '', native_language: '', record_language: '',
  gender: '', age_group: '', show_photo: true,
})
const newPhoto = ref<Blob | null>(null)
const newPhotoUrl = ref('')
const removePhoto = ref(false)
const photoVersion = ref(0)
const saving = ref(false)
const profileMsg = ref('')
// Render the profile fields only once they hold the saved values.
const ready = ref(false)

const photoUrl = computed(() => {
  if (newPhotoUrl.value) return newPhotoUrl.value
  if (me.value?.has_photo && !removePhoto.value) return authUrl('/api/me/photo', { v: String(photoVersion.value) })
  return ''
})
const hasPhoto = computed(() => !!photoUrl.value)

function fillForm() {
  if (!me.value) return
  for (const k of Object.keys(form) as (keyof typeof form)[]) (form as any)[k] = (me.value as any)[k] ?? ''
  form.show_photo = me.value.show_photo
}

onMounted(async () => {
  if (!signedIn.value || !(await loadMe())) return router.replace('/login?next=/account')
  fillForm()
  ready.value = true
  await loadRecordings()
})
onBeforeUnmount(() => { if (newPhotoUrl.value) URL.revokeObjectURL(newPhotoUrl.value) })

async function loadRecordings() {
  loading.value = true
  try {
    recordings.value = (await api<{ recordings: Recording[] }>('/api/me/recordings')).recordings
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function remove(rec: Recording) {
  if (!confirm(`Delete this recording?\n\n"${rec.transcript}"\n\nThis can't be undone.`)) return
  error.value = ''
  try {
    await api(`/api/me/recordings/${rec.id}`, { method: 'DELETE' })
    recordings.value = recordings.value.filter(r => r.id !== rec.id)
    flash.value = 'Recording deleted.'
  } catch (e: any) {
    error.value = e.message
  }
}

function pickPhoto(blob: Blob) {
  if (newPhotoUrl.value) URL.revokeObjectURL(newPhotoUrl.value)
  newPhoto.value = blob
  newPhotoUrl.value = URL.createObjectURL(blob)
  removePhoto.value = false
}
function dropPhoto() {
  if (newPhotoUrl.value) URL.revokeObjectURL(newPhotoUrl.value)
  newPhoto.value = null
  newPhotoUrl.value = ''
  removePhoto.value = true
}

// Set while the "complete your profile" pop-up is showing.
let wasIncomplete = false
const needsProfile = computed(() => ready.value && me.value && !me.value.profile_complete)
watch(needsProfile, v => { if (v) wasIncomplete = true }, { immediate: true })

async function saveProfile() {
  saving.value = true
  profileMsg.value = ''
  error.value = ''
  const data = new FormData()
  for (const [k, v] of Object.entries(form)) data.append(k, String(v))
  if (newPhoto.value) data.append('photo', newPhoto.value, 'photo.jpg')
  else if (removePhoto.value) data.append('remove_photo', 'true')
  try {
    me.value = await api('/api/me', { method: 'PATCH', form: data })
    if (newPhotoUrl.value) URL.revokeObjectURL(newPhotoUrl.value)
    newPhoto.value = null
    newPhotoUrl.value = ''
    removePhoto.value = false
    photoVersion.value++
    profileMsg.value = 'Profile saved.'
    if (wasIncomplete && me.value?.profile_complete) flash.value = "You're all set. You can start recording now."
    wasIncomplete = false
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function logout() {
  signOut()
  router.push('/')
}

const STATUS_LABEL = { pending: 'In review', validated: 'Accepted', rejected: 'Not accepted' }
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div v-if="me" class="account">
    <header class="account-head">
      <img v-if="me.has_photo" :src="authUrl('/api/me/photo', { v: String(photoVersion) })" alt="" class="avatar">
      <img v-else src="~/assets/images/default-avatar.webp" alt="" class="avatar">
      <div style="min-width: 0; flex: 1">
        <h1>{{ displayName }}</h1>
        <p class="muted small">{{ me.email }} · Speaker {{ me.speaker_id }}</p>
      </div>
      <NuxtLink to="/record" class="btn sm">Record <AppIcon name="arrow-right" /></NuxtLink>
      <button class="btn ghost sm" @click="logout">Sign out</button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="flash" class="alert success">{{ flash }}</div>

    <section class="card block-card">
      <div class="block-head">
        <h2>My recordings</h2>
        <span class="muted small">{{ recordings.length }} clip{{ recordings.length === 1 ? '' : 's' }}</span>
      </div>

      <p v-if="loading" class="muted small">Loading…</p>
      <div v-else-if="!recordings.length" class="empty">
        <p class="muted small">You haven't recorded anything yet.</p>
        <NuxtLink to="/record" class="btn sm">Start recording</NuxtLink>
      </div>
      <ul v-else class="recs">
        <li v-for="rec in recordings" :key="rec.id" class="rec">
          <div class="rec-main">
            <p class="rec-text">{{ rec.transcript }}</p>
            <p class="faint small">
              {{ when(rec.recorded_at) }} · {{ rec.duration_sec.toFixed(1) }} s · {{ languageName(rec.language) }}
              <span class="badge" :class="rec.status">{{ STATUS_LABEL[rec.status] }}</span>
              <span v-if="rec.origin === 'own'" class="badge own">Your own text</span>
            </p>
            <audio :src="authUrl(`/api/me/recordings/${rec.id}/audio`, { v: rec.recorded_at })" controls preload="none" />
          </div>
          <div class="rec-actions">
            <NuxtLink :to="`/record?redo=${rec.id}`" class="btn ghost sm">Re-record</NuxtLink>
            <button class="btn ghost sm danger" @click="remove(rec)">Delete</button>
          </div>
        </li>
      </ul>
    </section>

    <form v-if="ready && !needsProfile" class="card block-card" @submit.prevent="saveProfile">
      <div class="block-head"><h2>Profile</h2></div>
      <ProfileFields
        :form="form" :photo-url="photoUrl" :has-photo="hasPhoto" required
        @pick="pickPhoto" @remove="dropPhoto" @error="error = $event"
      />
      <div class="save-row">
        <span v-if="profileMsg" class="small" style="color: var(--ok)">{{ profileMsg }}</span>
        <button class="btn sm" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</button>
      </div>
    </form>

    <!-- Required before recording; it has no close button. -->
    <Transition name="fade">
      <div v-if="needsProfile" class="overlay">
        <form class="card complete" @submit.prevent="saveProfile">
          <header class="complete-head">
            <!-- Greyed out on purpose: this pop-up can't be closed until the profile is saved. -->
            <button type="button" class="close" disabled aria-label="Close (complete your profile first)" title="Complete your profile to continue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <h2>Complete your profile</h2>
            <p class="muted small">A few details before you start recording.</p>
          </header>
          <div class="complete-body">
            <ProfileFields
              :form="form" :photo-url="photoUrl" :has-photo="hasPhoto" required
              @pick="pickPhoto" @remove="dropPhoto" @error="error = $event"
            />
            <div v-if="error" class="alert error">{{ error }}</div>
          </div>
          <footer class="complete-foot">
            <button type="button" class="link-out" @click="logout">Sign out</button>
            <button class="btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save and continue' }}</button>
          </footer>
        </form>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Inner-page cards are flat: border only, no shadow. */
.card { box-shadow: none; }
.account { max-width: 760px; margin: 0 auto; display: grid; gap: 16px; }
.account-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.account-head h1 { font-size: 24px; margin: 0; }
.account-head p { margin: 2px 0 0; }
.avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex: none; background: var(--accent); border: 1px solid var(--card-border); }

.block-card { padding: 20px 22px; }
.block-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
.block-head h2 { font-size: 17px; margin: 0; }

.empty { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.empty p { margin: 0; }
.recs { list-style: none; margin: 0; padding: 0; }
.rec { display: flex; gap: 14px; padding: 14px 0; border-top: 1px solid var(--card-border); }
.rec:first-child { border-top: 0; padding-top: 0; }
.rec-main { flex: 1; min-width: 0; }
.rec-text { margin: 0 0 2px; font-weight: 600; font-size: 15px; line-height: 1.4; }
.rec-main .faint { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rec audio { width: 100%; height: 36px; }
.rec-actions { display: flex; flex-direction: column; gap: 6px; flex: none; }
.btn.danger { color: var(--bad); }
.badge.own { background: rgba(31, 79, 209, 0.08); color: var(--link); }
.save-row { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; }

.overlay {
  position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px 16px;
  background: rgba(12, 14, 28, 0.6);
}
.complete {
  width: 100%; max-width: 560px; padding: 0; border-radius: 14px; overflow: hidden;
  max-height: calc(100vh - 48px); max-height: calc(100dvh - 48px);
  display: flex; flex-direction: column; box-shadow: 0 24px 60px -20px rgba(12, 14, 28, 0.45);
}
.complete-head { position: relative; padding: 18px 56px 14px 20px; border-bottom: 1px solid var(--card-border); }
.close {
  position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; display: grid; place-items: center;
  border: 0; border-radius: 8px; background: none; color: var(--faint); opacity: 0.45; cursor: not-allowed;
}
.close svg { width: 16px; height: 16px; }
.complete-head h2 { font-size: 17px; margin: 0 0 4px; }
.complete-head p { margin: 0; line-height: 1.5; }
.complete-body { flex: 1 1 auto; overflow-y: auto; padding: 18px 20px; }
.complete-foot {
  display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 20px;
  border-top: 1px solid var(--card-border);
}
.complete-foot .btn { font-size: 14px; padding: 9px 16px; border-radius: 9px; box-shadow: none; }
.link-out { border: 0; background: none; padding: 0; font: inherit; font-size: 13px; color: var(--muted); cursor: pointer; }
.link-out:hover { color: var(--text); text-decoration: underline; }

@media (max-width: 560px) {
  .rec { flex-direction: column; }
  .rec-actions { flex-direction: row; }
}
</style>
