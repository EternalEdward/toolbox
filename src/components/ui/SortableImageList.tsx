import { useCallback, useRef, useState } from 'react'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
}

interface Props {
  images: ImageItem[]
  onReorder: (images: ImageItem[]) => void
  onRemove: (id: string) => void
}

export default function SortableImageList({ images, onReorder, onRemove }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const draggedItem = useRef<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    draggedItem.current = index
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem.current === null) return
    const from = draggedItem.current
    const to = index
    if (from === to) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const newImages = [...images]
    const [removed] = newImages.splice(from, 1)
    newImages.splice(to, 0, removed)
    onReorder(newImages)
    setDragIndex(null)
    setOverIndex(null)
    draggedItem.current = null
  }, [images, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
    draggedItem.current = null
  }, [])

  if (images.length === 0) return null

  return (
    <div className="w-full max-w-md">
      <label className="text-sm font-medium text-gray-700 block mb-2">
        已选图片（拖拽排序）
        <span className="text-gray-400 font-normal ml-1">({images.length} 张)</span>
      </label>
      <div className="space-y-2">
        {images.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
              dragIndex === index
                ? 'opacity-50 border-blue-400 bg-blue-50'
                : overIndex === index
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-gray-400 text-sm w-6 text-center tabular-nums">
              {index + 1}
            </span>
            <img
              src={img.previewUrl}
              alt={img.file.name}
              className="w-12 h-12 object-cover rounded border border-gray-200"
            />
            <span className="flex-1 text-sm text-gray-700 truncate">
              {img.file.name}
            </span>
            <button
              onClick={() => onRemove(img.id)}
              className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
              title="删除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { ImageItem }
