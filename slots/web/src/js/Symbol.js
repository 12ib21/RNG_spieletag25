const cache = {};

const chanceLegendary = 10;
const chanceBonus = 20;
const chanceBasic = 70;

const numLegendary = 2;
const numBonus = 2;

export default class Symbol {
    constructor(name = Symbol.random()) {
        this.name = name;

        if (cache[name]) {
            this.img = cache[name].cloneNode();
        } else {
            this.img = new Image();
            this.img.src = require(`../assets/symbols/${name}.jpg`);

            cache[name] = this.img;
        }
    }

    static preload() {
        Symbol.symbols.forEach((symbol) => new Symbol(symbol));
    }

    static get symbols() {
        return [
            "boneberg",
            "krauss_bike",
            "eska",
            "worbs",
            "breuer",
            "joos",
            "knape",
            "kob",
            "krauss",
            "moehrle",
            "temmel",
            "volker",
            "default",
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
}
