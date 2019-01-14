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

export const sagaStepModel = mongoose.model('sagalogs', sagaStepSchema);



//enum : ['requestSent', 'requestCompleted', 'compensationRequestSent', 'compensationRequestCompleted'],