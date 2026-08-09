import type { Quadrilateral, Point } from '../types'

// ========== Image Processing Utilities ==========

/** Load a File/Blob as HTMLImageElement */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

/** Draw image onto canvas, optionally rescaling to maxDimension */
export function imageToImageData(
  img: HTMLImageElement,
  maxDimension = 800
): { imageData: ImageData; canvas: HTMLCanvasElement } {
  let w = img.naturalWidth
  let h = img.naturalHeight
  const scale = Math.min(1, maxDimension / Math.max(w, h))
  w = Math.round(w * scale)
  h = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  return { imageData, canvas }
}

// ========== Grayscale & Edge Detection ==========

/** Convert RGBA ImageData to grayscale Uint8Array */
export function toGrayscale(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const off = i * 4
    // Weighted luminance
    gray[i] = Math.round(data[off] * 0.299 + data[off + 1] * 0.587 + data[off + 2] * 0.114)
  }
  return gray
}

/** Apply a simple 3x3 Gaussian blur to grayscale image (in-place) */
export function gaussianBlur(gray: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(width * height)
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1]
  const kSum = 16

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      let ki = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * width + (x + dx)] * kernel[ki++]
        }
      }
      result[y * width + x] = Math.round(sum / kSum)
    }
  }
  return result
}

/** Sobel edge magnitude */
export function sobelEdges(gray: Uint8Array, width: number, height: number): Uint8Array {
  const edges = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      // Sobel X
      const gx =
        -1 * gray[idx - width - 1] + 1 * gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -1 * gray[idx + width - 1] + 1 * gray[idx + width + 1]
      // Sobel Y
      const gy =
        -1 * gray[idx - width - 1] + -2 * gray[idx - width] + -1 * gray[idx - width + 1] +
        1 * gray[idx + width - 1] + 2 * gray[idx + width] + 1 * gray[idx + width + 1]
      const magnitude = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy)))
      edges[idx] = magnitude
    }
  }
  return edges
}

/** Otsu's method to find optimal threshold for a grayscale image */
export function otsuThreshold(gray: Uint8Array): number {
  const histogram = new Int32Array(256)
  for (let i = 0; i < gray.length; i++) {
    histogram[gray[i]]++
  }

  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }

  let sumB = 0
  let wB = 0
  let maxVariance = 0
  let threshold = 128

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break

    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) * (mB - mF)

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }

  return threshold
}

// ========== Corner Detection ==========

interface EdgePoint {
  x: number
  y: number
}

/**
 * Scan from 4 edges inward to find document boundary points.
 * Each scan returns points along one edge.
 */
function scanEdge(
  edges: Uint8Array,
  width: number,
  height: number,
  direction: 'top' | 'bottom' | 'left' | 'right',
  threshold: number,
  step = 5
): EdgePoint[] {
  const points: EdgePoint[] = []

  switch (direction) {
    case 'top':
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y++) {
          if (edges[y * width + x] > threshold) {
            points.push({ x, y })
            break
          }
        }
      }
      break
    case 'bottom':
      for (let x = 0; x < width; x += step) {
        for (let y = height - 1; y >= 0; y--) {
          if (edges[y * width + x] > threshold) {
            points.push({ x, y })
            break
          }
        }
      }
      break
    case 'left':
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x++) {
          if (edges[y * width + x] > threshold) {
            points.push({ x, y })
            break
          }
        }
      }
      break
    case 'right':
      for (let y = 0; y < height; y += step) {
        for (let x = width - 1; x >= 0; x--) {
          if (edges[y * width + x] > threshold) {
            points.push({ x, y })
            break
          }
        }
      }
      break
  }

  return points
}

/** Linear regression: fit y = mx + b */
function fitLineY(points: EdgePoint[]): { m: number; b: number } | null {
  if (points.length < 2) return null
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  const n = points.length
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
  }
  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-6) return null
  const m = (n * sumXY - sumX * sumY) / denom
  const b = (sumY - m * sumX) / n
  return { m, b }
}

/** Linear regression: fit x = my + b (for near-vertical lines) */
function fitLineX(points: EdgePoint[]): { m: number; b: number } | null {
  if (points.length < 2) return null
  let sumX = 0, sumY = 0, sumYX = 0, sumYY = 0
  const n = points.length
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumYX += p.y * p.x
    sumYY += p.y * p.y
  }
  const denom = n * sumYY - sumY * sumY
  if (Math.abs(denom) < 1e-6) return null
  const m = (n * sumYX - sumY * sumX) / denom
  const b = (sumX - m * sumY) / n
  return { m, b }
}

