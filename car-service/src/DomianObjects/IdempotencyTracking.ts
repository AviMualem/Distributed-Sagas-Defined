import * as mongoose from 'mongoose';

const idempotencyTrackingSchema = new mongoose.Schema({
    idempotencyKey: String,
    actionWasDone: Boolean,
  });

export const idempotencyTrackingModel = mongoose.model('idempotencytrackingscars', idempotencyTrackingSchema);
