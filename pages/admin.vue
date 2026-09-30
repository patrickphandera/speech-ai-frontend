<script setup lang="ts">
const { api, token, setToken, authUrl } = useApi()

// ---------------------------------------------------------------- sign in
const step = ref<'start' | 'code'>('start')
const sentTo = ref('')
const code = ref('')
const authBusy = ref(false)
const authError = ref('')

async function requestCode() {
  authBusy.value = true
  authError.value = ''
  try {
    const data = await api('/api/admin/request-code', { method: 'POST' })
    sentTo.value = data.sent_to
    step.value = 'code'
  } catch (e: any) {
    authError.value = e.message
    if (e.message.includes('just sent')) step.value = 'code'
  } finally {
    authBusy.value = false
  }
}

async function verify() {
  authBusy.value = true
  authError.value = ''
  try {
    const data = await api('/api/admin/verify', { json: { code: code.value } })
    setToken(data.token)
    code.value = ''
    step.value = 'start'
    await refresh()
  } catch (e: any) {
    authError.value = e.message
  } finally {
    authBusy.value = false
  }
}

function signOut() {
  setToken('')
}

// ------------------------------------------------------------- dashboard
const tab = ref<'download' | 'review' | 'prompts'>('download')
const stats = ref<any>(null)
const error = ref('')

async function refresh() {
  error.value = ''
  try {
    stats.value = await api('/api/admin/stats')
  } catch (e: any) {
    error.value = e.message
  }
}

onMounted(() => { if (token.value) refresh() })
watch(token, t => { if (!t) stats.value = null })

const fmtHours = (s: number) =>
  s >= 3600 ? `${(s / 3600).toFixed(2)} h` : s >= 60 ? `${(s / 60).toFixed(1)} min` : `${Math.round(s)} s`

// -------------------------------------------------------------- download
const filters = reactive({
  status: [] as string[],
  speakers: [] as string[],
  date_from: '',
  date_to: '',
  audio: true,
})
const preview = ref<{ total: number, seconds: number } | null>(null)

function filterParams() {
  const p: Record<string, string> = { audio: filters.audio ? '1' : '0' }
  if (filters.status.length) p.status = filters.status.join(',')
  if (filters.speakers.length) p.speakers = filters.speakers.join(',')
  if (filters.date_from) p.date_from = filters.date_from
  if (filters.date_to) p.date_to = filters.date_to
  return p
}

function toggle(list: string[], value: string) {
  const i = list.indexOf(value)
  i >= 0 ? list.splice(i, 1) : list.push(value)
}

let previewTimer: number | undefined
watch([() => [...filters.status], () => [...filters.speakers], () => filters.date_from, () => filters.date_to, token], () => {
  clearTimeout(previewTimer)
  if (!token.value) return
  previewTimer = window.setTimeout(async () => {
    try {
      const q = new URLSearchParams({ ...filterParams(), limit: '1' })
      const data = await api(`/api/admin/recordings?${q}`)
      preview.value = { total: data.total, seconds: data.seconds }
    } catch {}
  }, 250)
}, { immediate: true })

function download(all: boolean) {
  const params = all ? { audio: filters.audio ? '1' : '0' } : filterParams()
  window.location.href = authUrl('/api/admin/export', params)
}

// ---------------------------------------------------------------- review
const reviewStatus = ref('pending')
// '' = all clips, 'own' = only contributors' own text
const reviewOrigin = ref('')
const editing = ref<number | null>(null)
const editText = ref('')
const recordings = ref<any[]>([])
const reviewTotal = ref(0)

async function loadRecordings() {
  const q = new URLSearchParams({ limit: '50' })
  if (reviewStatus.value) q.set('status', reviewStatus.value)
  if (reviewOrigin.value) q.set('origin', reviewOrigin.value)
  try {
    const data = await api(`/api/admin/recordings?${q}`)
    recordings.value = data.recordings
    reviewTotal.value = data.total
  } catch (e: any) {
    error.value = e.message
  }
}
watch([tab, reviewStatus, reviewOrigin], () => { if (tab.value === 'review') loadRecordings() })

function startEdit(rec: any) {
  editing.value = rec.id
  editText.value = rec.transcript
}
async function saveText(rec: any) {
  try {
    const data = await api(`/api/admin/recordings/${rec.id}`, { method: 'PATCH', json: { transcript: editText.value } })
    rec.transcript = data.transcript
    editing.value = null
  } catch (e: any) {
    error.value = e.message
  }
}

