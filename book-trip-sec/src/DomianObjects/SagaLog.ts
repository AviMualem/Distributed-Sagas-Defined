import * as mongoose from "mongoose";

const sagaStepSchema = new mongoose.Schema({
    sagaId: String,
    date:Date,
    httpCode:Number,
    serviceWasUnreachable:Boolean,
    serviceName:String,
    // serviceName:
    // {
    //   type: String,
    //   enum : ['carService', 'apartmentService', 'restaurantService'],
    // },
    status: {
      type: String,
      enum : ['transactionCommunicationStarted', 'transactionCommunicationEnded', 'compensationCommunicationStarted', 'compensationCommunicationEnded'],
  }
  });


  //By providing a unique index aroung sagaId serviceName and status we are protecting a non valid state.
sagaStepSchema.index({sagaId: 1,serviceName:1, status: 1}, {unique: true, name: 'service_interaction_uniqueness'});
export const sagaStepModel = mongoose.model('sagalogs', sagaStepSchema);



//enum : ['requestSent', 'requestCompleted', 'compensationRequestSent', 'compensationRequestCompleted'],