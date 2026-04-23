import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { ArticleWord } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import { FloatingWord } from '../FloatingWord/FloatingWord'
import './WordCloudScene.css'

type WordCloudSceneProps = {
  words: ArticleWord[]
}

type DisplayWord = ArticleWord & {
  id: string
  fontSize: number
  color: string
  motionSeed: number
}

type MeasuredTextBounds = {
  width: number
  height: number
}

type PositionedWord = DisplayWord & {
  basePosition: [number, number, number]
  visualHalfWidth: number
  visualHalfHeight: number
  reservedHalfWidth: number
  reservedHalfHeight: number
}

type AnchorSlot = {
  x: number
  y: number
  z: number
  jitterX: number
  jitterY: number
  jitterZ: number
}

type LayoutZone = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

const WORD_COLORS = ['#eef3ff', '#d8e3ff', '#b8cbff', '#93afff', '#7697ff']

const STAGE_LIMITS = {
  minX: -10.8,
  maxX: 10.8,
  minY: -3.8,
  maxY: 3.8,
  minZ: -1.18,
  maxZ: 0.12,
}

const ANCHOR_SLOTS: AnchorSlot[] = [
  { x: 0, y: 0.08, z: 0.04, jitterX: 0.24, jitterY: 0.16, jitterZ: 0.05 },
  { x: -6.35, y: -1.2, z: -0.18, jitterX: 0.26, jitterY: 0.16, jitterZ: 0.05 },
  { x: 6.35, y: 1.2, z: -0.18, jitterX: 0.26, jitterY: 0.16, jitterZ: 0.05 },
  { x: -8.2, y: 2.05, z: -0.34, jitterX: 0.22, jitterY: 0.14, jitterZ: 0.05 },
  { x: 8.2, y: -2.05, z: -0.34, jitterX: 0.22, jitterY: 0.14, jitterZ: 0.05 },
  { x: 0, y: 2.6, z: -0.46, jitterX: 0.24, jitterY: 0.12, jitterZ: 0.05 },
  { x: 0, y: -2.6, z: -0.46, jitterX: 0.24, jitterY: 0.12, jitterZ: 0.05 },
  { x: -9.55, y: 0.4, z: -0.56, jitterX: 0.18, jitterY: 0.12, jitterZ: 0.05 },
  { x: 9.55, y: -0.4, z: -0.56, jitterX: 0.18, jitterY: 0.12, jitterZ: 0.05 },
]

const LAYOUT_ZONES: LayoutZone[] = [
  { minX: -10.2, maxX: -5.8, minY: 1.25, maxY: 3.35, minZ: -0.92, maxZ: -0.24 },
  { minX: -10.2, maxX: -5.8, minY: -3.35, maxY: -1.25, minZ: -0.92, maxZ: -0.24 },
  { minX: -5.1, maxX: 5.1, minY: 1.7, maxY: 3.45, minZ: -0.96, maxZ: -0.24 },
  { minX: -5.1, maxX: 5.1, minY: -3.45, maxY: -1.7, minZ: -0.96, maxZ: -0.24 },
  { minX: 5.8, maxX: 10.2, minY: 1.25, maxY: 3.35, minZ: -0.92, maxZ: -0.24 },
  { minX: 5.8, maxX: 10.2, minY: -3.35, maxY: -1.25, minZ: -0.92, maxZ: -0.24 },
  { minX: -10.3, maxX: -6.4, minY: -0.92, maxY: 0.98, minZ: -1.02, maxZ: -0.34 },
  { minX: 6.4, maxX: 10.3, minY: -0.98, maxY: 0.92, minZ: -1.02, maxZ: -0.34 },
  { minX: -3.8, maxX: 3.8, minY: -0.98, maxY: 0.98, minZ: -0.16, maxZ: 0.08 },
]

function createSeed(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createRandom(seed: number) {
  let current = seed

  return () => {
    current += 0x6d2b79f5
    let temp = Math.imul(current ^ (current >>> 15), current | 1)
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), temp | 61)
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296
  }
}

