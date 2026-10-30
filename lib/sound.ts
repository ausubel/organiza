let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/** Must be called from a user gesture once so browsers allow later playback. */
export function unlockAudio() {
  const audio = getContext()
  if (audio?.state === 'suspended') void audio.resume()
}

export function playAlarm(times = 3) {
  const audio = getContext()
  if (!audio) return
  const start = audio.currentTime + 0.05
  for (let i = 0; i < times; i++) {
    for (const [offset, freq] of [
      [0, 880],
      [0.18, 1175],
    ] as const) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const t = start + i * 0.6 + offset
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.17)
    }
  }
}

export function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icon-192.png' })
  } catch {
    // Some mobile browsers only allow notifications through the service worker.
  }
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}
