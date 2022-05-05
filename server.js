// Janco Spies u21434159

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const request = require('request');
require('dotenv').config();
const clientFiles = ['/index.css', '/index.html', '/', '/index.js', '/favicon.ico', '/SiteLogo.svg', '/SiteLogo.png', '/testpage.html'];
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
            if ((req.url).toString().includes('svg'))
                res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'image/svg+xml' });
            else
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
    } else {//post request to log in 
        console.log('received post request');
        var reqdata = '';
        req.on("data", function (d) {
            reqdata += d;
        });
        req.on("end", function () {
            var pars = getParams(reqdata);
            pars.return = [''];
            const options = {
                url: process.env.WURL,
                json: true,
                body: pars,
                auth: {
                    user: process.env.WUSERNAME,
                    pass: process.env.WPASSWORD,
                    sendImmediately: false
                }
            };

            request.post(options, (err, resp, body) => {
                if (err) {
                    return console.log(err);
                }
                if (body['status'] != 'success') {
                    return console.log("Login request failed: " + body['data'][0]['message']);
                }
                console.log('User ' + body['data'][0]['username'] + ' has logged in successfully');
                var f = getFile('/testpage.html');
                res.writeHead(200, { 'Access-Control-Allow-Origin': '*', "Content-Type":'text/html'});
                res.write(f);
                res.end();

            });







        });
    }

}).listen(PORT);
console.log("Listening on " + PORT);
server.on('error', (e) => {
    console.log('server error ' + e.stack);
})

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
        // console.log('Edited client js file');
        return fs.readFileSync('client_src/.' + name);
    } else if (clientFiles.includes(name)) {
        return fs.readFileSync('client_src/.' + name);
    }

}

function getParams(string) {
    var pars = string.split('&');
    var res = {};
    for (var i = 0; i < pars.length; i++) {
        var p = pars[i].split('=');
        res[p[0]] = p[1];
    }

    return res;
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