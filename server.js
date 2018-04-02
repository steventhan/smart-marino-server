const express = require("express");
const http = require("http");
const mongoose = require("mongoose");

const api = require("./api");
const Machine = require("./models/Machine");
const app = express();
const server = http.Server(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 4000;
mongoose.connect("mongodb://localhost/marino");


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


server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
