const {SerialPort} = require("serialport");
const WebSocket = require('ws');

const webSocketPort = 8085
const port = new SerialPort({
    path: 'COM9',
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

const wss = new WebSocket.Server({port: webSocketPort});

wss.on('connection', (ws) => {
    console.log('Client connected');

    port.on('data', (data) => {
        console.log('Data received SP: ' + data);
        // Send a message to the web application when a coin is inserted
        if (data.toString().startsWith('cns:')) {
            // durch 2 teilen, da ja 50ct Münzen gezählt werden.
            let cns = parseInt(data.toString().slice(4)) / 2;
            console.log(`Sending +${cns} Coins`);
            ws.send(`cns:${cns}`);
        }
        if (data.toString() === 'ftpoff')
            ws.send('ftpoff');
        if (data.toString() === 'ftpon')
            ws.send('ftpon');
    });

    setTimeout(() => {
        ws.send('hb');
    }, 5000);

    port.on('error', (err) => {
        console.error('Error SP: ', err.message);
    });

    ws.on('close', () => {
        ws.close();
    })
});

console.log(`WebSocket server is running on ws://localhost:${webSocketPort}`);

