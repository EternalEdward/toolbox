import { useState, useCallback, useRef } from 'react'

interface BgRemovalState {
  loading: boolean
  progressMessage: string
  progressPercent: number
  resultBlob: Blob | null
  resultUrl: string | null
  error: string | null
}

export default function useBackgroundRemoval() {
  const [state, setState] = useState<BgRemovalState>({
    loading: false,
    progressMessage: '',
    progressPercent: 0,
    resultBlob: null,
    resultUrl: null,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const removeBackground = useCallback(async (imageBlob: Blob) => {
    setState({
      loading: true,
      progressMessage: '正在加载 AI 模型（约 40MB），首次使用请耐心等待…',
      progressPercent: 0,
      resultBlob: null,
      resultUrl: null,
      error: null,
    })

    abortRef.current = new AbortController()

    try {
      // Dynamic import to avoid loading the heavy library on initial page load
      const { removeBackground: imglyRemoveBg } = await import('@imgly/background-removal')

      setState(s => ({
        ...s,
        progressMessage: '正在处理图片…',
        progressPercent: 30,
      }))

      const resultBlob = await imglyRemoveBg(imageBlob, {
        model: 'isnet_quint8',
        device: 'cpu',
        output: {
          format: 'image/png',
        },
        progress: (key: string, current: number, total: number) => {
          // Map internal progress to UI messages
          let message = '正在处理…'
          let percent = 30

          if (key.includes('download') || key.includes('fetch')) {
            message = '正在下载模型文件…'
            percent = Math.round((current / total) * 30)
          } else if (key.includes('compute') || key.includes('run')) {
            message = 'AI 正在分析图片…'
            percent = 30 + Math.round((current / total) * 60)
          }

          setState(s => ({
            ...s,
            progressMessage: message,
            progressPercent: percent,
          }))
        },
      })

      const resultUrl = URL.createObjectURL(resultBlob)

      setState({
        loading: false,
        progressMessage: '处理完成！',
        progressPercent: 100,
        resultBlob,
        resultUrl,
        error: null,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState(s => ({ ...s, loading: false, error: null }))
        return
      }
      setState({
        loading: false,
        progressMessage: '',
        progressPercent: 0,
        resultBlob: null,
        resultUrl: null,
        error: err instanceof Error ? err.message : '背景移除失败，请重试',
      })
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
    setState({
      loading: false,
      progressMessage: '',
      progressPercent: 0,
      resultBlob: null,
      resultUrl: null,
      error: null,
    })
  }, [state.resultUrl])

  return { ...state, removeBackground, cancel, reset }
}
