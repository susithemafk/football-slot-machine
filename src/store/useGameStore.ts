import { create } from "zustand"
import { storage } from "../services/storage"
import { evaluateGrid } from "../game/paylines"
import { wait } from "../misc/utils"
import { SpecialWinType } from "../game/specialWins"

export type SymbolType = "BALL" | "WHISTLE" | "BOOT" | "TROPHY"

// Definice jednoho slotu na mřížce (4 sloupce x 3 řádky)
// Výsledek točení bude pole 4 sloupců, přičemž každý sloupec má 3 symboly
export type ReelGrid = SymbolType[][]

export interface GameSettings {
    masterVolume: number
    sfxVolume: number
}

export interface SpecialWin {
    name: SpecialWinType
}

export interface GameState {
    gameStatus: "IDLE" | "SPINNING" | "EVALUATING" | "WIN" | "SPECIAL_WIN"

    balance: number
    currentBet: number
    lastWin: number
    winNote: string
    specialWins: SpecialWin[]
    winningLines: { lineIndex: number; symbol: SymbolType; prize: number; winningLineShape: [number, number][] }[]

    // Aktuální zobrazená mřížka (4 sloupce, každý 3 symboly)
    grid: ReelGrid

    // Nastavení
    settings: GameSettings
    updateSettings: (newSettings: Partial<GameSettings>) => void

    // Akce
    setBet: (bet: number) => void
    spin: () => void
    closeSpecialWin: (wonBonusAmount: number) => void
    setGameStatus: (status: GameState["gameStatus"]) => void

    popAndProcessNextSpecialWin: (rewardToAdd: number) => void

    // Persistence
    saveGame: () => Promise<void>
    loadGame: () => Promise<void>
}

const SAVE_KEY = "football_slot_save_v1"

// Definice symbolů a jejich "vah" (čím nižší váha, tím vzácnější symbol)
// 1 = nejvzácnější (pohár), 4 = nejčastější (míč)
export const SYMBOLS_POOL: { type: SymbolType; weight: number; bgColor: string }[] = [
    { type: "TROPHY", weight: 1, bgColor: "#FFD700" }, // Zlatý pohár
    { type: "BOOT", weight: 2, bgColor: "#C0C0C0" }, // Stříbrná boty
    { type: "WHISTLE", weight: 3, bgColor: "#FFA500" }, // Píšťalka
    { type: "BALL", weight: 4, bgColor: "#0000FF" }, // Míč
]

function getRandomSymbol(): SymbolType {
    const totalWeight = SYMBOLS_POOL.reduce((sum, item) => sum + item.weight, 0)
    let randomNum = Math.random() * totalWeight

    for (const item of SYMBOLS_POOL) {
        if (randomNum < item.weight) {
            return item.type
        }
        randomNum -= item.weight
    }
    return "BALL"
}

// Generování mřížky 3x3
function generateRandomGrid(): ReelGrid {
    const grid: ReelGrid = []
    const COLUMNS = 3
    const ROWS = 3

    for (let c = 0; c < COLUMNS; c++) {
        const column: SymbolType[] = []
        for (let r = 0; r < ROWS; r++) {
            column.push(getRandomSymbol())
        }
        grid.push(column)
    }

    return grid
}

const playWinAnimation = async () => {
    await wait(5)
    // console.log("playing win animation")
    await wait(5)
}

export const useGameStore = create<GameState>((set, get) => ({
    gameStatus: "IDLE",
    balance: 1000,
    currentBet: 10,
    lastWin: 0,
    winNote: "",
    specialWins: [],
    winningLines: [],

    // default grid
    grid: [
        ["BALL", "BOOT", "WHISTLE"],
        ["BALL", "BALL", "BALL"],
        ["TROPHY", "BOOT", "WHISTLE"],
    ],

    settings: {
        masterVolume: 80,
        sfxVolume: 100,
    },

    updateSettings: (newSettings) => {
        set((state) => ({
            settings: {
                ...state.settings,
                ...newSettings,
            },
        }))

        // save game state after updating settings
        get().saveGame()
    },

    setBet: (bet: number) => {
        if (get().gameStatus !== "IDLE") return
        set({ currentBet: bet })

        // save game state after changing bet
        get().saveGame()
    },

    setGameStatus: (status) => set({ gameStatus: status }),

    spin: () => {
        const { balance, currentBet, gameStatus } = get()

        if (gameStatus === "SPINNING" || gameStatus === "EVALUATING") return
        if (balance < currentBet) {
            alert("Nedostatek kreditů!")
            return
        }

        // reset
        set({
            balance: balance - currentBet, // lower balance
            gameStatus: "SPINNING",
            winningLines: [],
            lastWin: 0,
        })

        // Simulace točení (1.5 sekundy)
        setTimeout(() => {
            const newGrid = generateRandomGrid()

            set({
                grid: newGrid,
                gameStatus: "EVALUATING",
            })

            // Vyhodnocení
            setTimeout(async () => {
                const evaluation = evaluateGrid(newGrid, currentBet)

                if (evaluation.specialWins.length > 0) {
                    set({
                        gameStatus: "SPECIAL_WIN",
                        specialWins: evaluation.specialWins,
                    })
                } else {
                    await playWinAnimation()
                    set({ gameStatus: "IDLE", specialWins: [] })
                }

                set((state) => ({
                    balance: state.balance + evaluation.totalWin,
                    lastWin: evaluation.totalWin,
                    winNote: evaluation.note,
                    winningLines: evaluation.winningLines,
                }))
            }, 100)
        }, 100)

        // save game state after spin
        get().saveGame()
    },

    closeSpecialWin: (wonBonusAmount: number) => {
        set((state) => ({
            balance: state.balance + wonBonusAmount,
            lastWin: state.lastWin + wonBonusAmount,
            gameStatus: "IDLE",
            activeSpecialWin: null,
        }))
    },

    popAndProcessNextSpecialWin: (rewardToAdd: number) => {
        const { balance, lastWin, specialWins } = get()

        // 1. Odstraníme první prvek z pole (shift)
        const remainingWins = specialWins.slice(1)

        // 2. Aktualizujeme zůstatek a posuneme stav
        set({
            balance: balance + rewardToAdd,
            lastWin: lastWin + rewardToAdd,
            specialWins: remainingWins,
        })

        // 3. Pokud v poli ještě nějaké speciální výhry zbyly, zůstaneme ve stavu SPECIAL_WIN
        // a UI automaticky zobrazí další v pořadí. Pokud je pole prázdné, vrátíme hru do IDLE.
        if (remainingWins.length === 0) {
            set({ gameStatus: "IDLE" })
        }
    },

    saveGame: async () => {
        const { balance, currentBet, settings } = get()
        await storage.save(SAVE_KEY, { balance, currentBet, settings })
    },

    loadGame: async () => {
        const data = await storage.load(SAVE_KEY)
        if (data && typeof data === "object") {
            set({
                balance: typeof data.balance === "number" ? data.balance : 1000,
                currentBet: typeof data.currentBet === "number" ? data.currentBet : 10,
                settings: data.settings || { masterVolume: 80, sfxVolume: 100 },
            })
        }
    },
}))
