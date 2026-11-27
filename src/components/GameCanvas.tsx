import React, { useEffect, useState, useCallback, useRef } from "react"
import { Application, extend } from "@pixi/react"
import { Container, Graphics, Sprite, Assets, Texture, Ticker, Application as PixiApplication } from "pixi.js"
import { useGameStore, SymbolType, SymbolsTextureSizes } from "../store/useGameStore"
import { SpinButton } from "./SpinButton"
import { OutlineFilter } from "pixi-filters"

// Zaregistrujeme komponenty pro PixiJS v8 JSX
extend({ Container, Graphics, Sprite })

const SYMBOL_SIZE = 90
const GAP = 10
const SLOT_STEP = SYMBOL_SIZE + GAP // 100px na 1 pozici
const VISIBLE_ROWS = 3

export function GameCanvas() {
    const grid = useGameStore((state) => state.grid)
    const gameStatus = useGameStore((state) => state.gameStatus)
    const winningLines = useGameStore((state) => state.winningLines)
    const activeLineIndex = useGameStore((state) => state.activeLineIndex)

    const [textures, setTextures] = useState<Record<SymbolType, Texture | null>>({
        BALL: null,
        TROPHY: null,
        BOOT: null,
        WHISTLE: null,
    })
    const [frameTexture, setFrameTexture] = useState<Texture | null>(null)
    const [buttonFrameTex, setButtonFrameTex] = useState<Texture | null>(null)
    const [ballTexture, setBallTexture] = useState<Texture | null>(null)

    const [loaded, setLoaded] = useState(false)

    // Reference pro kontejnery točení a masku
    const reelContainersRef = useRef<Array<Container | null>>([null, null, null])
    const maskGraphicRef = useRef<Graphics | null>(null)
    const [maskObj, setMaskObj] = useState<Graphics | null>(null)

    const winningSpritesRef = useRef<Array<{ sprite: import("pixi.js").Sprite; baseScale: number }>>([])

    const isSpinningRef = useRef(false)
    const spinSpeedsRef = useRef([0, 0, 0])

    const getRandomSymbol = (): SymbolType => {
        const syms: SymbolType[] = ["BALL", "TROPHY", "BOOT", "WHISTLE"]
        return syms[Math.floor(Math.random() * syms.length)]
    }

    // Načtení textur při startu
    useEffect(() => {
        async function loadTextures() {
            try {
                const loadedTextures: Record<string, Texture> = {}
                const symbols: SymbolType[] = ["BALL", "TROPHY", "BOOT", "WHISTLE"]

                for (const symbol of symbols) {
                    const texture = await Assets.load<Texture>(`/assets/images/slots/${symbol}.webp`)
                    if (texture && texture.source) {
                        texture.source.scaleMode = "linear"
                    }
                    loadedTextures[symbol] = texture
                }

                const frameTex = await Assets.load<Texture>(`/assets/images/slots_frame.webp`)
                if (frameTex && frameTex.source) {
                    frameTex.source.scaleMode = "linear"
                }

                const buttonFrameTex = await Assets.load<Texture>(`/assets/images/spin-button-frame.png`)
                if (buttonFrameTex && buttonFrameTex.source) {
                    buttonFrameTex.source.scaleMode = "linear"
                }

                const ballTex = await Assets.load<Texture>(`/assets/images/spin-button.webp`)
                if (ballTex && ballTex.source) {
                    ballTex.source.scaleMode = "linear"
                }

                setBallTexture(ballTex)
                setButtonFrameTex(buttonFrameTex)
                setFrameTexture(frameTex)
                setTextures(loadedTextures as Record<SymbolType, Texture>)
                setLoaded(true)
            } catch (e) {
                console.error("Chyba při načítání assetů slotu:", e)
            }
        }
        loadTextures()
    }, [])

    // Propojení masky hned po mountnutí grafiky
    const setMaskRef = useCallback((node: Graphics | null) => {
        if (node) {
            maskGraphicRef.current = node
            setMaskObj(node) // Uložíme do stavu, aby ho pixiContainer mohl bezpečně použít
        }
    }, [])

    // Reakce na stav točení
    useEffect(() => {
        if (gameStatus === "SPINNING") {
            isSpinningRef.current = true
            spinSpeedsRef.current = [30, 35, 40]
        } else {
            const timer = setTimeout(() => {
                isSpinningRef.current = false
                spinSpeedsRef.current = [0, 0, 0]
                reelContainersRef.current.forEach((c) => {
                    if (c) c.y = 0
                })
            }, 400)
            return () => clearTimeout(timer)
        }
    }, [gameStatus])

    // Game loop pro plynulý pohyb válců dolů
    useEffect(() => {
        const ticker = Ticker.shared
        let elapsed = 0

        const animate = () => {
            elapsed += 0.05 // Rychlost pulzování

            // 1. Původní animace točení válců
            if (isSpinningRef.current) {
                reelContainersRef.current.forEach((container, colIdx) => {
                    if (!container) return
                    container.y += spinSpeedsRef.current[colIdx]
                    if (container.y >= SLOT_STEP * 1.5) {
                        container.y -= SLOT_STEP
                    }
                })
            }

            // 2. Nová animace pulzování výherních symbolů (scale pohlcení / přiblížení)
            if (!isSpinningRef.current && winningLines && winningLines.length > 0) {
                // Vytvoříme plynulý sinusový puls od 1.0 do 1.12 (zvětšení a zmenšení)
                const pulseScale = 0.0475 + Math.sin(elapsed * 4.6) * 0.12 * 0.02

                winningSpritesRef.current.forEach((item) => {
                    if (item && item.sprite) {
                        item.sprite.scale.set(pulseScale)
                    }
                })
            }
        }

        ticker.add(animate)
        return () => {
            ticker.remove(animate)
        }
    }, [winningLines])

    if (!loaded) {
        return <div style={{ color: "white", textAlign: "center", padding: "40px" }}>Načítám grafiku válců...</div>
    }

    return (
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <Application
                background={0x000}
                backgroundAlpha={0}
                width={500}
                height={650}
                onInit={(app: PixiApplication) => {
                    ;(globalThis as typeof globalThis & { __PIXI_APP__: PixiApplication }).__PIXI_APP__ = app
                }}
            >
                <pixiContainer>
                    {/* VRSTVA 1: Tmavé pozadí hrací plochy pod symboly */}
                    {/* <pixiGraphics
                        draw={(g) => {
                            g.clear()
                            g.roundRect(45, 45, 300, 300, 8)
                            g.fill({ color: 0x9a1a1a })
                        }}
                    /> */}

                    {/* VRSTVA 4: Zlatý rám (slots_frame) je v JSX až na konci, takže leží FYZICKY ÚPLNĚ NAVRCH */}
                    {frameTexture && <pixiSprite texture={frameTexture} x={0} anchor={0.0825} y={0} width={600} height={600} />}

                    {/* VRSTVA 2: Definice grafické masky (nevykresluje se na plátno jako viditelný prvek, slouží pro ořez) */}
                    <pixiGraphics
                        ref={setMaskRef}
                        draw={(g) => {
                            g.clear()
                            g.rect(34, 32, 438, 438)
                            g.fill({ color: 0xffffff })
                        }}
                    />

                    {/* VRSTVA 3: Válce obalené maskou */}
                    <pixiContainer mask={maskObj} scale={1.5} x={-33} y={-33}>
                        {grid.map((column, colIdx) => {
                            const reelSymbols: SymbolType[] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol(), column[0], column[1], column[2]]

                            return (
                                <pixiContainer key={colIdx} x={colIdx * SLOT_STEP + 45} y={45}>
                                    <pixiContainer
                                        ref={(el) => {
                                            if (el) reelContainersRef.current[colIdx] = el
                                        }}
                                    >
                                        {reelSymbols.map((symbol, sIdx) => {
                                            const rowOffset = sIdx - 3
                                            const isWithinGrid = rowOffset >= 0 && rowOffset < VISIBLE_ROWS

                                            let isWinning = false
                                            if (isWithinGrid && winningLines && activeLineIndex !== null && winningLines[activeLineIndex]) {
                                                const currentActiveLine = winningLines[activeLineIndex]
                                                isWinning = currentActiveLine.winningLineShape.some(([c, r]) => c === colIdx && r === rowOffset)
                                            }

                                            const texture = textures[symbol]
                                            const height = SymbolsTextureSizes[symbol].height
                                            const width = SymbolsTextureSizes[symbol].width

                                            return (
                                                <pixiContainer key={sIdx} x={0} y={rowOffset * SLOT_STEP}>
                                                    <pixiGraphics
                                                        draw={(g) => {
                                                            g.clear()
                                                            g.roundRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 10)
                                                            g.fill({ color: 0x2a2a2a, alpha: 1 })

                                                            if (isWinning && !isSpinningRef.current) {
                                                                // g.stroke({ width: 4, color: 0xffd700 })
                                                            } else {
                                                                g.stroke({ width: 0 })
                                                            }
                                                        }}
                                                    />

                                                    {texture && (
                                                        <pixiSprite
                                                            texture={texture}
                                                            x={SYMBOL_SIZE / 2}
                                                            y={SYMBOL_SIZE / 2}
                                                            anchor={0.5}
                                                            width={width}
                                                            height={height}
                                                            // filters={[new OutlineFilter({ thickness: 4, color: 0xffd700 })]}
                                                            filters={
                                                                isWinning && !isSpinningRef.current
                                                                    ? [new OutlineFilter({ thickness: 4, color: 0xd6c829 })]
                                                                    : []
                                                            }
                                                            ref={(el) => {
                                                                if (el && isWinning && !isSpinningRef.current) {
                                                                    // Přidáme do pole pro pulzování
                                                                    winningSpritesRef.current.push({ sprite: el, baseScale: 1 })
                                                                } else if (el && !isWinning) {
                                                                    // Odstraníme z pole, pokud už není výherní
                                                                    winningSpritesRef.current = winningSpritesRef.current.filter((item) => item.sprite !== el)
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </pixiContainer>
                                            )
                                        })}
                                    </pixiContainer>
                                </pixiContainer>
                            )
                        })}
                    </pixiContainer>

                    <SpinButton x={185} y={440} ballTexture={ballTexture} frameTexture={buttonFrameTex} />

                    {/* VRSTVA 4: Zlatý rám (slots_frame) je v JSX až na konci, takže leží FYZICKY ÚPLNĚ NAVRCH */}
                    {/* {frameTexture && <pixiSprite texture={frameTexture} x={0} y={0} width={390} height={390} />} */}
                </pixiContainer>
            </Application>
        </div>
    )
}
