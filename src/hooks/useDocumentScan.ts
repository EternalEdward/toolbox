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

export type OutputFormat = 'png' | 'jpg' | 'pdf'

interface ScanState {
  loading: boolean
  progressMessage: string
  originalUrl: string | null
  originalWidth: number
  originalHeight: number
  previewWidth: number
  previewHeight: number
  previewCorners: Quadrilateral | null
  originalCorners: Quadrilateral | null
  resultBlob: Blob | null
  resultUrl: string | null
  /** Whether corners should be shown for adjustment */
  adjusting: boolean
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
    resultBlob: null,
    resultUrl: null,
    adjusting: false,
    error: null,
  })
  const originalImageRef = useRef<HTMLImageElement | null>(null)
  const cornersRef = useRef<Quadrilateral | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Core transform logic */
  const doTransform = useCallback(async (
    img: HTMLImageElement,
    corners: Quadrilateral
  ): Promise<Blob | null> => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const outSize = computeOutputSize(corners, 1200)

    const transformed = perspectiveTransform(
      srcData, canvas.width, canvas.height,
      corners, outSize.width, outSize.height
    )
    enhanceScan(transformed)

    const outCanvas = document.createElement('canvas')
    outCanvas.width = outSize.width
    outCanvas.height = outSize.height
    const outCtx = outCanvas.getContext('2d')!
    outCtx.putImageData(transformed, 0, 0)

    return new Promise<Blob | null>(res => outCanvas.toBlob(res, 'image/png'))
  }, [])

  /** Load file, auto-detect corners, and auto-scan once */
  const loadFile = useCallback(async (file: File) => {
    setState(s => ({
      ...s,
      loading: true,
      progressMessage: '正在分析图像…',
      error: null,
      adjusting: false,
    }))

    try {
      const url = URL.createObjectURL(file)
      const img = await loadImageFromBlob(file)
      originalImageRef.current = img

      const origW = img.naturalWidth
      const origH = img.naturalHeight

      const { imageData } = imageToImageData(img, 600)
      const previewW = imageData.width
      const previewH = imageData.height

      const previewCorners = detectDocumentCorners(imageData, previewW, previewH)
      const originalCorners = scaleCorners(
        previewCorners,
        { width: previewW, height: previewH },
        { width: origW, height: origH }
      )
      cornersRef.current = originalCorners

      // Auto-scan immediately
      const blob = await doTransform(img, originalCorners)
      const resultUrl = blob ? URL.createObjectURL(blob) : null

      setState({
        loading: false,
        progressMessage: '',
        originalUrl: url,
        originalWidth: origW,
        originalHeight: origH,
        previewWidth: previewW,
        previewHeight: previewH,
        previewCorners,
        originalCorners,
        resultBlob: blob,
        resultUrl,
        adjusting: false,
        error: null,
      })
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '图像加载失败',
      }))
    }
  }, [doTransform])

  /** Enter adjustment mode — show corners overlay */
  const startAdjust = useCallback(() => {
    setState(s => ({ ...s, adjusting: true }))
  }, [])

  /** Exit adjustment mode */
  const finishAdjust = useCallback(() => {
    setState(s => ({ ...s, adjusting: false }))
  }, [])

  /** Run the actual scan using refs (bypasses stale closures) */
  const runScan = useCallback(async () => {
    const img = originalImageRef.current
    const corners = cornersRef.current
    if (!img || !corners) return

    setState(s => ({ ...s, loading: true, progressMessage: '正在扫描…', error: null }))
    try {
      await new Promise(r => setTimeout(r, 30))
      const blob = await doTransform(img, corners)
      if (!blob) throw new Error('处理失败')
      const resultUrl = URL.createObjectURL(blob)
      setState(s => ({
        ...s,
        loading: false,
        progressMessage: '',
        resultBlob: blob,
        resultUrl,
      }))
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : '处理失败',
      }))
    }
  }, [doTransform])

  /** Update one corner and schedule debounced auto-scan */
  const updatePreviewCorner = useCallback((corner: keyof Quadrilateral, point: Point) => {
    setState(s => {
      if (!s.previewCorners || !s.originalCorners || !s.previewWidth) return s
      const newPreview = { ...s.previewCorners, [corner]: point }
      const sx = s.originalWidth / s.previewWidth
      const sy = s.originalHeight / s.previewHeight
      const newOriginal: Quadrilateral = {
        ...s.originalCorners,
        [corner]: { x: Math.round(point.x * sx), y: Math.round(point.y * sy) },
      }
      cornersRef.current = newOriginal
      return { ...s, previewCorners: newPreview, originalCorners: newOriginal }
    })

    // Debounced auto-scan: 800ms after last corner move
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runScan(), 800)
  }, [runScan])

  /** Manually trigger scan immediately (clears debounce) */
  const manualScan = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    await runScan()
  }, [runScan])

  /** Generate output in requested format */
  const generateOutput = useCallback(async (format: OutputFormat): Promise<{ blob: Blob; filename: string } | null> => {
    if (!state.resultBlob) return null

    if (format === 'png') {
      return { blob: state.resultBlob, filename: 'scanned_document.png' }
    }

    const img = await loadImageFromBlob(state.resultBlob)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!

    if (format === 'jpg') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, 'image/jpeg', 0.92)
      )
      if (!blob) return null
      return { blob, filename: 'scanned_document.jpg' }
    }

    // PDF
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    })
    pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height)
    const blob = pdf.output('blob')
    return { blob, filename: 'scanned_document.pdf' }
  }, [state.resultBlob])

  const reset = useCallback(() => {
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl)
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
    originalImageRef.current = null
    cornersRef.current = null
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
      resultBlob: null,
      resultUrl: null,
      adjusting: false,
      error: null,
    })
  }, [state.originalUrl, state.resultUrl])

  return {
    ...state,
    loadFile,
    startAdjust,
    finishAdjust,
    updatePreviewCorner,
    manualScan,
    generateOutput,
    reset,
  }
}
