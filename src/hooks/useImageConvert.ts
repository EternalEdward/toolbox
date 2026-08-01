import { useState, useCallback } from 'react'
import type { ImageFormat } from '../types'
import { loadImage } from '../utils/image'

interface ConvertState {
  loading: boolean
  result: {
    blob: Blob
    previewUrl: string
    originalFormat: string
    targetFormat: string
  } | null
  error: string | null
}

export default function useImageConvert() {
  const [state, setState] = useState<ConvertState>({
    loading: false,
    result: null,
    error: null,
  })

  const convert = useCallback(async (file: File, targetFormat: ImageFormat) => {
    setState({ loading: true, result: null, error: null })

    try {
      const url = URL.createObjectURL(file)
      const img = await loadImage(url)
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => {
            if (b) resolve(b)
            else reject(new Error('转换失败'))
          },
          targetFormat,
          0.92,
        )
      })

      const previewUrl = URL.createObjectURL(blob)

      setState({
        loading: false,
        result: {
          blob,
          previewUrl,
          originalFormat: file.type || 'image/png',
          targetFormat,
        },
        error: null,
      })
    } catch (err) {
      setState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : '转换失败，请重试',
      })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null })
  }, [])

  return { ...state, convert, reset }
}
