import { useState, useCallback, useRef, useEffect } from 'react'
import type { Quadrilateral, Point } from '../../types'
import type { OutputFormat } from '../../hooks/useDocumentScan'
import ImageDropzone from '../ui/ImageDropzone'
import ImagePreview from '../ui/ImagePreview'
import LoadingOverlay from '../ui/LoadingOverlay'
import useDocumentScan from '../../hooks/useDocumentScan'
import { validateImageFile, formatBytes } from '../../utils/file'
import { saveAs } from 'file-saver'

const PREVIEW_MAX = 600
const DOT_SIZE = 20

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'pdf', label: 'PDF' },
]

export default function DocumentScanner() {
  const [file, setFile] = useState<File | null>(null)
  const {
    loading,
    progressMessage,
    originalUrl,
    imgWidth,
    imgHeight,
    corners,
    resultUrl,
    resultBlob,
    adjusting,
    error,
    loadFile,
    startAdjust,
    finishAdjust,
    updateCorner,
    manualScan,
    generateOutput,
    reset: resetScan,
  } = useDocumentScan()

  const [draggingCorner, setDraggingCorner] = useState<keyof Quadrilateral | null>(null)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png')
  const [generating, setGenerating] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgDisplay, setImgDisplay] = useState({ w: 0, h: 0 })

  const updateImgSize = useCallback(() => {
    if (imgRef.current) {
      setImgDisplay({
        w: imgRef.current.clientWidth,
        h: imgRef.current.clientHeight,
      })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateImgSize)
    return () => window.removeEventListener('resize', updateImgSize)
  }, [updateImgSize])

  /**
   * Convert corner from ORIGINAL image pixel coords to DISPLAY pixel coords.
   * One-step mapping: no intermediate preview space.
   * The displayed <img> shows the original image scaled by CSS.
   */
  const toDisplay = useCallback(
    (p: Point): Point => {
      if (!imgWidth || !imgHeight || imgDisplay.w === 0) return p
      return {
        x: (p.x / imgWidth) * imgDisplay.w,
        y: (p.y / imgHeight) * imgDisplay.h,
      }
    },
    [imgWidth, imgHeight, imgDisplay]
  )

  /** Convert display pixel coords back to original image pixel coords */
  const fromDisplay = useCallback(
    (dx: number, dy: number): Point => {
      if (!imgWidth || !imgHeight || imgDisplay.w === 0) return { x: dx, y: dy }
      return {
        x: (dx / imgDisplay.w) * imgWidth,
        y: (dy / imgDisplay.h) * imgHeight,
      }
    },
    [imgWidth, imgHeight, imgDisplay]
  )

  const handlePointerDown = useCallback(
    (corner: keyof Quadrilateral) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDraggingCorner(corner)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingCorner || !containerRef.current) return
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const dx = e.clientX - rect.left
      const dy = e.clientY - rect.top
      const origPt = fromDisplay(
        Math.max(0, Math.min(imgDisplay.w, dx)),
        Math.max(0, Math.min(imgDisplay.h, dy))
      )
      updateCorner(draggingCorner, origPt)
    },
    [draggingCorner, imgDisplay, fromDisplay, updateCorner]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDraggingCorner(null)
  }, [])

  const handleFiles = useCallback(
    (files: File[]) => {
      const f = files[0]
      const err = validateImageFile(f)
      if (err) { alert(err); return }
      resetScan()
      setFile(f)
      setOutputFormat('png')
      loadFile(f)
    },
    [loadFile, resetScan]
  )

  const handleReset = useCallback(() => {
    resetScan()
    setFile(null)
    setOutputFormat('png')
  }, [resetScan])

  const handleDownload = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    try {
      const output = await generateOutput(outputFormat)
      if (output) saveAs(output.blob, output.filename)
    } finally {
      setGenerating(false)
    }
  }, [generateOutput, outputFormat, generating])

  // Corners in display coordinates for overlay rendering
  const displayCorners = corners && adjusting
    ? {
        topLeft: toDisplay(corners.topLeft),
        topRight: toDisplay(corners.topRight),
        bottomRight: toDisplay(corners.bottomRight),
        bottomLeft: toDisplay(corners.bottomLeft),
      }
    : null

  const hasResult = !!resultUrl
  const hasCorners = !!corners

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">扫描证件</h1>
        <p className="text-gray-500 text-sm mt-1">
          拍照上传文档，拖拽角点框选范围，结果实时更新
        </p>
      </div>

      {!file ? (
        <>
          <ImageDropzone onFiles={handleFiles} />
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            💡 提示：将证件平放在对比度明显的背景上，自动检测效果更好。所有处理均在浏览器本地完成。
          </div>
        </>
      ) : loading && !hasCorners ? (
        <LoadingOverlay message={progressMessage} />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* ===== Original image + corner overlay ===== */}
          <div>
            <p className="text-sm text-gray-500 mb-2 font-medium">
              {adjusting ? '拖拽蓝色角点框选扫描区域' : '原始图片'}
            </p>
            <div
              ref={containerRef}
              className="relative inline-block border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
              style={{ touchAction: 'none', userSelect: 'none' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {originalUrl && (
                <img
                  ref={imgRef}
                  src={originalUrl}
                  alt="原始文档"
                  className="block"
                  style={{ maxWidth: PREVIEW_MAX, maxHeight: PREVIEW_MAX * 1.5 }}
                  onLoad={updateImgSize}
                  draggable={false}
                />
              )}

              {/* Corner dots — only in adjust mode */}
              {displayCorners && (
                <>
                  {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((key) => {
                    const pt = displayCorners[key]
                    const isDragging = draggingCorner === key
                    return (
                      <div
                        key={key}
                        onPointerDown={handlePointerDown(key)}
                        className="absolute cursor-grab active:cursor-grabbing"
                        style={{
                          left: pt.x - DOT_SIZE / 2,
                          top: pt.y - DOT_SIZE / 2,
                          width: DOT_SIZE,
                          height: DOT_SIZE,
                          zIndex: 20,
                        }}
                      >
                        <div
                          className={`w-full h-full rounded-full border-2 transition-transform ${
                            isDragging
                              ? 'border-blue-400 bg-blue-300 scale-110'
                              : 'border-white bg-blue-500'
                          }`}
                          style={{ boxShadow: '0 0 0 2px rgba(59,130,246,0.5), 0 1px 4px rgba(0,0,0,0.3)' }}
                        />
                      </div>
                    )
                  })}

                  {/* Edge lines via SVG */}
                  {(() => {
                    const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = displayCorners
                    return (
                      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                        {[[tl, tr], [tr, br], [br, bl], [bl, tl]].map(([a, b], i) => (
                          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                            stroke="rgba(59,130,246,0.6)" strokeWidth="2" strokeDasharray="6,3" />
                        ))}
                      </svg>
                    )
                  })()}
                </>
              )}
            </div>
            {file && <p className="text-xs text-gray-400 mt-1">{formatBytes(file.size)}</p>}
          </div>

          {/* ===== Buttons ===== */}
          {hasCorners && !adjusting && hasResult && (
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={startAdjust}
                className="px-6 py-2.5 rounded-lg font-medium bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors">
                调整选区
              </button>
              <button onClick={handleReset}
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                重新选择
              </button>
            </div>
          )}

          {adjusting && (
            <div className="space-y-3">
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={manualScan} disabled={loading}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {loading ? '扫描中…' : '立即扫描'}
                </button>
                <button onClick={finishAdjust}
                  className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                  完成调整
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center text-sm text-blue-700">
                拖拽蓝色角点，松手后自动更新结果。也可点「立即扫描」手动触发。
              </div>
            </div>
          )}

          {/* ===== Loading ===== */}
          {loading && hasCorners && <LoadingOverlay message={progressMessage} />}

          {/* ===== Result ===== */}
          {hasResult && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <ImagePreview src={resultUrl!} alt="扫描结果" label="扫描结果" />

              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-500 mr-1">输出格式：</span>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setOutputFormat(opt.value)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        outputFormat === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={handleDownload} disabled={generating}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    generating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {generating ? '生成中…' : `下载 ${outputFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
