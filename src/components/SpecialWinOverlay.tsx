import { useGameStore } from "../store/useGameStore"
import { SPECIAL_WIN_CONFIGS } from "../game/specialWins"
import { useState } from "react"

export function SpecialWinOverlay() {
    const gameStatus = useGameStore((store) => store.gameStatus)
    const specialWins = useGameStore((store) => store.specialWins) // Toto je teď pole: SpecialWin[]
    const currentBet = useGameStore((store) => store.currentBet)

    // Akce ve store, kterou si za chvíli upravíme
    const popAndProcessNextSpecialWin = useGameStore((store) => store.popAndProcessNextSpecialWin)

    // Lokální stav pro minihru penalty (pokud zrovna probíhá)
    const [penaltyShot, setPenaltyShot] = useState(false)
    const [penaltyScored, setPenaltyScored] = useState(false)

    // Pokud nejablejsme ve stavu speciální výhry nebo je pole prázdné, ničím neblokujeme obrazovku
    if (gameStatus !== "SPECIAL_WIN" || !specialWins || specialWins.length === 0) {
        return null
    }

    // VŽDY zpracováváme PRVNÍ prvek fronty (FIFO - First In, First Out)
    const currentWin = specialWins[0]
    const config = SPECIAL_WIN_CONFIGS[currentWin.name]
    const bonusReward = currentBet * config.baseRewardMultiplier

    const handleShootPenalty = (scored: boolean) => {
        setPenaltyShot(true)
        setPenaltyScored(scored)
    }

    const finishCurrentSpecialWin = (reward: number) => {
        setPenaltyShot(false) // reset lokálního stavu penalty
        // Zavoláme store, který přičte peníze, odstraní tuto výhru z pole,
        // a buď posune na další, nebo vrátí hru do IDLE.
        popAndProcessNextSpecialWin(reward)
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                color: "white",
                fontFamily: "sans-serif",
            }}
        >
            <div
                style={{
                    background: "#222",
                    padding: "40px",
                    borderRadius: "12px",
                    border: "3px solid gold",
                    textAlign: "center",
                    maxWidth: "500px",
                }}
            >
                {/* Malý indikátor pořadí, např. "Speciální výhra 1 z 2" */}
                <span style={{ fontSize: "14px", color: "#aaa" }}>
                    Výhra {1} z {specialWins.length}
                </span>

                <h1 style={{ color: "gold", fontSize: "28px", marginTop: "10px" }}>{config.title}</h1>
                <p style={{ fontSize: "18px", margin: "20px 0" }}>{config.description}</p>

                {/* Univerzální tlačítko pro standardní speciální výhry (Tři řady, Čtyři řady atd.) */}
                {currentWin.name !== "PENALTY_KICK" && !penaltyShot && (
                    <div>
                        <h2 style={{ color: "#00ff00", fontSize: "36px" }}>+{bonusReward} Kč</h2>
                        <button
                            onClick={() => finishCurrentSpecialWin(bonusReward)}
                            style={{
                                padding: "12px 24px",
                                fontSize: "18px",
                                background: "gold",
                                color: "black",
                                fontWeight: "bold",
                                border: "none",
                                cursor: "pointer",
                                borderRadius: "6px",
                                marginTop: "20px",
                            }}
                        >
                            Vyzvednout výhru!
                        </button>
                    </div>
                )}

                {/* Interaktivní rozhraní pro penaltu */}
                {currentWin.name === "PENALTY_KICK" && penaltyShot && (
                    <PenaltyShot scored={penaltyScored} submit={(scored) => finishCurrentSpecialWin(scored ? bonusReward : 0)} bonus={bonusReward} />
                )}

                {currentWin.name === "PENALTY_KICK" && !penaltyShot && (
                    <div>
                        <p>Zvol si stranu, kam vystřelíš penaltu:</p>
                        <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "20px" }}>
                            <button
                                onClick={() => handleShootPenalty(Math.random() > 0.3)}
                                style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}
                            >
                                Vlevo ⬅️
                            </button>
                            <button
                                onClick={() => handleShootPenalty(Math.random() > 0.3)}
                                style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}
                            >
                                Uprostřed ⬆️
                            </button>
                            <button
                                onClick={() => handleShootPenalty(Math.random() > 0.3)}
                                style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", cursor: "pointer", borderRadius: "4px" }}
                            >
                                Vpravo ➡️
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

type PenaltyShotProps = {
    scored: boolean
    submit: (scored: boolean) => void
    bonus: number
}

const PenaltyShot = (props: PenaltyShotProps) => {
    const { scored, submit, bonus } = props

    return (
        <div>
            {scored ? (
                <>
                    <h3 style={{ color: "lightgreen" }}>GÓL! ⚽</h3>
                    <p>Úspěšná penalta! Odnášíš si navíc {bonus} korun.</p>
                </>
            ) : (
                <>
                    <h3 style={{ color: "tomato" }}>Chyceno! ❌</h3>
                    <p>Brankář penaltu chytil, tentokrát bez bonusu.</p>
                </>
            )}
            <button
                onClick={() => submit(scored)}
                style={{
                    padding: "10px 20px",
                    background: "gold",
                    color: "black",
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "4px",
                    marginTop: "15px",
                }}
            >
                Pokračovat
            </button>
        </div>
    )
}
