import { useState, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

interface CompressState {
  loading: boolean
  result: {
    blob: Blob
    previewUrl: string
    originalSize: number
    compressedSize: number
  } | null
  error: string | null
}

export default function useImageCompress() {
  const [state, setState] = useState<CompressState>({
    loading: false,
    result: null,
    error: null,
  })

  const compress = useCallback(async (file: File, quality: number) => {
    setState({ loading: true, result: null, error: null })

    try {
      const compressedBlob = await imageCompression(file, {
        maxSizeMB: 20,
        maxWidthOrHeight: 4096,
        initialQuality: quality / 100,
        useWebWorker: true,
        fileType: file.type || 'image/jpeg',
      })

      const previewUrl = URL.createObjectURL(compressedBlob)

      setState({
        loading: false,
        result: {
          blob: compressedBlob,
          previewUrl,
          originalSize: file.size,
          compressedSize: compressedBlob.size,
        },
        error: null,
      })
    } catch (err) {
      setState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : '压缩失败，请重试',
      })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null })
  }, [])

  return { ...state, compress, reset }
}
