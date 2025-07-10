import Slot from "./Slot.js";
import bgmStart from "../assets/sound/Bgm_start.mp3";
import bgmLoop from "../assets/sound/Bgm_loop.mp3";
import jackpotSfx from "../assets/sound/jackpot.mp3";
import bigWinSfx from "../assets/sound/bigWin.mp3";
import smallMediumWinSfx from "../assets/sound/small_mediumWin.mp3";
import coinInsertSfx from "../assets/sound/coinInsert.mp3";
import payoutSfx from "../assets/sound/payout.mp3";
import spinStartSfx from "../assets/sound/spinStart.mp3";
import reelsSpinningSfx from "../assets/sound/reelsSpinning.mp3";
import looseSfx from "../assets/sound/loose.mp3";

const windowTitle = document.title;
const webSocketPort = 8085;
const MAX_COIN_AUFLADUNG = 1000;
const bgmVolume = 0.5; // max 1
const sfxVolume = 1; // max 1
const maxSelectableBet = 10000; // all in zählt seperat
const autoFullscreen = false;
const preventDevTools = false;
const keyConfig = { // space: " ", enter: "enter", etc
    spin: " ",
    allIn: "Enter",
    lowerBet: "a",
    increaseBet: "d",
    killSwitch: "k",
    killSwitchAus: "l",
    addEur: "q",
    addEurPass: "abisino",
};
const gamepadConfig = {
    spin: "B0",
    allIn: "B1",
    lowerBet: "A01",
    increaseBet: "A0-1",
    killSwitch: "B11",
    autoplay: "A1-1",
    autoplayOff: "A11",
};
const WEBSOCKET_TIMEOUT = 1500;
let killswitch = false;
const ksJson = JSON.parse(window.localStorage.getItem("ks"));
if (ksJson !== null) {
    window.localStorage.removeItem("ks");
    killswitch = ksJson.killswitch;
    window.killswitch = killswitch;
    setTimeout(() => {
        slot.setBalance(ksJson.balance);
        setBet(ksJson.bet);
    }, 10);
}

// fullscreen
if (autoFullscreen) {
    document.documentElement.addEventListener("click", requestFullscreen);
    document.documentElement.addEventListener("keydown", requestFullscreen);
    document.documentElement.addEventListener("touchstart", requestFullscreen);
}

function requestFullscreen() {
    document.documentElement.removeEventListener("click", requestFullscreen);
    document.documentElement.removeEventListener("keydown", requestFullscreen);
    document.documentElement.removeEventListener("touchstart", requestFullscreen);
    try {
        document.documentElement.requestFullscreen();
    } catch (error) {
        console.error("Error in requestFullscreen:", error);
    }
}

const winVisualizeSvg = createOverlaySVG();

let bgmStarted = false;
let audioContext, audioBufferStart, audioBufferLoop, sourceNode;
let audioLoaded = false;

// Load the audio file
function loadAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadBuffer(bgmStart)
        .then((buffer) => {
            audioBufferStart = buffer;
            return loadBuffer(bgmLoop);
        })
        .then((buffer) => {
            audioBufferLoop = buffer;
            audioLoaded = true;
        });
}

function loadBuffer(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        request.onload = function () {
            audioContext.decodeAudioData(
                request.response,
                function (buffer) {
                    resolve(buffer);
                },
                reject,
            );
        };
        request.send();
    });
}

loadAudio();

