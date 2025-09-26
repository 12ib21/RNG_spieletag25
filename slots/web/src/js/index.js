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

import bohlAllIn1 from "../assets/sound/voice/all_in1.mp3";
import bohlAllIn2 from "../assets/sound/voice/all_in2.mp3";
import bohlAllInDecrease1 from "../assets/sound/voice/all_in_decrease1.mp3";
import bohlAllInDecrease2 from "../assets/sound/voice/all_in_decrease2.mp3";
import bohlWalterCombo1 from "../assets/sound/voice/waltercombo1.mp3";
import bohlWalterCombo2 from "../assets/sound/voice/waltercombo2.mp3";
import bohlWalterCombo3 from "../assets/sound/voice/waltercombo3.mp3";
import bohlSmallWin1 from "../assets/sound/voice/small_win1.mp3";
import bohlSmallWin2 from "../assets/sound/voice/small_win2.mp3";
import bohlMediumWin1 from "../assets/sound/voice/medium_win1.mp3";
import bohlMediumWin2 from "../assets/sound/voice/medium_win2.mp3";
import bohlBigWin from "../assets/sound/voice/big_win.mp3";
import bohlJackpot from "../assets/sound/voice/jackpot.mp3";
import bohlPleite from "..//assets/sound/voice/pleite.mp3";
import bohlLoose1 from "../assets/sound/voice/loose1.mp3";
import bohlLoose2 from "../assets/sound/voice/loose2.mp3";
import bohlLoose3 from "../assets/sound/voice/loose3.mp3";
import bohlLoose4 from "../assets/sound/voice/loose4.mp3";
import bohlLoose5 from "../assets/sound/voice/loose5.mp3";
import bohlAmbient1 from "../assets/sound/voice/ambient1.mp3";
import bohlAmbient2 from "../assets/sound/voice/ambient2.mp3";
import bohlAmbient4 from "../assets/sound/voice/ambient4.mp3";
import bohlAmbient5 from "../assets/sound/voice/ambient5.mp3";
import bohlIdle1 from "../assets/sound/voice/idle1.mp3";
import bohlIdle2 from "../assets/sound/voice/idle2.mp3";
import bohlIdle3 from "../assets/sound/voice/idle3.mp3";
import bohlIdle4 from "../assets/sound/voice/idle4.mp3";
import bohlIdle5 from "../assets/sound/voice/idle5.mp3";
import bohlRothWin from "../assets/sound/voice/roth_win.mp3";

const allInSounds = [bohlAllIn1, bohlAllIn2];
const allInDecreaseSounds = [bohlAllInDecrease1, bohlAllInDecrease2];
const walterComboSounds = [bohlWalterCombo1, bohlWalterCombo2, bohlWalterCombo3];
const mediumWinSounds = [bohlMediumWin1, bohlMediumWin2];
const basicWinSounds = [bohlSmallWin1, bohlSmallWin2];
const looseSounds = [bohlLoose1, bohlLoose2, bohlLoose3, bohlLoose4, bohlLoose5];
const idleSounds = [bohlIdle1, bohlIdle2, bohlIdle3, bohlIdle4, bohlIdle5, bohlAmbient1, bohlAmbient2, bohlAmbient4, bohlAmbient5];

