import Slot from "./Slot.js";

// TODO: RTP soll auf 90-95% rauslaufen

const windowTitle = document.title;
const webSocketPort = 8085
const MAX_COIN_AUFLADUNG = 10

const config = {
    inverted: false, // true: reels spin from top to bottom; false: reels spin from bottom to top
    onSpinStart: (symbols) => {
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
        }
    }
    if (event.data.toString().startsWith('ftpon')) {
        slot.freeToPlay = true;
    }
    if (event.data.toString().startsWith('ftpoff')) {
        slot.freeToPlay = false;

    }
    updateUI();
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
        slot.spinButton.disabled = false;
        document.getElementById('cost').innerHTML = 'FTP ~ &infin;';
        document.title = `${windowTitle} ~ FTP`;
    } else {
        slot.spinButton.disabled = slot.currentBalance < slot.config.costPerSpin;
        document.getElementById('cost').innerText = slot.config.costPerSpin.toFixed(2);
        document.title = `${windowTitle} ~ ${slot.currentBalance.toFixed(2)}€`;
    }
    if (slot.isSpinning === true) slot.spinButton.disabled = true;
}
