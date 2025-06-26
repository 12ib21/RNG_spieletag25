
const {SerialPort} = require("serialport");
const WebSocket = require('ws');

const webSocketPort = 8085
const port = new SerialPort({
    path: 'COM3',
    baudRate: 115200
});

port.on('open', () => {
    console.log('Serial Port Opened');
});

port.on('data', (data) => {
    console.log('Data received SPR: ' + data);
    // Here you can call the function to insert a coin in your web app
    // For example: insertCoin();
});

port.on('error', (err) => {
    console.error('Error SPR: ', err.message);
});

const wss = new WebSocket.Server({ port: webSocketPort });

wss.on('connection', (ws) => {
    console.log('Client connected');

    port.on('data', (data) => {
        console.log('Data received SP: ' + data);
        // Send a message to the web application when a coin is inserted
        ws.send('coinInserted');
    });
    setTimeout(()=> {ws.send('coinInserted')}, 5000);

    port.on('error', (err) => {
        console.error('Error SP: ', err.message);
    });
});

console.log(`WebSocket server is running on ws://localhost:${webSocketPort}`);

