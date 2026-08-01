import { BG_PRESET_COLORS } from '../../constants'
import type { BgPresetColor } from '../../types'

interface Props {
  preset: BgPresetColor
  customColor: string
  onPresetChange: (preset: BgPresetColor) => void
  onCustomColorChange: (color: string) => void
  disabled?: boolean
}

export default function ColorPicker({
  preset,
  customColor,
  onPresetChange,
  onCustomColorChange,
  disabled,
}: Props) {
  return (
    <div className="w-full max-w-md">
      <label className="text-sm font-medium text-gray-700 block mb-2">
        背景颜色
      </label>
      <div className="flex flex-wrap gap-3 items-center">
        {BG_PRESET_COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => onPresetChange(c.value as BgPresetColor)}
            disabled={disabled}
            className={`w-10 h-10 rounded-full border-2 transition-all ${
              preset === c.value && preset !== 'custom'
                ? 'border-blue-600 scale-110 shadow-md'
                : 'border-gray-300 hover:scale-105'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: c.hex }}
            title={c.label}
          />
        ))}
        <button
          onClick={() => onPresetChange('custom')}
          disabled={disabled}
          className={`w-10 h-10 rounded-full border-2 transition-all bg-gradient-to-br from-red-400 via-green-400 to-blue-400 ${
            preset === 'custom'
              ? 'border-blue-600 scale-110 shadow-md'
              : 'border-gray-300 hover:scale-105'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="自定义颜色"
        />
        {preset === 'custom' && (
          <input
            type="color"
            value={customColor}
            onChange={e => onCustomColorChange(e.target.value)}
            disabled={disabled}
            className="w-10 h-10 rounded cursor-pointer border border-gray-300"
          />
        )}
      </div>
    </div>
  )
}
