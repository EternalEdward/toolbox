import type { ImageFormat, PaperSize, PaperSizeConfig, BgColorConfig } from '../types'

export const FORMAT_LABELS: Record<ImageFormat, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
  'image/bmp': 'BMP',
}

export const FORMAT_EXTENSIONS: Record<ImageFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
}

export const SUPPORTED_INPUT_FORMATS: ImageFormat[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/bmp',
]

export const SUPPORTED_OUTPUT_FORMATS: ImageFormat[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/bmp',
]

export const PAPER_SIZES: Record<PaperSize, PaperSizeConfig> = {
  a4: { width: 210, height: 297, label: 'A4 (210×297mm)' },
  letter: { width: 215.9, height: 279.4, label: 'Letter (215.9×279.4mm)' },
}

export const BG_PRESET_COLORS: BgColorConfig[] = [
  { value: 'white', label: '白色', hex: '#FFFFFF' },
  { value: 'blue', label: '蓝色', hex: '#438EDB' },
  { value: 'red', label: '红色', hex: '#DA251D' },
]

export const MAX_PDF_IMAGES = 30
export const MAX_RENDER_DIMENSION = 2480
