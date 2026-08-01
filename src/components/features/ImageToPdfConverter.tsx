import { useState, useCallback } from 'react'
import type { PaperSize } from '../../types'
import ImageDropzone from '../ui/ImageDropzone'
import SortableImageList, { type ImageItem } from '../ui/SortableImageList'
import PaperSizeSelector from '../ui/PaperSizeSelector'
import LoadingOverlay from '../ui/LoadingOverlay'
import useImageToPdf from '../../hooks/useImageToPdf'
import { validateImageFile } from '../../utils/file'
import { MAX_PDF_IMAGES } from '../../constants'

let idCounter = 0

export default function ImageToPdfConverter() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [paperSize, setPaperSize] = useState<PaperSize>('a4')
  const { generating, progress, error, generate } = useImageToPdf()

  const handleFiles = useCallback((files: File[]) => {
    const validFiles: ImageItem[] = []
    for (const f of files) {
      const err = validateImageFile(f)
      if (err) {
        alert(err)
        continue
      }
      validFiles.push({
        id: String(++idCounter),
        file: f,
        previewUrl: URL.createObjectURL(f),
      })
    }

    setImages(prev => {
      const combined = [...prev, ...validFiles]
      if (combined.length > MAX_PDF_IMAGES) {
        alert(`最多支持 ${MAX_PDF_IMAGES} 张图片，多余图片已忽略`)
        return combined.slice(0, MAX_PDF_IMAGES)
      }
      return combined
    })
  }, [])

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.previewUrl)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const handleReorder = useCallback((newImages: ImageItem[]) => {
    setImages(newImages)
  }, [])

  const handleGenerate = useCallback(() => {
    generate(images, paperSize)
  }, [images, paperSize, generate])

  const handleClear = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setImages([])
  }, [images])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">图片转 PDF</h1>
        <p className="text-gray-500 text-sm mt-1">
          多张图片合成一个 PDF 文件，拖拽排序，自定义纸张大小
        </p>
      </div>

      <ImageDropzone onFiles={handleFiles} multiple maxFiles={MAX_PDF_IMAGES} />

      {images.length > 0 && (
        <SortableImageList
          images={images}
          onReorder={handleReorder}
          onRemove={handleRemove}
        />
      )}

      <PaperSizeSelector value={paperSize} onChange={setPaperSize} disabled={generating} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600 text-sm">
          {error}
        </div>
      )}

      {generating && (
        <LoadingOverlay message="正在生成 PDF…" progress={progress} />
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={handleGenerate}
          disabled={images.length === 0 || generating}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            images.length === 0 || generating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {generating ? `生成中 ${progress}%` : '生成并下载 PDF'}
        </button>
        {images.length > 0 && !generating && (
          <button
            onClick={handleClear}
            className="px-6 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            清空列表
          </button>
        )}
      </div>
    </div>
  )
}