function getColor(weight: number) {
  const index = Math.min(
    WORD_COLORS.length - 1,
    Math.floor(weight * WORD_COLORS.length),
  )

  return WORD_COLORS[index]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createFontSize(weight: number) {
  return 0.22 + weight * 0.56
}

function getMotionRange(weight: number) {
  return {
    x: 0.026 + (1 - weight) * 0.02,
    y: 0.018 + (1 - weight) * 0.016,
  }
}

function createDisplayWords(words: ArticleWord[], articleSignature: string) {
  const seedSource = words
    .map((item) => `${item.word}:${item.weight}:${item.score}`)
    .join('|')

  const random = createRandom(createSeed(seedSource))

  return [...words]
    .sort((left, right) => right.weight - left.weight)
    .map((item, index) => ({
      ...item,
      id: `${articleSignature}:${index}:${item.word}`,
      fontSize: createFontSize(item.weight),
      color: getColor(item.weight),
      motionSeed: random(),
    }))
}

function getWordSignature(words: DisplayWord[]) {
  return words.map((item) => item.id).join('|')
}

function getMeasuredBounds(troika: any): MeasuredTextBounds | null {
  const bounds = troika?.textRenderInfo?.visibleBounds ?? troika?.textRenderInfo?.blockBounds

  if (!Array.isArray(bounds) || bounds.length !== 4) {
    return null
  }

  const [minX, minY, maxX, maxY] = bounds
  const width = Math.max(Math.abs(maxX - minX), 0.01)
  const height = Math.max(Math.abs(maxY - minY), 0.01)

  return { width, height }
}

function createReservedHalfWidth(
  word: string,
  visualWidth: number,
  weight: number,
) {
  const motion = getMotionRange(weight)
  const hoverPadding = visualWidth * 0.04
  const phrasePadding = word.includes(' ') ? 0.18 : 0.1
  const lengthPadding = Math.min(word.length * 0.008, 0.18)

  return visualWidth / 2 + motion.x + hoverPadding + phrasePadding + lengthPadding + 0.2
}

function createReservedHalfHeight(visualHeight: number, weight: number) {
  const motion = getMotionRange(weight)
  const hoverPadding = visualHeight * 0.04

  return visualHeight / 2 + motion.y + hoverPadding + 0.18
}

function collidesWithPlacedWords(
  candidate: [number, number, number],
  reservedHalfWidth: number,
  reservedHalfHeight: number,
  placedWords: PositionedWord[],
) {
  return placedWords.some((placedWord) => {
    const dx = Math.abs(candidate[0] - placedWord.basePosition[0])
    const dy = Math.abs(candidate[1] - placedWord.basePosition[1])

    const minX = reservedHalfWidth + placedWord.reservedHalfWidth + 0.06
    const minY = reservedHalfHeight + placedWord.reservedHalfHeight + 0.04

    return dx < minX && dy < minY
  })
}

function buildAnchorCandidate(slot: AnchorSlot, random: () => number) {
  return [
    slot.x + (random() * 2 - 1) * slot.jitterX,
    slot.y + (random() * 2 - 1) * slot.jitterY,
    slot.z + (random() * 2 - 1) * slot.jitterZ,
  ] as [number, number, number]
}

function buildZoneCandidate(zone: LayoutZone, random: () => number) {
  return [
    zone.minX + random() * (zone.maxX - zone.minX),
    zone.minY + random() * (zone.maxY - zone.minY),
    zone.minZ + random() * (zone.maxZ - zone.minZ),
  ] as [number, number, number]
}

function buildGridCandidates(index: number, random: () => number) {
  const rows = [3.1, 2.3, 1.5, 0.7, -0.1, -0.9, -1.7, -2.5, -3.3]
  const columns = [-9.8, -7.35, -4.9, -2.45, 0, 2.45, 4.9, 7.35, 9.8]
  const candidates: [number, number, number][] = []

  for (let offset = 0; offset < rows.length; offset += 1) {
    const rowIndex = (index + offset) % rows.length
    const reverse = rowIndex % 2 === 1
    const orderedColumns = reverse ? [...columns].reverse() : columns

    for (let columnIndex = 0; columnIndex < orderedColumns.length; columnIndex += 1) {
      candidates.push([
        orderedColumns[columnIndex] + (random() * 2 - 1) * 0.08,
        rows[rowIndex] + (random() * 2 - 1) * 0.06,
        -0.7 + (random() * 2 - 1) * 0.06,
      ])
    }
  }

  return candidates
}

function choosePosition(
  index: number,
  reservedHalfWidth: number,
  reservedHalfHeight: number,
  placedWords: PositionedWord[],
  random: () => number,
) {
  if (index < ANCHOR_SLOTS.length) {
    const slot = ANCHOR_SLOTS[index]

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidate = buildAnchorCandidate(slot, random)

      if (
        !collidesWithPlacedWords(
          candidate,
          reservedHalfWidth,
          reservedHalfHeight,
          placedWords,
        )
      ) {
        return candidate
      }
    }
  }

  const preferredZone = LAYOUT_ZONES[index % LAYOUT_ZONES.length]

  for (let attempt = 0; attempt < 260; attempt += 1) {
    const zone =
      attempt < 130
        ? preferredZone
        : LAYOUT_ZONES[(index + attempt) % LAYOUT_ZONES.length]

    const candidate = buildZoneCandidate(zone, random)

    if (
      !collidesWithPlacedWords(
        candidate,
        reservedHalfWidth,
        reservedHalfHeight,
        placedWords,
      )
    ) {
      return candidate
    }
  }

  const gridCandidates = buildGridCandidates(index, random)

  for (const candidate of gridCandidates) {
    if (
      !collidesWithPlacedWords(
        candidate,
        reservedHalfWidth,
        reservedHalfHeight,
        placedWords,
      )
    ) {
      return candidate
    }
  }

  return [
    clamp(
      -9.8 + ((index * 1.87) % 19.6),
      STAGE_LIMITS.minX,
      STAGE_LIMITS.maxX,
    ),
    clamp(
      [2.95, 2.15, 1.35, 0.55, -0.25, -1.05, -1.85, -2.65, -3.35][index % 9],
      STAGE_LIMITS.minY,
      STAGE_LIMITS.maxY,
    ),
    -0.7,
  ] as [number, number, number]
}

