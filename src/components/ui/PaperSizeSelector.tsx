import type { PaperSize } from '../../types'
import { PAPER_SIZES } from '../../constants'

interface Props {
  value: PaperSize
  onChange: (size: PaperSize) => void
  disabled?: boolean
}

export default function PaperSizeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full max-w-md">
      <label className="text-sm font-medium text-gray-700 block mb-2">
        纸张大小
      </label>
      <div className="flex gap-2">
        {(Object.keys(PAPER_SIZES) as PaperSize[]).map(size => {
          const config = PAPER_SIZES[size]
          const isActive = value === size
          return (
            <button
              key={size}
              onClick={() => onChange(size)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
