import { useState, useCallback, useRef, useEffect } from 'react'
import type { BgPresetColor } from '../../types'
import ImageDropzone from '../ui/ImageDropzone'
import ImagePreview from '../ui/ImagePreview'
import DownloadButton from '../ui/DownloadButton'
import ColorPicker from '../ui/ColorPicker'
import LoadingOverlay from '../ui/LoadingOverlay'
import useBackgroundRemoval from '../../hooks/useBackgroundRemoval'
import { BG_PRESET_COLORS } from '../../constants'
import { validateImageFile, formatBytes } from '../../utils/file'

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bgPreset, setBgPreset] = useState<BgPresetColor>('white')
  const [customColor, setCustomColor] = useState('#FFFFFF')
  const [compositedUrl, setCompositedUrl] = useState<string | null>(null)
  const [compositedBlob, setCompositedBlob] = useState<Blob | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const compositedUrlRef = useRef<string | null>(null)
  const {
    loading,
    progressMessage,
    progressPercent,
    resultBlob,
    resultUrl,
    error,
    removeBackground,
    cancel,
    reset,
  } = useBackgroundRemoval()

  // Composite foreground onto background color
  useEffect(() => {
    if (!resultUrl) {
      setCompositedUrl(null)
      return
    }

    const bgHex = bgPreset === 'custom'
      ? customColor
      : BG_PRESET_COLORS.find(c => c.value === bgPreset)?.hex || '#FFFFFF'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      // Fill background color
      ctx.fillStyle = bgHex
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw foreground (transparent PNG)
      ctx.drawImage(img, 0, 0)

      canvas.toBlob(b => {
        if (compositedUrlRef.current) URL.revokeObjectURL(compositedUrlRef.current)
        if (b) {
          const url = URL.createObjectURL(b)
          compositedUrlRef.current = url
          setCompositedUrl(url)
          setCompositedBlob(b)
        }
      }, 'image/png')
    }

    img.src = resultUrl
  }, [resultUrl, bgPreset, customColor])

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0]
    const err = validateImageFile(f)
    if (err) {
      alert(err)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    reset()
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setCompositedUrl(null)
    setCompositedBlob(null)
  }, [previewUrl, reset])

  const handleRemoveBg = useCallback(() => {
    if (!file) return
    setCompositedUrl(null)
    setCompositedBlob(null)
    removeBackground(file)
  }, [file, removeBackground])

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (compositedUrl) URL.revokeObjectURL(compositedUrl)
    reset()
    setFile(null)
    setPreviewUrl(null)
    setCompositedUrl(null)
    setCompositedBlob(null)
  }, [previewUrl, compositedUrl, reset])

  const finalPreviewUrl = compositedUrl || resultUrl

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">照片换背景</h1>
        <p className="text-gray-500 text-sm mt-1">
          AI 智能抠图，替换纯色背景。适合证件照换底色。
        </p>
      </div>

      {!file ? (
        <>
          <ImageDropzone onFiles={handleFiles} />
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
            💡 提示：首次使用需要下载 AI 模型（约 40MB），完成后会缓存到浏览器中，后续使用无需重新下载。在桌面端浏览器上效果最佳。
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className={`grid ${finalPreviewUrl ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
            <ImagePreview
              src={previewUrl!}
              alt="原始图片"
              label="原始图片"
              sizeInfo={formatBytes(file.size)}
            />
            {finalPreviewUrl ? (
              <ImagePreview
                src={finalPreviewUrl}
                alt="换背景后"
                label="换背景后"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                {!loading && (
                  <div className="text-center">
                    <ColorPicker
                      preset={bgPreset}
                      customColor={customColor}
                      onPresetChange={setBgPreset}
                      onCustomColorChange={setCustomColor}
                    />
                    <p className="text-gray-400 text-sm mt-4">选择背景颜色后点击"开始抠图"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <ColorPicker
            preset={bgPreset}
            customColor={customColor}
            onPresetChange={setBgPreset}
            onCustomColorChange={setCustomColor}
            disabled={loading}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <LoadingOverlay message={progressMessage} progress={progressPercent} />
          )}

          <div className="flex gap-3 justify-center">
            {!resultUrl && !loading && (
              <button
                onClick={handleRemoveBg}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                开始抠图
              </button>
            )}
            {resultUrl && finalPreviewUrl && compositedBlob && (
              <>
                <DownloadButton
                  blob={compositedBlob}
                  filename="photo_no_bg.png"
                  label="下载图片"
                />
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  重新选择
                </button>
              </>
            )}
            {loading && (
              <button
                onClick={cancel}
                className="px-6 py-2.5 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
