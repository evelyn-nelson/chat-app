const WebSocket = global.WebSocket || require("WebSocket").default;

var socket = new WebSocket("ws://localhost:8080/ws");

const connect = (cb) => {
  console.log("connecting");
  socket.onopen = () => {
    console.log("connected");
  };
  socket.onmessage = (msg) => {
    console.log("msg: ", msg);
  };
  socket.onclose = (event) => {
    console.log("closed: ", event);
  };
  socket.onerror = (err) => {
    console.error("error: ", err);
  };
};

const sendMsg = (msg) => {
  socket.send(msg);
};

export { connect, sendMsg };
