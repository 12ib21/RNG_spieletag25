const cache = {};

const rewardBasic = 1;
const rewardBonus = 2;
const rewardLegendary = 5;

const chanceLegendary = 10;
const chanceBonus = 20;
const chanceBasic = 70;
const WALTER_MULTIPLIER = -0.5;

const numLegendary = 2;
const numBonus = 2;

const gifs = [
    "walter"
];

export default class Symbol {
    constructor(name = Symbol.random()) {
        if (window.killswitch === true) name += "_";
        this.name = name;

        if (cache[name]) {
            this.img = cache[name].cloneNode();
        } else {
            this.img = new Image();
            this.img.src = require(`../assets/symbols/${name}.${gifs.findIndex(p => p === name) === -1 ? "jpg" : "gif"}`);

            cache[name] = this.img;
        }
    }

    static preload() {
        Symbol.symbols.forEach((symbol) => new Symbol(symbol));
    }

    static get symbols() {
        return [
            "hengge",
            "krauss_bike",
            "eska",
            "worbs",
            "bohl",
            "boneberg",
            "breuer",
            "knape",
            "kob",
            "krauss",
            "moehrle",
            "temmel",
            "volker",
            "roth",
            "woerle",
            "walter",
            "mueller_deuschle",
            "rudolf",
            "gross",
            "bernhoerster",
            "rng",
        ];
    }

    static random() {
        let randomVal = Math.floor(Math.random() * (chanceBasic + chanceBonus + chanceLegendary));
        if (randomVal < chanceLegendary)
            return this.#random_Legendary();
        else if (randomVal < chanceBonus)
            return this.#random_Bonus();
        else
            return this.#random_Basic();
    }

    static #random_Basic() {
        return this.symbols[Math.floor(Math.random() * (this.symbols.length - numLegendary - numBonus - 1)) + numLegendary + numBonus];
    }

    static #random_Bonus() {
        return this.symbols[Math.floor(Math.random() * numBonus) + numLegendary];
    }

    static #random_Legendary() {
        return this.symbols[Math.floor(Math.random() * numLegendary)];
    }

    static getMultiplier(symbol) {
        const symbolIndex = this.symbols.findIndex(p => p === symbol);
        if (symbolIndex === -1) return 0;
        if (this.symbols[symbolIndex] === "walter") return WALTER_MULTIPLIER;
        if (symbolIndex < numLegendary) return rewardLegendary;
        if (symbolIndex < numLegendary + numBonus) return rewardBonus;
        return rewardBasic
    }
}
