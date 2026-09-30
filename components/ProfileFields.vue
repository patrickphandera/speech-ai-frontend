<script setup lang="ts">
// Profile fields shared by the sign-up form and the account page. `form` is the parent's
// reactive object; the fields write straight into it. The photo is kept by the parent.
type ProfileForm = {
  preferred_name: string, country: string, region: string, dialect: string,
  native_language: string, record_language: string, gender: string, age_group: string, show_photo: boolean,
}
// `required` marks the fields a contributor must fill in before recording (all but the photo).
const props = defineProps<{ form: ProfileForm, photoUrl?: string, hasPhoto?: boolean, required?: boolean }>()
const emit = defineEmits<{ pick: [photo: Blob], remove: [], error: [message: string] }>()
const { api } = useApi()

// Region: a list per country, plus "Other" with a free-text box.
const OTHER = '__other__'
const regions = computed(() => AFRICAN_COUNTRIES.find(c => c.code === props.form.country)?.regions ?? [])
const regionChoice = ref('')
const regionOther = ref('')
function syncRegionFromForm() {
  const r = props.form.region
  if (!r) regionChoice.value = ''
  else if (regions.value.includes(r)) regionChoice.value = r
  else { regionChoice.value = OTHER; regionOther.value = r }
}
syncRegionFromForm()
watch(() => props.form.country, (now, before) => {
  if (before !== undefined && now !== before) { regionChoice.value = ''; regionOther.value = '' }
})
watch([regionChoice, regionOther], () => {
  props.form.region = regionChoice.value === OTHER ? regionOther.value.trim() : regionChoice.value
})

// Only languages that have sentences to read can be chosen for recording.
const recordLanguages = ref<{ language: string, prompts: number }[]>([])
const languagesError = ref(false)
onMounted(async () => {
  try {
    const { languages } = await api('/api/prompt-languages')
    recordLanguages.value = languages
    if (!languages.some((l: { language: string }) => l.language === props.form.record_language)) {
      props.form.record_language = languages[0]?.language ?? ''
    }
  } catch {
    languagesError.value = true
  }
})

const photoInput = ref<HTMLInputElement>()
async function pickPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (photoInput.value) photoInput.value.value = ''
  if (!file) return
  try {
    emit('pick', await squarePhoto(file))
  } catch {
    emit('error', 'Could not read that image. Try a JPEG or PNG.')
  }
}
</script>

<template>
  <div class="profile-row">
    <!-- Click the picture to choose or change the photo. -->
    <button type="button" class="photo-preview" :aria-label="hasPhoto ? 'Change profile photo' : 'Choose a profile photo'"
            :title="hasPhoto ? 'Change photo' : 'Choose a photo'" @click="photoInput?.click()">
      <img v-if="photoUrl" :src="photoUrl" alt="Your photo">
      <img v-else src="~/assets/images/default-avatar.webp" alt="" class="default-avatar">
      <span class="photo-edit" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.5" />
        </svg>
      </span>
    </button>
    <div class="profile-fields">
      <label for="f-name">Preferred name</label>
      <input id="f-name" v-model="form.preferred_name" :required="required" maxlength="64" placeholder="What should we call you?" autocomplete="nickname">
      <button v-if="hasPhoto" type="button" class="link-btn" style="margin-top: 6px" @click="emit('remove')">Remove photo</button>
    </div>
    <input ref="photoInput" type="file" accept="image/*" hidden @change="pickPhoto">
  </div>
  <label v-if="hasPhoto" class="check" style="margin: -6px 0 14px">
    <input v-model="form.show_photo" type="checkbox">
    <span>Show my photo on the community board</span>
  </label>

  <div class="grid grid-2">
    <div>
      <label for="f-country">Country</label>
      <select id="f-country" v-model="form.country" :required="required">
        <option value="">Select a country</option>
        <option v-for="c in AFRICAN_COUNTRIES" :key="c.code" :value="c.code">{{ c.name }}</option>
      </select>
    </div>
    <div>
      <label for="f-region">Region / province</label>
      <select id="f-region" v-model="regionChoice" :disabled="!form.country" :required="required">
        <option value="">{{ form.country ? 'Select a region' : 'Choose a country first' }}</option>
        <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
        <option v-if="form.country" :value="OTHER">Other / not listed</option>
      </select>
    </div>
    <div v-if="regionChoice === OTHER" style="grid-column: 1 / -1">
      <label for="f-region-other">Your region</label>
      <input id="f-region-other" v-model="regionOther" :required="required" maxlength="64" placeholder="Type your region or district">
    </div>

    <div>
      <label for="f-native">First language</label>
      <select id="f-native" v-model="form.native_language" :required="required">
        <option value="">Select a language</option>
        <option v-for="l in AFRICAN_LANGUAGES" :key="l.code" :value="l.code">{{ l.name }}</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div>
      <label for="f-record">Language you'll record in</label>
      <select id="f-record" v-model="form.record_language" :disabled="!recordLanguages.length" :required="required">
        <option v-if="!recordLanguages.length" value="">{{ languagesError ? 'Could not load languages' : 'Loading…' }}</option>
        <option v-for="l in recordLanguages" :key="l.language" :value="l.language">
          {{ languageName(l.language) }} · {{ l.prompts }} sentence{{ l.prompts === 1 ? '' : 's' }}
        </option>
      </select>
    </div>

    <div>
      <label for="f-gender">Gender</label>
      <select id="f-gender" v-model="form.gender" :required="required">
        <option value="">Select</option>
        <option value="prefer_not">Prefer not to say</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div>
      <label for="f-age">Age group</label>
      <select id="f-age" v-model="form.age_group" :required="required">
        <option value="">Select</option>
        <option value="prefer_not">Prefer not to say</option>
        <option>18-24</option><option>25-34</option><option>35-44</option>
        <option>45-54</option><option>55-64</option><option>65+</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.profile-row { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
.profile-fields { flex: 1; min-width: 0; }
.link-btn { border: 0; background: none; padding: 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--link); cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
.photo-preview {
  width: 64px; height: 64px; flex: none; border-radius: 50%; overflow: hidden; cursor: pointer; padding: 0;
  border: 1px solid var(--card-border); background: var(--accent);
}
.photo-preview { position: relative; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Camera badge that appears on hover, so it's clear the picture can be changed. */
.photo-edit {
  position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%;
  background: rgba(12, 14, 28, 0.45); color: white; opacity: 0; transition: opacity 0.15s;
}
.photo-edit svg { width: 20px; height: 20px; }
.photo-preview:hover .photo-edit, .photo-preview:focus-visible .photo-edit { opacity: 1; }
/* Shown until the speaker picks a photo. */
.default-avatar { object-fit: cover; }
label { font-size: 13px; margin-bottom: 4px; }
input:not([type="checkbox"]), select { font-size: 14px; padding: 8px 11px; border-radius: 8px; }
select:disabled { opacity: 0.6; cursor: not-allowed; }
.grid { gap: 12px; }
.check { font-size: 13px; line-height: 1.5; }
.check input { width: 16px; height: 16px; margin-top: 1px; }
</style>