/** Find intersection of two lines (one fit as y=mx+b, other as x=my+b) */
function intersect(
  lineY: { m: number; b: number } | null,
  lineX: { m: number; b: number } | null,
  defaultX: number,
  defaultY: number,
  width: number,
  height: number
): Point {
  if (lineY && lineX) {
    // y = m1*x + b1, x = m2*y + b2
    // Substitute: y = m1*(m2*y + b2) + b1
    // y = m1*m2*y + m1*b2 + b1
    // y*(1 - m1*m2) = m1*b2 + b1
    const m1 = lineY.m, b1 = lineY.b
    const m2 = lineX.m, b2 = lineX.b
    const denom = 1 - m1 * m2
    if (Math.abs(denom) > 1e-6) {
      const y = (m1 * b2 + b1) / denom
      const x = m2 * y + b2
      return { x: Math.round(x), y: Math.round(y) }
    }
  }
  // Fallback
  return { x: defaultX, y: defaultY }
}

/** Clamp point within image bounds */
function clampPoint(p: Point, w: number, h: number, margin = 20): Point {
  return {
    x: Math.max(margin, Math.min(w - margin, p.x)),
    y: Math.max(margin, Math.min(h - margin, p.y)),
  }
}

/**
 * Auto-detect document corners from the processed image.
 * Returns the best-guess quadrilateral for the document.
 */
export function detectDocumentCorners(
  imageData: ImageData,
  width: number,
  height: number
): Quadrilateral {
  // Step 1: Grayscale
  const gray = toGrayscale(imageData)

  // Step 2: Gaussian blur
  const blurred = gaussianBlur(gray, width, height)

  // Step 3: Sobel edge detection
  const edges = sobelEdges(blurred, width, height)

  // Step 4: Compute edge magnitude statistics and find threshold
  const sortedEdges = Array.from(edges).sort((a, b) => a - b)
  const p90 = sortedEdges[Math.floor(sortedEdges.length * 0.9)]
  const threshold = Math.max(40, p90 * 0.4)

  // Step 5: Scan from each edge
  const topPts = scanEdge(edges, width, height, 'top', threshold)
  const botPts = scanEdge(edges, width, height, 'bottom', threshold)
  const leftPts = scanEdge(edges, width, height, 'left', threshold)
  const rightPts = scanEdge(edges, width, height, 'right', threshold)

  // Step 6: Fit lines
  const topLine = fitLineY(topPts)
  const botLine = fitLineY(botPts)
  const leftLine = fitLineX(leftPts)
  const rightLine = fitLineX(rightPts)

  // Step 7: Compute corners as intersections
  const w = width, h = height
  let topLeft = clampPoint(intersect(topLine, leftLine, 0, 0, w, h), w, h)
  let topRight = clampPoint(intersect(topLine, rightLine, w, 0, w, h), w, h)
  let bottomRight = clampPoint(intersect(botLine, rightLine, w, h, w, h), w, h)
  let bottomLeft = clampPoint(intersect(botLine, leftLine, 0, h, w, h), w, h)

  // Step 8: Validate — if corners are too close to edges or clearly wrong,
  // fall back to a centered 80% rectangle
  const margin = Math.min(w, h) * 0.05
  const isValid =
    topLeft.x > margin && topLeft.y > margin &&
    topRight.x < w - margin && topRight.y > margin &&
    bottomRight.x < w - margin && bottomRight.y < h - margin &&
    bottomLeft.x > margin && bottomLeft.y < h - margin

  if (!isValid) {
    const padX = w * 0.1
    const padY = h * 0.1
    topLeft = { x: Math.round(padX), y: Math.round(padY) }
    topRight = { x: Math.round(w - padX), y: Math.round(padY) }
    bottomRight = { x: Math.round(w - padX), y: Math.round(h - padY) }
    bottomLeft = { x: Math.round(padX), y: Math.round(h - padY) }
  }

  return { topLeft, topRight, bottomRight, bottomLeft }
}

// ========== Perspective Transform ==========

/**
 * Compute the 3x3 homography matrix from 4 point correspondences.
 * Maps source points to destination points.
 */