function resolveResidualOverlaps(words: PositionedWord[]) {
  const resolved = words.map((item) => ({
    ...item,
    basePosition: [...item.basePosition] as [number, number, number],
  }))

  for (let pass = 0; pass < 28; pass += 1) {
    let moved = false

    for (let leftIndex = 0; leftIndex < resolved.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < resolved.length;
        rightIndex += 1
      ) {
        const left = resolved[leftIndex]
        const right = resolved[rightIndex]

        const dx = right.basePosition[0] - left.basePosition[0]
        const dy = right.basePosition[1] - left.basePosition[1]
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        const minX = left.reservedHalfWidth + right.reservedHalfWidth
        const minY = left.reservedHalfHeight + right.reservedHalfHeight

        if (absDx >= minX || absDy >= minY) {
          continue
        }

        const overlapX = minX - absDx
        const overlapY = minY - absDy
        const leftShiftRatio = left.weight >= right.weight ? 0.16 : 0.84
        const rightShiftRatio = left.weight >= right.weight ? 0.84 : 0.16

        if (overlapX < overlapY) {
          const direction =
            absDx < 0.001
              ? (leftIndex + rightIndex) % 2 === 0
                ? -1
                : 1
              : Math.sign(dx)
          const shift = overlapX / 2 + 0.04

          left.basePosition[0] = clamp(
            left.basePosition[0] - direction * shift * leftShiftRatio,
            STAGE_LIMITS.minX,
            STAGE_LIMITS.maxX,
          )
          right.basePosition[0] = clamp(
            right.basePosition[0] + direction * shift * rightShiftRatio,
            STAGE_LIMITS.minX,
            STAGE_LIMITS.maxX,
          )
        } else {
          const direction =
            absDy < 0.001
              ? (leftIndex + rightIndex) % 2 === 0
                ? -1
                : 1
              : Math.sign(dy)
          const shift = overlapY / 2 + 0.04

          left.basePosition[1] = clamp(
            left.basePosition[1] - direction * shift * leftShiftRatio,
            STAGE_LIMITS.minY,
            STAGE_LIMITS.maxY,
          )
          right.basePosition[1] = clamp(
            right.basePosition[1] + direction * shift * rightShiftRatio,
            STAGE_LIMITS.minY,
            STAGE_LIMITS.maxY,
          )
        }

        moved = true
      }
    }

    if (!moved) {
      break
    }
  }

  return resolved
}

function buildPositionedWords(
  words: DisplayWord[],
  measurements: Record<string, MeasuredTextBounds>,
) {
  const seedSource = words.map((item) => item.id).join('|')
  const random = createRandom(createSeed(seedSource))
  const positionedWords: PositionedWord[] = []

  for (let index = 0; index < words.length; index += 1) {
    const item = words[index]
    const measured = measurements[item.id]
    const visualHalfWidth = measured.width / 2
    const visualHalfHeight = measured.height / 2
    const reservedHalfWidth = createReservedHalfWidth(
      item.word,
      measured.width,
      item.weight,
    )
    const reservedHalfHeight = createReservedHalfHeight(
      measured.height,
      item.weight,
    )

    const basePosition = choosePosition(
      index,
      reservedHalfWidth,
      reservedHalfHeight,
      positionedWords,
      random,
    )

    positionedWords.push({
      ...item,
      basePosition: [
        clamp(basePosition[0], STAGE_LIMITS.minX, STAGE_LIMITS.maxX),
        clamp(basePosition[1], STAGE_LIMITS.minY, STAGE_LIMITS.maxY),
        clamp(basePosition[2], STAGE_LIMITS.minZ, STAGE_LIMITS.maxZ),
      ],
      visualHalfWidth,
      visualHalfHeight,
      reservedHalfWidth,
      reservedHalfHeight,
    })
  }

  return resolveResidualOverlaps(positionedWords)
}