const windowTitle = document.title;
const webSocketPort = 8085;
const MAX_COIN_AUFLADUNG = 1000000;
const bgmVolume = 0.5; // max 1
const sfxVolume = 0.75; // max 1
const bohlVolume = 1; // max 1
const bohlIdleVolume = 1; // max 1
const delayUntilIdleSounds = 15; // s
const maxSelectableBet = 10000; // all in zählt seperat
const coinInsertCooldown = 100; // 100ms
const coinInsertAddAmount = 25; // +10€ für beliebige Münze
const autoFullscreen = true;
const preventDevTools = true;
const keyConfig = {
    // space: " ", enter: "enter", etc
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
    coinInsterted: "B2",
    coinInsterted: "B2",
};
const WEBSOCKET_TIMEOUT = 1500;
let credits = true;
let killswitch = false;
let killswitch_client = false;
let killswitch_server = false;
let lastSpin = Date.now();
window.killswitch = killswitch;
window.nextJp = false; // next jackpot trigger
let musicAllowed = true;
let lastCoinAufladung = Date.now();
const ksJson = JSON.parse(window.localStorage.getItem("ks"));
if (ksJson !== null) {
    setCredits(false);
    window.localStorage.removeItem("ks");
    killswitch = ksJson.killswitch;
    killswitch_server = killswitch; // damits nicht reloaded
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
    try {
        document.documentElement
            .requestFullscreen()
            .then(() => {
                document.documentElement.removeEventListener(
                    "click",
                    requestFullscreen,
                );
                document.documentElement.removeEventListener(
                    "keydown",
                    requestFullscreen,
                );
                document.documentElement.removeEventListener(
                    "touchstart",
                    requestFullscreen,
                );
            })
            .catch((e) => {
                console.warn("Error while requestFullscreen:", e);
            });
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
    if (audioLoaded === false || musicAllowed === false) return;
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
    if (credits === true) setCredits(false);
    if (bgmStarted === true || musicAllowed === false) return;
    bgmStarted = true;
    if (audioLoaded === true) startBgm(audioBufferStart);
    else {
        const int = setInterval(() => {
            if (audioLoaded === true) {
                if (musicAllowed === true) startBgm(audioBufferStart);
                clearInterval(int);
            }
        }, 100);
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
            let playBohlSound = true;
            if (winAmount < 0) {
                if (window.killswitch === false) {
                    if (walterComboSounds.length !== 0) {
                        const randomIndex = Math.floor(Math.random() * walterComboSounds.length);
                        playSound(walterComboSounds[randomIndex], bohlVolume);
                        playBohlSound = false;
                    }
                } else playSound(looseSfx, sfxVolume);
            }

            if (window.isRothWin === true) {
                window.isRothWin = false;
                playBohlSound = false;
                playSound(bohlRothWin, bohlVolume);
            }

            switch (winType) {
                case "jackpot":
                    if (winAmount > 0 || playBohlSound === true) playSound(bohlJackpot, bohlVolume);
                    setTimeout(() => {
                        playSound(jackpotSfx, sfxVolume);
                    }, 750);
                    break;
                case "big":
                    if (winAmount > 0)
                        setTimeout(() => {
                            playSound(bigWinSfx, sfxVolume / 2);
                        }, 500);
                    if (playBohlSound === true) playSound(bohlBigWin, bohlVolume);
                    break;
                case "medium":
                    if (winAmount > 0) setTimeout(() => {
                        playSound(smallMediumWinSfx, sfxVolume / 2);
                    }, 500);
                    if (playBohlSound === true)
                        if (mediumWinSounds.length !== 0) {
                            const randomIndex = Math.floor(Math.random() * mediumWinSounds.length);
                            playSound(mediumWinSounds[randomIndex], bohlVolume);
                        }
                    break;
                case "basic":
                    if (winAmount > 0) setTimeout(() => {
                        playSound(smallMediumWinSfx, sfxVolume / 2);
                    }, 500);
                    if (playBohlSound === true)
                        if (basicWinSounds.length !== 0) {
                            const randomIndex = Math.floor(Math.random() * basicWinSounds.length);
                            playSound(basicWinSounds[randomIndex], bohlVolume);
                        }
                    break;
            }
            setTimeout(() => {
                const baseAmount = slot.currentBalance - winAmount;
                playSound(payoutSfx, sfxVolume);
                incrementBal(baseAmount, winAmount);
                updateUI();
            }, 2000);
        } else {
            if (window.killswitch === false) {
                if (looseSounds.length !== 0 && slot.currentBalance > 0) {
                    const randomIndex = Math.floor(Math.random() * looseSounds.length);
                    playSound(looseSounds[randomIndex], bohlVolume);
                }
            } else playSound(looseSfx, sfxVolume / (slot.currentBalance <= 0 ? 2 : 1));
            updateUI();
        }
        if (slot.currentBalance <= 0) {
            setTimeout(
                () => {
                    playSound(bohlPleite, bohlVolume);
                }, winAmount === 0 ? 100 : 1500);
        }
        lastSpin = Date.now();
    },
    winVisualizeSvg: winVisualizeSvg,
};