function computeHomography(
  src: [number, number][],
  dst: [number, number][]
): Float64Array {
  // Build 8x8 linear system A*h = b
  const A = new Float64Array(64)
  const b = new Float64Array(8)

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]
    const [u, v] = dst[i]
    const r1 = i * 2
    const r2 = i * 2 + 1

    A[r1 * 8 + 0] = x
    A[r1 * 8 + 1] = y
    A[r1 * 8 + 2] = 1
    A[r1 * 8 + 3] = 0
    A[r1 * 8 + 4] = 0
    A[r1 * 8 + 5] = 0
    A[r1 * 8 + 6] = -x * u
    A[r1 * 8 + 7] = -y * u
    b[r1] = u

    A[r2 * 8 + 0] = 0
    A[r2 * 8 + 1] = 0
    A[r2 * 8 + 2] = 0
    A[r2 * 8 + 3] = x
    A[r2 * 8 + 4] = y
    A[r2 * 8 + 5] = 1
    A[r2 * 8 + 6] = -x * v
    A[r2 * 8 + 7] = -y * v
    b[r2] = v
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 8; col++) {
    // Find pivot
    let maxVal = Math.abs(A[col * 8 + col])
    let maxRow = col
    for (let row = col + 1; row < 8; row++) {
      const val = Math.abs(A[row * 8 + col])
      if (val > maxVal) {
        maxVal = val
        maxRow = row
      }
    }

    // Swap rows
    if (maxRow !== col) {
      for (let k = 0; k < 8; k++) {
        const tmp = A[col * 8 + k]
        A[col * 8 + k] = A[maxRow * 8 + k]
        A[maxRow * 8 + k] = tmp
      }
      const tmpB = b[col]
      b[col] = b[maxRow]
      b[maxRow] = tmpB
    }

    // Eliminate below
    const pivot = A[col * 8 + col]
    if (Math.abs(pivot) < 1e-10) continue

    for (let row = col + 1; row < 8; row++) {
      const factor = A[row * 8 + col] / pivot
      for (let k = col; k < 8; k++) {
        A[row * 8 + k] -= factor * A[col * 8 + k]
      }
      b[row] -= factor * b[col]
    }
  }

  // Back substitution
  const h = new Float64Array(9)
  for (let row = 7; row >= 0; row--) {
    let sum = b[row]
    for (let k = row + 1; k < 8; k++) {
      sum -= A[row * 8 + k] * h[k]
    }
    h[row] = sum / A[row * 8 + row]
  }
  h[8] = 1 // h33 = 1 (scale fixed)

  return h
}

/** Apply inverse homography: map dst point to src point */
function applyInverseHomography(h: Float64Array, x: number, y: number): { x: number; y: number } {
  // Compute adjugate of 3x3 matrix for inverse: H_inv = adj(H) / det(H)
  const [
    h11, h12, h13,
    h21, h22, h23,
    h31, h32, h33,
  ] = h

  // det(H)
  const det =
    h11 * (h22 * h33 - h23 * h32) -
    h12 * (h21 * h33 - h23 * h31) +
    h13 * (h21 * h32 - h22 * h31)

  // Adjugate
  const a11 = (h22 * h33 - h23 * h32) / det
  const a12 = -(h12 * h33 - h13 * h32) / det
  const a13 = (h12 * h23 - h13 * h22) / det
  const a21 = -(h21 * h33 - h23 * h31) / det
  const a22 = (h11 * h33 - h13 * h31) / det
  const a23 = -(h11 * h23 - h13 * h21) / det
  const a31 = (h21 * h32 - h22 * h31) / det
  const a32 = -(h11 * h32 - h12 * h31) / det
  const a33 = (h11 * h22 - h12 * h21) / det

  const w = a31 * x + a32 * y + a33
  return {
    x: (a11 * x + a12 * y + a13) / Math.max(w, 1e-10),
    y: (a21 * x + a22 * y + a23) / Math.max(w, 1e-10),
  }
}

/** Bilinear interpolation at sub-pixel position */
function sampleBilinear(data: Uint8ClampedArray, width: number, height: number, px: number, py: number): [number, number, number, number] {
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)

  const fx = px - x0
  const fy = py - y0

  const idx = (xx: number, yy: number) => (yy * width + xx) * 4

  // Handle out-of-bounds
  const clampX = (x: number) => Math.max(0, Math.min(width - 1, x))
  const clampY = (y: number) => Math.max(0, Math.min(height - 1, y))

  const getPixel = (xx: number, yy: number) => {
    const i = idx(clampX(xx), clampY(yy))
    return [data[i], data[i + 1], data[i + 2], data[i + 3]]
  }

  const [r00, g00, b00, a00] = getPixel(x0, y0)
  const [r10, g10, b10, a10] = getPixel(x1, y0)
  const [r01, g01, b01, a01] = getPixel(x0, y1)
  const [r11, g11, b11, a11] = getPixel(x1, y1)

  return [
    Math.round(r00 * (1 - fx) * (1 - fy) + r10 * fx * (1 - fy) + r01 * (1 - fx) * fy + r11 * fx * fy),
    Math.round(g00 * (1 - fx) * (1 - fy) + g10 * fx * (1 - fy) + g01 * (1 - fx) * fy + g11 * fx * fy),
    Math.round(b00 * (1 - fx) * (1 - fy) + b10 * fx * (1 - fy) + b01 * (1 - fx) * fy + b11 * fx * fy),
    Math.round(a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy) + a01 * (1 - fx) * fy + a11 * fx * fy),
  ]
}

