let coinsInserted = 0;

// WebSocket connection to coin server
    const socket = new WebSocket('ws://localhost:8080');

    socket.onmessage = function(event) {
        if (event.data === 'coinInserted') {
            insertCoin(); // Call the insertCoin function when a coin is detected
        }
    };

    socket.onopen = function() {
        console.log('WebSocket connection established');
    };

    socket.onerror = function(error) {
        console.error('WebSocket error: ', error);
    };

function insertCoin() {
    coinsInserted++;
    console.log(`Coin inserted. Total coins: ${coinsInserted}`);
}

// Function to simulate spinning the slot machine
function spinSlots() {
    if (coinsInserted > 0) {
        coinsInserted--; // Deduct a coin for the spin
        const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐'];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

        document.getElementById('reel1').innerText = reel1;
        document.getElementById('reel2').innerText = reel2;
        document.getElementById('reel3').innerText = reel3;

        // Call the dummy payout function
        payout();
    } else {
        console.log("Insert a coin to play!");
    }
}

// Dummy payout function
function payout() {
    console.log("Payout function called. No real payout implemented.");
}

// Event listener for the spin button
document.getElementById('startButton').addEventListener('click', spinSlots);

// Simulate coin input from the custom machine
function simulateCoinInput() {
    setInterval(() => {
        insertCoin(); // Simulate a coin being inserted every second
    }, 1000); // Adjust the interval as needed
}

// Start simulating coin input
simulateCoinInput();

