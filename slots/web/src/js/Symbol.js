const cache = {};

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
            "breuer",
            "eska",
            "joos",
            "knape",
            "kob",
            "krauss",
            "krauss_bike",
            "moehrle",
            "temmel",
            "volker",
            "worbs",
            "default",
        ];
    }

    static random() {
        // -1, weil das "default" Symbol nicht genommen werden soll
        return this.symbols[Math.floor(Math.random() * (this.symbols.length - 1))];
    }
}
