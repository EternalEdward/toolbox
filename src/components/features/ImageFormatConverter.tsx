import { useState, useCallback, useEffect } from 'react'
import type { ImageFormat } from '../../types'
import ImageDropzone from '../ui/ImageDropzone'
import ImagePreview from '../ui/ImagePreview'
import DownloadButton from '../ui/DownloadButton'
import FormatSelector from '../ui/FormatSelector'
import LoadingOverlay from '../ui/LoadingOverlay'
import useImageConvert from '../../hooks/useImageConvert'
import { validateImageFile, getImageType, formatBytes } from '../../utils/file'
import { detectAvifEncodeSupport } from '../../utils/image'
import { FORMAT_LABELS, FORMAT_EXTENSIONS } from '../../constants'

export default function ImageFormatConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/png')
  const [unsupportedFormats, setUnsupportedFormats] = useState<ImageFormat[]>([])
  const { loading, result, error, convert, reset } = useImageConvert()

  useEffect(() => {
    detectAvifEncodeSupport().then(supported => {
      if (!supported) setUnsupportedFormats(['image/avif'])
    })
  }, [])

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
  }, [previewUrl, reset])

  const handleConvert = useCallback(() => {
    if (!file) return
    convert(file, targetFormat)
  }, [file, targetFormat, convert])

  const sourceFormatLabel = file
    ? FORMAT_LABELS[getImageType(file) as ImageFormat] || '未知'
    : ''

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">格式转换</h1>
        <p className="text-gray-500 text-sm mt-1">
          PNG / JPEG / WebP / AVIF / BMP 之间自由转换
        </p>
      </div>

      {!file ? (
        <ImageDropzone onFiles={handleFiles} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ImagePreview
              src={previewUrl!}
              alt="原始图片"
              label={`原始图片 (${sourceFormatLabel})`}
              sizeInfo={formatBytes(file.size)}
            />
            {result ? (
              <ImagePreview
                src={result.previewUrl}
                alt="转换后"
                label={`转换后 (${FORMAT_LABELS[result.targetFormat as ImageFormat]})`}
              />
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-gray-400 text-sm">选择格式后点击转换</p>
              </div>
            )}
          </div>

          <FormatSelector
            value={targetFormat}
            onChange={setTargetFormat}
            unsupportedFormats={unsupportedFormats}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {loading && <LoadingOverlay message="转换中…" />}

          <div className="flex gap-3 justify-center">
            {!result && !loading && (
              <button
                onClick={handleConvert}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                开始转换
              </button>
            )}
            {result && (
              <>
                <DownloadButton
                  blob={result.blob}
                  filename={`converted.${FORMAT_EXTENSIONS[result.targetFormat as ImageFormat]}`}
                  label={`下载 ${FORMAT_LABELS[result.targetFormat as ImageFormat]}`}
                />
                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    setFile(null)
                    setPreviewUrl(null)
                    reset()
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  重新选择
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
