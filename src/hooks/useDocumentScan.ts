import { useState, useCallback, useRef } from 'react'
import type { Quadrilateral, Point } from '../types'
import {
  loadImageFromBlob,
  imageToImageData,
  detectDocumentCorners,
  perspectiveTransform,
  enhanceScan,
  computeOutputSize,
  scaleCorners,
} from '../utils/scan'

interface ScanState {
  loading: boolean
  progressMessage: string
  originalUrl: string | null
  originalWidth: number
  originalHeight: number
  /** Actual width of the detection-scale image */
  previewWidth: number
  /** Actual height of the detection-scale image */
  previewHeight: number
  /** Corners in preview coordinate space */
  previewCorners: Quadrilateral | null
  /** Corners in original image coordinate space */
  originalCorners: Quadrilateral | null
  resultUrl: string | null
  resultBlob: Blob | null
  error: string | null
}

export default function useDocumentScan() {
  const [state, setState] = useState<ScanState>({
    loading: false,
    progressMessage: '',
    originalUrl: null,
    originalWidth: 0,
    originalHeight: 0,
    previewWidth: 0,
    previewHeight: 0,
    previewCorners: null,
    originalCorners: null,
    resultUrl: null,
    resultBlob: null,
    error: null,
  })
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const onResultRef = useRef<(() => void) | null>(null)

  /** Register a callback to be called when scan result is ready */
  const onResultReady = useCallback((fn: () => void) => {
    onResultRef.current = fn
  }, [])

  /** Load file and auto-detect corners */
  const loadFile = useCallback(async (file: File) => {
    setState(s => ({
      ...s,
      loading: true,
      progressMessage: '正在分析图像…',
      error: null,
    }))

    try {
      const url = URL.createObjectURL(file)
      const img = await loadImageFromBlob(file)
      originalImageRef.current = img

      const origW = img.naturalWidth
      const origH = img.naturalHeight

      // Detect corners on scaled-down version
      const { imageData } = imageToImageData(img, 600)
      const previewW = imageData.width
      const previewH = imageData.height

      const previewCorners = detectDocumentCorners(imageData, previewW, previewH)

      // Scale corners back to original coordinates
      const originalCorners = scaleCorners(
        previewCorners,
        { width: previewW, height: previewH },
        { width: origW, height: origH }
      )

      setState({
        loading: false,
        progressMessage: '检测完成，可拖拽角点调整区域',
        originalUrl: url,
        originalWidth: origW,
        originalHeight: origH,
        previewWidth: previewW,
        previewHeight: previewH,
        previewCorners,
        originalCorners,
        resultUrl: null,
        resultBlob: null,
        error: null,
      })
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '图像加载失败',
      }))
    }
  }, [])

  /** Update one corner (point is in preview coordinate space) */
  const updatePreviewCorner = useCallback((corner: keyof Quadrilateral, point: Point) => {
    setState(s => {
      if (!s.previewCorners || !s.originalCorners || !s.previewWidth) return s
      const newPreview = { ...s.previewCorners, [corner]: point }
      // Scale from preview space to original space using actual preview dimensions
      const sx = s.originalWidth / s.previewWidth
      const sy = s.originalHeight / s.previewHeight
      const newOriginal = {
        ...s.originalCorners,
        [corner]: { x: Math.round(point.x * sx), y: Math.round(point.y * sy) },
      }
      return { ...s, previewCorners: newPreview, originalCorners: newOriginal }
    })
  }, [])

  /** Apply perspective transform and produce result */
  const applyTransform = useCallback(async () => {
    const img = originalImageRef.current
    const corners = state.originalCorners
    if (!img || !corners) return

    setState(s => ({
      ...s,
      loading: true,
      progressMessage: '正在进行透视矫正…',
      error: null,
    }))

    // Yield to let the UI update before heavy computation
    await new Promise(r => setTimeout(r, 50))

    try {
      // Draw original image to canvas
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Compute output size (max 1200 for fast processing)
      const outSize = computeOutputSize(corners, 1200)

      // Apply perspective transform
      const transformed = perspectiveTransform(
        srcData,
        canvas.width,
        canvas.height,
        corners,
        outSize.width,
        outSize.height
      )

      // Enhance
      enhanceScan(transformed)

      // Render to canvas and export
      const outCanvas = document.createElement('canvas')
      outCanvas.width = outSize.width
      outCanvas.height = outSize.height
      const outCtx = outCanvas.getContext('2d')!
      outCtx.putImageData(transformed, 0, 0)

      const blob = await new Promise<Blob | null>(res => outCanvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Failed to create output image')

      const resultUrl = URL.createObjectURL(blob)

      setState(s => ({
        ...s,
        loading: false,
        progressMessage: '处理完成',
        resultUrl,
        resultBlob: blob,
      }))

      // Notify that result is ready (for auto-scroll etc.)
      onResultRef.current?.()
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '透视矫正失败',
      }))
    }
  }, [state.originalCorners])

  const reset = useCallback(() => {
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl)
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
    originalImageRef.current = null
    setState({
      loading: false,
      progressMessage: '',
      originalUrl: null,
      originalWidth: 0,
      originalHeight: 0,
      previewWidth: 0,
      previewHeight: 0,
      previewCorners: null,
      originalCorners: null,
      resultUrl: null,
      resultBlob: null,
      error: null,
    })
  }, [state.originalUrl, state.resultUrl])

  return {
    ...state,
    loadFile,
    updatePreviewCorner,
    applyTransform,
    onResultReady,
    reset,
  }
}