async function setStatus(rec: any, status: string) {
  try {
    await api(`/api/admin/recordings/${rec.id}`, { method: 'PATCH', json: { status } })
    rec.status = status
    if (reviewStatus.value && reviewStatus.value !== status) {
      recordings.value = recordings.value.filter(r => r.id !== rec.id)
      reviewTotal.value--
    }
    refresh()
  } catch (e: any) {
    error.value = e.message
  }
}

// --------------------------------------------------------------- prompts
const promptForm = reactive({ text: '', language: '', domain: '', source: '' })
const promptMsg = ref('')

async function addPrompts() {
  promptMsg.value = ''
  try {
    const data = await api('/api/admin/prompts', { json: promptForm })
    promptMsg.value = `Added ${data.added} sentence(s)${data.skipped ? `, skipped ${data.skipped} duplicate(s)` : ''}.`
    promptForm.text = ''
    refresh()
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Sign in -->
  <div v-if="!token" class="split hero" style="padding-top: 40px">
    <section>
      <h1>Admin <span class="accent-text">dashboard</span></h1>
      <p class="muted" style="max-width: 440px">
        Review incoming clips, add sentences and download all or part of the dataset.
        Access is protected with a one-time code sent by email.
      </p>
    </section>
    <div class="card" style="text-align: center; width: 100%; max-width: 440px; justify-self: end">
      <div class="lock">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
      <h2>Admin access</h2>

      <template v-if="step === 'start'">
        <p class="muted small">We'll email a 6-digit verification code to the administrator's inbox.</p>
        <button class="btn block" :disabled="authBusy" @click="requestCode">
          {{ authBusy ? 'Sending…' : 'Email me a code' }}
        </button>
      </template>

      <form v-else @submit.prevent="verify">
        <p class="muted small">
          Enter the code sent to <b style="color: var(--text)">{{ sentTo || 'the admin email' }}</b>.
          It expires in 10 minutes.
        </p>
        <input
          v-model="code" class="code-input" inputmode="numeric" autocomplete="one-time-code"
          maxlength="6" placeholder="••••••" autofocus
          @input="code = code.replace(/\D/g, '')"
        >
        <button class="btn block" style="margin-top: 14px" :disabled="code.length !== 6 || authBusy">
          {{ authBusy ? 'Checking…' : 'Verify & continue' }}
        </button>
        <button type="button" class="btn ghost sm" style="margin-top: 10px" :disabled="authBusy" @click="requestCode">
          Resend code
        </button>
      </form>
      <div v-if="authError" class="alert error">{{ authError }}</div>
    </div>
  </div>

  <!-- Dashboard -->
  <div v-else>
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin: 10px 0 20px">
      <div>
        <h1 style="font-size: 34px; margin-bottom: 4px">Dataset <span class="accent-text">dashboard</span></h1>
        <span class="muted small">Review clips and download all or part of the dataset.</span>
      </div>
      <div style="display: flex; gap: 8px">
        <button class="btn ghost sm" @click="refresh">↻ Refresh</button>
        <button class="btn ghost sm" @click="signOut">Sign out</button>
      </div>
    </div>

    <div v-if="stats" class="grid grid-4" style="margin-bottom: 20px">
      <div class="card stat">
        <span class="faint small">Total audio</span>
        <b class="accent-text">{{ fmtHours(stats.seconds) }}</b>
        <span class="muted small">{{ stats.clips }} clips</span>
      </div>
      <div class="card stat">
        <span class="faint small">Validated</span>
        <b style="color: var(--ok)">{{ fmtHours(stats.by_status.validated.seconds) }}</b>
        <span class="muted small">{{ stats.by_status.validated.clips }} clips</span>
      </div>
      <div class="card stat">
        <span class="faint small">Awaiting review</span>
        <b style="color: var(--warn)">{{ stats.by_status.pending.clips }}</b>
        <span class="muted small">{{ stats.by_status.rejected.clips }} rejected</span>
      </div>
      <div class="card stat">
        <span class="faint small">Speakers</span>
        <b>{{ stats.speakers.length }}</b>
        <span class="muted small">{{ stats.prompts }} sentences</span>
      </div>
    </div>

    <div class="tabs">
      <button :class="{ on: tab === 'download' }" @click="tab = 'download'">Download</button>
      <button :class="{ on: tab === 'review' }" @click="tab = 'review'">Review clips</button>
      <button :class="{ on: tab === 'prompts' }" @click="tab = 'prompts'">Sentences</button>
    </div>

    <div v-if="error" class="alert error" style="margin-bottom: 14px">{{ error }}</div>

    <!-- Download -->
    <div v-if="tab === 'download'" class="split main-side">
      <div class="card">
        <h2>Custom selection</h2>
        <p class="muted small" style="margin-top: 0">Leave a filter empty to include everything.</p>

        <div class="grid grid-2" style="margin-bottom: 18px">
          <div>
            <label>Review status</label>
            <div class="chips">
              <span v-for="s in ['validated', 'pending', 'rejected']" :key="s"
                    class="chip" :class="{ on: filters.status.includes(s) }"
                    @click="toggle(filters.status, s)">{{ s }}</span>
            </div>
          </div>
          <div>
            <label>Speakers</label>
            <div class="chips">
              <span v-if="!stats?.speakers.length" class="faint small">No speakers yet</span>
              <span v-for="sp in stats?.speakers" :key="sp.speaker_id"
                    class="chip" :class="{ on: filters.speakers.includes(sp.speaker_id) }"
                    @click="toggle(filters.speakers, sp.speaker_id)">
                {{ sp.speaker_id }} <span style="opacity: 0.7">· {{ sp.clips }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-2" style="margin-bottom: 18px">
          <div><label>Recorded from</label><input v-model="filters.date_from" type="date"></div>
          <div><label>Recorded to</label><input v-model="filters.date_to" type="date"></div>
        </div>

        <label class="check" style="margin-bottom: 20px">
          <input v-model="filters.audio" type="checkbox">
          <span>Include audio files <span class="faint">(uncheck for metadata CSVs only)</span></span>
        </label>

        <div class="selection-bar">
          <span v-if="preview" class="muted small">
            <b style="color: var(--text)">{{ preview.total }}</b> clips selected
            <template v-if="preview.total"> · {{ fmtHours(preview.seconds) }}</template>
          </span>
          <button class="btn gold" :disabled="!preview?.total" @click="download(false)">⬇ Download selection</button>
        </div>
      </div>

      <aside class="grid">
        <div class="card download-hero">
          <h2>Full dataset</h2>
          <p class="muted small" style="margin-top: 0">
            Every clip, <span v-if="stats">{{ stats.clips }} clips · {{ fmtHours(stats.seconds) }}</span>.
          </p>
          <button class="btn block" :disabled="!stats?.clips" @click="download(true)">⬇ Download everything</button>
        </div>
        <div class="card" style="padding: 20px">
          <h3 style="margin-bottom: 8px">What's in the zip</h3>
          <ul class="muted small" style="margin: 0; padding-left: 18px; line-height: 1.9">
            <li><code>audio/</code>: 16 kHz mono WAV per speaker</li>
            <li><code>metadata.csv</code>: one row per clip</li>
            <li><code>speakers.csv</code>, <code>prompts.csv</code></li>
            <li><code>train</code> / <code>dev</code> / <code>test.csv</code>, split by speaker</li>
          </ul>
        </div>
      </aside>
    </div>

    <!-- Review -->
    <div v-if="tab === 'review'" class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px">
        <h2 style="margin: 0">{{ reviewTotal }} clip(s)</h2>
        <div class="chips">
          <span v-for="s in ['pending', 'validated', 'rejected', '']" :key="s"
                class="chip" :class="{ on: reviewStatus === s }"
                @click="reviewStatus = s">{{ s || 'all' }}</span>
          <span class="chip" :class="{ on: reviewOrigin === 'own' }" style="margin-left: 8px"
                @click="reviewOrigin = reviewOrigin === 'own' ? '' : 'own'">Own text only</span>
        </div>
      </div>
      <p v-if="!recordings.length" class="muted" style="text-align: center; padding: 30px 0">Nothing here.</p>
      <div v-for="rec in recordings" :key="rec.id" class="rec">
        <div style="min-width: 0">
          <template v-if="editing === rec.id">
            <textarea v-model="editText" rows="2" maxlength="300" style="min-height: 0; font-size: 14px" />
            <div style="display: flex; gap: 6px; margin: 6px 0">
              <button class="btn sm" @click="saveText(rec)">Save text</button>
              <button class="btn ghost sm" @click="editing = null">Cancel</button>
            </div>
          </template>
          <div v-else class="rec-text">
            {{ rec.transcript }}
            <span v-if="rec.origin === 'own'" class="badge own-badge">Own text</span>
            <button v-if="rec.origin === 'own'" class="edit-link" @click="startEdit(rec)">Edit text</button>
          </div>
          <div class="faint small">
            {{ rec.speaker_id }} · {{ rec.duration_sec }}s · {{ rec.environment || '—' }} · {{ rec.recorded_at.slice(0, 16).replace('T', ' ') }}
          </div>
        </div>
        <audio :src="authUrl(`/api/admin/audio/${rec.id}`)" controls preload="none" />
        <div class="rec-actions">
          <span class="badge" :class="rec.status">{{ rec.status }}</span>
          <button class="btn ok sm" :disabled="rec.status === 'validated'" @click="setStatus(rec, 'validated')">✓ Valid</button>
          <button class="btn bad sm" :disabled="rec.status === 'rejected'" @click="setStatus(rec, 'rejected')">✕ Reject</button>
        </div>
      </div>
      <p v-if="reviewTotal > recordings.length" class="faint small" style="text-align: center">
        Showing the latest {{ recordings.length }}. Review these to load more.
      </p>
    </div>

    <!-- Prompts -->
    <form v-if="tab === 'prompts'" class="split main-side" @submit.prevent="addPrompts">
      <div class="card">
        <h2>Add sentences</h2>
        <p class="muted small" style="margin-top: 0">
          One sentence per line. Write numbers and dates out as words. Duplicates are skipped.
        </p>
        <textarea v-model="promptForm.text" rows="12" placeholder="Muli bwanji lero?&#10;Ndikupita ku msika." />
      </div>
      <div class="card grid" style="gap: 14px">
        <div><label>Language code</label><input v-model="promptForm.language" placeholder="ny"></div>
        <div><label>Domain</label><input v-model="promptForm.domain" placeholder="daily_life"></div>
        <div><label>Source</label><input v-model="promptForm.source" placeholder="original"></div>
        <button class="btn block" :disabled="!promptForm.text.trim()">Add sentences</button>
        <div v-if="promptMsg" class="alert success" style="margin: 0">{{ promptMsg }}</div>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Inner-page cards are flat: border only, no shadow. */
.card { box-shadow: none; }
.lock {
  width: 60px; height: 60px; border-radius: 18px; margin: 0 auto 16px;
  background: var(--primary); display: grid; place-items: center;
  box-shadow: 0 10px 24px -10px rgba(19, 52, 143, 0.45);
}
.code-input {
  text-align: center; font-size: 30px; font-weight: 800; letter-spacing: 0.5em;
  padding: 14px 0 14px 0.5em;
}
.stat { display: flex; flex-direction: column; gap: 4px; padding: 20px; }
.stat b { font-size: 28px; letter-spacing: -0.02em; }
.tabs {
  display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px;
  background: var(--soft); border: 1px solid var(--card-border); border-radius: 14px;
  max-width: 100%; overflow-x: auto;
}
.tabs button {
  border: 0; background: none; color: var(--muted); font: inherit; font-weight: 700; font-size: 14px;
  padding: 9px 16px; border-radius: 10px; cursor: pointer; white-space: nowrap;
}
.own-badge { background: rgba(31, 79, 209, 0.08); color: var(--link); margin-left: 6px; vertical-align: middle; }
.edit-link { border: 0; background: none; padding: 0; margin-left: 6px; font: inherit; font-size: 12px; color: var(--link); cursor: pointer; text-decoration: underline; }
.tabs button.on { background: var(--primary); color: white; }
.download-hero {
  background: rgba(19, 52, 143, 0.05);
}
.selection-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding-top: 18px; border-top: 1px solid var(--card-border);
}
.rec {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(220px, 1fr) auto;
  gap: 16px; align-items: center; padding: 14px 0; border-top: 1px solid var(--card-border);
}
.rec audio { width: 100%; height: 38px; }
@media (max-width: 900px) { .rec { grid-template-columns: 1fr; gap: 10px; } }
.rec-text { font-weight: 600; margin-bottom: 4px; }
.rec-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
