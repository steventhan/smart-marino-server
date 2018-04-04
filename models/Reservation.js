const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  machine: { type: Number, ref: "Machine", required: true },
  user: { type: String, required: true },
  status: { type: String, required: true }
});

const Reservation = mongoose.model("Reservation", ReservationSchema);

module.exports = Reservation;
