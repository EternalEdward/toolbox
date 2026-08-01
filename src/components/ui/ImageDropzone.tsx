import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: Record<string, string[]>
  maxFiles?: number
  disabled?: boolean
}

export default function ImageDropzone({
  onFiles,
  multiple = false,
  accept,
  maxFiles = 1,
  disabled = false,
}: Props) {
  const defaultAccept = {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif'],
    'image/bmp': ['.bmp'],
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFiles(acceptedFiles)
    }
  }, [onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: accept || defaultAccept,
    maxFiles,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50'
          : disabled
          ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
          : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-4xl mb-3">{isDragActive ? '📥' : '📁'}</div>
      {isDragActive ? (
        <p className="text-blue-600 font-medium">松开放到这里</p>
      ) : (
        <>
          <p className="text-gray-600 font-medium">
            拖拽图片到这里，或点击选择
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {multiple
              ? '支持 PNG / JPEG / WebP / AVIF / BMP 格式'
              : '支持 PNG / JPEG / WebP / AVIF / BMP 格式'}
          </p>
        </>
      )}
    </div>
  )
}
