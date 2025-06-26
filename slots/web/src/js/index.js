import Slot from "./Slot.js";

let coins = 0

const config = {
  inverted: false, // true: reels spin from top to bottom; false: reels spin from bottom to top
  onSpinStart: (symbols) => {
    console.log("onSpinStart", symbols);
  },
  onSpinEnd: (symbols) => {
    console.log("onSpinEnd", symbols);
  },
  costPerSpin: 1,
};

const slot = new Slot(document.getElementById("slot"), config);

// WebSocket connection to coin server
const socket = new WebSocket('ws://localhost:8085');

socket.onmessage = function(event) {
  if (event.data === 'coinInserted') {
    coins++;
    console.log("Coins: " + coins);
    slot.setBalance(coins);
  }
};

socket.onopen = function() {
  console.log('WebSocket connection established');
};

socket.onerror = function(error) {
  console.error('WebSocket error: ', error);
};
