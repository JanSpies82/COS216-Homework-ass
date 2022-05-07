/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
// Janco Spies u21434159

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const request = require('request');
require('dotenv').config();
const clientFiles = ['/index.css', '/index.html', '/', '/index.js', '/favicon.ico', '/SiteLogo.svg', '/SiteLogo.png', '/testpage.html'];
const clients = new Set();
const jsdom = require('jsdom');
const dom = new jsdom.JSDOM('');
const $ = require('jquery')(dom.window);

////////////////////////////////////////////////////////////////////////* Main server code
// const prompt = require("prompt-sync")({ sigint: true });
// const PORT = prompt("Which port should the server use? ");
const PORT = 8321;

console.log('Starting Server on ' + PORT);
var lastuname = 'def';
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
    } else {//post request to log in 
        console.log('Received login request');
        var reqdata = '';
        req.on('data', function (d) {
            reqdata += d;
        });
        req.on('end', function () {
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
                    console.log('Login request failed: ' + body['data'][0]['message']);
                    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
                    res.write(JSON.stringify(body));
                    res.end();
                    return;
                }
                console.log('User ' + body['data'][0]['username'] + ' has logged in successfully');

                var r = {
                    'status': 'success',
                    'username': body['data'][0]['username'],
                    'key': body['data'][0]['api_key']
                };
                lastuname = body['data'][0]['username'];
                res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
                res.write(JSON.stringify(r));
                res.end();

            });
        });
    }

}).listen(PORT);
console.log('Listening on ' + PORT);
server.on('error', (e) => {
    console.log('server error ' + e.stack);
});

////////////////////////////////////////////////////////////////////////* Socket server code
const wss = new WebSocket.Server({ noServer: true });
server.on('upgrade', function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
        wss.emit('connection', ws, request);
    });
});
wss.on('connection', ws => {
    ws.id = lastuname;
    clients.add(ws);
    console.log(ws.id + ' is connected to socket');

    ws.on('message', function incoming(data) {
        var jData = JSON.parse(data);
        if (jData['action'] == 'establish') {//////////////////////* When server receives establish request
            var found = false;
            for (let c of clients)
                if (c.id === ws.id && jData.hasOwnProperty('key')) {
                    c.key = jData['key'];
                    found = true;
                }
            if (found) {
                console.log(ws.id + ' has established the connection and their key is set to ' + jData['key']);
                const resp = {
                    content: 'establish',
                    status: 'success'
                };
                ws.send(JSON.stringify(resp));
            } else {
                console.log(ws.id + ' has failed to establish a connection and has been disconnected');
                const resp = {
                    content: 'establish',
                    status: 'failed'
                };
                ws.send(JSON.stringify(resp));
                clients.delete(ws);
                ws.close();
            }



        } else if (jData['action'] == 'getArticles') {//////////////////////* When server receives getArticles request
            console.log('Recieved request from ' + ws.id + ' for articles');
            APIGetArticles((err, resp) => {
                if (err) {
                    console.log('Article request failed ' + err);
                    const errresp = {
                        content: 'articles',
                        status: 'failed'
                    };
                    ws.send(JSON.stringify(errresp));
                }
                else {
                    resp.content = 'articles';
                    ws.send(JSON.stringify(resp));
                }
            });

        } else if (jData['action'] == 'message') {//////////////////////* When server receives message request
            console.log('Message received: ' + jData['message']);
            for (let c of clients) {
                var repObj = {
                    'status': 'success',
                    'content': 'message',
                    'message': 'Message of ' + jData['message'] + ' from ' + ws.id + ' acknowledged by server'
                };
                c.send(JSON.stringify(repObj));
            }
        }
    });

    ws.on('close', function incoming(data) {
        console.log(ws.id + ' has disconnected');
        clients.delete(ws);
    });


});

