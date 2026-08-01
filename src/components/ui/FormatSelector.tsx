import type { ImageFormat } from '../../types'
import { FORMAT_LABELS, SUPPORTED_OUTPUT_FORMATS } from '../../constants'

interface Props {
  value: ImageFormat
  onChange: (format: ImageFormat) => void
  unsupportedFormats?: ImageFormat[]
  disabled?: boolean
}

export default function FormatSelector({
  value,
  onChange,
  unsupportedFormats = [],
  disabled,
}: Props) {
  return (
    <div className="w-full max-w-md">
      <label className="text-sm font-medium text-gray-700 block mb-2">
        目标格式
      </label>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_OUTPUT_FORMATS.map(format => {
          const isUnsupported = unsupportedFormats.includes(format)
          const isActive = value === format
          return (
            <button
              key={format}
              onClick={() => !isUnsupported && onChange(format)}
              disabled={isUnsupported || disabled}
              title={isUnsupported ? '您的浏览器不支持输出此格式' : ''}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isUnsupported
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                  : isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {FORMAT_LABELS[format]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
