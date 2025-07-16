const readline = require('readline');
const { SerialPort } = require("serialport");
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const defaultRtp = 1;
const defaultFtp = false;
const defaultKillswitch = false;
const gewinnmodusRtp = 0.5;

const webSocketPort = 8085
const managementPort = 5560;
const webSocketManagementPort = 5561;
const managementDir = path.join(__dirname, "management");
const lbFile = path.join(managementDir, "leaderboard", "lb.json");
const port = new SerialPort({
    path: 'COM9',
    baudRate: 115200
});

const clients = [
    {
        name: "localhost_windows",
        ip: "::1",
        muenzomat: true,
        infos: {
            musik: true,
        },
    },
    {
        name: "localhost",
        ip: "127.0.0.1",
        muenzomat: false,
        infos: {
            musik: true,
        },
    },
    {
        name: "paul-inf",
        ip: "10.1.2.82",
        muenzomat: false,
        infos: {
            musik: true,
        },
    },
    {
        name: "johannes-inf",
        ip: "10.1.2.90",
        muenzomat: false,
        infos: {
            musik: true,
        },
    },
    {
        name: "chandri-inf",
        ip: "10.1.2.127",
        muenzomat: false,
        infos: {
            musik: true,
        },
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
        name: "Rot",
        ip: "192.168.2.2",
        muenzomat: false,
        infos: {
            musik: true,
        },
    },
    {
        name: "Gruen",
        ip: "192.168.2.3",
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
            if (client.muenzomat)
                client.infos.ftp = data.toString() === "ftpoff" ? false : data.toString() === "ftpon";
        });
    }
    if (data.toString().startsWith('rtp')) {
        clients.forEach((client) => {
            if (client.muenzomat)
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
                console.log("Für alle Clients:\nr -> hot reload\nR -> reload (geld weg)\nf -> FTP an\nd -> FTP aus\nu -> umsatzmodus\ns -> suchtmodus\nk -> killswitch an\nl -> killswitch aus\n");
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
            } else if (input.toLowerCase() === "r")
                broadcast(input);
            broadcast();
        }
        rlq();
    });
}

rlq();

function broadcast(msg) {
    clients.forEach(client => {
        if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN) {
            if (msg !== "" && msg !== undefined)
                client.ws.send(msg);
            client.ws.send(JSON.stringify(client.infos));
        }
    });
}

function broadcastManagement() {
    const clientsCp = clients
        .filter(client => client.ws && client.ws.readyState === WebSocket.OPEN) // Filter clients
        .map(({ ws, ...rest }) => rest);
    managementClients.forEach(client => {
        if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN)
            client.ws.send(JSON.stringify(clientsCp));
    });
}

function _broadcast(msg) {
    clients.forEach(client => {
        if (client.muenzomat === true && client.ws !== undefined && client.ws.readyState === WebSocket.OPEN) {
            if (msg !== "" && msg !== undefined)
                client.ws.send(msg);
            client.ws.send(JSON.stringify(client.infos));
        }
    });
}

const wss = new WebSocket.Server({ port: webSocketPort });

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
    broadcastManagement();
});

function sendClientInfos(client) {
    if (client === null || client === undefined) return;
    if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(client.infos));
    }
}

const ensureLbFileExists = () => {
    if (!fs.existsSync(lbFile)) {
        // Create the file with an initial empty array
        fs.writeFileSync(lbFile, JSON.stringify([], null, 2), 'utf8');
    }
};
ensureLbFileExists();