////////////////////////////////////////////////////////////////////////* External API communication
function APIGetArticles(cb) {
    const jsonreq = {
        type: 'info',
        key: process.env.SERVERKEY,
        page: 'today',
        return: ['*'],
    };
    const options = {
        url: process.env.WURL,
        json: true,
        body: jsonreq,
        auth: {
            user: process.env.WUSERNAME,
            pass: process.env.WPASSWORD,
            sendImmediately: false
        }
    };

    request.post(options, (err, resp, body) => {
        if (err) {
            console.log(err);
            cb(false);
        }
        if (body['status'] != 'success') {
            console.log('Failed');
            cb(false);
        }
        console.log('getArticle status: ' + body['status']);
        // body.content = 'articles';
        cb(null, body);
    });
}

function APIaddChat(user, article, content, reply, cb) {
    const jsonreq = {
        type: 'chat',
        op: 'add',
        key: process.env.SERVERKEY,
        newMessage: {
            user: user,
            article: article,
            content: content,
            reply: reply,
        },
        return: [''],

    };

    $.ajax({
        url: process.env.WURL,
        type: 'POST',
        data: JSON.stringify(jsonreq),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        success: function (data) {
            console.log('addChat status: ' + data['status']);
            cb(null, data['data'][0]['message']);
            // console.log(JSON.stringify(data['data'][0].message, null, 4));
        },
        error: function (xhr, status, error) {
            console.log('Add chat api request failed');
            console.log('request:\n' + JSON.stringify(this, null, 4));
            cb(false);
        },
    });
}

function APIgetChat(article, cb) {
    const jsonreq = {
        type: 'chat',
        op: 'get',
        key: process.env.SERVERKEY,
        article: article,
        return: [''],

    };

    $.ajax({
        url: process.env.WURL,
        type: 'POST',
        data: JSON.stringify(jsonreq),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        success: function (data) {
            console.log('getChat status: ' + data['status']);
            cb(null, JSON.stringify(data['data']));
            // console.log(JSON.stringify(data['data'][0].message, null, 4));
        },
        error: function (xhr, status, error) {
            console.log('Get chat api request failed');
            console.log('request:\n' + JSON.stringify(this, null, 4));
            cb(false);
        },
    });
}
//////////////////////////////////////////////////////////////////////* Internal server commands 
process.stdin.addListener('data', data => {
    var strdata = data.toString();
    // console.log(strdata.includes("KILL"));
    if (isEq(strdata, 'LIST'))
        commandList();
    else if (isEq(strdata, 'QUIT'))
        commandQuit();
    else if (strdata.includes('KILL'))
        commandKill(strdata);
    else {
        console.log('Unrecognised command');
        // APIGetArticles();
        // APIaddChat('user1', 278, 'this is an article', null);
        // APIgetChat(123);
    }
});

function commandList() {
    console.log('All active connections:');
    if (clients.size == 0)
        console.log('none');
    else
        for (let c of clients)
            console.log(c.id);
}
function commandKill(c) {
    if (clients.size == 0) {
        console.log('There are currently no connected users');
        return;
    }
    var id = c.replace('KILL ', '').trim();
    for (let c of clients) {
        if (c.id === id) {
            c.send('You are being disconnected');
            c.close();
            clients.delete(c);
            return;
        }
    }
    console.log('User not found');
}
function commandQuit() {
    for (let c of clients) {
        c.send('This server will be going offline now and thus you will be disconnected');
        c.close();
        clients.delete(c);
    }
    console.log('All users have been disconnected and server will now go offline');
    process.exit();
}

////////////////////////////////////////////////////////////////////////* Helper functions

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
function getFile(name) {
    console.log('Getting ' + name);
    if (name == '/') {
        return fs.readFileSync('client_src/index.html');
    }
    if (name == '/index.js') {//Edit js file to account for dynamic port
        var oldf = fs.readFileSync('client_src/index.js');
        const pstr = /PORT\s=\s\d{4}/;
        var newValue = oldf.toString().replace(pstr, 'PORT = ' + PORT);
        fs.writeFileSync('client_src/index.js', newValue);
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