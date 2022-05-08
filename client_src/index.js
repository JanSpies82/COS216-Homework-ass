/* eslint-disable no-useless-escape */
/* eslint-disable indent */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
/* eslint-disable no-undef */

$(document).ready(function (e) {
    sessionStorage.setItem('username', null);
    sessionStorage.setItem('key', null);

    $('body').append($('<div class="title_header">').append($('<h1>News4You Chatpage</h1><img id="logo" src="SiteLogo.svg" alt="Logo" height="64" width="64"/>')));
    $('body').append($('<div>', { id: 'centered_div' }));
    $('#centered_div').append('<form id="login_form" name="login_form"></form>');
    $('#login_form').append($('<legend>').text('Enter your details to log in'));
    $('#login_form').append($('<p id="error_lbl">'));
    $('#login_form').append($('<p>').html('<label class="form_lb" for="Username"> Username/Email: </label><input required class="Form_input" type="text" name="Username" id="usernamein">'));
    $('#login_form').append($('<p>').html('<label class="form_lb" for="Pass">Password: </label><input required class="Form_input" type="password" name="Pass" id="passwordin">'));
    $('#login_form').append($('<p>').html('<input class="Form_Sub" type="button" value="Submit" onclick="login()"/>'));
    $('legend').click(function (e) {
        $('#usernamein').val('DefaultUser');
        $('#passwordin').val('Password123!');
    });

    toastr.options.closeButton = true;

    //!Testing code
    $('legend').click();
    $('.Form_Sub').click();
});

function login() {
    $('#error_lbl').text('');
    let fdata = new FormData($('#login_form')[0]);
    let jsonreq = Object.fromEntries(fdata.entries());
    jsonreq.type = 'login';
    $.post(
        'http://localhost:' + PORT + '/',
        jsonreq,
        function (data, status) {
            console.log('status: ' + status);
            if (data['status'] !== 'success') {
                $('#error_lbl').text('Login failed : ' + data['data'][0]['message']);
                return;
            }
            sessionStorage.setItem('username', data['username']);
            sessionStorage.setItem('key', data['key']);
            setMainWindow();
        }
    );
}


const PORT = 8321;
var socket;
function setMainWindow() {
    $(document).attr('title', 'News4You Chatpage');
    $('#centered_div').empty();
    $('#centered_div').append($('<button id="reconnect">').text('Reconnect'), $('<button id="disconnect">').text('Disconnect'));
    $('#centered_div').append($('<h2 id="connectionstat">'));
    $('#centered_div').append($('<div id="data">'));
    $('#centered_div').append($('<form id="messagefrm">').append('<input type="text" name="message" id="message" /><button id="send">Send</button>'));
    $('#centered_div').append($('<button id="getArt">Get articles</button>'));
    reconnect();
}

function reconnect() {
    $('#connectionstat').text('Attempting to reconnect');
    try {
        socket.close();
    } catch (e) { }

    socket = new WebSocket('ws://localhost:' + PORT);
    socket.onopen = socOpen;
    socket.onmessage = socMessage;
    socket.onclose = socClose;
    $('#send').on('click', function (e) {
        e.preventDefault;
        console.log('sending');
        var text = $('#message').val();
        if (text.length == 0)
            return;
        var messObj = {
            'action': 'message',
            'message': text
        };

        socket.send(JSON.stringify(messObj));
        $('#data').append('Sending ' + text + ' <br/>');
        return false;

    });
    $('#disconnect').on('click', function (e) {
        e.preventDefault;
        socket.close();
    });
    $('#reconnect').on('click', function (e) {
        e.preventDefault;
        reconnect();
    });
    $('#getArt').click((e) => {
        e.preventDefault;
        console.log('sending article request');
        const req = {
            'action': 'getArticles'
        };
        socket.send(JSON.stringify(req));
    });


}

function socOpen(ev) {//* When socket is opened
    console.log('opening');
    $('#disconnect').attr('disabled', false);
    $('#reconnect').attr('disabled', false);
    $('#data').append('<br/>');
    var reqEst = {
        'action': 'establish',
        'key': sessionStorage.getItem('key')
    };
    socket.send(JSON.stringify(reqEst));
    $('#connectionstat').text('Connected');

    //!Testing code
    $('#getArt').click();
}

