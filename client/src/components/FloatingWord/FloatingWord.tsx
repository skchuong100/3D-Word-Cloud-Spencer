import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { MathUtils, type Group } from 'three'

type FloatingWordProps = {
  word: string
  weight: number
  basePosition: [number, number, number]
  fontSize: number
  color: string
  motionSeed: number
}

function getMotionRange(weight: number) {
  return {
    x: 0.026 + (1 - weight) * 0.02,
    y: 0.018 + (1 - weight) * 0.016,
    z: 0.012 + (1 - weight) * 0.012,
  }
}

export function FloatingWord({
  word,
  weight,
  basePosition,
  fontSize,
  color,
  motionSeed,
}: FloatingWordProps) {
  const groupRef = useRef<Group>(null)
  const [isHovered, setIsHovered] = useState(false)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }

    const elapsed = state.clock.elapsedTime
    const motion = getMotionRange(weight)

    groupRef.current.position.set(
      basePosition[0] +
        Math.sin(elapsed * (0.36 + motionSeed * 0.22) + motionSeed * 11) *
          motion.x,
      basePosition[1] +
        Math.cos(elapsed * (0.42 + motionSeed * 0.18) + motionSeed * 17) *
          motion.y,
      basePosition[2] +
        Math.sin(elapsed * (0.28 + motionSeed * 0.14) + motionSeed * 7) *
          motion.z,
    )

    const targetScale = isHovered ? 1.05 : 1
    const nextScale = MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.08)
    groupRef.current.scale.setScalar(nextScale)
  })

  return (
    <group ref={groupRef} position={basePosition}>
      <Billboard follow>
        <Text
          fontSize={fontSize}
          color={isHovered ? '#ffffff' : color}
          anchorX="center"
          anchorY="middle"
          maxWidth={10}
          textAlign="center"
          outlineWidth={0.02}
          outlineColor="#09101f"
          fillOpacity={0.98}
          onPointerOver={(event) => {
            event.stopPropagation()
            setIsHovered(true)
          }}
          onPointerOut={() => {
            setIsHovered(false)
          }}
        >
          {word}
        </Text>
      </Billboard>
    </group>
  )
}