import Slot from "./Slot.js";
import bgmStart from "../assets/sound/Bgm_start.mp3";
import bgmLoop from "../assets/sound/Bgm_loop.mp3";
import jackpotSfx from "../assets/sound/jackpot.mp3";
import bigWinSfx from "../assets/sound/bigWin.mp3";
import smallMediumWinSfx from "../assets/sound/small_mediumWin.mp3";
import coinInsertSfx from "../assets/sound/coinInsert.mp3";
import payoutSfx from "../assets/sound/payout.mp3";
import spinStartSfx from "../assets/sound/spinStart.mp3";
import looseSfx from "../assets/sound/loose.mp3";

// TODO: RTP soll auf 90-95% rauslaufen

const windowTitle = document.title;
const webSocketPort = 8085
const MAX_COIN_AUFLADUNG = 10
const bgmVolume = 0.5; // max 1
const sfxVolume = 1; // max 1

const winVisualizeSvg = createOverlaySVG();

let bgmStarted = false;
let audioContext, audioBufferStart, audioBufferLoop, sourceNode;

// Load the audio file
function loadAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadBuffer(bgmStart).then(buffer => {
        audioBufferStart = buffer;
        return loadBuffer(bgmLoop);
    }).then(buffer => {
        audioBufferLoop = buffer;
    });
}

function loadBuffer(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            audioContext.decodeAudioData(request.response, function (buffer) {
                resolve(buffer);
            }, reject);
        };
        request.send();
    });
}

loadAudio();

function startBgm(buffer) {
    if (buffer) {
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(bgmVolume, 0);
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        sourceNode.start(0, 0);
        sourceNode.onended = () => {
            if (buffer === audioBufferStart) {
                startBgm(audioBufferLoop);
            } else {
                startBgm(audioBufferLoop);
            }
        };
    }
}

document.addEventListener('click', startBgmListener);
document.addEventListener('keydown', startBgmListener);
document.addEventListener('touchstart', startBgmListener);

function startBgmListener() {
    if (bgmStarted) return;
    bgmStarted = true;
    startBgm(audioBufferStart);
}

function playSound(sound, volume) {
    const audio = new Audio(sound);
    audio.volume = volume;
    audio.disableRemotePlayback = true;
    audio.play().catch((err) => {
        console.error(`Error playing sound: ${err}`);
    });
}

const config = {
    inverted: false, // true: reels spin from top to bottom; false: reels spin from bottom to top
    onSpinStart: () => {
        playSound(spinStartSfx, sfxVolume);
        updateUI();
    },
    onSpinEnd: (winType, winAmount) => {
        if (winAmount !== 0) {
            console.log(winType);
            switch (winType) {
                case "jackpot":
                    playSound(jackpotSfx, sfxVolume);
                    break;
                case "big":
                    playSound(bigWinSfx, sfxVolume);
                    break;
                case "medium":
                    playSound(smallMediumWinSfx, sfxVolume);
                    break;
                case "basic":
                    playSound(smallMediumWinSfx, sfxVolume);
                    break;
            }
            setTimeout(() => {
                const baseAmount = slot.currentBalance - winAmount;
                playSound(payoutSfx, sfxVolume);
                incrementBal(baseAmount, winAmount);
                updateUI();
            }, 2000);
        } else {
            playSound(looseSfx, sfxVolume);
            updateUI();
        }
    },
    costPerSpin: 0.5,
    winVisualizeSvg: winVisualizeSvg,
};

function incrementBal(baseAmount, add) {
    let div = 0.01;
    if (add < 10) div = 0.01;
    else if (add < 50) div = 0.05;
    else if (add < 100) div = 0.1;
    else div = 2;
    const incrementAmount = Math.floor(add / div);
    const balElem = document.getElementById("bal");
    const time = 1000 / incrementAmount;
    let currentAdd = 0;
    clearInterval(window.payoutIncrementInterval);
    if (incrementAmount > 0 && !slot.freeToPlay) {
        window.payoutIncrementInterval = setInterval(() => {
            if (currentAdd < incrementAmount) {
                balElem.innerText = (baseAmount + ((currentAdd + 1) * div)).toFixed(2);
                currentAdd++;
            } else {
                clearInterval(window.payoutIncrementInterval);
                slot.setBalance(baseAmount + add);
            }
        }, time);
    }
}

setTimeout(updateUI, 1000);

const slot = new Slot(document.getElementById("slot"), config);

// TODO: jackpot automatisch in updateUI aktualisieren,
//  dafür muss aber calcJackpot noch umgeschrieben werden,
//  dass nicht auf die this variablen vom aktiven spiel zugegriffen wird
const jackpot = slot.calcJackpotAmount();

// WebSocket connection to coin server
const socket = new WebSocket(`ws://localhost:${webSocketPort}`);

socket.onmessage = function (event) {
    if (event.data.toString().startsWith('cns:')) {
        slot.freeToPlay = false;
        let cns = parseFloat(event.data.slice(4));
        if (cns > MAX_COIN_AUFLADUNG) {
            console.error("Coin amount exceeded!");
        } else {
            playSound(coinInsertSfx, sfxVolume);
            incrementBal(slot.currentBalance, cns);
        }
    }
    if (event.data.toString().startsWith('ftpon')) {
        slot.freeToPlay = true;
    }
    if (event.data.toString().startsWith('ftpoff')) {
        slot.freeToPlay = false;
    }
    if (!slot.isSpinning)
        updateUI();
};

socket.onopen = function () {
    console.log('WebSocket connection established');
};

socket.onerror = function (error) {
    console.error('WebSocket error: ', error);
};

function updateUI() {
    document.getElementById('cost').innerText = slot.config.costPerSpin.toFixed(2);
    document.getElementById('jp').innerHTML = jackpot.toFixed(2);
    if (slot.freeToPlay === true) {
        slot.spinButton.disabled = false;
        document.getElementById('bal').innerHTML = 'FTP ~ &infin;';
        document.title = `${windowTitle} ~ FTP`;
    } else {
        slot.spinButton.disabled = slot.currentBalance < slot.config.costPerSpin;
        document.getElementById('bal').innerText = slot.currentBalance.toFixed(2);
        document.title = `${windowTitle} ~ ${slot.currentBalance.toFixed(2)}€`;
    }
    if (slot.isSpinning === true) slot.spinButton.disabled = true;
    resizeOverlaySvg(winVisualizeSvg);
}

function createOverlaySVG() {
    // Create the SVG element
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "overlay");

    svg.style.position = "absolute";
    svg.style.pointerEvents = "none"; // allows clicks to pass through the SVG
    resizeOverlaySvg(svg);
    document.body.appendChild(svg); // ist egal wohin appenden, ist ja absolut positioniert

    return svg;
}

function resizeOverlaySvg(svg) {
    const reelsDiv = document.getElementById("reels");
    const rect = reelsDiv.getBoundingClientRect();
    svg.setAttribute("width", rect.width.toString());
    svg.setAttribute("height", rect.height.toString());
    svg.style.top = `${rect.top}px`;
    svg.style.left = `${rect.left}px`;
}

window.onresize = () => {
    resizeOverlaySvg(winVisualizeSvg);
};
