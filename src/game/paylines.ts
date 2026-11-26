import { ReelGrid, SpecialWin, SymbolType } from "../store/useGameStore"
import { SPECIAL_WIN_PRIORITY } from "./specialWins"

// Definice multiplikátorů pro jednotlivé symboly (kolikrát se násobí sázka)
export const SYMBOL_MULTIPLIERS: Record<SymbolType, number> = {
    TROPHY: 50, // Pohár je hlavní výhra (Jackpot)
    BOOT: 20, // Kopačka
    WHISTLE: 15, // Píšťalka
    BALL: 10, // Míč
}

// type winTypes = "line" | "diagonal" | ""

// Definice výherních linií pomocí souřadnic [sloupec, řádek] v mřížce 3x3
// Sloupce (0-2) a řádky (0-2)
export type PaylineCoordinates = {
    note: string
    array: [number, number][]
}

export const PAYLINES: PaylineCoordinates[] = [
    {
        note: "Horní řádek",
        array: [
            [0, 0],
            [1, 0],
            [2, 0],
        ],
    },

    {
        note: "Prostřední řádek",
        array: [
            [0, 1],
            [1, 1],
            [2, 1],
        ],
    },
    {
        note: "Spodní řádek",
        array: [
            [0, 2],
            [1, 2],
            [2, 2],
        ],
    },

    // Sloupce
    {
        note: "Levý sloupec",
        array: [
            [0, 0],
            [0, 1],
            [0, 2],
        ],
    },
    {
        note: "Prostřední sloupec",
        array: [
            [1, 0],
            [1, 1],
            [1, 2],
        ],
    },
    {
        note: "Pravý sloupec",
        array: [
            [2, 0],
            [2, 1],
            [2, 2],
        ],
    },

    // Diagonály
    {
        note: "Diagonála zleva doprava",
        array: [
            [0, 0],
            [1, 1],
            [2, 2],
        ],
    },
    {
        note: "Diagonála zprava doleva",
        array: [
            [2, 0],
            [1, 1],
            [0, 2],
        ],
    },
]

interface EvaluationResult {
    totalWin: number
    note: string
    winningLines: { lineIndex: number; symbol: SymbolType; prize: number; winningLineShape: [number, number][] }[]
    specialWins: SpecialWin[]
}

/**
 * Vyhodnotí mřížku 3x3 na základě definovaných paylines
 */
export function evaluateGrid(grid: ReelGrid, currentBet: number): EvaluationResult {
    let totalWin = 0
    let winNote = ""
    const winningLines: { lineIndex: number; symbol: SymbolType; prize: number; winningLineShape: [number, number][] }[] = []

    PAYLINES.forEach((line, index) => {
        const { array: lineCoords } = line

        // Získáme symboly na dané linii
        const [aCoord, bCoord, cCoord] = lineCoords
        const symbolA = grid[aCoord[0]][aCoord[1]]
        const symbolB = grid[bCoord[0]][bCoord[1]]
        const symbolC = grid[cCoord[0]][cCoord[1]]

        // Kontrola, zda jsou všechny 3 symboly na linii shodné
        if (symbolA === symbolB && symbolB === symbolC) {
            const multiplier = SYMBOL_MULTIPLIERS[symbolA] || 10
            const lineWin = currentBet * multiplier

            totalWin += lineWin
            winningLines.push({
                lineIndex: index,
                symbol: symbolA,
                prize: lineWin,
                winningLineShape: lineCoords,
            })
            winNote += `${line.note}: ${lineWin} Kč (symbol: ${symbolA})\n`
        }
    })

    winningLines.sort((a, b) => b.prize - a.prize)

    const calcSpecialWin = (): SpecialWin[] => {
        const res: SpecialWin[] = []

        const calc2xBootWin = (): boolean => {
            let countOfBootWins = 0
            winningLines.forEach((line) => {
                if (line.symbol === "BOOT") countOfBootWins++
            })
            if (countOfBootWins == 2) return true
            return false
        }

        let countOfWinningLines = winningLines.length

        if (countOfWinningLines === 5) res.push({ name: "FIVE_LINES" })
        if (calc2xBootWin()) res.push({ name: "PENALTY_KICK" })
        if (countOfWinningLines === 4) res.push({ name: "FOUR_LINES" })
        if (countOfWinningLines === 3) res.push({ name: "THREE_LINES" })

        const sortSpecialWinsByPriority = (wins: SpecialWin[]): SpecialWin[] => {
            const getPriority = (win: SpecialWin): number => {
                return SPECIAL_WIN_PRIORITY[win.name]
            }

            return wins.sort((a, b) => getPriority(a) - getPriority(b))
        }

        return sortSpecialWinsByPriority(res)
        // return sortSpecialWinsByPriority([
        //     { name: "PENALTY_KICK" },
        //     { name: "FIVE_LINES" },
        //     { name: "THREE_LINES" },
        //     { name: "JACKPOT" },
        //     { name: "FOUR_LINES" },
        // ])
    }

    return { totalWin, winningLines, note: winNote.trim(), specialWins: calcSpecialWin() }
}
