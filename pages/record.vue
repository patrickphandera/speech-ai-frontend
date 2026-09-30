<script setup lang="ts">
const MAX_SEC = 25
const MIN_SEC = 1

const { api } = useApi()
const { signedIn, displayName, loadMe } = useAccount()
const router = useRouter()
const route = useRoute()

// ?redo=<id> re-records one of the speaker's own clips instead of reading new sentences.
const redoId = computed(() => Number(route.query.redo) || 0)

// 'read' = read the sentences we provide; 'own' = type your own sentence, reviewed by an admin.
const mode = ref<'read' | 'own'>('read')
const ownText = ref('')
const OWN_MIN = 3
const OWN_MAX = 300
const ownTextOk = computed(() => ownText.value.trim().length >= OWN_MIN)
function setMode(m: 'read' | 'own') {
  if (state.value === 'recording' || state.value === 'uploading') return
  discard()
  flash.value = ''
  error.value = ''
  mode.value = m
}
const prompt = ref<{ prompt_id: string, text: string, domain: string } | null>(null)
const recorded = ref(0)
const total = ref(0)
const skipped = ref<string[]>([])
const loading = ref(true)
const environment = ref('quiet_indoor')

type State = 'idle' | 'recording' | 'processing' | 'review' | 'uploading'
const state = ref<State>('idle')
const elapsed = ref(0)
const level = ref(0)
const clip = ref<{ blob: Blob, url: string, seconds: number, peak: number } | null>(null)
const error = ref('')
const flash = ref('')

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let timer: number | undefined
let raf: number | undefined
let meterCtx: AudioContext | null = null

const device = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'phone' : 'computer'

onMounted(async () => {
  const next = encodeURIComponent(route.fullPath)
  const me = signedIn.value ? await loadMe() : null
  if (!me) return router.replace(`/login?next=${next}`)
  // The dashboard asks for the missing details first.
  if (!me.profile_complete) return router.replace('/account')
  if (redoId.value) await loadRedo()
  else await loadPrompt()
})

