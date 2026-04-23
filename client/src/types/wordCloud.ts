import type { ArticleWord } from '../modules/articleAnalyzer/articleAnalyzer.types'

export type WordCloudSceneProps = {
  words: ArticleWord[]
}

export type DisplayWord = ArticleWord & {
  id: string
  fontSize: number
  color: string
  motionSeed: number
}

export type MeasuredTextBounds = {
  width: number
  height: number
}

export type PositionedWord = DisplayWord & {
  basePosition: [number, number, number]
  visualHalfWidth: number
  visualHalfHeight: number
  reservedHalfWidth: number
  reservedHalfHeight: number
}

export type AnchorSlot = {
  x: number
  y: number
  z: number
  jitterX: number
  jitterY: number
  jitterZ: number
}

export type LayoutZone = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type TroikaTextRenderInfoLike = {
  visibleBounds?: [number, number, number, number]
  blockBounds?: [number, number, number, number]
}

export type TroikaTextLike = {
  textRenderInfo?: TroikaTextRenderInfoLike | null
}

export type MeasurementSnapshot = {
  signature: string
  measurements: Record<string, MeasuredTextBounds>
}

export type RenderedSnapshot = {
  signature: string
  words: PositionedWord[]
}