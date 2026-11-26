import React, { useEffect, useState, useCallback, useRef } from "react"
import { Application, extend } from "@pixi/react"
import { Container, Graphics, Sprite, Assets, Texture, Ticker, Application as PixiApplication } from "pixi.js"
import { useGameStore, SymbolType } from "../store/useGameStore"

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
                    const texture = await Assets.load<Texture>(`/assets/images/slots/${symbol}.png`)
                    loadedTextures[symbol] = texture
                }

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
            spinSpeedsRef.current = [30, 35, 40] // Rychlost točení
        } else if (gameStatus === "EVALUATING" || gameStatus === "IDLE") {
            const timer = setTimeout(() => {
                isSpinningRef.current = false
                spinSpeedsRef.current = [0, 0, 0]
                // Po zastavení srovnáme pozici kontejnerů přesně na 0
                reelContainersRef.current.forEach((c) => {
                    if (c) c.y = 0
                })
            }, 600)
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
                if (container.y >= SLOT_STEP) {
                    container.y -= SLOT_STEP
                }
            })
        }

        ticker.add(animateReels)
        return () => {
            ticker.remove(animateReels)
        }
    }, [])

    // Pozadí celé herní desky
    const drawBoardBackground = useCallback((g: Graphics) => {
        g.clear()
        g.roundRect(0, 0, 340, 340, 16)
        g.fill({ color: 0x111111, alpha: 0.95 })
        g.stroke({ width: 4, color: 0x444444 })
    }, [])

    // Vykreslení ořezové masky pro PixiJS v8
    const drawMaskGraphics = useCallback((g: Graphics) => {
        g.clear()
        // Oblast, kde budou symboly viditelné (odpovídá rozměrům mřížky 3x3)
        g.rect(20, 20, 300, 300)
        g.fill({ color: 0xffffff })
    }, [])

    if (!loaded) {
        return <div style={{ color: "white", textAlign: "center", padding: "40px" }}>Načítám grafiku válců...</div>
    }

    return (
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <Application
                background={0x0a0a0a}
                width={380}
                height={380}
                onInit={(app: PixiApplication) => {
                    ;(globalThis as typeof globalThis & { __PIXI_APP__: PixiApplication }).__PIXI_APP__ = app
                }}
            >
                <pixiContainer x={20} y={20}>
                    {/* Pozadí desky */}
                    <pixiGraphics draw={drawBoardBackground} />

                    {/* Definice grafické masky pro ořez */}
                    <pixiGraphics
                        ref={(el) => {
                            if (el) maskRef.current = el
                        }}
                        draw={drawMaskGraphics}
                    />

                    {/* Hlavní kontejner pro hrací plochu s aplikovanou maskou */}
                    <pixiContainer mask={maskRef.current}>
                        {grid.map((column, colIdx) => {
                            // Sestavíme delší pás symbolů (např. 6 kusů),
                            // kde spodní 3 symboly (indexy 3, 4, 5) jsou reálný výsledek `column` ze store.
                            const reelSymbols: SymbolType[] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol(), column[0], column[1], column[2]]

                            return (
                                <pixiContainer key={colIdx} x={colIdx * SLOT_STEP + 20} y={20}>
                                    {/* Pohyblivý kontejner válce */}
                                    <pixiContainer
                                        ref={(el) => {
                                            if (el) reelContainersRef.current[colIdx] = el
                                        }}
                                    >
                                        {reelSymbols.map((symbol, sIdx) => {
                                            // Reálné řádky 0, 1, 2 odpovídají posledním třem prvkům v poli reelSymbols (indexy 3, 4, 5)
                                            // Abychom je správně zarovnali, posuneme celý pás o 3 kroky nahoru,
                                            // tak aby ve viditelné mřížce 3x3 byly zobrazené přesně ty cílové symboly.
                                            const rowOffset = sIdx - 3
                                            const isWithinGrid = rowOffset >= 0 && rowOffset < VISIBLE_ROWS

                                            let isWinning = false
                                            if (isWithinGrid && winningLines && activeLineIndex !== null && winningLines[activeLineIndex]) {
                                                const currentActiveLine = winningLines[activeLineIndex]
                                                isWinning = currentActiveLine.winningLineShape.some(([c, r]) => c === colIdx && r === rowOffset)
                                            }

                                            const texture = textures[symbol]

                                            return (
                                                <pixiContainer key={sIdx} x={0} y={rowOffset * SLOT_STEP}>
                                                    <pixiGraphics
                                                        draw={(g) => {
                                                            g.clear()
                                                            g.roundRect(0, 0, SYMBOL_SIZE, SYMBOL_SIZE, 10)
                                                            g.fill({ color: 0x222222 })

                                                            if (isWinning && !isSpinningRef.current) {
                                                                g.stroke({ width: 4, color: 0xffd700 }) // Zlatý rámeček výhry
                                                            } else {
                                                                g.stroke({ width: 2, color: 0x555555 })
                                                            }
                                                        }}
                                                    />

                                                    {texture && (
                                                        <pixiSprite
                                                            texture={texture}
                                                            x={SYMBOL_SIZE / 2}
                                                            y={SYMBOL_SIZE / 2}
                                                            anchor={0.5}
                                                            width={75}
                                                            height={75}
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
