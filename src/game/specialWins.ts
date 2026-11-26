export type SpecialWinType = "PENALTY_KICK" | "JACKPOT" | "THREE_LINES" | "FOUR_LINES" | "FIVE_LINES"

export type SpecialWinPriority = Record<SpecialWinType, number>

export const SPECIAL_WIN_PRIORITY: SpecialWinPriority = {
    JACKPOT: 1,
    FIVE_LINES: 2,
    PENALTY_KICK: 3,
    FOUR_LINES: 4,
    THREE_LINES: 5,
}

export interface SpecialWinConfig {
    name: SpecialWinType
    title: string
    description: string
    baseRewardMultiplier: number
}

export const SPECIAL_WIN_CONFIGS: Record<SpecialWinType, SpecialWinConfig> = {
    JACKPOT: {
        name: "JACKPOT",
        title: "⚽ HLAVNÍ FOTBALOVÝ JACKPOT! 🏆",
        description: "Tvé mužstvo vyhrálo ligu! Získáváš obří bonus!",
        baseRewardMultiplier: 100,
    },
    PENALTY_KICK: {
        name: "PENALTY_KICK",
        title: "⚡ PENALTOVÝ ROZSTŘEL! 🥅",
        description: "Vstřel branku brankáři a znásob svou výhru!",
        baseRewardMultiplier: 25,
    },
    THREE_LINES: {
        name: "THREE_LINES",
        title: "TŘI ŘADY",
        description: "",
        baseRewardMultiplier: 10,
    },
    FOUR_LINES: {
        name: "FOUR_LINES",
        title: "ČTYŘI ŘADY",
        description: "",
        baseRewardMultiplier: 20,
    },
    FIVE_LINES: {
        name: "FIVE_LINES",
        title: "PĚT ŘAD",
        description: "",
        baseRewardMultiplier: 30,
    },
}