function MeasurementLayer({
  words,
  signature,
  onMeasured,
}: {
  words: DisplayWord[]
  signature: string
  onMeasured: (nextMeasurements: Record<string, MeasuredTextBounds>) => void
}) {
  const measurementsRef = useRef<Record<string, MeasuredTextBounds>>({})
  const emittedSignatureRef = useRef('')

  useEffect(() => {
    measurementsRef.current = {}
    emittedSignatureRef.current = ''
  }, [signature])

  const handleSync = useCallback(
    (wordId: string, troika: any) => {
      const bounds = getMeasuredBounds(troika)

      if (!bounds) {
        return
      }

      measurementsRef.current[wordId] = bounds

      if (Object.keys(measurementsRef.current).length !== words.length) {
        return
      }

      const nextMeasurements = { ...measurementsRef.current }
      const nextSignature = JSON.stringify(nextMeasurements)

      if (nextSignature === emittedSignatureRef.current) {
        return
      }

      emittedSignatureRef.current = nextSignature
      onMeasured(nextMeasurements)
    },
    [onMeasured, words.length],
  )

  return (
    <group position={[0, 0, -40]}>
      {words.map((item) => (
        <Text
          key={item.id}
          fontSize={item.fontSize}
          anchorX="center"
          anchorY="middle"
          maxWidth={10}
          textAlign="center"
          fillOpacity={0}
          outlineWidth={0}
          depthOffset={-100}
          onSync={(troika) => {
            handleSync(item.id, troika)
          }}
        >
          {item.word}
        </Text>
      ))}
    </group>
  )
}

function SceneGroup({ words }: { words: PositionedWord[] }) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }

    const elapsed = state.clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.016
    groupRef.current.rotation.x = Math.cos(elapsed * 0.06) * 0.007
  })

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[0, 4.5, 6]} intensity={1.05} />
      <pointLight position={[-6, 1.5, 4]} intensity={0.65} color="#4e73ff" />
      <pointLight position={[6, -1.5, 4]} intensity={0.5} color="#7a62ff" />
      <fog attach="fog" args={['#050712', 14, 22]} />

      <group ref={groupRef}>
        {words.map((item) => (
          <FloatingWord
            key={item.id}
            word={item.word}
            weight={item.weight}
            basePosition={item.basePosition}
            fontSize={item.fontSize}
            color={item.color}
            motionSeed={item.motionSeed}
          />
        ))}
      </group>
    </>
  )
}

export function WordCloudScene({ words }: WordCloudSceneProps) {
  const articleSignature = useMemo(
    () =>
      words
        .map((item) => `${item.word}:${item.weight}:${item.score}`)
        .join('|'),
    [words],
  )

  const displayWords = useMemo(
    () => createDisplayWords(words, articleSignature),
    [words, articleSignature],
  )

  const wordSignature = useMemo(
    () => getWordSignature(displayWords),
    [displayWords],
  )

  const [measurements, setMeasurements] = useState<Record<string, MeasuredTextBounds>>({})
  const [renderedWords, setRenderedWords] = useState<PositionedWord[]>([])

  useEffect(() => {
    setMeasurements({})
  }, [wordSignature])

  const areMeasurementsReady = displayWords.every((item) => measurements[item.id])

  useEffect(() => {
    if (!areMeasurementsReady) {
      return
    }

    const nextWords = buildPositionedWords(displayWords, measurements)
    setRenderedWords(nextWords)
  }, [areMeasurementsReady, displayWords, measurements])

  return (
    <div className="word-cloud-scene">
      <Canvas camera={{ position: [0, 0, 14.8], fov: 34 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#050712']} />
        <Suspense fallback={null}>
          <MeasurementLayer
            key={wordSignature}
            words={displayWords}
            signature={wordSignature}
            onMeasured={setMeasurements}
          />
          {renderedWords.length > 0 ? <SceneGroup words={renderedWords} /> : null}
        </Suspense>
      </Canvas>
    </div>
  )
}