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
  /** Original image display URL */
  originalUrl: string | null
  /** Original image pixel dimensions */
  imgWidth: number
  imgHeight: number
  /** Corners in ORIGINAL image pixel coordinates — the single source of truth */
  corners: Quadrilateral | null
  /** Scan result */
  resultBlob: Blob | null
  resultUrl: string | null
  /** Whether adjust mode is active */
  adjusting: boolean
  error: string | null
}

export default function useDocumentScan() {
  const [state, setState] = useState<ScanState>({
    loading: false,
    progressMessage: '',
    originalUrl: null,
    imgWidth: 0,
    imgHeight: 0,
    corners: null,
    resultBlob: null,
    resultUrl: null,
    adjusting: false,
    error: null,
  })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const cornersRef = useRef<Quadrilateral | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Core transform: given original-space corners, produce scan blob */
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
    outCtx(outCanvas).putImageData(transformed, 0, 0)

    return new Promise<Blob | null>(res => outCanvas.toBlob(res, 'image/png'))
  }, [])

  /** Run scan with current corners from ref */
  const runScan = useCallback(async () => {
    const img = imgRef.current
    const corners = cornersRef.current
    if (!img || !corners) return

    setState(s => ({ ...s, loading: true, progressMessage: '正在扫描…', error: null }))
    try {
      await new Promise(r => setTimeout(r, 30))
      const blob = await doTransform(img, corners)
      if (!blob) throw new Error('处理失败')
      const resultUrl = blob ? URL.createObjectURL(blob) : null
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

  /** Load file: auto-detect corners in ORIGINAL coordinates, auto-scan */
  const loadFile = useCallback(async (file: File) => {
    setState(s => ({ ...s, loading: true, progressMessage: '正在分析图像…', adjusting: false, error: null }))

    try {
      const url = URL.createObjectURL(file)
      const img = await loadImageFromBlob(file)
      imgRef.current = img

      const origW = img.naturalWidth
      const origH = img.naturalHeight

      // Detect on small version, then scale corners to original coordinates
      const { imageData } = imageToImageData(img, 600)
      const previewW = imageData.width
      const previewH = imageData.height
      const previewCorners = detectDocumentCorners(imageData, previewW, previewH)
      const corners = scaleCorners(previewCorners, { width: previewW, height: previewH }, { width: origW, height: origH })
      cornersRef.current = corners

      // Auto-scan
      const blob = await doTransform(img, corners)
      const resultUrl = blob ? URL.createObjectURL(blob) : null

      setState({
        loading: false,
        progressMessage: '',
        originalUrl: url,
        imgWidth: origW,
        imgHeight: origH,
        corners,
        resultBlob: blob,
        resultUrl,
        adjusting: false,
        error: null,
      })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : '图像加载失败' }))
    }
  }, [doTransform])

  const startAdjust = useCallback(() => setState(s => ({ ...s, adjusting: true })), [])
  const finishAdjust = useCallback(() => setState(s => ({ ...s, adjusting: false })), [])

  /**
   * Update one corner — point is in ORIGINAL image pixel coordinates.
   * This is the single source of truth: what you see is what gets scanned.
   */
  const updateCorner = useCallback((corner: keyof Quadrilateral, point: Point) => {
    setState(s => {
      if (!s.corners) return s
      const clamped: Point = {
        x: Math.round(Math.max(0, Math.min(s.imgWidth, point.x))),
        y: Math.round(Math.max(0, Math.min(s.imgHeight, point.y))),
      }
      const newCorners: Quadrilateral = { ...s.corners, [corner]: clamped }
      cornersRef.current = newCorners
      return { ...s, corners: newCorners }
    })

    // Debounced auto-scan
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runScan(), 800)
  }, [runScan])

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
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92))
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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl)
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl)
    imgRef.current = null
    cornersRef.current = null
    setState({
      loading: false,
      progressMessage: '',
      originalUrl: null,
      imgWidth: 0,
      imgHeight: 0,
      corners: null,
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
    updateCorner,
    manualScan,
    generateOutput,
    reset,
  }
}

/** tiny helper */
function outCtx(c: HTMLCanvasElement) {
  return c.getContext('2d')!
}