function startBgm(buffer) {
    if (!audioLoaded) return;
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

document.addEventListener("click", startBgmListener);
document.addEventListener("keydown", startBgmListener);
document.addEventListener("touchstart", startBgmListener);

function startBgmListener() {
    if (bgmStarted) return;
    bgmStarted = true;
    if (audioLoaded)
        startBgm(audioBufferStart);
    else {
        const int = setInterval(() => {
            if (audioLoaded) {
                startBgm(audioBufferStart);
                clearInterval(int);
            }
        }, 250);
    }
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
        playSound(reelsSpinningSfx, sfxVolume);
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
    winVisualizeSvg: winVisualizeSvg,
};

function incrementBal(baseAmount, add) {
    let div = 0.01;
    if (add < 5) div = 0.01;
    else if (add < 50) div = 0.11;
    else if (add < 100) div = 0.51;
    else if (add < 1000) div = 2.51;
    else if (add < 5000) div = 9.51;
    else if (add < 10000) div = 21.01;
    else div = 61.01;
    const incrementAmount = Math.floor(add / div);
    const balElem = document.getElementById("bal");
    const time = 1000 / incrementAmount;
    let currentAdd = 0;
    clearInterval(window.payoutIncrementInterval);
    slot.setBalance(baseAmount + add);
    if (incrementAmount > 0 && !slot.freeToPlay) {
        window.payoutIncrementInterval = setInterval(() => {
            if (currentAdd < incrementAmount) {
                balElem.innerText = (baseAmount + (currentAdd + 1) * div).toFixed(2);
                currentAdd++;
            } else {
                clearInterval(window.payoutIncrementInterval);
                updateUI();
            }
        }, time);
    }
}

setTimeout(updateUI, 1000);

const slot = new Slot(document.getElementById("slot"), config);
let jackpot = slot.calcJackpotAmount();
let oldBet = slot.bet;

// WebSocket connection to server
let socketLastReceived = Date.now();
setInterval(() => {
    if (Date.now() - socketLastReceived >= WEBSOCKET_TIMEOUT) {
        console.log("Websocket timeout, reconnecting..");
        initWebSocket();
    }
}, 1000);
updateGamepadStatus();

function initWebSocket() {
    const socket = new WebSocket(`ws://${window.location.hostname}:${webSocketPort}`);

    socket.onmessage = function (event) {
        socketLastReceived = Date.now();
        if (event.data.toString().startsWith("cns:")) {
            slot.freeToPlay = false;
            let cns = parseFloat(event.data.slice(4));
            if (cns > MAX_COIN_AUFLADUNG) {
                console.error("Coin amount exceeded!");
            } else {
                playSound(coinInsertSfx, sfxVolume);
                incrementBal(slot.currentBalance, cns);
            }
        }
        if (event.data.toString().startsWith("ftpon")) {
            slot.freeToPlay = true;
        }
        if (event.data.toString().startsWith("ftpoff")) {
            slot.freeToPlay = false;
        }
        if (event.data.toString().startsWith("rtpn")) {
            slot.externalRtpCorrection = 1;
        }
        if (event.data.toString().startsWith("rtps")) {
            slot.externalRtpCorrection = 0.5;
        }
        if (!slot.isSpinning) updateUI();
    };
    socket.onopen = function () {
        console.log("WebSocket connection established");
    };
    socket.onerror = function (error) {
        console.error("WebSocket error: ", error);
    };
}

document.getElementById('lowerBet').addEventListener("click", () => decreaseBet());
document.getElementById('allIn').addEventListener("click", () => allIn());
document.getElementById('increaseBet').addEventListener("click", () => increaseBet());

function allIn() {
    if (slot.isSpinning) return;
    if (slot.bet === slot.currentBalance) {
        setBet(oldBet);
    } else {
        setBet(Math.max(0, slot.currentBalance));
        const winDisplay = document.getElementById("winText");
        winDisplay.innerHTML = `All in!<br>${slot.bet.toFixed(2)}€`;
        winDisplay.style.animation = "pop 2s forwards";
        setTimeout(() => {
            winDisplay.style.animation = "";
        }, 2000);
    }
}

function increaseBet() {
    if (slot.isSpinning) return;
    const currentBet = slot.bet;
    let newBet;
    if (currentBet < 0.05) {
        newBet = Math.min(currentBet + 0.01, maxSelectableBet);
    } else if (currentBet < 1) {
        newBet = Math.min(currentBet + 0.05, maxSelectableBet);
    } else if (currentBet < 10) {
        newBet = Math.min(currentBet + 0.5, maxSelectableBet);
    } else if (currentBet < 100) {
        newBet = Math.min(currentBet + 5, maxSelectableBet);
    } else if (currentBet < 500) {
        newBet = Math.min(currentBet + 10, maxSelectableBet);
    } else if (currentBet < 1000) {
        newBet = Math.min(currentBet + 50, maxSelectableBet);
    } else {
        newBet = Math.min(currentBet + 100, maxSelectableBet);
    }
    newBet = Math.max(0, Math.min(slot.currentBalance, newBet));
    setBet(Math.round(newBet * 100) / 100);
}

function decreaseBet() {
    if (slot.isSpinning) return;
    const currentBet = slot.bet;
    console.log(currentBet);
    let newBet;
    if (currentBet > 1000) {
        newBet = Math.max(currentBet - 100, 0.01);
    } else if (currentBet > 500) {
        newBet = Math.max(currentBet - 50, 0.01);
    } else if (currentBet > 100) {
        newBet = Math.max(currentBet - 10, 0.01);
    } else if (currentBet > 10) {
        newBet = Math.max(currentBet - 5, 0.01);
    } else if (currentBet > 1) {
        newBet = Math.max(currentBet - 0.5, 0.01);
    } else if (currentBet > 0.05) {
        newBet = Math.max(currentBet - 0.05, 0.01);
    } else {
        newBet = Math.max(currentBet - 0.01, 0.01);
    }
    newBet = Math.max(0, Math.min(slot.currentBalance, newBet));
    setBet(Math.round(newBet * 100) / 100);
}

function setBet(betAmount) {
    oldBet = slot.bet;
    slot.bet = betAmount;
    document.getElementById('lowerBet').disabled = betAmount <= 0.01;
    document.getElementById('increaseBet').disabled = betAmount >= maxSelectableBet;
    jackpot = slot.calcJackpotAmount();
    updateUI();
}

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    console.log(key);
    if (key === "f12" && preventDevTools) {
        e.preventDefault();
    }
    if (key === keyConfig.spin.toLowerCase()) {
        slot.spinButton.click();
    } else if (key === keyConfig.allIn.toLowerCase()) {
        allIn();
    } else if (key === keyConfig.lowerBet.toLowerCase()) {
        decreaseBet();
    } else if (key === keyConfig.increaseBet.toLowerCase()) {
        increaseBet();
    } else if (key === keyConfig.killSwitch.toLowerCase()) {
        killswitch = true;
        updateSymbols();
    } else if (key === keyConfig.killSwitchAus.toLowerCase()) {
        killswitch = true;
        updateSymbols();
    } else if (key === keyConfig.addEur.toLowerCase()) {
        const res = prompt("Passwort für Guthabenänderung");
        if (res === keyConfig.addEurPass) {
            try {
                const balChg = parseFloat(parseFloat(prompt("Menge?", "10")).toFixed(2));
                slot.addBalance(balChg);
                updateUI();
            } catch (e) {
            }
        }
    }
});

