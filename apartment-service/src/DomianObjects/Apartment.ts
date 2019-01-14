import * as mongoose from 'mongoose';

const apartmentSchema = new mongoose.Schema({
    apartmentId: String,
    apartmentName: String,
    isBooked: Boolean,
  });

export const apartmentModel = mongoose.model('apartments', apartmentSchema);
