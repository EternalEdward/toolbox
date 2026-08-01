import { useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import type { PaperSize } from '../types'
import { PAPER_SIZES, MAX_RENDER_DIMENSION } from '../constants'
import { loadImage } from '../utils/image'

interface PdfState {
  generating: boolean
  progress: number
  error: string | null
}

export default function useImageToPdf() {
  const [state, setState] = useState<PdfState>({
    generating: false,
    progress: 0,
    error: null,
  })

  const generate = useCallback(async (
    imageFiles: { file: File; previewUrl: string }[],
    paperSize: PaperSize,
  ) => {
    if (imageFiles.length === 0) {
      setState({ generating: false, progress: 0, error: '请先添加图片' })
      return
    }

    setState({ generating: true, progress: 0, error: null })

    try {
      const config = PAPER_SIZES[paperSize]
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [config.width, config.height],
      })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < imageFiles.length; i++) {
        const img = await loadImage(imageFiles[i].previewUrl)

        // Downscale large images to avoid memory issues
        let imgW = img.naturalWidth
        let imgH = img.naturalHeight
        if (Math.max(imgW, imgH) > MAX_RENDER_DIMENSION) {
          const scale = MAX_RENDER_DIMENSION / Math.max(imgW, imgH)
          imgW = Math.round(imgW * scale)
          imgH = Math.round(imgH * scale)
        }

        if (i > 0) {
          pdf.addPage()
        }

        const isCanvas = img instanceof HTMLCanvasElement
        const dataUrl = isCanvas ? (img as HTMLCanvasElement).toDataURL('image/jpeg', 0.92) : ''

        if (isCanvas) {
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH)
        } else {
          // Draw onto canvas first to downscale
          const canvas = document.createElement('canvas')
          canvas.width = imgW
          canvas.height = imgH
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, imgW, imgH)
          const scaledDataUrl = canvas.toDataURL('image/jpeg', 0.92)

          // Fit to page while maintaining aspect ratio
          const scale = Math.min(pageW / imgW, pageH / imgH)
          const drawW = imgW * scale
          const drawH = imgH * scale
          const x = (pageW - drawW) / 2
          const y = (pageH - drawH) / 2

          pdf.addImage(scaledDataUrl, 'JPEG', x, y, drawW, drawH)
        }

        setState(s => ({
          ...s,
          progress: Math.round(((i + 1) / imageFiles.length) * 100),
        }))
      }

      const pdfBlob = pdf.output('blob')
      const url = URL.createObjectURL(pdfBlob)

      // Trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = 'images.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setState({ generating: false, progress: 100, error: null })
    } catch (err) {
      setState({
        generating: false,
        progress: 0,
        error: err instanceof Error ? err.message : '生成 PDF 失败，请重试',
      })
    }
  }, [])

  return { ...state, generate }
}
