const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MachineSchema = new Schema({
  _id: {
    type: Number,
    require: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reservations: [{ type: Schema.Types.ObjectId, ref: "Reservation" }]
});

const Machine = mongoose.model("Machine", MachineSchema);

module.exports = Machine;
