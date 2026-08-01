interface Props {
  src: string
  alt?: string
  label?: string
  sizeInfo?: string
}

export default function ImagePreview({ src, alt = '', label, sizeInfo }: Props) {
  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-sm text-gray-500 mb-2">{label}</p>}
      <div className="w-full max-w-sm aspect-square flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      {sizeInfo && <p className="text-xs text-gray-400 mt-1">{sizeInfo}</p>}
    </div>
  )
}
