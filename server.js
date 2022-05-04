// Janco Spies u21434159

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const clientFiles = ['/index.css', '/index.html', '/', '/index.js', '/favicon.ico'];

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
        else {
            console.log(req.url + ' not found, returning 404');
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.write('{"status" : "failed", "error" : "Not found"}');
            res.end();
            return;
        }
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
    console.log('user is connected to socket');
    ws.on('message', function incoming(data) {
        console.log('Message received: ' + data);
        ws.send("Message received by server");
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

