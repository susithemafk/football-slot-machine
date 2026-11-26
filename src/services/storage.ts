import { GameState } from "../store/useGameStore"

interface GameStorageI {
    data: {
        balance: GameState["balance"]
        currentBet: GameState["currentBet"]
        settings: GameState["settings"]
    }
}

export interface GameStorage {
    save(key: string, data: GameStorageI["data"]): Promise<void>
    load(key: string): Promise<GameStorageI["data"] | null>
}

class WebStorage implements GameStorage {
    async save(key: string, data: GameStorageI["data"]): Promise<void> {
        console.log("Saving to localStorage:", key, data)
        try {
            localStorage.setItem(key, JSON.stringify(data))
        } catch (error) {
            console.error("Chyba při ukládání do localStorage:", error)
        }
    }

    async load(key: string): Promise<GameStorageI["data"] | null> {
        console.log("Loading from localStorage:", key)
        try {
            const item = localStorage.getItem(key)
            return item ? JSON.parse(item) : null
        } catch (error) {
            console.error("Chyba při načítání z localStorage:", error)
            return null
        }
    }
}

// Sem v budoucnu jednoduše přidáme ElectronStorage
// class ElectronStorage implements GameStorage {
//     async save(key: string, data: unknown): Promise<void> {
//         // Zde později přes Electron IPC / Node.js fs zapisujeme na disk
//         console.log("Electron save placeholder", key, data)
//     }

//     async load(key: string): Promise<GameStorageI["data"] | null> {
//         // Zde později čteme ze souboru na disku
//         console.log("Electron load placeholder", key)
//         return null
//     }
// }

// Automatická detekce prostředí (prozatím vždy WebStorage)
export const storage: GameStorage = new WebStorage()
