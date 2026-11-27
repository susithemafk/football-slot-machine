import React, { useEffect, useState, useCallback, useRef } from "react"
import { Application, extend } from "@pixi/react"
import { Container, Graphics, Sprite, Assets, Texture, Ticker, Application as PixiApplication } from "pixi.js"
import { useGameStore, SymbolType, SymbolsTextureSizes } from "../store/useGameStore"
import { SpinButton } from "./SpinButton"
import { OutlineFilter } from "pixi-filters"

// Zaregistrujeme komponenty pro PixiJS v8 JSX
extend({ Container, Graphics, Sprite })

interface CustomSprite extends Sprite {
    _symbolType?: SymbolType
}

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
            // Jakmile točení ve store skončí, okamžitě zastavíme pohyb a srovnáme pozici
            isSpinningRef.current = false
            spinSpeedsRef.current = [0, 0, 0]
            reelContainersRef.current.forEach((c) => {
                if (c) c.y = 0
            })
        }
    }, [gameStatus])

    // Game loop pro plynulý pohyb válců dolů
    // Game loop pro plynulý pohyb válců a okamžitou animaci výher
    // Game loop pro plynulý pohyb válců a zpomalenou, dramatickou animaci výher
    // Game loop pro pohyb válců, animaci velikosti (width/height) a zatmavení
    useEffect(() => {
        const ticker = Ticker.shared
        let winAnimElapsed = 0
        let lastActiveLine = activeLineIndex

        const animate = () => {
            if (gameStatus === "SPINNING") {
                isSpinningRef.current = true
                winAnimElapsed = 0

                // Při roztočení resetujeme všechna alpha a vrátíme rozměry na čisté hodnoty ze slovníku
                reelContainersRef.current.forEach((reel) => {
                    if (!reel) return
                    reel.children.forEach((itemContainer) => {
                        const bg = itemContainer.children[0]
                        const sprite = itemContainer.children[1] as CustomSprite

                        if (bg) bg.alpha = 1.0
                        if (sprite && sprite._symbolType) {
                            sprite.alpha = 1.0
                            sprite.width = SymbolsTextureSizes[sprite._symbolType].width
                            sprite.height = SymbolsTextureSizes[sprite._symbolType].height
                        }
                    })
                })

                reelContainersRef.current.forEach((container, colIdx) => {
                    if (!container) return
                    container.y += spinSpeedsRef.current[colIdx]
                    if (container.y >= SLOT_STEP * 1.5) {
                        container.y -= SLOT_STEP
                    }
                })
            } else if (winningLines && winningLines.length > 0 && activeLineIndex !== null) {
                if (lastActiveLine !== activeLineIndex) {
                    winAnimElapsed = 0
                    lastActiveLine = activeLineIndex
                }

                winAnimElapsed += 0.025

                let sizeMultiplier = 1.0
                if (winAnimElapsed < 0.6) {
                    const progress = winAnimElapsed / 0.6
                    sizeMultiplier = 1.0 + Math.sin(progress * Math.PI) * 0.15
                } else {
                    const pulseTime = (winAnimElapsed - 0.6) * 2.5
                    sizeMultiplier = 1.0 + Math.sin(pulseTime) * 0.03
                }

                const currentActiveLine = winningLines[activeLineIndex]

                reelContainersRef.current.forEach((reel, colIdx) => {
                    if (!reel) return

                    reel.children.forEach((itemContainer, sIdx) => {
                        const rowOffset = sIdx - 3
                        const isWithinGrid = rowOffset >= 0 && rowOffset < VISIBLE_ROWS

                        if (isWithinGrid) {
                            const isCurrentActiveWinningSymbol = currentActiveLine
                                ? currentActiveLine.winningLineShape.some(([c, r]) => c === colIdx && r === rowOffset)
                                : false

                            const bgGraphics = itemContainer.children[0]
                            const symbolSprite = itemContainer.children[1] as CustomSprite

                            if (symbolSprite && symbolSprite._symbolType) {
                                const baseSize = SymbolsTextureSizes[symbolSprite._symbolType]
                                const origW = baseSize.width
                                const origH = baseSize.height

                                if (isCurrentActiveWinningSymbol) {
                                    symbolSprite.width = origW * sizeMultiplier
                                    symbolSprite.height = origH * sizeMultiplier
                                    symbolSprite.alpha = 1.0
                                    // if (bgGraphics) bgGraphics.alpha = 1.0
                                } else {
                                    symbolSprite.width = origW
                                    symbolSprite.height = origH
                                    symbolSprite.alpha = 0.35
                                }
                                if (bgGraphics) bgGraphics.alpha = 0.5
                            }
                        }
                    })
                })
            } else {
                winAnimElapsed = 0
                lastActiveLine = null

                reelContainersRef.current.forEach((reel) => {
                    if (!reel) return
                    reel.children.forEach((itemContainer) => {
                        const bg = itemContainer.children[0]
                        const sprite = itemContainer.children[1] as CustomSprite
                        if (bg) bg.alpha = 1.0
                        if (sprite && sprite._symbolType) {
                            sprite.width = SymbolsTextureSizes[sprite._symbolType].width
                            sprite.height = SymbolsTextureSizes[sprite._symbolType].height
                            sprite.alpha = 1.0
                        }
                    })
                })
            }
        }

        ticker.add(animate)
        return () => {
            ticker.remove(animate)
        }
    }, [gameStatus, winningLines, activeLineIndex])

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
                        {(() => {
                            winningSpritesRef.current = []
                            return null
                        })()}

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
                                                <pixiContainer
                                                    key={sIdx}
                                                    x={SYMBOL_SIZE / 2} // Střed sloupce
                                                    y={rowOffset * SLOT_STEP + SYMBOL_SIZE / 2} // Střed řádku
                                                >
                                                    <pixiGraphics
                                                        draw={(g) => {
                                                            g.clear()
                                                            g.roundRect(-SYMBOL_SIZE / 2, -SYMBOL_SIZE / 2, SYMBOL_SIZE, SYMBOL_SIZE, 10)
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
                                                            x={0}
                                                            y={0}
                                                            anchor={0.5}
                                                            width={width}
                                                            height={height}
                                                            // filters={[new OutlineFilter({ thickness: 4, color: 0xffd700 })]}
                                                            filters={
                                                                isWinning && gameStatus !== "SPINNING" && gameStatus !== "EVALUATING"
                                                                    ? [new OutlineFilter({ thickness: 4, color: 0xd6c829 })]
                                                                    : []
                                                            }
                                                            // ref={(el) => {
                                                            //     if (el && isWinning && gameStatus !== "SPINNING" && gameStatus !== "EVALUATING") {
                                                            //         // Přidáme do pole pro pulzování
                                                            //         winningSpritesRef.current.push({ sprite: el, baseScale: 1 })
                                                            //     } else if (el && !isWinning) {
                                                            //         // Odstraníme z pole, pokud už není výherní
                                                            //         winningSpritesRef.current = winningSpritesRef.current.filter((item) => item.sprite !== el)
                                                            //     }
                                                            // }}
                                                            // ref={(el) => {
                                                            //     if (el && isWinning && gameStatus !== "SPINNING" && gameStatus !== "EVALUATING") {
                                                            //         winningSpritesRef.current.push({ sprite: el, baseScale: 1.0 })
                                                            //     }
                                                            // }}
                                                            ref={(el: CustomSprite | null) => {
                                                                if (el) {
                                                                    el._symbolType = symbol
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