const webserver = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/leaderboard/edit/submit") {
        let body = "";
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const json = JSON.parse(body);
            if (json.action !== undefined && json.name !== undefined) {
                fs.readFile(lbFile, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Failed to read JSON file' }));
                    }
                    try {
                        let existingJson = JSON.parse(data);
                        if (json.action === "add" && json.name !== undefined && json.money !== undefined)
                            existingJson.push({ name: json.name, money: parseFloat(json.money) });
                        if (json.action === "edit" && json.name !== undefined && json.money !== undefined) {
                            const idx = existingJson.findIndex(p => p.name === json.name);
                            if (idx !== -1) existingJson[idx].money = json.money;
                        }
                        if (json.action === "delete" && json.name !== undefined) {
                            const idx = existingJson.findIndex(p => p.name === json.name);
                            if (idx !== -1) existingJson.splice(idx, 1);
                        }
                        console.log(existingJson);
                        fs.writeFile(lbFile, JSON.stringify(existingJson, null, 2), 'utf8', (err) => {
                            if (err) {
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                return res.end('Failed to write JSON file');
                            }
                            res.writeHead(200, { 'Content-Type': 'text/plain' });
                            res.end('Data updated successfully');
                        });
                    } catch (err) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Invalid JSON in request');
                    }
                });
            }
        })
        return; // bereits gehandelt
    }
    let filePath = path.join(managementDir, req.url.endsWith("/") ? req.url + 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'font/eot',
        '.otf': 'font/otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss_management = new WebSocket.Server({ port: webSocketManagementPort });
let managementClients = [];
wss_management.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace("::ffff:", "");
    const i = managementClients.findIndex(managementClient => managementClient.ip === ip);
    if (i !== -1) managementClients.slice(i, 1); // durch neue verbindung ersetzen
    managementClients.push({ ip: ip, ws: ws });
    const clientsCp = clients
        .filter(client => client.ws && client.ws.readyState === WebSocket.OPEN) // Filter clients
        .map(({ ws, ...rest }) => rest);
    ws.send(JSON.stringify(clientsCp));

    ws.on('message', (msg) => {
        msg = msg.toString();
        if (msg.startsWith("{")) {
            const recvJson = JSON.parse(msg);
            if (recvJson !== null && recvJson !== undefined) {
                if (recvJson.client !== undefined) {
                    const client = clients.find(client => client.name === recvJson.client);
                    if (client !== null && client !== undefined) {
                        if (recvJson.musik !== undefined)
                            client.infos.musik = recvJson.musik === true;
                        if (recvJson.ftp !== undefined)
                            client.infos.ftp = recvJson.ftp === true
                        if (recvJson.rtpmode !== undefined)
                            client.infos.rtp = recvJson.rtpmode === true ? 1 : gewinnmodusRtp;
                        if (recvJson.ksw !== undefined)
                            client.infos.killswitch = recvJson.ksw === true;
                        if (recvJson.cns !== undefined && client.ws !== undefined && client.ws.readyState === WebSocket.OPEN)
                            client.ws.send(`cns:${parseFloat(parseFloat(recvJson.cns).toFixed(2))}`);
                        if (recvJson.reload !== undefined) {
                            let hard = false;
                            if (recvJson.hardReload !== undefined) hard = recvJson.hardReload === true;
                            if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN)
                                client.ws.send(hard === true ? "R" : "r");
                        }
                        if (recvJson.nextJp !== undefined && client.ws !== undefined && client.ws.readyState === WebSocket.OPEN) {
                            if (recvJson.nextJp === true) client.ws.send("nextJP!?&§");
                        }

                        if (client.ws !== undefined && client.ws.readyState === WebSocket.OPEN)
                            client.ws.send(JSON.stringify(client.infos));
                    }
                } else {
                    if (recvJson.masterKsw !== undefined) {
                        clients.forEach((client) => {
                            client.infos.killswitch = recvJson.masterKsw === true;
                        });
                        broadcast();
                    }
                }
            }
        }
        broadcastManagement();
        broadcast();
    });

    ws.on('close', () => {
        ws.close();
    });
});

setInterval(broadcastManagement, 5000);

webserver.listen(managementPort, () => {
    console.log(`Server is running on http://localhost:${managementPort}`);
});

console.log(`WebSocket server is running on ws://localhost:${webSocketPort}`);

process.on('SIGINT', () => { // ctrl-c
    console.log('Abbruch, Server wird beendet...');
    process.exit();
});
process.on('SIGTERM', () => { // debugger stop
    console.log('Abbruch, Server wird beendet...');
    process.exit();
});
