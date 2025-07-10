const readline = require('readline');
const {SerialPort} = require("serialport");
const WebSocket = require('ws');

const clients = [
    {
        name: "1",
        ip: "::1", // localhost
        muenzomat: true,
    }
];

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

    if (data.toString().startsWith('cns:')) {
        // durch 2 teilen, da ja 50ct Münzen gezählt werden.
        let cns = parseInt(data.toString().slice(4)) / 2;
        console.log(`Sending +${cns} Coins`);
        _broadcast(`cns:${cns}`);
    }
    if (data.toString() === 'ftpoff') // Free to play aus
        _broadcast('ftpoff');
    if (data.toString() === 'ftpon') // Free to play an
        _broadcast('ftpon');
    if (data.toString() === 'rtpn') // normaler RTP
        _broadcast('rtpn');
    if (data.toString() === 'rtps') // niedriger RTP
        _broadcast('rtps');
});

port.on('error', (err) => {
    console.error('Error SPR: ', err.message);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function rlq() {
    rl.question('', (input) => {
        if (input) {
            if (input === "h") {
                console.log("f -> FTP an\nd -> FTP aus\nu -> umsatzmodus\ns -> suchtmodus");
            } else if (input === "f") {
                broadcast("ftpon");
            } else if (input === "d") {
                broadcast("ftpoff");
            } else if (input === "u") {
                broadcast("rtps");
            } else if (input === "s") {
                broadcast("rtpn");
            }
        }
        rlq();
    });
}

rlq();

function broadcast(msg) {
    clients.forEach(client => {
        if (client.ws !== undefined)
            if (client.ws.readyState === WebSocket.OPEN)
                client.ws.send(msg);
    });
}

function _broadcast(msg) {
    clients.forEach(client => {
        if (client.muenzomat === true)
            if (client.ws !== undefined)
                if (client.ws.readyState === WebSocket.OPEN)
                    client.ws.send(msg);
    });
}

const wss = new WebSocket.Server({port: webSocketPort});

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace("::ffff:", "");
    const client = clients.find(client => client.ip === ip);
    if (client !== null) {
        console.log(`"${client.name}" connected [${ip}]`);
        client.ws = ws;
        setInterval(() => {
            ws.send('hb');
        }, 1000);
    } else {
        console.log(`Unknown client connected [${ip}]`);
    }
    ws.on('close', () => {
        ws.close();
    });
});

console.log(`WebSocket server is running on ws://localhost:${webSocketPort}`);

