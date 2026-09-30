<script setup lang="ts">
useHead({ title: 'Terms and conditions · Nzeru AI' })

// DRAFT: written from what the app actually does. Have it reviewed before launch.
const UPDATED = '30 September 2026'
</script>

<template>
  <article class="terms narrow">
    <h1>Terms and <span class="accent-text">conditions</span></h1>
    <p class="faint small">Last updated {{ UPDATED }}</p>

    <p>
      Nzeru AI collects voice recordings of people reading short sentences, to build an open
      speech dataset for African languages. By contributing, you agree to the terms below.
    </p>

    <h2>1. Who can contribute</h2>
    <p>You must be 18 or older, and you must record only your own voice.</p>

    <h2>2. What we collect</h2>
    <ul>
      <li>Your recordings, saved as 16 kHz mono audio with silence trimmed from both ends.</li>
      <li>The sentence you read, and when and on what kind of device you recorded it.</li>
      <li>Profile details: your country, region, first language, the language you record in, gender and age group. You can answer "Prefer not to say" for gender and age group.</li>
      <li>Your email address and a password, so you can sign in. The password is stored only as a secure hash.</li>
      <li>A preferred name and a photo, only if you choose to add them.</li>
    </ul>
    <p>
      In the dataset you are identified only by an anonymous speaker ID, such as spk001.
      Your email, preferred name and photo are never included in the dataset.
    </p>

    <h2>3. How recordings are used</h2>
    <p>
      Recordings are reviewed and may be added to an open dataset. The dataset is shared
      publicly, so researchers and developers can use it to train and evaluate speech
      technology such as speech recognition.
    </p>

    <h2>4. Your consent</h2>
    <p>
      Nothing is recorded until you agree to these terms. You can skip any sentence, and you
      can stop contributing at any time.
    </p>

    <h2>5. Your rights</h2>
    <p>
      Signed in, you can play, re-record or delete any of your recordings from your account page
      at any time. Deleting a recording removes it and its audio from our dataset. Recordings already included in a published version of the dataset may remain in copies
      that others have downloaded.
    </p>

    <h2>6. Your own text</h2>
    <p>
      You can record a sentence you type yourself. It must be your own words, or text you have the
      right to share. An admin reviews every own-text recording, may correct spelling in the text,
      and may reject it. Accepted text and recordings are shared under these same terms.
    </p>

    <h2>7. What you must not do</h2>
    <p>Do not record other people without their permission, or include personal or offensive content.</p>

    <h2>8. Changes</h2>
    <p>We may update these terms. The date at the top shows when they last changed.</p>

    <NuxtLink to="/" class="btn ghost" style="margin-top: 12px">Back to home</NuxtLink>
  </article>
</template>

<style scoped>
.terms { margin: 0 auto; padding-top: 12px; }
.terms h1 { font-size: clamp(30px, 4vw, 40px); }
.terms h2 { font-size: 17px; margin: 28px 0 6px; }
.terms p, .terms li { color: var(--muted); font-size: 15px; line-height: 1.65; }
.terms ul { padding-left: 20px; margin: 0; }
.terms li::marker { color: var(--gold-500); }
</style>
