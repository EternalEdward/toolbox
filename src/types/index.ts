export interface ImageFile {
  file: File
  previewUrl: string
  dimensions?: { width: number; height: number }
}

export interface CompressResult {
  blob: Blob
  originalSize: number
  compressedSize: number
  previewUrl: string
}

export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif' | 'image/bmp'

export type PaperSize = 'a4' | 'letter'

export interface PaperSizeConfig {
  width: number
  height: number
  label: string
}

export type BgPresetColor = 'white' | 'blue' | 'red' | 'custom'

export interface BgColorConfig {
  value: string
  label: string
  hex: string
}
