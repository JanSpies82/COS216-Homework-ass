const PORT = 8321;
var socket = new WebSocket('ws://localhost:' + PORT);
socket.onopen = function () {
    socket.send('hello');
    $("#data").append("Connected<br/>");
    $("#data").append("Sending Hello <br/>");

    $("#send").click(function (e) {
        e.preventDefault;
        var text = $("#message").val();
        socket.send(text);
        $("#data").append("Sending " + text + " <br/>");
    });
};
socket.onmessage = function (s) {
    console.log(s);
    $("#data").append("Reply: " + s.data + "<br/><br/>");
};

socket.onclose = function (e) {
    $("#data").append("Connection lost<br/><br/>");
}