function socMessage(ev) {//* When message is received
    console.log(ev);
    var response = JSON.parse(ev.data);
    switch (response['content']) {
        case 'establish':
            {
                console.log('received establish response');
                break;
            }
        case 'articles':
            {
                console.log('received getarticle response');
                setArticles(response);
                break;
            }
        case 'message': {
            $('#data').append('Reply: ' + response['message'] + '<br/><br/>');
            console.log('received message response');
            break;
        }
        case 'chatresp': {
            if (response['status'] === 'success') {
                addMsg(response['data'][0]['newChat']['user'], response['data'][0]['newChat']['time'], response['data'][0]['newChat']['content'], response['data'][0]['newChat']['reply']);
            } else {
                toastr.error('An error occurred while trying to add that message');
            }
            break;
        }
        case 'getchatresp': {
            console.log('received: ');
            console.log(response);
            if (response['status'] === 'success') {
                const artarr = response['data'];
                console.log(artarr);
                for (var a in artarr) {
                    console.log('a: ' + a);
                    addMsg(artarr[a]['user'], artarr[a]['time'], artarr[a]['content'], artarr[a]['reply']);
                }
            } else {
                toastr.error('An error occurred while trying to get messages for this article');
            }
            break;
        }
        default:
            {
                console.log('received unknown response: ' + response['action']);
                break;
            }
    }
}

function socClose(ev) {//* When socket is closed
    $('#data').append('Connection lost<br/><br/>');
    $('#disconnect').attr('disabled', true);
    $('#reconnect').attr('disabled', false);
    $('#connectionstat').text('Disconnected');
}

function setArticles(data) {
    $('#centered_div').remove();
    $('body').append($('<div id="articles" class="main_content">'));

    var author = [];
    var title = [];
    var description = [];
    var url = [];
    var img = [];
    var publishedDate = [];
    var category = [];
    var count = 0;
    var articles = data['data'];
    for (var i in articles) {
        title.push(articles[i].title);
        description.push(articles[i].description);
        url.push(articles[i].url);
        img.push(articles[i].image_url);
        publishedDate.push(articles[i].date);
        author.push(articles[i].source);
        category.push(articles[i].category);


        $('#articles').append($('<div class="article_box" id="box' + count + '">'));
        $('#box' + count).append([
            $('<img class="article_img" alt="article image" src="' + articles[i].image_url + '"/>'),
            $('<div class="headline_container">').html('<h1 class="headline"><a class="headline_link" target="_blank" onclick="openArt(\'' + articles[i].url + '\')">' + articles[i].title + '</a></h1><br /><br /><br />'),
            $('<p class="description" >').text((articles[i].description.length == 0) ? 'None' : articles[i].description),
            $('<div class="bottom_el">').append($('<div class="bottom_left_el">'))
        ]);
        $('.bottom_left_el').html('<p class="author">Author:' + articles[i].source + '</p><p class="category">Category: ' + articles[i].category + '</p><p class="date">' + convertTimestamp(articles[i].date) + '</p>');
        count++;

    }
}

function openArt(inp) {
    console.log('clicked ' + inp);
    $('body').append($('<div id="chat_container">').html('<div class="close">X</div>'));
    $('.close').click((e) => {
        e.preventDefault;
        $('.close').parent().remove();
    });

    $('#chat_container').append([
        $('<div id="message_container">').html('<p>No messages have been added for this article...yet</p>'),
        $('<form id="chat_form">').html('<input type="text" id="msg" />'),
        $('<button id="sendMsg">').text('Send')
    ]);

    $('#sendMsg').click((e) => {
        e.preventDefault;
        sendMessage($('#msg').val(), inp);
    });

    console.log('opened art');
    const reqObj = {
        action: 'getchat',
        article: inp
    };
    socket.send(JSON.stringify(reqObj));
}

function sendMessage(cont, art) {
    if (cont == '') {
        toastr.error('Please enter the message you would like to send');
        $('input:first').focus();
        return;
    }
    const reqObj = {
        action: 'sendchat',
        newChat: {
            user: sessionStorage.getItem('key'),
            article: art,
            content: cont,
            reply: null
        }
    };
    socket.send(JSON.stringify(reqObj));
    return;
}

function addMsg(user, time, content, reply) {
    $('#message_container').find('p').remove();
    $('#message_container').append('<div id="' + user + time + '" class="Msg">');
    $('#' + user + time).append($('<div class="uname">').text(user));
    $('#' + user + time).append($('<div class="timestamp">').text(convertNiceTimestamp(time)));
    $('#' + user + time).append($('<div class="msgcontent">').text(content));
    $('#message_container').append('<br>');
    $('#message_container').scrollTop($('#message_container').height());
    $('#msg').val('');
    return;
}

function convertTimestamp(timestamp) {
    var d = new Date(timestamp * 1000),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2);
    var time = yyyy + '-' + mm + '-' + dd;
    return time;
}

function convertNiceTimestamp(stamp) {
    const milliseconds = stamp * 1000;
    const dateObject = new Date(milliseconds);
    const humanDateFormat = dateObject.toLocaleString();
    return humanDateFormat;
}

function xssencode(input) {
    var returned = input.replace(/<[^>]*>/g, '');
    return returned.replace(/[-\[\]{@&!%}\(_=\'\"\)<>\*\+\?.,\^\$|#]/g, '\\$&');
}

function xssdecode(input) {
    if (input !== null)
        return input.replace(/\\/, '');
    return null;
}