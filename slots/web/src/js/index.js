import Slot from "./Slot.js";

const webSocketPort = 8085
const MAX_COIN_AUFLADUNG = 10

const config = {
    inverted: false, // true: reels spin from top to bottom; false: reels spin from bottom to top
    onSpinStart: (symbols) => {
        console.log("onSpinStart", symbols);
        updateUI();
    },
    onSpinEnd: (symbols) => {
        console.log("onSpinEnd", symbols);
        updateUI();
    },
    costPerSpin: 0.5,
};

setTimeout(updateUI, 1500);

const slot = new Slot(document.getElementById("slot"), config);

// WebSocket connection to coin server
const socket = new WebSocket(`ws://localhost:${webSocketPort}`);

socket.onmessage = function (event) {
    if (event.data.toString().startsWith('cns:')) {
        slot.freeToPlay = false;
        let cns = parseFloat(event.data.slice(4));
        if (cns > MAX_COIN_AUFLADUNG) {
            console.error("Coin amount exceeded!");
        } else {
            slot.addBalance(cns);
            console.log(`+${cns} Coins`);
            updateUI();
        }
    }
    if (event.data.toString().startsWith('ftpon')) {
        slot.freeToPlay = true;
    }
    if (event.data.toString().startsWith('ftpoff')) {
        slot.freeToPlay = false;
    }
};

socket.onopen = function () {
    console.log('WebSocket connection established');
};

socket.onerror = function (error) {
    console.error('WebSocket error: ', error);
};

function updateUI() {
    document.getElementById('bal').innerText = slot.currentBalance.toFixed(2);
    document.getElementById('jp').innerHTML = slot.currentBalance.toFixed(2);
    if (slot.freeToPlay === true) {
        document.getElementById('cost').innerHTML = 'FTP ~ &infin;';
    } else {
        document.getElementById('cost').innerText = slot.config.costPerSpin.toFixed(2);
    }
}