/**
 * Apply perspective correction to transform the quadrilateral region
 * into a rectangular output image.
 */
export function perspectiveTransform(
  sourceImageData: ImageData,
  srcWidth: number,
  srcHeight: number,
  corners: Quadrilateral,
  outputWidth: number,
  outputHeight: number
): ImageData {
  // Source points (from detected corners)
  const src: [number, number][] = [
    [corners.topLeft.x, corners.topLeft.y],
    [corners.topRight.x, corners.topRight.y],
    [corners.bottomRight.x, corners.bottomRight.y],
    [corners.bottomLeft.x, corners.bottomLeft.y],
  ]

  // Destination: full output rectangle
  const dst: [number, number][] = [
    [0, 0],
    [outputWidth - 1, 0],
    [outputWidth - 1, outputHeight - 1],
    [0, outputHeight - 1],
  ]

  const H = computeHomography(dst, src) // maps output → source (for inverse lookup)

  const output = new ImageData(outputWidth, outputHeight)
  const srcData = sourceImageData.data

  for (let dy = 0; dy < outputHeight; dy++) {
    for (let dx = 0; dx < outputWidth; dx++) {
      const srcPt = applyInverseHomography(H, dx, dy)
      const sx = srcPt.x
      const sy = srcPt.y

      // Check if within source bounds
      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        const [r, g, b, a] = sampleBilinear(srcData, srcWidth, srcHeight, sx, sy)
        const outIdx = (dy * outputWidth + dx) * 4
        output.data[outIdx] = r
        output.data[outIdx + 1] = g
        output.data[outIdx + 2] = b
        output.data[outIdx + 3] = a
      }
      // Else: leave as transparent (default 0)
    }
  }

  return output
}

// ========== Scan Enhancement ==========

/**
 * Apply auto-level (histogram stretch) and optional sharpening.
 * Operates on canvas in-place.
 */
export function enhanceScan(imageData: ImageData): void {
  const { data } = imageData
  const len = data.length

  // Find min and max pixel values
  let minVal = 255, maxVal = 0
  for (let i = 0; i < len; i += 4) {
    if (data[i + 3] === 0) continue // skip fully transparent
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    if (gray < minVal) minVal = gray
    if (gray > maxVal) maxVal = gray
  }

  // Stretch histogram (skip if already well-exposed)
  if (maxVal > minVal && (minVal > 10 || maxVal < 240)) {
    const scale = 255 / (maxVal - minVal)
    for (let i = 0; i < len; i += 4) {
      if (data[i + 3] === 0) continue
      data[i] = Math.round((data[i] - minVal) * scale)
      data[i + 1] = Math.round((data[i + 1] - minVal) * scale)
      data[i + 2] = Math.round((data[i + 2] - minVal) * scale)
    }
  }
}

/**
 * Compute a sensible output size for the scanned document.
 * Estimates based on the quadrilateral's width and height in pixels.
 */
export function computeOutputSize(
  corners: Quadrilateral,
  maxDimension = 2048
): { width: number; height: number } {
  // Compute the average edge lengths
  const topLen = Math.hypot(
    corners.topRight.x - corners.topLeft.x,
    corners.topRight.y - corners.topLeft.y
  )
  const bottomLen = Math.hypot(
    corners.bottomRight.x - corners.bottomLeft.x,
    corners.bottomRight.y - corners.bottomLeft.y
  )
  const leftLen = Math.hypot(
    corners.bottomLeft.x - corners.topLeft.x,
    corners.bottomLeft.y - corners.topLeft.y
  )
  const rightLen = Math.hypot(
    corners.bottomRight.x - corners.topRight.x,
    corners.bottomRight.y - corners.topRight.y
  )

  const avgW = (topLen + bottomLen) / 2
  const avgH = (leftLen + rightLen) / 2

  // Scale to fit maxDimension
  const scale = Math.min(1, maxDimension / Math.max(avgW, avgH))
  return {
    width: Math.round(avgW * scale),
    height: Math.round(avgH * scale),
  }
}

/**
 * Convert Quadrilateral coordinates from scaled (auto-detect size ~600px)
 * back to original image scale.
 */
export function scaleCorners(
  corners: Quadrilateral,
  fromSize: { width: number; height: number },
  toSize: { width: number; height: number }
): Quadrilateral {
  const sx = toSize.width / fromSize.width
  const sy = toSize.height / fromSize.height
  return {
    topLeft: { x: corners.topLeft.x * sx, y: corners.topLeft.y * sy },
    topRight: { x: corners.topRight.x * sx, y: corners.topRight.y * sy },
    bottomRight: { x: corners.bottomRight.x * sx, y: corners.bottomRight.y * sy },
    bottomLeft: { x: corners.bottomLeft.x * sx, y: corners.bottomLeft.y * sy },
  }
}
