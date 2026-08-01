interface Props {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function QualitySlider({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          压缩质量
        </label>
        <span className="text-sm text-gray-500 tabular-nums">{value}%</span>
      </div>
      <input
        type="range"
        min={10}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>最小体积</span>
        <span>最佳质量</span>
      </div>
    </div>
  )
}
