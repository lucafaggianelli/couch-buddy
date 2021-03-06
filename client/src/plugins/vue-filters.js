import Vue from 'vue'

Vue.filter('time', formatTime)
Vue.filter('bytes', formatBytes)

export function formatTime (time, colonsOrLetters = false) {
  const hours = Math.floor(time / 3600)
  let minutes = Math.floor((time - (hours * 3600)) / 60)
  let seconds = Math.round(time - (hours * 3600) - (minutes * 60))

  minutes = minutes.toString().padStart(2, '0')
  seconds = seconds.toString().padStart(2, '0')

  return colonsOrLetters ? `${hours}h ${minutes}m ${seconds}s` : `${hours}:${minutes}:${seconds}`
}

export function formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB' ]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
