import { useEffect, useState } from "react"
import { useGameStore, SYMBOLS_POOL } from "./store/useGameStore"
import { SpecialWinOverlay } from "./components/SpecialWinOverlay"

export function App() {
    const { balance, currentBet, gameStatus, grid, lastWin, winningLines, spin, setBet, loadGame } = useGameStore()

    // Lokální stav pro index právě zobrazené výherní linie
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)

    useEffect(() => {
        loadGame()
    }, [loadGame])

    // Efekt pro cyklické střídání výherních linií, pokud nějaké existují a hra není v procesu točení
    useEffect(() => {
        if (!winningLines || winningLines.length === 0 || gameStatus === "SPINNING") {
            setActiveLineIndex(null)
            return
        }

        // Nastavíme první linii hned
        setActiveLineIndex(0)

        // Každou 1..5 sekundy přepneme na další výherní linii v pořadí
        const interval = setInterval(() => {
            setActiveLineIndex((prevIndex) => {
                if (prevIndex === null) return 0
                // Pokud jsme na konci pole, vrátíme se na začátek (cyklení)
                return (prevIndex + 1) % winningLines.length
            })
        }, 1500)

        return () => clearInterval(interval)
    }, [winningLines, gameStatus])

    const getBackgroundColor = (symbol: string) => {
        const symbolData = SYMBOLS_POOL.find((item) => item.type === symbol)
        return symbolData?.bgColor || "#333"
    }

    // Zkontroluje, zda políčko patří do AKTUÁLNĚ zobrazené výherní linie
    const getActiveWinInfo = (colIdx: number, rowIdx: number) => {
        if (!winningLines || activeLineIndex === null) return null

        const currentLine = winningLines[activeLineIndex]
        if (!currentLine) return null

        const isPartOfLine = currentLine.winningLineShape.some(([c, r]) => c === colIdx && r === rowIdx)

        return isPartOfLine ? currentLine : null
    }

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif", background: "#111", color: "#fff", minHeight: "100vh" }}>
            <h1>⚽ Fotbalový Slot Automat</h1>

            <div style={{ margin: "20px 0", fontSize: "18px" }}>
                <p>
                    Kredit: <strong>{balance} Kč</strong>
                </p>
                <p>
                    Sázka: <strong>{currentBet} Kč</strong>
                </p>
                <p>
                    Stav automatu: <strong style={{ color: gameStatus === "SPINNING" ? "yellow" : "lightgreen" }}>{gameStatus}</strong>
                </p>

                {/* Info o právě zobrazené linii */}
                {winningLines && winningLines.length > 0 && activeLineIndex !== null && (
                    <p style={{ color: "gold", fontSize: "18px" }}>
                        🏆 Zobrazuji výherní linii {activeLineIndex + 1} z {winningLines.length}
                        (Výhra: {winningLines[activeLineIndex].prize} Kč)
                    </p>
                )}

                {lastWin > 0 && <p style={{ color: "gold", fontSize: "22px" }}>GÓL! Celková výhra: {lastWin} Kč!</p>}
            </div>

            {/* Mřížka 3x3 */}
            <div style={{ display: "flex", gap: "10px", background: "#222", padding: "15px", width: "fit-content", borderRadius: "8px" }}>
                {grid.map((column, colIdx) => (
                    <div key={colIdx} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {column.map((symbol, rowIdx) => {
                            const winInfo = getActiveWinInfo(colIdx, rowIdx)
                            const isWinning = Boolean(winInfo)

                            return (
                                <div
                                    key={rowIdx}
                                    style={{
                                        width: "80px",
                                        height: "80px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        backgroundColor: getBackgroundColor(symbol),
                                        border: isWinning ? "4px solid gold" : "1px solid #555",
                                        boxShadow: isWinning ? "0 0 15px gold" : "none",
                                        transform: isWinning ? "scale(1.05)" : "scale(1)",
                                        transition: "all 0.3s ease",
                                    }}
                                >
                                    <span>{symbol}</span>
                                    {isWinning && (
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                background: "black",
                                                padding: "2px",
                                                marginTop: "4px",
                                                borderRadius: "3px",
                                                color: "gold",
                                            }}
                                        >
                                            {winInfo?.prize}Kč
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button
                    onClick={spin}
                    disabled={gameStatus !== "IDLE"}
                    style={{
                        padding: "10px 20px",
                        fontSize: "16px",
                        background: gameStatus === "IDLE" ? "#28a745" : "#555",
                        color: "#fff",
                        border: "none",
                        cursor: gameStatus === "IDLE" ? "pointer" : "not-allowed",
                    }}
                >
                    {gameStatus === "SPINNING" ? "Točí se..." : "SPIN (Vystřelit)"}
                </button>

                <button onClick={() => setBet(10)} disabled={gameStatus !== "IDLE"}>
                    Sázka: 10
                </button>
                <button onClick={() => setBet(50)} disabled={gameStatus !== "IDLE"}>
                    Sázka: 50
                </button>
            </div>

            <SpecialWinOverlay />
        </div>
    )
}

export default App
