<script setup lang="ts">
useHead({ title: 'Create account · Nzeru AI' })
const { signedIn } = useAccount()
const router = useRouter()

// Already signed in: nothing to create.
onMounted(() => { if (signedIn.value) router.replace('/record') })
</script>

<template>
  <div class="auth">
    <SignupFlow />
  </div>
</template>

<style scoped>
/* Same layout as the sign-in page. */
.auth { display: grid; place-items: center; padding: 32px 0; }
</style>
