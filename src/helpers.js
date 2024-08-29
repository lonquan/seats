export function getColKey(key) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  let result = ''

  while (key >= 0) {
    result = base[key % 26] + result
    key = Math.floor(key / 26) - 1
  }

  return result
}
