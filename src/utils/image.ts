export function urlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then(r => r.blob())
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)
  return loadImage(url).then(img => {
    URL.revokeObjectURL(url)
    return { width: img.naturalWidth, height: img.naturalHeight }
  })
}

export async function detectAvifEncodeSupport(): Promise<boolean> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/avif'))
    return blob?.type === 'image/avif'
  } catch {
    return false
  }
}

export function getOutputFileName(originalName: string, format: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, '')
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
  }
  const ext = extMap[format] || 'png'
  return `${baseName}.${ext}`
}
