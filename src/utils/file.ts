export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return `"${file.name}" 不是图片文件`
  }
  if (file.size > 100 * 1024 * 1024) {
    return `"${file.name}" 超过 100MB，请选择较小的图片`
  }
  return null
}

export function getImageType(file: File): string {
  if (file.type && file.type.startsWith('image/')) {
    return file.type
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    bmp: 'image/bmp',
  }
  return map[ext || ''] || 'image/png'
}
