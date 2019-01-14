import * as mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
    carId: String,
    carName: String,
    isBooked: Boolean,
  });

export const carModel = mongoose.model('cars', carSchema);
