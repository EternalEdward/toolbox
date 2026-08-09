import { useState, useCallback, useRef, useEffect } from 'react'
import type { Quadrilateral, Point } from '../../types'
import ImageDropzone from '../ui/ImageDropzone'
import ImagePreview from '../ui/ImagePreview'
import DownloadButton from '../ui/DownloadButton'
import LoadingOverlay from '../ui/LoadingOverlay'
import useDocumentScan from '../../hooks/useDocumentScan'
import { validateImageFile, formatBytes } from '../../utils/file'

const PREVIEW_MAX = 600
const DOT_SIZE = 20

export default function DocumentScanner() {
  const [file, setFile] = useState<File | null>(null)
  const {
    loading,
    progressMessage,
    originalUrl,
    previewWidth,
    previewHeight,
    previewCorners,
    resultUrl,
    resultBlob,
    error,
    loadFile,
    updatePreviewCorner,
    applyTransform,
    onResultReady,
    reset: resetScan,
  } = useDocumentScan()

  const [draggingCorner, setDraggingCorner] = useState<keyof Quadrilateral | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [imgDisplay, setImgDisplay] = useState({ w: 0, h: 0 })

  // Auto-scroll to result when ready
  useEffect(() => {
    onResultReady(() => {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    })
  }, [onResultReady])

  // Update image display rect whenever image changes or window resizes
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

  // Convert corner from preview space to display space
  const toDisplay = useCallback(
    (p: Point): Point => {
      if (!previewWidth || !previewHeight || imgDisplay.w === 0) return p
      const sx = imgDisplay.w / previewWidth
      const sy = imgDisplay.h / previewHeight
      return { x: p.x * sx, y: p.y * sy }
    },
    [previewWidth, previewHeight, imgDisplay]
  )

  // Convert display coords back to preview space
  const fromDisplay = useCallback(
    (dx: number, dy: number): Point => {
      if (!previewWidth || !previewHeight || imgDisplay.w === 0) return { x: dx, y: dy }
      const sx = imgDisplay.w / previewWidth
      const sy = imgDisplay.h / previewHeight
      return { x: dx / sx, y: dy / sy }
    },
    [previewWidth, previewHeight, imgDisplay]
  )

  // Drag handlers
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
      const pt = fromDisplay(
        Math.max(0, Math.min(imgDisplay.w, dx)),
        Math.max(0, Math.min(imgDisplay.h, dy))
      )
      updatePreviewCorner(draggingCorner, pt)
    },
    [draggingCorner, imgDisplay, fromDisplay, updatePreviewCorner]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDraggingCorner(null)
  }, [])

  // Handle file drop
  const handleFiles = useCallback(
    (files: File[]) => {
      const f = files[0]
      const err = validateImageFile(f)
      if (err) {
        alert(err)
        return
      }
      resetScan()
      setFile(f)
      loadFile(f)
    },
    [loadFile, resetScan]
  )

  const handleReset = useCallback(() => {
    resetScan()
    setFile(null)
  }, [resetScan])

  // Corners in display coordinates for rendering
  const displayCorners = previewCorners
    ? {
        topLeft: toDisplay(previewCorners.topLeft),
        topRight: toDisplay(previewCorners.topRight),
        bottomRight: toDisplay(previewCorners.bottomRight),
        bottomLeft: toDisplay(previewCorners.bottomLeft),
      }
    : null

  const hasResult = !!resultUrl
  const hasCorners = !!previewCorners

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">扫描证件</h1>
        <p className="text-gray-500 text-sm mt-1">
          拍照上传文档或证件，自动矫正扭曲变形并去除背景，生成扫描件效果
        </p>
      </div>

      {!file ? (
        <>
          <ImageDropzone onFiles={handleFiles} />
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            💡 提示：拍摄时将证件平放在对比度明显的背景上（如深色桌面），自动检测效果更好。所有处理均在浏览器本地完成。
          </div>
        </>
      ) : loading && !hasCorners ? (
        <LoadingOverlay message={progressMessage} />
      ) : (
        <div className="space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Main content */}
          <div className={hasResult ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
            {/* Original with corner overlay */}
            <div>
              <p className="text-sm text-gray-500 mb-2 font-medium">
                {hasCorners && !hasResult ? '拖拽蓝色角点调整扫描区域' : '原始图片'}
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

                {/* Corner dots overlay */}
                {displayCorners && !hasResult && (
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

                    {/* Edge lines connecting corners */}
                    {(() => {
                      const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = displayCorners
                      const lines = [[tl, tr], [tr, br], [br, bl], [bl, tl]]
                      return (
                        <svg
                          className="absolute inset-0 pointer-events-none"
                          style={{ zIndex: 10 }}
                          width="100%"
                          height="100%"
                        >
                          {lines.map(([a, b], i) => (
                            <line
                              key={i}
                              x1={a.x}
                              y1={a.y}
                              x2={b.x}
                              y2={b.y}
                              stroke="rgba(59,130,246,0.6)"
                              strokeWidth="2"
                              strokeDasharray="6,3"
                            />
                          ))}
                        </svg>
                      )
                    })()}
                  </>
                )}
              </div>
              {file && (
                <p className="text-xs text-gray-400 mt-1">{formatBytes(file.size)}</p>
              )}
            </div>

            {/* Result preview */}
            {hasResult && (
              <div ref={resultRef}>
                <ImagePreview src={resultUrl!} alt="扫描结果" label="扫描结果" />
              </div>
            )}
          </div>

          {/* Loading during transform */}
          {loading && hasCorners && (
            <LoadingOverlay message={progressMessage} />
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-center" ref={resultRef}>
            {hasCorners && !hasResult && !loading && (
              <button
                onClick={applyTransform}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                开始扫描
              </button>
            )}
            {hasResult && resultBlob && (
              <>
                <DownloadButton blob={resultBlob} filename="scanned_document.png" label="下载扫描件" />
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  重新选择
                </button>
              </>
            )}
            {!hasResult && file && !loading && (
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                重新选择
              </button>
            )}
            {loading && hasCorners && (
              <button
                disabled
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
              >
                {progressMessage}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
