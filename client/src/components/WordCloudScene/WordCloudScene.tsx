import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { ArticleWord } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import { FloatingWord } from '../FloatingWord/FloatingWord'
import './WordCloudScene.css'

type WordCloudSceneProps = {
  words: ArticleWord[]
}

type PositionedWord = ArticleWord & {
  position: [number, number, number]
  fontSize: number
  color: string
  halfWidth: number
  halfHeight: number
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

const ANCHOR_SLOTS: AnchorSlot[] = [
  { x: 0, y: 0.15, z: 0.2, jitterX: 0.45, jitterY: 0.22, jitterZ: 0.12 },
  { x: -3.35, y: -1.05, z: -0.25, jitterX: 0.72, jitterY: 0.3, jitterZ: 0.18 },
  { x: 3.2, y: 0.9, z: -0.35, jitterX: 0.72, jitterY: 0.32, jitterZ: 0.18 },
  { x: -4.9, y: 1.55, z: -0.85, jitterX: 0.68, jitterY: 0.28, jitterZ: 0.16 },
  { x: 4.85, y: -1.45, z: -0.85, jitterX: 0.68, jitterY: 0.3, jitterZ: 0.16 },
  { x: 0.1, y: 1.95, z: -1.1, jitterX: 0.58, jitterY: 0.2, jitterZ: 0.16 },
  { x: 0.15, y: -2.05, z: -1.1, jitterX: 0.58, jitterY: 0.2, jitterZ: 0.16 },
  { x: -5.9, y: -0.15, z: -1.05, jitterX: 0.52, jitterY: 0.24, jitterZ: 0.14 },
  { x: 5.9, y: 0.15, z: -1.05, jitterX: 0.52, jitterY: 0.24, jitterZ: 0.14 },
]

const LAYOUT_ZONES: LayoutZone[] = [
  { minX: -6.4, maxX: -2.5, minY: -2.3, maxY: 2.2, minZ: -1.45, maxZ: -0.25 },
  { minX: 2.5, maxX: 6.4, minY: -2.3, maxY: 2.2, minZ: -1.45, maxZ: -0.25 },
  { minX: -4.8, maxX: 4.8, minY: 1.15, maxY: 2.45, minZ: -1.6, maxZ: -0.45 },
  { minX: -4.8, maxX: 4.8, minY: -2.55, maxY: -1.15, minZ: -1.6, maxZ: -0.45 },
  { minX: -6.8, maxX: 6.8, minY: -2.45, maxY: 2.45, minZ: -2, maxZ: -1.1 },
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
  return 0.34 + weight * 0.92
}

function estimateHalfWidth(word: string, fontSize: number) {
  const phraseBoost = word.includes(' ') ? 1.12 : 1
  return Math.max(0.62, word.length * fontSize * 0.155 * phraseBoost)
}

function estimateHalfHeight(fontSize: number) {
  return Math.max(0.34, fontSize * 0.48)
}

function collidesWithPlacedWords(
  candidate: [number, number, number],
  halfWidth: number,
  halfHeight: number,
  placedWords: PositionedWord[],
) {
  return placedWords.some((placedWord) => {
    const dx = Math.abs(candidate[0] - placedWord.position[0])
    const dy = Math.abs(candidate[1] - placedWord.position[1])
    const dz = Math.abs(candidate[2] - placedWord.position[2])

    const sameDepthMultiplier = dz < 0.95 ? 1.18 : 0.9
    const minX =
      (halfWidth + placedWord.halfWidth) * sameDepthMultiplier + 0.22
    const minY =
      (halfHeight + placedWord.halfHeight) * sameDepthMultiplier + 0.12

    return dx < minX && dy < minY && dz < 1.8
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

function getFallbackCandidate(index: number, random: () => number) {
  const laneY = [1.85, 1.2, 0.3, -0.65, -1.55][index % 5]
  const laneX = -6.2 + ((index * 1.93) % 12.4)

  return [
    laneX + (random() * 2 - 1) * 0.25,
    laneY + (random() * 2 - 1) * 0.16,
    -1.4 + (random() * 2 - 1) * 0.12,
  ] as [number, number, number]
}

function buildPositionedWords(words: ArticleWord[]): PositionedWord[] {
  const seedSource = words
    .map((item) => `${item.word}:${item.weight}:${item.score}`)
    .join('|')

  const random = createRandom(createSeed(seedSource))
  const positionedWords: PositionedWord[] = []
  const sortedWords = [...words].sort((left, right) => right.weight - left.weight)

  sortedWords.forEach((item, index) => {
    const fontSize = createFontSize(item.weight)
    const halfWidth = estimateHalfWidth(item.word, fontSize)
    const halfHeight = estimateHalfHeight(fontSize)

    let chosenPosition: [number, number, number] | null = null

    if (index < ANCHOR_SLOTS.length) {
      const slot = ANCHOR_SLOTS[index]

      for (let attempt = 0; attempt < 40; attempt += 1) {
        const candidate = buildAnchorCandidate(slot, random)

        if (
          !collidesWithPlacedWords(
            candidate,
            halfWidth,
            halfHeight,
            positionedWords,
          )
        ) {
          chosenPosition = candidate
          break
        }
      }
    }

    if (!chosenPosition) {
      const preferredZone = LAYOUT_ZONES[index % LAYOUT_ZONES.length]

      for (let attempt = 0; attempt < 90; attempt += 1) {
        const zone =
          attempt < 45
            ? preferredZone
            : LAYOUT_ZONES[(index + attempt) % LAYOUT_ZONES.length]

        const candidate = buildZoneCandidate(zone, random)

        if (
          !collidesWithPlacedWords(
            candidate,
            halfWidth,
            halfHeight,
            positionedWords,
          )
        ) {
          chosenPosition = candidate
          break
        }
      }
    }

    if (!chosenPosition) {
      chosenPosition = getFallbackCandidate(index, random)
    }

    positionedWords.push({
      ...item,
      position: [
        clamp(chosenPosition[0], -6.9, 6.9),
        clamp(chosenPosition[1], -2.75, 2.75),
        clamp(chosenPosition[2], -2.1, 0.4),
      ],
      fontSize,
      color: getColor(item.weight),
      halfWidth,
      halfHeight,
    })
  })

  return positionedWords
}

function SceneGroup({ words }: { words: PositionedWord[] }) {
  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }

    const elapsed = state.clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(elapsed * 0.16) * 0.035
    groupRef.current.rotation.x = Math.cos(elapsed * 0.12) * 0.012
    groupRef.current.position.y = Math.sin(elapsed * 0.18) * 0.04
  })

  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[0, 4.5, 6]} intensity={1.1} />
      <pointLight position={[-5, 1.5, 4]} intensity={0.7} color="#4e73ff" />
      <pointLight position={[5, -1.5, 4]} intensity={0.55} color="#7a62ff" />
      <fog attach="fog" args={['#050712', 12, 19]} />

      <group ref={groupRef}>
        {words.map((item) => (
          <FloatingWord
            key={item.word}
            word={item.word}
            weight={item.weight}
            position={item.position}
            fontSize={item.fontSize}
            color={item.color}
          />
        ))}
      </group>
    </>
  )
}

export function WordCloudScene({ words }: WordCloudSceneProps) {
  const positionedWords = useMemo(() => buildPositionedWords(words), [words])

  return (
    <div className="word-cloud-scene">
      <Canvas camera={{ position: [0, 0, 10.6], fov: 40 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#050712']} />
        <Suspense fallback={null}>
          <SceneGroup words={positionedWords} />
        </Suspense>
      </Canvas>
    </div>
  )
}