import { Billboard, Float, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { MathUtils, type Group } from 'three'

type FloatingWordProps = {
  word: string
  weight: number
  position: [number, number, number]
  fontSize: number
  color: string
}

export function FloatingWord({
  word,
  weight,
  position,
  fontSize,
  color,
}: FloatingWordProps) {
  const groupRef = useRef<Group>(null)
  const [isHovered, setIsHovered] = useState(false)

  useFrame(() => {
    if (!groupRef.current) {
      return
    }

    const targetScale = isHovered ? 1.06 : 1
    const nextScale = MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.08)
    groupRef.current.scale.setScalar(nextScale)
  })

  return (
    <group ref={groupRef} position={position}>
      <Float
        speed={0.7 + weight * 0.65}
        rotationIntensity={0.04}
        floatIntensity={0.18 + weight * 0.14}
        floatingRange={[-0.06, 0.06]}
      >
        <Billboard follow>
          <Text
            fontSize={fontSize}
            color={isHovered ? '#ffffff' : color}
            anchorX="center"
            anchorY="middle"
            maxWidth={8.6}
            textAlign="center"
            outlineWidth={0.022}
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
      </Float>
    </group>
  )
}