async function loadRedo() {
  loading.value = true
  try {
    const rec = await api(`/api/me/recordings/${redoId.value}`)
    prompt.value = { prompt_id: rec.prompt_id, text: rec.transcript, domain: '' }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(stopEverything)

async function loadPrompt() {
  loading.value = true
  error.value = ''
  try {
    const q = new URLSearchParams({ skip: skipped.value.join(',') })
    const data = await api(`/api/prompts/next?${q}`)
    prompt.value = data.prompt
    recorded.value = data.recorded
    total.value = data.total
    if (!data.prompt && skipped.value.length) {
      // Only skipped prompts remain; offer them again.
      skipped.value = []
      return loadPrompt()
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function startRecording() {
  error.value = ''
  flash.value = ''
  discard()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    })
  } catch {
    error.value = 'Microphone access was blocked. Allow the microphone in your browser settings.'
    return
  }
  chunks = []
  recorder = new MediaRecorder(stream)
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data)
  recorder.onstop = processClip
  recorder.start()
  state.value = 'recording'
  elapsed.value = 0
  const started = Date.now()
  timer = window.setInterval(() => {
    elapsed.value = (Date.now() - started) / 1000
    if (elapsed.value >= MAX_SEC) stopRecording()
  }, 100)
  startMeter(stream)
}

function startMeter(s: MediaStream) {
  meterCtx = new AudioContext()
  const analyser = meterCtx.createAnalyser()
  analyser.fftSize = 512
  meterCtx.createMediaStreamSource(s).connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  const tick = () => {
    analyser.getByteTimeDomainData(data)
    let peak = 0
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
    level.value = level.value * 0.7 + peak * 0.3
    raf = requestAnimationFrame(tick)
  }
  tick()
}

function stopRecording() {
  if (recorder?.state === 'recording') {
    state.value = 'processing'
    recorder.stop()
  }
  clearInterval(timer)
  if (raf) cancelAnimationFrame(raf)
  meterCtx?.close()
  meterCtx = null
  stream?.getTracks().forEach(t => t.stop())
  level.value = 0
}

async function processClip() {
  try {
    const samples = await toMono16k(new Blob(chunks, { type: recorder?.mimeType }))
    const blob = encodeWav(samples)
    clip.value = { blob, url: URL.createObjectURL(blob), seconds: samples.length / TARGET_RATE, peak: peakLevel(samples) }
    state.value = 'review'
  } catch {
    error.value = 'Could not process the recording. Please try again.'
    state.value = 'idle'
  }
}

const warning = computed(() => {
  if (!clip.value) return ''
  if (clip.value.seconds < MIN_SEC) return 'That clip is very short. Did you read the whole sentence?'
  if (clip.value.peak < 0.05) return 'That was very quiet. Move closer to the microphone.'
  if (clip.value.peak > 0.99) return 'That was very loud and may be distorted. Move a little further away.'
  return ''
})

async function submit() {
  const own = mode.value === 'own' && !redoId.value
  if (!clip.value || (own ? !ownTextOk.value : !prompt.value)) return
  state.value = 'uploading'
  error.value = ''
  const form = new FormData()
  form.append('audio', clip.value.blob, 'clip.wav')
  if (own) form.append('own_text', ownText.value.trim())
  else form.append('prompt_id', prompt.value!.prompt_id)
  if (redoId.value) form.append('replace_id', String(redoId.value))
  form.append('device', device)
  form.append('environment', environment.value)
  try {
    await api('/api/recordings', { form })
    if (redoId.value) return router.push('/account')
    discard()
    if (own) {
      ownText.value = ''
      flash.value = 'Saved! An admin will check your text and recording before it joins the dataset.'
      return
    }
    flash.value = 'Saved! Thank you.'
    await loadPrompt()
  } catch (e: any) {
    error.value = e.message
    state.value = 'review'
  }
}

function discard() {
  if (clip.value) URL.revokeObjectURL(clip.value.url)
  clip.value = null
  state.value = 'idle'
}

function skip() {
  if (!prompt.value) return
  skipped.value.push(prompt.value.prompt_id)
  discard()
  loadPrompt()
}

function stopEverything() {
  stopRecording()
  discard()
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (e.code !== 'Space' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT') return
  if (mode.value === 'own' && !ownTextOk.value) return
  e.preventDefault()
  if (state.value === 'recording') stopRecording()
  else if (state.value === 'idle' || state.value === 'review') startRecording()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const progress = computed(() => (total.value ? Math.min(100, (recorded.value / total.value) * 100) : 0))
</script>

<template>
  <div class="split main-side" style="padding-top: 10px">
    <div class="card main-card" style="text-align: center">
      <div v-if="!redoId" class="modes" role="tablist">
        <button type="button" role="tab" :aria-selected="mode === 'read'" :class="{ on: mode === 'read' }" @click="setMode('read')">Read a sentence</button>
        <button type="button" role="tab" :aria-selected="mode === 'own'" :class="{ on: mode === 'own' }" @click="setMode('own')">My own text</button>
      </div>

      <div v-if="loading" class="muted" style="padding: 60px 0">Loading…</div>

      <div v-else-if="mode === 'read' && !prompt" style="padding: 40px 0">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px">
          <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
        </svg>
        <h2>You've read every sentence!</h2>
        <p class="muted">Thank you for contributing. More sentences may be added later.</p>
        <button v-if="!redoId" class="btn ghost sm" style="margin-top: 8px" @click="setMode('own')">Record your own text</button>
      </div>

      <template v-else>
        <template v-if="mode === 'own' && !redoId">
          <label for="own-text" class="faint small" style="text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700">
            Type a sentence, then read it aloud
          </label>
          <textarea
            id="own-text" v-model="ownText" class="own-text" rows="3" :maxlength="OWN_MAX"
            :disabled="state === 'recording' || state === 'uploading'"
            placeholder="Write a short sentence in your language, the way you would say it."
          />
          <p class="faint small own-hint">
            Use your own words. Don't include names, phone numbers or other personal details.
            An admin reviews every own-text recording. <span style="float: right">{{ ownText.trim().length }}/{{ OWN_MAX }}</span>
          </p>
        </template>
        <template v-else-if="prompt">
          <span class="faint small" style="text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700">
            {{ redoId ? 'Re-record this sentence' : 'Read this aloud' }}
          </span>
          <p class="prompt-text">{{ prompt.text }}</p>
        </template>

        <div class="mic-wrap">
          <div class="mic-ring" :style="{ transform: `scale(${1 + level * 1.4})`, opacity: state === 'recording' ? 0.6 : 0 }" />
          <button
            class="mic"
            :class="{ live: state === 'recording' }"
            :disabled="state === 'processing' || state === 'uploading' || (mode === 'own' && !redoId && !ownTextOk)"
            :aria-label="state === 'recording' ? 'Stop recording' : 'Start recording'"
            @click="state === 'recording' ? stopRecording() : startRecording()"
          >
            <svg v-if="state !== 'recording'" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
            </svg>
            <span v-else class="stop-square" />
          </button>
        </div>

        <p class="muted small" style="min-height: 20px">
          <template v-if="state === 'recording'">Recording… {{ elapsed.toFixed(1) }}s · tap to stop</template>
          <template v-else-if="state === 'processing'">Processing…</template>
          <template v-else-if="state === 'uploading'">Uploading…</template>
          <template v-else-if="state === 'review'">Listen back, then submit or record again</template>
          <template v-else-if="mode === 'own' && !redoId && !ownTextOk">Type your sentence first</template>
          <template v-else>Tap the mic or press <kbd>Space</kbd> to start</template>
        </p>

        <Transition name="fade">
          <div v-if="clip && (state === 'review' || state === 'uploading')" style="margin-top: 8px">
            <audio :src="clip.url" controls style="width: 100%" />
            <div v-if="warning" class="alert error" style="text-align: left">{{ warning }}</div>
            <div style="display: flex; gap: 10px; margin-top: 16px">
              <button class="btn ghost" style="flex: 1" :disabled="state === 'uploading'" @click="startRecording">↻ Re-record</button>
              <button class="btn" style="flex: 2" :disabled="state === 'uploading' || clip.seconds < MIN_SEC || (mode === 'own' && !redoId && !ownTextOk)" @click="submit">
                {{ state === 'uploading' ? 'Saving…' : 'Submit ✓' }}
              </button>
            </div>
          </div>
        </Transition>

      </template>

      <div v-if="flash && state === 'idle'" class="alert success">{{ flash }}</div>
      <div v-if="error" class="alert error">{{ error }}</div>
    </div>

    <aside class="grid">
      <div v-if="!redoId" class="card side-card">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px">
          <NuxtLink to="/account" class="muted small">Signed in as <b style="color: var(--text)">{{ displayName }}</b></NuxtLink>
          <span class="small"><b class="accent-text" style="font-size: 20px">{{ recorded }}</b><span class="muted"> / {{ total }}</span></span>
        </div>
        <div class="progress"><div :style="{ width: progress + '%' }" /></div>
        <p class="faint small" style="margin: 8px 0 0">sentences recorded</p>
      </div>

      <div class="card side-card">
        <label>Where are you recording?</label>
        <select v-model="environment" :disabled="state === 'recording'">
          <option value="quiet_indoor">Quiet room</option>
          <option value="noisy_indoor">Noisy room</option>
          <option value="outdoor">Outdoors</option>
        </select>
        <NuxtLink v-if="redoId" to="/account" class="btn ghost sm block" style="margin-top: 12px">Cancel re-recording</NuxtLink>
        <button v-else-if="mode === 'read'" class="btn ghost sm block" style="margin-top: 12px" :disabled="!prompt || state === 'recording' || state === 'uploading'" @click="skip">
          Skip this sentence
        </button>
        <NuxtLink to="/account" class="btn ghost sm block" style="margin-top: 8px">My recordings</NuxtLink>
      </div>

      <div class="card side-card">
        <h3 style="margin-bottom: 8px">Tips for a great recording</h3>
        <ul class="muted small" style="margin: 0; padding-left: 18px; line-height: 1.9">
          <li>Find a quiet spot and hold the phone about a hand's width from your mouth.</li>
          <li>Read the sentence exactly as written, at your normal speed.</li>
          <li>If you stumble, just tap <b>Re-record</b>.</li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Inner-page cards are flat: border only, no shadow. */
.card { box-shadow: none; }
.main-card { padding: 40px 36px; min-height: 460px; display: flex; flex-direction: column; justify-content: center; }
.side-card { padding: 20px; }
.prompt-text {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 14px 0 30px;
  padding: 18px 22px; border-radius: 14px;
  /* Same pulsing blue border as the home page cards. */
  border: 1.5px solid var(--primary);
  animation: border-pulse 2.5s ease-in-out infinite;
}
.modes {
  display: inline-flex; align-self: center; gap: 2px; padding: 3px; margin: -12px auto 22px;
  border-radius: 10px; background: var(--soft); border: 1px solid var(--card-border);
}
.modes button {
  border: 0; background: none; font: inherit; font-size: 13px; font-weight: 700; color: var(--muted);
  padding: 6px 14px; border-radius: 7px; cursor: pointer;
}
.modes button.on { background: var(--card); color: var(--link); box-shadow: 0 1px 3px rgba(10, 31, 92, 0.12); }
.own-text {
  margin: 12px 0 6px; min-height: 96px; text-align: center; resize: vertical;
  font-size: clamp(18px, 3.5vw, 22px); font-weight: 600; line-height: 1.4; padding: 14px 16px; border-radius: 14px;
}
.own-hint { margin: 0 0 24px; text-align: left; line-height: 1.5; }
@keyframes border-pulse { 50% { border-color: var(--card-border); } }
@media (prefers-reduced-motion: reduce) { .prompt-text { animation: none; } }
.mic-wrap { position: relative; width: 112px; height: 112px; margin: 0 auto 16px; }
.mic-ring {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--accent); filter: blur(10px);
  transition: transform 0.08s linear, opacity 0.2s;
}
.mic {
  position: relative; width: 100%; height: 100%; border-radius: 50%; border: 0; cursor: pointer;
  background: var(--primary); display: grid; place-items: center;
  box-shadow: 0 14px 32px -12px rgba(19, 52, 143, 0.45);
  transition: transform 0.15s;
}
.mic:hover:not(:disabled) { transform: scale(1.04); }
.mic:disabled { opacity: 0.5; cursor: wait; }
.mic.live { background: #ff2d55; }
.stop-square { width: 28px; height: 28px; border-radius: 6px; background: white; }
kbd {
  font-family: inherit; font-size: 12px; padding: 2px 7px; border-radius: 6px;
  background: var(--soft); border: 1px solid var(--card-border);
}
</style>
