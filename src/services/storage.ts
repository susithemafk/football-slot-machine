// Definice rozhraní (kontraktu), které musí každé úložiště splňovat
export interface GameStorage {
    save(key: string, data: any): Promise<void>
    load(key: string): Promise<any | null>
}

// 1. Webová implementace (používá localStorage)
class WebStorage implements GameStorage {
    async save(key: string, data: any): Promise<void> {
        localStorage.setItem(key, JSON.stringify(data))
    }

    async load(key: string): Promise<any | null> {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : null
    }
}

// 2. Placeholder pro budoucí Electron (zatiaľ len fallback na web nebo konzoli)
class ElectronStorage implements GameStorage {
    async save(key: string, data: any): Promise<void> {
        // Tady později přes Electron IPC můžeme zavolat node.js 'fs.writeFileSync'
        console.log("Saving via Electron to disk...", key, data)
    }

    async load(key: string): Promise<any | null> {
        // Tady později zavoláme 'fs.readFileSync'
        console.log("Loading via Electron from disk...", key)
        return null
    }
}

// Detekce prostředí – zatím vrací vždy WebStorage
// Později, až přidáš Electron, sem dáš podmínku: nap např. window.electron ? new ElectronStorage() : new WebStorage()
export const storage: GameStorage = new WebStorage()
