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
    // $('.Form_Sub').click();
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
            console.log('login status: ' + status);
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
}

function socOpen(ev) {//* When socket is opened
    console.log('opening socket connection');
    $('#data').append('<br/>');
    var reqEst = {
        'action': 'establish',
        'key': sessionStorage.getItem('key')
    };
    socket.send(JSON.stringify(reqEst));
    $('#connectionstat').text('Connected');

    console.log('sending article request');
    const req = {
        'action': 'getArticles'
    };
    socket.send(JSON.stringify(req));
}

function socMessage(ev) {//* When message is received
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
                addMsg(response['data'][0]['newChat']['user'], response['data'][0]['newChat']['time'], response['data'][0]['newChat']['content'], response['data'][0]['newChat']['replyuser'], response['data'][0]['newChat']['replycontent']);
            } else {
                toastr.error('An error occurred while trying to add that message');
            }
            break;
        }
        case 'getchatresp': {
            console.log('Get chat response: ');
            if (response['status'] === 'success') {
                const artarr = response['data'];
                for (var a in artarr) {
                    console.log('getchat:\n', JSON.stringify(artarr[a], null, 4));
                    addMsg(artarr[a]['user'], artarr[a]['time'], artarr[a]['content'], artarr[a]['replyuser'], artarr[a]['replycontent']);
                }
            } else {
                toastr.error('An error occurred while trying to get messages for this article');
            }
            break;
        }
        case 'newMessages': {
            toastr.info('New message received!');
            console.log(JSON.stringify(response, null, 4));
            addMsg(response['data'][0]['user'], response['data'][0]['time'], response['data'][0]['content'], response['data'][0]['replyuser'], response['data'][0]['replycontent']);
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
    $('body').append($('<div id="chat_container">').html('<div class="close">X</div>'));
    $('.close').click((e) => {
        e.preventDefault;
        $('.close').parent().remove();
    });

    $('#chat_container').append([
        $('<div id="message_container">').html('<p>No messages have been added for this article...yet</p>'),
        $('<form id="chat_form">').html('<input type="text" id="msg_input" /> <input type="hidden" id="replyTime" value=null>'),
        $('<button id="sendMsg">').text('Send')
    ]);

    $('#sendMsg').click((e) => {
        e.preventDefault;
        if (!$('#reply_legend').length)
            $('#replyTime').val(null);
        sendMessage($('#msg_input').val(), inp, $('#replyTime').val());
    });

    const reqObj = {
        action: 'getchat',
        article: inp
    };
    socket.send(JSON.stringify(reqObj));
}

function sendMessage(cont, art, reptime = null) {
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
            reply: reptime
        }
    };
    console.log('sending Message: \n');
    socket.send(JSON.stringify(reqObj));
    $('#reply_legend').remove();
    return;
}

function addMsg(user, time, content, replyuser, replycontent) {
    $('#message_container').find('p').remove();
    $('#message_container').append('<div id="' + user + time + '" class="Msg">');
    if (replyuser != null && replycontent != null)
        $('#' + user + time).append($('<div class="reply">').html('Replying to: ' + replyuser + '~' + replycontent));
    $('#' + user + time).append($('<div class="uname">').text(user));
    $('#' + user + time).append($('<span class="tooltiptext">').html('Click on a message to reply to it'));
    $('#' + user + time).append($('<div class="timestamp">').text(convertNiceTimestamp(time)));
    $('#' + user + time).append($('<div class="unixtime">').text(time));
    $('#' + user + time).append($('<div class="msgcontent">').text(content));
    $('#message_container').append('<br>');
    $('#' + user + time).wrap($('<span class="tooltip">'));
    $('#message_container').scrollTop($('#message_container').height());
    $('#msg_input').val('');
    $('#' + user + time).click((e) => {
        e.preventDefault;
        createReply($('#' + user + time + ' .uname').text(), $('#' + user + time + ' .msgcontent').text(), $('#' + user + time + ' .unixtime').text());
    });
    return;
}

function createReply(Repuname, Repcontent, Reptime) {
    $('#reply_legend').html('');
    $('#reply_legend').remove();
    $('input:first').before($('<legend id="reply_legend">').html('<div class="close">X</div><div id="replyUname">' + Repuname + ':</div><div id="replyContent">' + Repcontent + '</div>'));
    $('#reply_legend .close').click((e) => {
        e.preventDefault;
        $('#reply_legend').remove();
        $('#replyTime').val(null);
    });
    $('#replyTime').val(Reptime);
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