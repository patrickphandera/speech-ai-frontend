export type Me = {
  speaker_id: string, email: string, preferred_name: string, country: string, region: string,
  dialect: string, native_language: string, record_language: string, gender: string, age_group: string,
  show_photo: boolean, has_photo: boolean, profile_complete: boolean, recorded: number,
}

/** The signed-in contributor, shared across pages. */
export function useAccount() {
  const { api, speakerToken, setSpeakerToken } = useApi()
  const me = useState<Me | null>('me', () => null)
  const signedIn = computed(() => !!speakerToken.value)

  async function loadMe() {
    if (!speakerToken.value) {
      me.value = null
      return null
    }
    try {
      me.value = await api<Me>('/api/me')
    } catch {
      me.value = null
    }
    return me.value
  }

  function signIn(token: string) {
    setSpeakerToken(token)
    return loadMe()
  }

  function signOut() {
    setSpeakerToken('')
    me.value = null
  }

  const displayName = computed(() => me.value?.preferred_name || me.value?.speaker_id || '')

  return { me, signedIn, displayName, loadMe, signIn, signOut }
}
