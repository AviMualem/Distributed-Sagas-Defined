import * as mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
    restaurantId: String,
    restaurantName: String,
    isBooked: Boolean,
  });

export const restaurantModel = mongoose.model('restaurants', restaurantSchema);
