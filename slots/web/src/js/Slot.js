import Reel from "./Reel.js";
import Symbol from "./Symbol.js";
import rng from "./trueRNG.js";

const rtpCorrection = 0.35;
const winFrequency = 40; // %
// Alle wins nur alle winFrequency mal
// die restlichen prozente gehen an small wins
const mediumWinChance = 35 // %
const bigWinChance = 14.9 // %
const jackpotChance = 0.1 // %

const initialBalance = 0; // €
const initialBet = 5; // €

const default_symbol = "rng";
const winningPatterns = {
    basic: [
        [
            ["+", "+", "+"],
            2
        ],
        [
            ["+"],
            ["+"],
            ["+"],
            2
        ],
        [
            ["+", "-"],
            ["-", "+"],
            ["+", "-"],
            3
        ],
        [
            ["-", "+"],
            ["+", "-"],
            ["-", "+"],
            3
        ],
    ],
    medium: [
        [
            ["+", "-", "-"],
            ["-", "+", "-"],
            ["-", "-", "+"],
            7
        ],
        [
            ["-", "-", "+"],
            ["-", "+", "-"],
            ["+", "-", "-"],
            7
        ],
        [
            ["-", "+", "-"],
            ["+", "-", "+"],
            5
        ],
        [
            ["+", "-", "+"],
            ["-", "+", "-"],
            5
        ],
    ],
    big: [
        [
            ["+", "+", "+", "+", "+"],
            20
        ],
        [
            ["+", "-", "-", "-", "-"],
            ["-", "+", "+", "+", "-"],
            ["-", "-", "-", "-", "+"],
            40
        ],
        [
            ["-", "-", "-", "-", "+"],
            ["-", "+", "+", "+", "-"],
            ["+", "-", "-", "-", "-"],
            40
        ],
    ],
    jackpot: [
        [
            ["+", "+", "+", "+", "+"],
            ["+", "+", "+", "+", "+"],
            ["+", "+", "+", "+", "+"],
            1500
        ],
    ]
};
const winningPatternsSvg = {
    basic: [
        [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ],
        [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
        ],
        [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 2 },
        ],
        [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 2 },
        ],
    ],
    medium: [
        [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ],
        [
            { x: 0, y: 2 },
            { x: 1, y: 1 },
            { x: 2, y: 0 },
        ],
        [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 2, y: 1 },
        ],
        [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 0 },
        ],
    ],
    big: [
        [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 0 },
        ],
        [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 2 },
        ],
        [
            { x: 0, y: 2 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 4, y: 0 },
        ],
    ],
    jackpot: [
        [],
    ],
};
const colorPalette = [
    "red",
    "green",
    "blue",
    "pink",
    "yellow",
    "cyan",
    "orange",
    "purple"
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

        this.nextSymbols = this.currentSymbols;

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

        this.currentBalance = initialBalance;
        this.freeToPlay = false;
        this.isSpinning = false;
        this.winAmount = 0;
        this.nextMatches = null;
        this.bet = initialBet;
        this.biggestWinType = "";
        this.externalRtpCorrection = 1;
    }

    setBalance(balance) {
        this.currentBalance = parseFloat(balance);
    }

    addBalance(balance) {
        this.currentBalance += parseFloat(balance);
    }

    spin() {
        if (this.isSpinning || this.currentBalance === 0) return;
        if (this.currentBalance < Math.abs(this.bet) && this.freeToPlay === false) {
            console.log("Nicht genug Kohle!");
            return;
        }
        if (this.freeToPlay === false)
            this.currentBalance -= this.bet;

        this.currentSymbols = this.nextSymbols;
        this.nextSymbols = this.#convertScreenToSlots(this.#generateScreen());
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
        const mvV = 3 - patternRows;
        const mvH = 5 - patternCols;
        let startRow = this.#getRandomInt(mvV) // Ensure it fits vertically
        let startCol = this.#getRandomInt(mvH) // Ensure it fits horizontally
        if (patternRows === 3) startRow = 0;
        if (patternCols === 5) startCol = 0;
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

    #getRandomInt(max) {
        return Math.floor(Math.random() * (max + 1));
    }

    #placePattern(screen, pattern, startRow, startCol) {
        const patternRows = pattern.length;
        const patternCols = pattern[0].length;

        for (let row = 0; row < patternRows; row++) {
            if (typeof pattern[row] === "number") break; // am Ende noch winAmount
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
        if (window.nextJp === true) {
            window.nextJp = false; // reset nextJp
            return winningPatterns.jackpot[0];
        }
        const winFrequencyNormalized = (winFrequency * this.externalRtpCorrection) / 100;
        const randomValues = rng.generateTrueRandomValues(3); // generate 3 at a time to avoid biasing
        if (randomValues[0] < winFrequencyNormalized) { // jetzt gewinnt der spieler
            const rand = Math.floor(randomValues[1] * 1000) / 10;
            let patterns;
            if (rand < jackpotChance * this.externalRtpCorrection)
                patterns = winningPatterns.jackpot;
            else if (rand < bigWinChance * this.externalRtpCorrection)
                patterns = winningPatterns.big;
            else if (rand < mediumWinChance * this.externalRtpCorrection)
                patterns = winningPatterns.medium;
            else patterns = winningPatterns.basic;

            return patterns[Math.min(Math.floor(randomValues[2] * patterns.length), patterns.length - 1)].slice(0, -1);
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

    #convertSlotsToScreen(slots) {
        const screen = [];
        let newRow = [];

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 5; j++) {
                newRow.push(slots[j][i]);
            }
            screen.push(newRow);
            newRow = [];
        }

        if (newRow.length > 0) screen.push(newRow);
        return screen;
    }

    #calcWinAmount(symbols, overwrite_ths = true) {
        // symbols ist im slot Format!
        let winAmount = 0;
        let matches = [];
        window.isRothWin = false;
        winningPatterns.basic.forEach((pattern, index) => {
            const res = this.#getPatternMatches(pattern, symbols, "basic", index, overwrite_ths);
            if (res.length !== 0) {
                res.forEach(match => {
                    matches.push(match);
                });
            }
        });
        winningPatterns.medium.forEach((pattern, index) => {
            const res = this.#getPatternMatches(pattern, symbols, "medium", index, overwrite_ths);
            if (res.length !== 0) {
                res.forEach(match => {
                    matches.push(match);
                });
            }
        });
        winningPatterns.big.forEach((pattern, index) => {
            const res = this.#getPatternMatches(pattern, symbols, "big", index, overwrite_ths);
            if (res.length !== 0) {
                res.forEach(match => {
                    matches.push(match);
                });
            }
        });
        winningPatterns.jackpot.forEach((pattern, index) => {
            const res = this.#getPatternMatches(pattern, symbols, "jackpot", index, overwrite_ths);
            if (res.length !== 0) {
                res.forEach(match => {
                    matches.push(match);
                });
            }
        });
        if (overwrite_ths)
            this.nextMatches = matches;
        matches.forEach(match => {
            winAmount += this.#calcWinAmountForPattern(match.payoutAmount, match.symbol) * this.bet;
        });
        winAmount = Math.round(winAmount * 100) / 100;
        if (overwrite_ths) {
            console.log(matches);
            console.log(`win amount: ${winAmount}`);
        }
        return winAmount;
    }

    #calcWinAmountForPattern(baseWinAmount, symbol) {
        const multiplier = Symbol.getMultiplier(symbol);
        return baseWinAmount * multiplier;
    }

    calcJackpotAmount() {
        const symbols = [
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
            [default_symbol, default_symbol, default_symbol],
        ]
        return this.#calcWinAmount(symbols, false);
    }

    #visualizeWins() {
        if (this.nextMatches === null || this.nextMatches === undefined) return;
        this.config.winVisualizeSvg.innerHTML = "";
        let lastDelay = 0;
        const colorOffset = this.#getRandomInt(colorPalette.length);
        this.nextMatches.reverse().forEach((match, index) => {
            console.log(match);
            const points = winningPatternsSvg[match.patternType][match.patternIndex];
            const color = colorPalette[(index + colorOffset) % colorPalette.length];
            this.#createPolyline(points, match.posX, match.posY, color, 100 * index);
            lastDelay = 100 * index;
        });
        if (this.nextMatches.length === 0) { // nix gewonnen
            return 500;
        }
        const winAmount = this.winAmount.toFixed(2);
        setTimeout(() => {
            // gewinnmenge anzeigen
            const winDisplay = document.getElementById("winText");
            const winTypeText = `${this.#capitalizeFirstLetter(this.biggestWinType)} ${winAmount > 0 ? "Win" : "Loss"}!`;
            winDisplay.innerHTML = `${winAmount > 0 ? "" : `${window.killswitch ? "Schade" : "Waltercombo"}!<br>`}${winTypeText}<br>${winAmount > 0 ? "+" : ""}${winAmount}€ (${(winAmount / this.bet).toFixed(2)}x)`;
            winDisplay.style.animation = "pop 2s forwards";
            setTimeout(() => {
                winDisplay.style.animation = "";
            }, 2000);
        }, Math.max(0, lastDelay + 650));

        // 750 für die svg Animation, 2000 für die Textanimation
        return Math.max(0, lastDelay + 750 + 2000);
    }

    #capitalizeFirstLetter(str) {
        if (str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    #createPolyline(points, offsetX, offsetY, color, delay) {
        const cellWidth = this.config.winVisualizeSvg.getAttribute("width") / 5;
        const cellHeight = this.config.winVisualizeSvg.getAttribute("height") / 3;
        const polylinePoints = points.map(point => {
            return `${(point.x + offsetX) * cellWidth + cellWidth / 2},${(point.y + offsetY) * cellHeight + cellHeight / 2}`;
        }).join(" ");
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", polylinePoints);
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", color);
        polyline.setAttribute("stroke-width", "10");
        polyline.setAttribute("stroke-linecap", "round");

        this.config.winVisualizeSvg.appendChild(polyline);

        requestAnimationFrame(() => {
            let length = 100;
            try {
                length = polyline.getTotalLength();
            } catch (e) {
            }
            polyline.setAttribute("stroke-dasharray", length.toString());
            polyline.setAttribute("stroke-dashoffset", length.toString());

            setTimeout(() => {
                polyline.style.transition = "stroke-dashoffset 750ms ease-in-out";
                polyline.setAttribute("stroke-dashoffset", "0");
            }, 100 + delay);
        });
    }

    #addBalance() {
        this.currentBalance += this.winAmount;
        this.winAmount = 0;
    }

    #getPatternMatches(_pattern, slotSymbols, patternType, patternIndex, overwrite_ths) {
        let finalMatches = [];
        const winAmount = _pattern[_pattern.length - 1];
        let pattern = _pattern.slice(0, -1);
        const height = pattern.length;
        const width = pattern[0].length;
        const mvLR = Math.max(0, 5 - width);
        const mvHR = Math.max(0, 3 - height);
        const slotPattern = this.#convertSlotsToScreen(slotSymbols);
        for (let i = 0; i <= mvLR; i++) {
            for (let j = 0; j <= mvHR; j++) { // arr [j][i], slot[i][j]
                let winningSymbol = null;
                let matches = true;
                let cancel = false;
                pattern.forEach((row, rowIndex) => {
                    row.forEach((col, colIndex) => {
                        if (col === "+" && !cancel) {
                            if (winningSymbol === null) winningSymbol = slotPattern[j + rowIndex][i + colIndex];
                            matches = slotPattern[j + rowIndex][i + colIndex] === winningSymbol;
                            cancel = !matches;
                        }
                    });
                });
                let match = {};
                match.matches = matches;
                match.symbol = winningSymbol;
                match.posX = i;
                match.posY = j;
                match.pattern = pattern;
                match.payoutAmount = winAmount * rtpCorrection;
                match.patternType = patternType;
                match.patternIndex = patternIndex;
                if (match.matches) {
                    if (match.symbol === "roth") window.isRothWin = true;
                    finalMatches.push(match);
                    if (overwrite_ths) {
                        if (this.biggestWinType === "basic") {
                            this.biggestWinType = match.patternType;
                        } else if (this.biggestWinType === "medium" && (match.patternType === "big" || match.patternType === "jackpot")) {
                            this.biggestWinType = match.patternType;
                        } else if (this.biggestWinType === "big" && match.patternType === "jackpot") {
                            this.biggestWinType = match.patternType;
                        } else {
                            this.biggestWinType = match.patternType;
                        }
                    }
                }
            }
        }
        return finalMatches;
    }

    onSpinStart(symbols) {
        this.spinButton.disabled = true;
        this.isSpinning = true;
        this.config.winVisualizeSvg.innerHTML = "";
        this.winAmount = this.#calcWinAmount(symbols);
        this.config.onSpinStart?.(symbols);
    }

    onSpinEnd() {
        const winAmount = this.winAmount;
        const time = this.#visualizeWins();
        this.#addBalance();
        setTimeout(() => {
            this.config.onSpinEnd?.(this.biggestWinType, winAmount);
            setTimeout(() => {
                this.isSpinning = false;
                this.spinButton.disabled = false;
                if (this.autoPlayCheckbox.checked) {
                    return window.setTimeout(() => {
                        if (this.autoPlayCheckbox.checked === true) this.spin();
                    }, winAmount === 0 ? 0 : 1000);
                }
            }, 2500);
        }, Math.max(0, time / 2 - 2000));
    }
}