let idleSoundQueueId = null;

function queueIdleSound() {
    if (slot.isSpinning === false && Date.now() - lastSpin >= 1000 * delayUntilIdleSounds) {
        idleSoundQueueId = setTimeout(() => {
            idleSound();
            queueIdleSound();
        }, 1000 * 10 + Math.floor(Math.random() * 1000 * 30));
    } else {
        if (idleSoundQueueId !== null) {
            clearTimeout(idleSoundQueueId);
            idleSoundQueueId = null;
        }
        setTimeout(queueIdleSound, 1000);
    }
}

function idleSound() {
    if (idleSounds.length === 0) return;
    const randomIndex = Math.floor(Math.random() * idleSounds.length);
    playSound(idleSounds[randomIndex], bohlIdleVolume);
}


function incrementBal(baseAmount, add) {
    const targetTime = 2; // sec
    const timePerIncrement = 10; // ms
    const div = add / (targetTime * (1000 / timePerIncrement));

    const incrementAmount = Math.floor(add / div);
    const balElem = document.getElementById("bal");
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
        }, timePerIncrement);
    }
}

setTimeout(updateUI, 1000);

const slot = new Slot(document.getElementById("slot"), config);
let jackpot = slot.calcJackpotAmount();
let oldBet = slot.bet;
queueIdleSound();

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
    const socket = new WebSocket(
        `ws://${window.location.hostname}:${webSocketPort}`,
    );

    socket.onmessage = function (event) {
        socketLastReceived = Date.now();
        if (event.data.toString().startsWith("cns:")) {
            if (Date.now() - lastCoinAufladung > 100) {
                lastCoinAufladung = Date.now();
                slot.freeToPlay = false;
                let cns = parseFloat(event.data.slice(4));
                if (cns > MAX_COIN_AUFLADUNG) {
                    console.error("Coin amount exceeded!");
                } else {
                    playSound(coinInsertSfx, sfxVolume);
                    incrementBal(slot.currentBalance, cns);
                }
            }
        } else if (event.data.toString() === "nextJP!?&§") {
            window.nextJp = true;
            console.log("Next Jackpot triggered!");
        } else if (event.data.toString().startsWith("{")) {
            const tJson = JSON.parse(event.data.toString());
            console.log(tJson);
            slot.freeToPlay = tJson.ftp === true;
            slot.externalRtpCorrection = Math.max(0, tJson.rtp);
            killswitch_server = tJson.killswitch === true;
            musicAllowed = tJson.musik === true;
            if (musicAllowed === false && bgmStarted === true) {
                sourceNode.stop();
            }
            updateSymbols();
        } else if (event.data.toString().toLowerCase() === "r") {
            // reload
            if (event.data.toString() === "r") {
                let killswitch_json = {
                    killswitch: killswitch,
                    bet: slot.bet,
                    balance: slot.currentBalance,
                };
                if (slot.isSpinning === true)
                    killswitch_json.balance += killswitch_json.bet;
                window.localStorage.setItem("ks", JSON.stringify(killswitch_json));
            }
            window.location.reload();
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

document
    .getElementById("lowerBet")
    .addEventListener("click", () => decreaseBet());
document.getElementById("allIn").addEventListener("click", () => allIn());
document
    .getElementById("increaseBet")
    .addEventListener("click", () => increaseBet());

let lastAllInTrigger = Date.now() - 2500;
let lastAllInTriggerDecrease = Date.now() - 2500;

function allIn() {
    if (slot.isSpinning) return;
    if (slot.bet === slot.currentBalance) {
        if (Date.now() - lastAllInTriggerDecrease >= 2500) {
            if (allInDecreaseSounds.length !== 0) {
                const randomIndex = Math.floor(Math.random() * allInDecreaseSounds.length);
                playSound(allInDecreaseSounds[randomIndex], bohlVolume);
            }
            lastAllInTriggerDecrease = Date.now();
        }
        setBet(oldBet);
    } else {
        setBet(Math.max(0, slot.currentBalance));
        const winDisplay = document.getElementById("winText");
        winDisplay.innerHTML = `All in!<br>${slot.bet.toFixed(2)}€`;
        winDisplay.style.animation = "pop 2s forwards";
        if (Date.now() - lastAllInTrigger >= 2500) {
            if (allInSounds.length !== 0) {
                const randomIndex = Math.floor(Math.random() * allInSounds.length);
                playSound(allInSounds[randomIndex], bohlVolume);
            }
            lastAllInTrigger = Date.now();
        }
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
    newBet = Math.round(newBet * 100) / 100;
    if (newBet === slot.currentBalance) {
        if (Date.now() - lastAllInTrigger >= 2500) {
            if (allInSounds.length !== 0) {
                const randomIndex = Math.floor(Math.random() * allInSounds.length);
                playSound(allInSounds[randomIndex], bohlVolume);
            }
            lastAllInTrigger = Date.now();
        }
    }
    setBet(newBet);
}

function decreaseBet() {
    if (slot.isSpinning) return;
    const currentBet = slot.bet;
    if (currentBet === slot.currentBalance) {
        if (Date.now() - lastAllInTriggerDecrease >= 2500) {
            if (allInDecreaseSounds.length !== 0) {
                const randomIndex = Math.floor(Math.random() * allInDecreaseSounds.length);
                playSound(allInDecreaseSounds[randomIndex], bohlVolume);
            }
            lastAllInTriggerDecrease = Date.now();
        }
    }
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
    newBet = Math.max(
        0,
        Math.min(slot.currentBalance, Math.min(maxSelectableBet, newBet)),
    );
    setBet(Math.round(newBet * 100) / 100);
}

function setBet(betAmount) {
    oldBet = slot.bet;
    slot.bet = betAmount;
    document.getElementById("lowerBet").disabled = betAmount <= 0.01;
    document.getElementById("increaseBet").disabled =
        betAmount >= maxSelectableBet;
    jackpot = slot.calcJackpotAmount();
    updateUI();
}

window.addEventListener("keydown", (e) => {
    if (credits === true) setCredits(false);
    else {
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
            killswitch_client = true;
            updateSymbols();
        } else if (key === keyConfig.killSwitchAus.toLowerCase()) {
            killswitch_client = false;
            updateSymbols();
        } else if (key === keyConfig.addEur.toLowerCase()) {
            const res = prompt("Passwort für Guthabenänderung");
            if (res === keyConfig.addEurPass) {
                try {
                    const balChg = parseFloat(
                        parseFloat(prompt("Menge?", "10")).toFixed(2),
                    );
                    slot.addBalance(balChg);
                    updateUI();
                } catch (e) {
                }
            }
        }
    }
});

let lastInsert = Date.now() - coinInsertCooldown;
function updateGamepadStatus() {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad) {
            checkGamepadTrigger(gamepad, gamepadConfig.spin, () => {
                if (credits === true) setCredits(false);
                else slot.spinButton.click();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.allIn, () => {
                if (credits === true) setCredits(false);
                else allIn();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.lowerBet, () => {
                if (credits === true) setCredits(false);
                else decreaseBet();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.increaseBet, () => {
                if (credits === true) setCredits(false);
                else increaseBet();
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.autoplay, () => {
                if (credits === true) setCredits(false);
                else slot.autoPlayCheckbox.checked = true;
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.autoplayOff, () => {
                if (credits === true) setCredits(false);
                else slot.autoPlayCheckbox.checked = false;
                startBgmListener();
            });
            checkGamepadTrigger(gamepad, gamepadConfig.coinInsterted, () => {
                if (credits === true) setCredits(false);
                startBgmListener();
                if (Date.now() - lastInsert >= coinInsertCooldown) {
                    lastInsert = Date.now();
                    playSound(coinInsertSfx, 1);
                    slot.addBalance(coinInsertAddAmount);
                    updateUI();
                }
            });
            checkGamepadTrigger(
                gamepad,
                gamepadConfig.killSwitch,
                () => {
                    killswitch_client = true;
                    updateSymbols();
                },
                () => {
                    killswitch_client = false;
                    updateSymbols();
                },
            );
        }
    }
    requestAnimationFrame(updateGamepadStatus);
}

const gamepadDebounceTimers = new Map();

function checkGamepadTrigger(gamepad, cfg, fn, nfn) {
    const buttonStates = gamepad.buttons.map((button) => button.pressed);
    const axes = gamepad.axes;
    if (cfg.toLowerCase().startsWith("b")) {
        const id = parseInt(cfg.slice(1));
        const mapId = "b" + id.toString();
        if (buttonStates[id] === true) {
            if (!gamepadDebounceTimers.has(mapId)) {
                fn?.();
                const timeoutId = setTimeout(() => {
                    const intervalId = setInterval(() => {
                        fn?.();
                    }, 25);
                    gamepadDebounceTimers.set(mapId, { intervalId });
                    gamepadDebounceTimers.set(mapId, { intervalId });
                }, 800);
                gamepadDebounceTimers.set(mapId, { timeoutId });
                gamepadDebounceTimers.set(mapId, { timeoutId });
            }
        } else {
            nfn?.();
            if (gamepadDebounceTimers.has(mapId)) {
                const { timeoutId, intervalId } = gamepadDebounceTimers.get(mapId);
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
        const mapId = "a" + targetValue.toString() + id.toString();
        if (axes[id] === targetValue) {
            if (!gamepadDebounceTimers.has(mapId)) {
                fn?.();
                const timeoutId = setTimeout(() => {
                    const intervalId = setInterval(() => {
                        fn?.();
                    }, 25);
                    gamepadDebounceTimers.set(mapId, { intervalId });
                    gamepadDebounceTimers.set(mapId, { intervalId });
                }, 800);
                gamepadDebounceTimers.set(mapId, { timeoutId });
                gamepadDebounceTimers.set(mapId, { timeoutId });
            }
        } else {
            if (gamepadDebounceTimers.has(mapId)) {
                const { timeoutId, intervalId } = gamepadDebounceTimers.get(mapId);
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
    document.getElementById("cost").innerText = slot.bet.toFixed(2);
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
        else document.getElementById("bal").parentElement.style.color = "";
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
    if (killswitch_server === true) killswitch = true;
    else killswitch = killswitch_client;
    if (killswitch !== window.killswitch) {
        let killswitch_json = {
            killswitch: killswitch,
            bet: slot.bet,
            balance: slot.currentBalance,
        };
        if (slot.isSpinning === true)
            killswitch_json.balance += killswitch_json.bet;
        window.localStorage.setItem("ks", JSON.stringify(killswitch_json));
        window.location.reload();
    }
    window.killswitch = killswitch;
}

window.onresize = () => {
    resizeOverlaySvg(winVisualizeSvg);
};

function setCredits(state) {
    if (state === true) {
        document.getElementById("credits").classList.remove("credits_off");
        credits = state;
    } else {
        document.getElementById("credits").classList.add("credits_off");
        credits = state;
    }
}
