export const TARGET_RATE = 16000

/** Decode any browser recording, then resample to 16 kHz mono and trim silence. */
export async function toMono16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  await ctx.close()
  const length = Math.ceil(decoded.duration * TARGET_RATE)
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return trimSilence(rendered.getChannelData(0))
}

/** Remove leading/trailing silence, keeping a little padding around the speech. */
export function trimSilence(samples: Float32Array, threshold = 0.015, padSec = 0.25): Float32Array {
  const win = Math.floor(TARGET_RATE * 0.02)
  const loud = (i: number) => {
    let sum = 0
    for (let j = i; j < Math.min(i + win, samples.length); j++) sum += samples[j] * samples[j]
    return Math.sqrt(sum / win) > threshold
  }
  let start = 0
  while (start < samples.length && !loud(start)) start += win
  let end = samples.length - win
  while (end > start && !loud(end)) end -= win
  if (start >= end) return samples
  const pad = Math.floor(TARGET_RATE * padSec)
  return samples.slice(Math.max(0, start - pad), Math.min(samples.length, end + win + pad))
}

export function peakLevel(samples: Float32Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  return peak
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
