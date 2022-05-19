/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
// Janco Spies u21434159

const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const request = require('request');
require('dotenv').config();
const clientFiles = ['/index.css', '/index.html', '/', '/index.js', '/favicon.ico', '/SiteLogo.svg', '/SiteLogo.png', '/testpage.html', '/toastr.min.js', '/toastr.min.css'];
const clients = new Set();
const jsdom = require('jsdom');
const dom = new jsdom.JSDOM('');
const $ = require('jquery')(dom.window);

////////////////////////////////////////////////////////////////////////* Main server code
const prompt = require('prompt-sync')({ sigint: true });
const PORT = prompt('Which port should the server use? ');
// const PORT = 8321;

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
var synctimer = null;
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
        else if (jData['action'] == 'sendchat') {
            console.log('Recieved request from ' + ws.id + ' to send chat');
            APIaddChat(jData['newChat']['user'], jData['newChat']['article'], jData['newChat']['content'], jData['newChat']['reply'], (err, resp) => {
                if (err) {
                    console.log('Add chat ' + err);
                    const errresp = {
                        content: 'chatresp',
                        status: 'failed'
                    };
                    ws.send(JSON.stringify(errresp));
                }
                else {
                    if (resp == null) {
                        console.log('resp is null');
                        const errresp = {
                            content: 'chatresp',
                            status: 'failed'
                        };
                        ws.send(JSON.stringify(errresp));
                    } else if (resp == false) {
                        console.log('resp is false');
                        const errresp = {
                            content: 'chatresp',
                            status: 'failed'
                        };
                        ws.send(JSON.stringify(errresp));
                    } else {
                        resp.content = 'chatresp';
                        ws.send(JSON.stringify(resp));
                        ws.lasttime = resp.timestamp;
                    }
                }
            });
        }
        else if (jData['action'] == 'getchat') {
            console.log('Recieved request from ' + ws.id + ' to get chats');
            ws.currart = jData['article'];
            ws.lasttime = Math.floor(Date.now() / 1000);
            APIgetChat(jData['article'], (err, resp) => {
                if (err) {
                    console.log('Get chat ' + err);
                    const errresp = {
                        content: 'getchatresp',
                        status: 'failed'
                    };
                    ws.send(JSON.stringify(errresp));
                }
                else {
                    if (resp == null) {
                        console.log('resp is null');
                        const errresp = {
                            content: 'getchatresp',
                            status: 'failed'
                        };
                        ws.send(JSON.stringify(errresp));
                    } else if (resp == false) {
                        console.log('resp is false');
                        const errresp = {
                            content: 'getchatresp',
                            status: 'failed'
                        };
                        ws.send(JSON.stringify(errresp));
                    } else {
                        resp.content = 'getchatresp';
                        ws.send(JSON.stringify(resp));
                    }
                }
            });
            if (synctimer === null)
                synctimer = setInterval(() => sync(), 5000);
        }

        function sync() {
            for (let c of clients) {
                if (c.currart != null && c.lasttime != null) {
                    APIsyncMessages(c.currart, c.lasttime, (err, resp) => {
                        if (c.lasttime < Math.floor(Date.now() / 1000))
                            c.lasttime = Math.floor(Date.now() / 1000);
                        if (err) {
                            console.log('Sync chat ' + err);
                        }
                        else {
                            if (resp == null) {
                                console.log('Sync for ' + c.id + ' is null');
                            } else if (resp == false) {
                                console.log('Sync for ' + c.id + ' is false');
                            } else if (resp['data']['SyncStatus'] == 'outofdate') {
                                resp.content = 'newMessages';
                                const jsonReq = {
                                    content: 'newMessages',
                                    data: resp['data']['NewMess']
                                };

                                c.send(JSON.stringify(jsonReq));
                            }
                        }
                    });
                }
            }
        }
    });

    ws.on('close', function incoming(data) {
        console.log(ws.id + ' has disconnected');
        clients.delete(ws);
        if (clients.size === 0 && synctimer != null) {
            clearInterval(synctimer);
            synctimer = null;
        }
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
        cb(null, body);
    });
}

function APIsyncMessages(article, time, cb) {
    const jsonreq = {
        type: 'chat',
        key: process.env.SERVERKEY,
        op: 'sync',
        url: article,
        timestamp: time,
        return: [''],
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
            console.log('Sync Failed');
            cb(false);
        }
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
        console.log('addChat status: ' + body['status']);
        if (body['status'] != 'success') {
            console.log(body['data'][0]['message']);
            cb(false);
        } else {
            cb(null, body);
        }
    });
}

function APIgetChat(article, cb) {
    const jsonreq = {
        type: 'chat',
        op: 'get',
        key: process.env.SERVERKEY,
        url: article,
        return: [''],

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
        console.log('getChat status: ' + body['status']);
        if (body['status'] != 'success') {
            console.log(body['data'][0]['message']);
            cb(false);
        } else {
            cb(null, body);
        }
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
            const mess = {
                content: 'Connection',
                action: 'KILL'
            };
            c.close(1000, 'Connection has been closed');
            clients.delete(c);
            return;
        }
    }
    console.log('User not found');
}
function commandQuit() {
    for (let c of clients) {
        c.close(1001, 'Server is shutting down');
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