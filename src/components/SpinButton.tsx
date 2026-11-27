import React, { useEffect, useRef, useState } from "react"
import { extend } from "@pixi/react"
import { Container, Sprite, Texture, Ticker } from "pixi.js"
import { useGameStore } from "../store/useGameStore"

// Zaregistrujeme kontejnery a spritery pro PixiJS JSX
extend({ Container, Sprite })

interface SpinButtonProps {
    x: number
    y: number
    ballTexture: Texture | null
    frameTexture: Texture | null
    size?: number
}

export function SpinButton({ x, y, ballTexture, frameTexture, size = 140 }: SpinButtonProps) {
    const spin = useGameStore((state) => state.spin)
    const gameStatus = useGameStore((state) => state.gameStatus)

    // Lokální stav pro točení tlačítka s časovým offsetem
    const [isButtonSpinning, setIsButtonSpinning] = useState(false)
    const ballRef = useRef<import("pixi.js").Sprite | null>(null)

    // Sledujeme změny gameStatus a aplikujeme 1 vteřinu offsetu při zastavování
    useEffect(() => {
        let timeoutId: any

        if (gameStatus === "SPINNING") {
            setIsButtonSpinning(true)
        } else {
            // Hra už dohrála, ale my chceme, aby se míč točil o 1 vteřinu déle (1000 ms)
            timeoutId = setTimeout(() => {
                setIsButtonSpinning(false)
            }, 400) // <-- Tady je onen časový offset 1 sekunda
        }

        return () => {
            clearTimeout(timeoutId)
        }
    }, [gameStatus])

    // Animace rotace míče řízená lokálním stavem
    useEffect(() => {
        const ticker = Ticker.shared

        const rotateBall = () => {
            if (ballRef.current) {
                // Pokud je lokální stav aktivní, točí se zběsile, jinak pomalu (idle)
                const speed = isButtonSpinning ? 0.15 : 0.01
                ballRef.current.rotation += speed
            }
        }

        ticker.add(rotateBall)
        return () => {
            ticker.remove(rotateBall)
        }
    }, [isButtonSpinning])

    const handleClick = () => {
        if (gameStatus === "IDLE" && !isButtonSpinning) {
            spin()
        }
    }

    return (
        <pixiContainer x={x} y={y} eventMode="static" cursor="pointer" onPointerDown={handleClick}>
            <pixiGraphics
                draw={(g) => {
                    g.clear()
                    // g.beginFill(0x000000, 0) // Transparentní výplň
                    // g.drawCircle(size / 2, size / 2, size / 2) // Kruh kolem míče
                    // g.endFill()

                    // g.roundRect(0, 0, size, size, 10) // Rámeček kolem tlačítka
                    // g.stroke({ color: 0x008000, width: 4 }) // Bílý rámeček
                    g.roundRect(8, 8, size - 10, size - 10, 999)
                    // g.fill({ color: 0x008000, alpha: 1 }) // Transparentní výplň
                    g.fill({ color: 0x5e4219, alpha: 1 }) // Transparentní výplň
                }}
            >
                {/* 1. Vnitřní rotační míč */}
                {ballTexture && (
                    <pixiSprite
                        ref={(el) => {
                            if (el) ballRef.current = el
                        }}
                        texture={ballTexture}
                        anchor={0.5}
                        x={size / 2}
                        y={size / 2 + 1}
                        width={size * 0.75} // Míč o něco menší než rám, aby se do něj vešel
                        height={size * 0.75}
                    />
                )}

                {/* 2. Statický vnější rám */}
                {frameTexture && <pixiSprite texture={frameTexture} anchor={0.5} x={size / 2} y={size / 2} width={size} height={size} />}
            </pixiGraphics>
        </pixiContainer>
    )
}
