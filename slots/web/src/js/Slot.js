import Reel from "./Reel.js";
import Symbol from "./Symbol.js";

const winFrequency = 40; // %
const default_symbol = "default";
const winningPatterns = [
    [
        ["+", "+", "+", "+", "+"]
    ],
    [
        ["+", "-", "-", "-", "-"],
        ["-", "+", "+", "+", "-"],
        ["-", "-", "-", "-", "+"]
    ],
    [
        ["-", "-", "-", "-", "+"],
        ["-", "+", "+", "+", "-"],
        ["+", "-", "-", "-", "-"]
    ],
    [
        ["+", "-", "-", "-", "+"],
        ["-", "+", "+", "+", "-"],
        ["+", "-", "-", "-", "+"]
    ],
    [
        ["+", "-", "-"],
        ["-", "+", "-"],
        ["-", "-", "+"]
    ],
    [
        ["-", "-", "+"],
        ["-", "+", "-"],
        ["+", "-", "-"]
    ],
    [
        ["+"],
        ["+"],
        ["+"]
    ],

    // Add more patterns as needed
];

export default class Slot {
    constructor(domElement, config = {}) {
        Symbol.preload();

        this.currentSymbols = [
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
        ];

        this.nextSymbols = [
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
        ];

        this.container = domElement;

        this.reels = Array.from(this.container.getElementsByClassName("reel")).map(
            (reelContainer, idx) =>
                new Reel(reelContainer, idx, this.currentSymbols[idx])
        );

        this.spinButton = document.getElementById("spin");
        this.spinButton.addEventListener("click", () => this.spin());

        this.autoPlayCheckbox = document.getElementById("autoplay");

        if (config.inverted) {
            this.container.classList.add("inverted");
        }

        this.config = config;

        this.currentBalance = 0;
        this.freeToPlay = false;
    }

    setBalance(balance) {
        this.currentBalance = parseFloat(balance);
    }

    addBalance(balance) {
        this.currentBalance += parseFloat(balance);
    }

    spin() {
        if (this.currentBalance < this.config.costPerSpin && this.freeToPlay === false) {
            console.log("Nicht genug Kohle!");
            return;
        }
        if (this.freeToPlay === false)
            this.currentBalance -= this.config.costPerSpin;

        this.currentSymbols = this.nextSymbols;
        this.nextSymbols = this.#convertScreenToSlots(this.#generateScreen());
        console.log(this.nextSymbols)
        this.onSpinStart(this.nextSymbols);

        return Promise.all(
            this.reels.map((reel) => {
                reel.renderSymbols(this.nextSymbols[reel.idx]);
                return reel.spin();
            })
        ).then(() => this.onSpinEnd(this.nextSymbols));
    }

    #generateScreen() {
        const screen = this.#createEmptyGrid(3, 5);
        const winningPattern = this.#selectWinningPattern();
        // Determine the size of the winning pattern
        const patternRows = winningPattern.length;
        const patternCols = winningPattern[0].length;
        const startRow = Math.floor(Math.random() * (3 - patternRows + 1)); // Ensure it fits vertically
        const startCol = Math.floor(Math.random() * (5 - patternCols + 1)); // Ensure it fits horizontally
        console.log(`row: ${startRow}, col: ${startCol}`);
        this.#placePattern(screen, winningPattern, startRow, startCol);

        // Fill remaining spaces with random symbols
        const winningSymbol = Symbol.random();
        for (let row = 0; row < 3; row++) {
            console.log(screen[row]);
            for (let col = 0; col < 5; col++) {
                if (screen[row][col] === "X") {
                    screen[row][col] = winningSymbol;
                } else { // an dem Platz passiert eh nichts
                    screen[row][col] = Symbol.random();
                }
            }
        }
        console.log(screen);
        return screen;
    }

    #placePattern(screen, pattern, startRow, startCol) {
        const patternRows = pattern.length;
        const patternCols = pattern[0].length;

        for (let row = 0; row < patternRows; row++) {
            for (let col = 0; col < patternCols; col++) {
                if (pattern[row][col] === "+") {
                    screen[startRow + row][startCol + col] = "X";
                } else {
                    screen[startRow + row][startCol + col] = "-"; // Keep non-winning positions as "-"
                }
            }
        }
    }

    #selectWinningPattern() {
        // not always win
        const winFrequencyNormalized = winFrequency / 100;
        if (Math.random() < winFrequencyNormalized) { // jetzt gewinnt der spieler
            const patterns = winningPatterns;
            return patterns[Math.floor(Math.random() * patterns.length)];
        }
        return [[]];
    }

    #createEmptyGrid(rows, cols) {
        const grid = [];
        for (let i = 0; i < rows; i++) {
            grid[i] = Array(cols).fill("-"); // Initialize with non-winning symbols
        }
        return grid;
    }

    #convertScreenToSlots(screen) {
        const slots = [];
        let newRow = [];

        for (let j = 0; j < screen[0].length; j++) {
            for (let i = 0; i < screen.length; i++) {
                newRow.push(screen[i][j]);
            }
            slots.push(newRow);
            newRow = [];
        }

        if (newRow.length > 0) slots.push(newRow);
        return slots;
    }

    onSpinStart(symbols) {
        this.spinButton.disabled = true;

        this.config.onSpinStart?.(symbols);
    }

    onSpinEnd(symbols) {
        this.spinButton.disabled = false;

        this.config.onSpinEnd?.(symbols);

        if (this.autoPlayCheckbox.checked) {
            return window.setTimeout(() => this.spin(), 200);
        }
    }
}
