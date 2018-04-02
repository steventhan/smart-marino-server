const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
  date: { type: Date, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  machine: { type: Number, ref: "Machine", required: true },
  userId: { type: String, required: true },
});

const Reservation = mongoose.model('Revservation', ReservationSchema);

module.exports = Reservation;
