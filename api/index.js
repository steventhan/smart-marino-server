const api = require("express").Router();
const jsonParser = require("body-parser").json();
const moment = require("moment");
const mongoose = require("mongoose");

const Machine = require("../models/Machine");
const Reservation = require("../models/Reservation");

const machines = require("./fake-data");

api.use(jsonParser);


api.use((req, res, next) => {
  if (!req.query.userId && !req.body.userId) {
    return res.sendStatus(400);
  }
  next();
});


api.get("/hours", (req, res) => {
  res.send({
    "today": moment().format("YYYY-MM-DD"),
    "open": "8:00",
    "close": "1:00"
  });
});


api.get("/machines", (req, res) => {
  Machine.find({}, (err, machines) => {
    if (err) {
      res.sendStatus(400);
    }
    res.send(machines);
  })
});


api.post("/machines", (req, res) => {
  Machine.create(req.body)
    .then(machine => {
      res.send(machine);
    })
    .catch(err => {
      res.send(err);
    })
});


api.get("/machines/:id", (req, res) => {
  Machine.findById(req.params.id)
    .populate("reservation")
    .exec((err, machine) => {
      if (err) {
        return res.sendStatus(400);
      } else if (!machine) {
        return res.sendStatus(404);
      }
      res.send(machine);
    });
});


api.get("/reservations", (req, res) => {
  Reservation.find({userId: req.query.userId})
    .populate("machine")
    .exec((err, rev) => {
      if (err) {
        return res.send(err, 400);
      } else if (!rev) {
        return res.sendStatus(404);
      }
      res.send(rev);
    });
});


api.post("/reservations", (req, res) => {
  Reservation.create(req.body)
    .then(rev => {
      Reservation.populate(rev, {path: "machine"}, (err, rev) => {
        rev.machine.reservations.push(rev);
        rev.machine.save();
        res.send(rev);
      })
    })
    .catch(err => {
      res.send(err);
    })
});

api.get("/reservations/:id", (req, res) => {
  Reservation.findById(new mongoose.Types.ObjectId(req.params.id))
    .populate("machine")
    .exec((err, rev) => {
      if (err) {
        return res.send(err, 400);
      } else if (!rev) {
        return res.sendStatus(404);
      }
      res.send(rev);
    });
});


api.delete("/reservations/:id", (req, res) => {
  Reservation.findOne({_id: new mongoose.Types.ObjectId(req.params.id), userId: req.body.userId})
    .populate("machine")
    .exec((err, rev) => {
      if (err) {
        return res.send(err, 400);
      } else if (!rev) {
        return res.sendStatus(404);
      }
      let index = rev.machine.reservations.indexOf(rev._id);
      rev.machine.reservations.splice(index, 1);
      rev.machine.save()
      rev.remove((err, rev) => {
        res.sendStatus(200);
      });
    });
});

module.exports = api;

  // Machine.findById(req.params.id, (err, machine) => {
  //   if (err) {
  //     console.log(err);
  //     return res.sendStatus(400);
  //   } else if (!machine) {
  //     return res.sendStatus(404);
  //   }
  //   let userId = req.body.userId;
  //   let date = req.body.date;
  //   let timeSlots = req.body.timeSlots.map((s, i) => {
  //     if (s) {
  //       return userId;
  //     }
  //   });
  //   // if (!machine[date]) {
  //   //   machine[date] =
  //   //
  //   // }
  //   return res.send(machine);
  //
  //
  //   // req.io.emit("machines", machines);
  // })
