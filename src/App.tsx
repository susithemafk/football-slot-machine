import { useEffect, useState } from "react"
import { useGameStore, SYMBOLS_POOL } from "./store/useGameStore"
import { SpecialWinOverlay } from "./components/SpecialWinOverlay"
import { GameCanvas } from "./components/GameCanvas" // <-- 1. Importujeme PixiJS plátno

export function App() {
    const { balance, currentBet, gameStatus, grid, lastWin, winNote, winningLines, activeLineIndex, setActiveLineIndex, spin, setBet, loadGame } =
        useGameStore()

    useEffect(() => {
        loadGame()
    }, [loadGame])

    // Efekt pro cyklické střídání výherních linií v Zustand store
    useEffect(() => {
        if (!winningLines || winningLines.length === 0 || gameStatus === "SPINNING") {
            setActiveLineIndex(null)
            return
        }

        setActiveLineIndex(0)
        const interval = setInterval(() => {
            // Použijeme aktuální stav ze store pomocí get() nebo callbacku v set
            useGameStore.setState((state) => {
                if (!state.winningLines || state.winningLines.length === 0) return {}
                const nextIndex = state.activeLineIndex === null ? 0 : (state.activeLineIndex + 1) % state.winningLines.length
                return { activeLineIndex: nextIndex }
            })
        }, 1500)

        return () => clearInterval(interval)
    }, [winningLines, gameStatus, setActiveLineIndex])

    return (
        <div className="w-screen" style={{ padding: "20px", fontFamily: "sans-serif", background: "#111", color: "#fff", minHeight: "100vh" }}>
            <h1>⚽ Fotbalový Slot Automat</h1>

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

            <div className="flex justify-center items-center flex-nowrap flex-col-reverse">
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

                    {winningLines && winningLines.length > 0 && activeLineIndex !== null && (
                        <p style={{ color: "gold", fontSize: "18px" }}>
                            🏆 Zobrazuji výherní linii {activeLineIndex + 1} z {winningLines.length}
                            (Výhra: {winningLines[activeLineIndex].prize} Kč)
                        </p>
                    )}

                    {lastWin > 0 && <p style={{ color: "gold", fontSize: "22px" }}>GÓL! Celková výhra: {lastWin} Kč!</p>}
                    {winNote && <pre style={{ background: "#222", padding: "10px", borderRadius: "5px", whiteSpace: "pre-wrap" }}>{winNote}</pre>}
                </div>

                {/* --- 2. ZDE NYNÍ VYKRESLUJEME PIXIJS PLÁTNO MÍSTO HTML DIVŮ --- */}
                <GameCanvas />
            </div>

            <SpecialWinOverlay />
        </div>
    )
}

export default App
