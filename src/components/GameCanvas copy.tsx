import React, { useEffect, useState, useCallback, useRef } from "react"
import { Application, extend } from "@pixi/react"
import { Container, Graphics, Sprite, Assets, Texture, Ticker, Application as PixiApplication, Text } from "pixi.js"
import { useGameStore, SymbolType, SymbolsTextureSizes } from "../store/useGameStore"

// Zaregistrujeme komponenty pro PixiJS v8 JSX
extend({ Container, Graphics, Sprite })

const SYMBOL_SIZE = 90
const GAP = 10
const SLOT_STEP = SYMBOL_SIZE + GAP // 100px na 1 pozici
const TOTAL_ROWS = 6 // Kolik symbolů celkem tvoří "pás" v jednom válci
const VISIBLE_ROWS = 3 // Kolik jich má být vidět

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
    const [bgTexture, setBgTexture] = useState<Texture | null>(null)
    const [refereeTexture, setRefereeTexture] = useState<Texture | null>(null)
    const [loaded, setLoaded] = useState(false)

    // Reference na kontejnery a masku
    const reelContainersRef = useRef<Array<Container | null>>([null, null, null])
    const maskRef = useRef<Graphics | null>(null)
    const isSpinningRef = useRef(false)
    const spinSpeedsRef = useRef([0, 0, 0])

    // Pomocný balíček náhodných symbolů pro "pás" během točení
    const getRandomSymbol = (): SymbolType => {
        const syms: SymbolType[] = ["BALL", "TROPHY", "BOOT", "WHISTLE"]
        return syms[Math.floor(Math.random() * syms.length)]
    }

    // Načtení textur
    useEffect(() => {
        async function loadTextures() {
            try {
                const loadedTextures: Record<string, Texture> = {}
                const symbols: SymbolType[] = ["BALL", "TROPHY", "BOOT", "WHISTLE"]

                for (const symbol of symbols) {
                    const texture = await Assets.load<Texture>(`/assets/images/slots/${symbol}.webp`)

                    if (texture && texture.source) {
                        texture.source.scaleMode = "linear" // Zajistí hladké a ostré hrany bez rozmazání
                    }

                    loadedTextures[symbol] = texture
                }

                const backgroundTexture = await Assets.load<Texture>(`/assets/images/slots_frame.webp`)
                if (backgroundTexture && backgroundTexture.source) {
                    backgroundTexture.source.scaleMode = "linear"
                }

                const refereeTexture = await Assets.load<Texture>(`/assets/images/referee.webp`)
                if (refereeTexture && refereeTexture.source) {
                    refereeTexture.source.scaleMode = "linear"
                }

                setRefereeTexture(refereeTexture)
                setBgTexture(backgroundTexture)
                setTextures(loadedTextures as Record<SymbolType, Texture>)
                setLoaded(true)
            } catch (e) {
                console.error("Chyba při načítání assetů slotu:", e)
            }
        }
        loadTextures()
    }, [])

    // Reakce na stav točení
    useEffect(() => {
        if (gameStatus === "SPINNING") {
            isSpinningRef.current = true
            spinSpeedsRef.current = [30, 35, 40]
            // spinSpeedsRef.current = [1, 1, 1]
            // spinSpeedsRef.current = [0, 0, 0]
        } else {
            // Jakmile točení skončí (bez ohledu na to, zda jdeme do EVALUATING, WIN nebo SPECIAL_WIN),
            // válce plynule dojedou a zastaví se.
            const timer = setTimeout(() => {
                isSpinningRef.current = false
                spinSpeedsRef.current = [0, 0, 0]
                reelContainersRef.current.forEach((c) => {
                    if (c) c.y = 0
                })
            }, 400) // Zkráceno na 400ms pro svižnější zastavení
            return () => clearTimeout(timer)
        }
    }, [gameStatus])

    // Game loop pro plynulý pohyb dolů
    useEffect(() => {
        const ticker = Ticker.shared

        const animateReels = () => {
            if (!isSpinningRef.current) return

            reelContainersRef.current.forEach((container, colIdx) => {
                if (!container) return

                container.y += spinSpeedsRef.current[colIdx]

                // Jakmile popojedeme o celý jeden krok, posuneme vnitřek a resetujeme y,
                // čímž vytvoříme plynulý nekonečný pás bez "skákání"
                if (container.y >= SLOT_STEP * 1.5) {
                    container.y -= SLOT_STEP
                }
            })
        }

        ticker.add(animateReels)
        return () => {
            ticker.remove(animateReels)
        }
    }, [])

    // Vykreslení ořezové masky pro PixiJS v8
    const drawMaskGraphics = useCallback((g: Graphics) => {
        g.clear()
        // Oblast, kde budou symboly viditelné (odpovídá rozměrům mřížky 3x3)
        g.rect(20, 20, 522, 522)
        g.fill({ color: "transparent" })
    }, [])

    if (!loaded) {
        return <div style={{ color: "white", textAlign: "center", padding: "40px" }}>Načítám grafiku válců...</div>
    }

    return (
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <Application
                background={0x00000000}
                backgroundAlpha={0}
                width={600}
                height={600}
                onInit={(app: PixiApplication) => {
                    ;(globalThis as typeof globalThis & { __PIXI_APP__: PixiApplication }).__PIXI_APP__ = app
                }}
            >
                {/* Referee */}
                {/* {refereeTexture && <pixiSprite texture={refereeTexture} x={-83} y={-78} width={726} height={726} />} */}

                <pixiContainer x={20} y={20}>
                    {/* 1. Pozadí desky (místo šedého obdélníku vykreslíme obrázek pozadí, pokud je načtený) */}
                    {bgTexture ? (
                        <pixiSprite texture={bgTexture} x={-83} y={-78} width={726} height={726} />
                    ) : (
                        <pixiGraphics
                            draw={(g) => {
                                g.clear()
                                g.roundRect(0, 0, 600, 600, 16)
                                // g.fill({ color: 0x611111 })
                            }}
                        />
                    )}

                    {/* Maskovací oblast */}
                    <pixiGraphics
                        ref={(el) => {
                            if (el) maskRef.current = el
                        }}
                        draw={drawMaskGraphics}
                    />

                    {/* Hlavní kontejner pro hrací plochu s aplikovanou maskou */}
                    <pixiContainer mask={maskRef.current} width={486} x={-14} height={486} y={-14}>
                        {grid.map((column, colIdx) => {
                            const reelSymbols: SymbolType[] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol(), column[0], column[1], column[2]]

                            return (
                                <pixiContainer key={colIdx} x={colIdx * SLOT_STEP + 20} y={20}>
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
                                                    {/* Místo plného šedého pozadí za symbolem teď dáváme jemný obrys/rámeček,
                                                        aby prosvítalo naše nové pozadí (bgTexture) */}
                                                    <pixiGraphics
                                                        draw={(g) => {
                                                            g.clear()
                                                            g.roundRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 10)
                                                            // Změněno na částečně průhlednou černou, aby prosvítalo pozadí hřiště za symboly
                                                            g.fill({ color: 0x000000, alpha: 0.4 })

                                                            if (isWinning && !isSpinningRef.current) {
                                                                g.stroke({ width: 4, color: 0xffd700 })
                                                            } else {
                                                                g.stroke({ width: 2, color: 0x555555, alpha: 0.6 })
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
                </pixiContainer>
            </Application>
        </div>
    )
}
