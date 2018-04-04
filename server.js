const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");

const api = require("./api");
const Machine = require("./models/Machine");
const app = express();
const server = http.Server(app);
const io = require("socket.io")(server);

const URI = process.env.MONGODB_URI || "mongodb://localhost/marino";
const PORT = process.env.PORT || 4000;
mongoose.connect(URI);


io.on("connection", (socket) => {
  socket.on("machines", (msg) => {
    Machine.find({}, (err, machines) => {
      if (err) {
        socket.emit("io-error", err);
      } else {
        socket.emit("machines", machines);
      }
    })
  });
});


app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api", api);

app.use(express.static("./build"));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "build/index.html"));
});


server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
