// NOTE: THIS IS FOR EXPLANATION ONLY
// IT IS NOT BEING USED IN THE CODE
const http = require("http");
const WebSocket = require("ws");

const PORT = 3001;

// Create a HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Websocket Server Running");
});

// Create a WebSocket Server
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(JSON.stringify({ message: "Hello from websocket.js!" }));

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server UP & RUNNING on Port ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
