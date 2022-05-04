const PORT = 8800;
var socket = new WebSocket('ws://localhost:' + PORT);
socket.onopen = function () {
    socket.send('hello');
    $("#data").append("Connected<br/>");
    $("#data").append("Sending Hello <br/>");
};
socket.onmessage = function (s) {
    console.log(s);
    $("#data").append("Reply: " + s.data + "<br/><br/>");
};