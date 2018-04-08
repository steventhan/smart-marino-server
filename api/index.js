const api = require("express").Router();
const jsonParser = require("body-parser").json();
const moment = require("moment");
const mongoose = require("mongoose");

const Machine = require("../models/Machine");
const Reservation = require("../models/Reservation");

const machines = require("./fake-data");

api.use(jsonParser);


api.use((req, res, next) => {
  if (!req.query.user && !req.body.user) {
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


let isReserved = (start, end, reservations) => {
  return reservations.reduce((acc, cur) => {
    let rezStart = moment(cur.start);
    let rezEnd = moment(cur.end);
    return (((start >= rezStart && start < rezEnd)
            || (end > rezStart && end <= rezStart))
            && cur.status === "upcoming") || acc;
  }, false);
}

api.get("/machines/:machineId/reservation", (req, res) => {
  let now = moment();

  Reservation.findOne({
    "machine": { _id: req.params.machineId },
    status: { $in: ["upcoming", "started"] },
    start: { $lte: now.toDate() },
    end: { $gte: now.toDate() },
  }).exec((err, rez) => {
    if (err) {
      return res.status(400).send(err);
    }
    if (!rez) {
      return res.sendStatus(404);
    }
    return res.send({
      start: moment(rez.start).format(),
      end: moment(rez.end).format(),
      status: rez.status
    });
  });
});


api.post("/qr", (req, res) => {
  let now = moment();

  Reservation.findOne({
    "machine": { _id: req.body.machine },
    status: "upcoming",
    user: req.body.user,
    start: { $lte: now.toDate() },
    end: { $gte: now.toDate() },
  }).exec((err, rez) => {
    if (err) {
      console.log(err);
      return res.status(400).send(err);
    }
    if (!rez) {
      return res.sendStatus(404);
    }
    rez.status = "started";
    rez.save((err, rez) => res.send(rez));
  });
});

api.get("/machines/:machineId/time-slots/:date", (req, res) => {
  let startOfDay = moment(req.params.date).startOf("day");
  let endOfDay = moment(req.params.date).endOf("day");

  Reservation.find({
    "machine": { _id: req.params.machineId },
    $or : [
      { start: { $gte: startOfDay.toDate(), $lt: endOfDay.toDate() } },
      { end: { $gt: startOfDay.toDate(), $lte: endOfDay.toDate() } },
    ]
  }).exec((err, reservations) => {
      if (err) {
        return res.sendStatus(400);
      }
      let results = [];
      let start = startOfDay;

      while (start < endOfDay) {
        let twentyMins = moment(start).add(20, "m");
        results.push({
          start: start.format(),
          end: twentyMins.format(),
          reserved: isReserved(start, twentyMins, reservations)
        });
        start = twentyMins;
      }
      res.send(results);
    });
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
  Reservation.find({ user: req.query.user })
    .populate("machine")
    .sort({ start: "asc" })
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
  let now = moment().subtract(20, "m");
  let start = moment(req.body.start);
  let end = moment(req.body.end)

  if (start < now || end <= start) {
    return res.status(400).send("Invalid time range");
  }

  Reservation.find({
    "machine": { _id: req.body.machine },
    "status": "upcoming",
    $or: [
      {
        start: { $gte: start.toDate(),  $lt: end.toDate() }
      },
      {
        end: { $gt: start.toDate(), $lte: end.toDate() }
      }
    ]
  }, (err, reservations) => {
    if (err) {
      return res.sendStatus(400);
    }
    if (reservations.length > 0) {
      return res.status(400).send("Time range no longer available");
    }
    Reservation.create({...req.body, status: "upcoming"})
      .then(created => {
        Reservation.populate(created, {path: "machine"}, (err, c) => {
          if (err) {
            res.status(400).send(err);
          }
          created.machine.reservations.push(c._id);
          created.machine.save();
          res.send(created);
        });
      })
      .catch(err => {
        res.send(err);
      });
  });
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


api.patch("/reservations/:id", (req, res) => {
  Reservation.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), user: req.body.user })
    .exec((err, rez) => {
      if (err) {
        return res.status(400).send(err);
      } else if (!rez) {
        return res.sendStatus(404);
      }
      rez.status = req.body.status;
      rez.save((err, saved) => res.send(saved));
    });
});


api.delete("/reservations/:id", (req, res) => {
  Reservation.findOne({_id: new mongoose.Types.ObjectId(req.params.id), user: req.body.user })
    .populate("machine")
    .exec((err, rez) => {
      if (err) {
        return res.status(400).send(err);
      } else if (!rez) {
        return res.sendStatus(404);
      }
      let index = rez.machine.reservations.indexOf(rez._id);
      rez.machine.reservations.splice(index, 1);
      rez.machine.save();
      rez.remove((err, rez) => {
        if (err) {
          res.status(400).send(err);
        }
        res.sendStatus(200);
      });
    });
});

module.exports = api;
