// Janco Spies u21434159

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const events = require("events");
const clientFiles = ['/index.css', '/index.html', '/', '/index.js', '/favicon.ico'];
const clients = new Set();

// const prompt = require("prompt-sync")({ sigint: true });
// const PORT = prompt("Which port should the server use? ");
const PORT = 8321;

console.log('Starting Server on ' + PORT);

const server = http.createServer(function (req, res) {
    if (req.method == 'GET') //File request
    {
        if (clientFiles.includes(req.url)) //Valid file requests
        {
            var f = getFile(req.url);
            res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
            res.write(f);
            res.end();
        }
        // else {
        //     console.log(req.url + ' not found, returning 200');
        //     res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        //     res.write('{"status" : "failed", "error" : "Not found"}');
        //     res.end();
        //     return;
        // }
    }

}).listen(PORT);
console.log("Listening on " + PORT);

const wss = new WebSocket.Server({ noServer: true });
server.on('upgrade', function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    })
})
wss.on('connection', ws => {
    ws.id = "User" + (clients.size + 1);
    clients.add(ws);
    console.log(ws.id + ' is connected to socket');
    ws.on('message', function incoming(data) {
        console.log('Message received: ' + data);
        for (let c of clients)
            c.send("Message of " + data.toString().trim() + " from " + ws.id + " acknowledged by server");
    });

    ws.on('close', function incoming(data) {
        console.log(ws.id + ' has disconnected');
        clients.delete(ws);
    });
});





function getFile(name) {
    console.log('Getting ' + name);
    if (name == '/') {
        return fs.readFileSync('client_src/index.html');
    }
    if (name == "/index.js") {//Edit js file to account for dynamic port
        var oldf = fs.readFileSync('client_src/index.js');
        const pstr = /PORT\s=\s\d{4}/;
        var newValue = oldf.toString().replace(pstr, "PORT = " + PORT);
        fs.writeFileSync('client_src/index.js', newValue)
        console.log('Edited client js file');
        return fs.readFileSync('client_src/.' + name);
    } else if (clientFiles.includes(name)) {
        return fs.readFileSync('client_src/.' + name);
    }

}

process.stdin.addListener('data', data => {
    strdata = data.toString();
    // console.log(strdata.includes("KILL"));
    if (isEq(strdata, "LIST"))
        commandList();
    else if (isEq(strdata, "QUIT"))
        commandQuit();
    else if (strdata.includes("KILL"))
        commandKill(strdata);
    else console.log('Unrecognised command');
})

function commandList() {
    console.log("All active connections:")
    if (clients.size == 0)
        console.log("none");
    else
        for (let c of clients)
            console.log(c.id);
}

function commandKill(c) {
    if (clients.size == 0) {
        console.log("There are currently no connected users")
        return;
    }
    id = c.replace("KILL ", "").trim();
    for (let c of clients) {
        if (c.id === id) {
            c.send("You are being disconnected");
            c.close();
            clients.delete(c);
            return;
        }
    }
    console.log("User not found");
}

function commandQuit() {
    if (clients.size == 0)
        return;
    for (let c of clients) {
        c.send("This server will be going offline now and thus you will be disconnected");
        c.close();
        clients.delete(c);
    }
    console.log("All users have been disconnected and server will now go offline");
    process.exit();
}

function isEq(a, b) {
    var i = 0;
    var j = 0;
    var result = true;
    while (j < b.length) {
        if (a[i] != b[j] || i == a.length) {
            result = false;
        }
        else
            i++;
        j++;
    }
    return result;
}