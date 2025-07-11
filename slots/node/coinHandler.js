const readline = require('readline');
const {SerialPort} = require("serialport");
const WebSocket = require('ws');

const defaultRtp = 1;
const defaultFtp = false;
const defaultKillswitch = false;
const gewinnmodusRtp = 0.5;

const webSocketPort = 8085
const port = new SerialPort({
    path: 'COM9',
    baudRate: 115200
});

const clients = [
    {
        name: "1",
        ip: "::1", // localhost
        muenzomat: true,
        musik: true,
        infos: {},
    },
    {
        name: "2",
        ip: "172.26.224.1",
        muenzomat: true,
        infos: {
            musik: true,
        },
    },
    {
        name: "rot",
        ip: "192.168.162.116",
        muenzomat: false,
        infos: {
            musik: true,
        },
    },
    {
        name: "gruen",
        ip: "192.168.90.0",
        muenzomat: false,
        infos: {
            musik: false,
        },
    },
    {
        name: "hnd",
        ip: "192.168.179.67",
        muenzomat: false,
        infos: {
            musik: false,
        },
    }
];

clients.forEach((client) => {
    client.infos.rtp = defaultRtp;
    client.infos.ftp = defaultFtp;
    client.infos.killswitch = defaultKillswitch;
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
    if (data.toString().startsWith('ftp')) {
        clients.forEach((client) => {
            client.infos.ftp = data.toString() === "ftpoff" ? false : data.toString() === "ftpon";
        });
    }
    if (data.toString().startsWith('rtp')) {
        clients.forEach((client) => {
            client.infos.rtp = data.toString() === "rtpn" ? 1 : data.toString() === "rtps" ? gewinnmodusRtp : 1;
        });
    }
    _broadcast();
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
                console.log("Für alle Clients:\nf -> FTP an\nd -> FTP aus\nu -> umsatzmodus\ns -> suchtmodus\nk -> killswitch an\nl -> killswitch aus\n");
            } else if (input === "f" || input === "d") {
                clients.forEach((client) => {
                    client.infos.ftp = input === "f";
                });
            } else if (input === "u" || input === "s") {
                clients.forEach((client) => {
                    client.infos.rtp = input === "u" ? gewinnmodusRtp : 1;
                });
            } else if (input === "k" || input === "l") {
                clients.forEach((client) => {
                    client.infos.killswitch = input === "k";
                });
            }
            broadcast();
        }
        rlq();
    });
}

rlq();

function broadcast(msg) {
    clients.forEach(client => {
        if (client.ws !== undefined)
            if (client.ws.readyState === WebSocket.OPEN) {
                if (msg !== "" && msg !== undefined)
                    client.ws.send(msg);
                client.ws.send(JSON.stringify(client.infos));
            }
    });
}

function _broadcast(msg) {
    clients.forEach(client => {
        if (client.muenzomat === true)
            if (client.ws !== undefined)
                if (client.ws.readyState === WebSocket.OPEN) {
                    if (msg !== "" && msg !== undefined)
                        client.ws.send(msg);
                    client.ws.send(JSON.stringify(client.infos));
                }
    });
}

const wss = new WebSocket.Server({port: webSocketPort});

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace("::ffff:", "");
    const client = clients.find(client => client.ip === ip);
    if (client !== null && client !== undefined) {
        console.log(`"${client.name}" connected [${ip}]`);
        client.ws = ws;
        sendClientInfos(client);
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

function sendClientInfos(client) {
    if (client === null || client === undefined) return;
    if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(client.infos));
    }
}

console.log(`WebSocket server is running on ws://localhost:${webSocketPort}`);

process.on('SIGINT', () => { // ctrl-c
    console.log('Abbruch, Server wird beendet...');
    process.exit();
});
process.on('SIGTERM', () => { // debugger stop
    console.log('Abbruch, Server wird beendet...');
    process.exit();
});