function updateGamepadStatus() {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad) {
            checkGamepadTrigger(gamepad, gamepadConfig.spin, () => {
                slot.spinButton.click();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.allIn, () => {
                allIn();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.lowerBet, () => {
                decreaseBet();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.increaseBet, () => {
                increaseBet();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.autoplay, () => {
                slot.autoPlayCheckbox.checked = true;
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.autoplayOff, () => {
                slot.autoPlayCheckbox.checked = false;
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.killSwitch, () => {
                killswitch = true;
                updateSymbols();
            }, () => {
                killswitch = false;
                updateSymbols();
            });

        }
    }
    requestAnimationFrame(updateGamepadStatus);
}

const gamepadDebounceTimers = new Map();

function checkGamepadTrigger(gamepad, cfg, fn, nfn) {
    const buttonStates = gamepad.buttons.map(button => button.pressed);
    const axes = gamepad.axes;
    if (cfg.toLowerCase().startsWith("b")) {
        const id = parseInt(cfg.slice(1));
        const mapId = "b" + (id.toString());
        if (buttonStates[id] === true) {
            if (!gamepadDebounceTimers.has(mapId)) {
                fn?.();
                const timeoutId = setTimeout(() => {
                    const intervalId = setInterval(() => {
                        fn?.();
                    }, 25);
                    gamepadDebounceTimers.set(mapId, {intervalId});
                }, 800);
                gamepadDebounceTimers.set(mapId, {timeoutId});
            }
        } else {
            nfn?.();
            if (gamepadDebounceTimers.has(mapId)) {
                const {timeoutId, intervalId} = gamepadDebounceTimers.get(mapId);
                clearTimeout(timeoutId);
                if (intervalId) {
                    clearInterval(intervalId);
                }
                gamepadDebounceTimers.delete(mapId);
            }
        }
    } else if (cfg.toLowerCase().startsWith("a")) {
        const targetValue = parseFloat(cfg.toLowerCase().substring(2));
        const id = parseInt(cfg.substring(1, 2));
        const mapId = "a" + (targetValue.toString()) + (id.toString());
        if (axes[id] === targetValue) {
            if (!gamepadDebounceTimers.has(mapId)) {
                fn?.();
                const timeoutId = setTimeout(() => {
                    const intervalId = setInterval(() => {
                        fn?.();
                    }, 25);
                    gamepadDebounceTimers.set(mapId, {intervalId});
                }, 800);
                gamepadDebounceTimers.set(mapId, {timeoutId});
            }
        } else {
            if (gamepadDebounceTimers.has(mapId)) {
                const {timeoutId, intervalId} = gamepadDebounceTimers.get(mapId);
                clearTimeout(timeoutId);
                if (intervalId) {
                    clearInterval(intervalId);
                }
                gamepadDebounceTimers.delete(mapId);
            }
        }
    }
}

function updateUI() {
    document.getElementById("cost").innerText =
        slot.bet.toFixed(2);
    document.getElementById("jp").innerHTML = jackpot.toFixed(2);
    if (slot.freeToPlay === true) {
        slot.spinButton.disabled = false;
        document.getElementById("bal").innerHTML = "FTP ~ &infin;";
        document.title = `${windowTitle} ~ FTP`;
        document.getElementById("bal").parentElement.style.color = "";
    } else {
        slot.spinButton.disabled = slot.currentBalance < slot.bet;
        document.getElementById("bal").innerText = slot.currentBalance.toFixed(2);
        if (slot.bet > slot.currentBalance)
            document.getElementById("bal").parentElement.style.color = "red";
        else
            document.getElementById("bal").parentElement.style.color = "";
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

function updateSymbols() {
    // update symbols after killswitch toggle
    if (killswitch !== window.killswitch) {
        let killswitch_json = {
            killswitch: killswitch,
            bet: slot.bet,
            balance: slot.currentBalance,
        };
        window.localStorage.setItem("ks", JSON.stringify(killswitch_json));
        window.location.reload();
    }
    window.killswitch = killswitch;
}

window.onresize = () => {
    resizeOverlaySvg(winVisualizeSvg);
};
