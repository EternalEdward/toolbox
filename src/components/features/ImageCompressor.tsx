import { useState, useCallback } from 'react'
import ImageDropzone from '../ui/ImageDropzone'
import ImagePreview from '../ui/ImagePreview'
import DownloadButton from '../ui/DownloadButton'
import QualitySlider from '../ui/QualitySlider'
import LoadingOverlay from '../ui/LoadingOverlay'
import useImageCompress from '../../hooks/useImageCompress'
import { formatBytes, validateImageFile } from '../../utils/file'

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [quality, setQuality] = useState(80)
  const { loading, result, error, compress, reset } = useImageCompress()

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

  const handleCompress = useCallback(() => {
    if (!file) return
    compress(file, quality)
  }, [file, quality, compress])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">图片压缩</h1>
        <p className="text-gray-500 text-sm mt-1">调整压缩质量，在体积和画质之间找到平衡</p>
      </div>

      {!file ? (
        <ImageDropzone onFiles={handleFiles} />
      ) : (
        <div className="space-y-6">
          {/* Preview area */}
          <div className={`grid ${result ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
            <ImagePreview
              src={previewUrl!}
              alt="原始图片"
              label="原始图片"
              sizeInfo={formatBytes(file.size)}
            />
            {result && (
              <ImagePreview
                src={result.previewUrl}
                alt="压缩后"
                label="压缩后"
                sizeInfo={formatBytes(result.compressedSize)}
              />
            )}
          </div>

          {/* Size comparison */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-medium">
                {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
              </p>
              <p className="text-green-600 text-sm">
                减小了{' '}
                {((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {!result && !loading && (
            <QualitySlider value={quality} onChange={setQuality} />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {loading && <LoadingOverlay message="压缩中…" />}

          <div className="flex gap-3 justify-center">
            {!result && !loading && (
              <button
                onClick={handleCompress}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                开始压缩
              </button>
            )}
            {result && (
              <>
                <DownloadButton blob={result.blob} filename={`compressed_${file.name}`} label="下载压缩图片" />
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
            {loading && (
              <button
                disabled
                className="px-6 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
              >
                处理中…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
