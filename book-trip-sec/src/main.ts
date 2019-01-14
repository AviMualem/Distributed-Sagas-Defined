import { sagaStepModel } from './DomianObjects/SagaLog';
import * as mongoose from 'mongoose';
import process = require('process');
import { throws } from 'assert';
import { SocketTimeoutError } from './CustomErrors/SocketTimeoutError';
import { ConnectionRefusedError } from './CustomErrors/ConnectionRefusedError';
import { EOVERFLOW } from 'constants';
import { InvokeHttpPostMethod, HttpRequestDetails } from './HttpUtil';
import { ServiceInteractionManager } from './serviceIntegration';
import { checkForMessages } from './azureServiceBusIntegration';
// import { bootstrap } from 'main';
import{InvokeSagaTransactionsLogic,InvokeSagaBackwordsRecoveryLogicFinal} from './SagaFlowManager';
// tslint:disable-next-line:no-var-requires
const azure = require('azure-sb');
// tslint:disable-next-line:no-var-requires
const request = require('request');
const rp = require('request-promise');
import{InitDbConnection} from './mongoDbIntegration'
import{bootstrap} from './bootstrapperManager';

// export async function bootstrap()
//  {
//     await InitDbConnection();

//     // require('dotenv').config();
//     // const uri = process.env.mongo_connection_string;
//     // await mongoose.connect(uri);
//     // const mongoDbConnection = mongoose.connection;
//     // const coll = await mongoDbConnection.db.listCollections().toArray();
//     // const sagaLogCollection = coll.find(x => x.name === 'sagalogs');
//     // if  (sagaLogCollection === undefined) {

//     //     await mongoDbConnection.createCollection('sagalogs');
//     // }
   
//     //bus integration.!!
//     const sbService = azure.createServiceBusService('Endpoint=sb://avitests.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=KdYr6P7yknynQRbEs5KoIVQoGsXpZMruxK6Doxu/lDQ=');
//     (checkForMessages.bind(null, sbService, 'avi'), 200);
// }

// export async function InvokeSagaTransactionsLogic(serviceDetails:ServiceInteractionManager[]) : Promise<any>
// {
//   // in backwards recovery sagas, this method will be called only once due to the fact that after a first failure only compensation mode will be executed.
//   let servicesThatCompletedSuccessfully: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
//   //During transaction mode a single failure (HTTP code which isnt 200 \ Connection refused will lead to compensation logic to be invoked.
//   //var failureDetectedDuringTxMode = false;
//   var failureDetectedDuringTxMode =false;
//   for(let i=0; i<serviceDetails.length; i++)
//   {
//     try
//     {
//       var httpResCode:number;
//       await serviceDetails[i].LogTransactionCommunicationStartedEvent();
//       httpResCode = await serviceDetails[i].InvokeTransactionLogicAndLogCommunicationEndedEvent();
//       if (httpResCode === 200)
//       {
//         servicesThatCompletedSuccessfully.push(serviceDetails[i]);
//       }
//       else
//       {
//         //HTTP code different than 200 should state the sage to start compensating services that returned 200.
//         failureDetectedDuringTxMode=true;
//         break;
//       }
//     }
//     catch (error)
//     {
//       if(error instanceof ConnectionRefusedError)
//       {
//         //When Running the saga for the first time connection refused (service is down) is valid as a result for CommunicationEnded event.
//         await serviceDetails[i].LogTransactionCommunicationEndedWithConnectionRefusedEvent();
//       }
//       failureDetectedDuringTxMode=true;
//       break;
//     }
//   }

//   if (servicesThatCompletedSuccessfully.length > 0 && failureDetectedDuringTxMode)
//   {
//     // This condition is met in 2 scenarios:
//     // 1. a service within the saga returned http code other than 200
//     // 2. a technical failure was detected in a service call (connection refused)
//     // during the compensation logic the saga logic will try to compensate as much services as possible.
//     var failureDetectedDuringCompensation = false;
//     for(let j=0; j<servicesThatCompletedSuccessfully.length; j++)
//     {
//       try
//       {
//         await serviceDetails[j].LogCompensationCommunicationStartedEvent();
//         await serviceDetails[j].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
//       }
//       catch
//       {
//         failureDetectedDuringCompensation = true;
//       }
//     }

//     if(failureDetectedDuringCompensation)
//     {
//       throw new Error('saga compensation logic failed / partially succeded .')
//     }
//   }
// }

// export async function InvokeSagaBackwordsRecoveryLogicFinal(sagaId:string, serviceDetails:ServiceInteractionManager[], sagaLog) :Promise<any>
// {
//   var failureDetectedDuringCompensation : boolean = false;

//   for(let i=0; i<serviceDetails.length; i++)
//   {
//     try
//     {
//       const relevantLog = sagaLog.filter(x=>x["serviceName"] ===serviceDetails[i].serviceName);

//       // Checking to see if the saga was interacting with the service in the past.
//       // in cases where no interaction was made, no need for any kind of action to assure compensation.
//       // in cases this conidition passes we know for a fact that a request sent entry has been saved in the database because it the first log entry for service communication. 
//       if (relevantLog.length > 0)
//       {
//           const compensationCommunicationEndedEventExist = relevantLog.filter(x => x["status"] === "compensationCommunicationEnded").length === 1;
//           const compensationCommunicationStartedEventExist = relevantLog.filter(x => x["status"] === "compensationCommunicationStarted").length === 1;
//           const transactionCommunicationEndedEventExist = relevantLog.filter(x => x["status"] === "transactionCommunicationEnded").length === 1;
//           var transactionCommunicationEndedEvent;
//           var transactionEndedWithConnectionRefused :boolean;
//           var transactionEndedWithNonSuccessfulHttpCode :boolean;
//           var transactionEndedWithSuccessfulHttpCode:boolean;
//           if (transactionCommunicationEndedEventExist)
//           {
//             transactionCommunicationEndedEvent = relevantLog.filter(x => x["status"] === "transactionCommunicationEnded")[0];
//             transactionEndedWithConnectionRefused =  transactionCommunicationEndedEvent.serviceWasUnreachable === true;
//             transactionEndedWithNonSuccessfulHttpCode = transactionCommunicationEndedEvent.hasOwnProperty('httpCode') && transactionCommunicationEndedEvent.httpCode!=200;
//             transactionEndedWithSuccessfulHttpCode = transactionCommunicationEndedEvent.hasOwnProperty('httpCode') && transactionCommunicationEndedEvent.httpCode===200;
//           }
//           // compensation should be invoked only for service that are NOT met with ANY of these conditions.
//           // 1. service compensation logic was ended.
//           // 2. service has transactionCommunicationEnded event with code different than 200.
//           // 3. service has transactionCommunicationEnded event with connection refused status.
//           if(!compensationCommunicationEndedEventExist && !(transactionEndedWithNonSuccessfulHttpCode) && !(transactionEndedWithConnectionRefused))
//           {
//               if(compensationCommunicationStartedEventExist)
//               {
//                 // Compenstaion communication allready been initiated. so now it just need to be replayed again. 
//                 await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
//               }
//               else if (transactionEndedWithSuccessfulHttpCode)
//               {
//                 // service has a transactionCommunication ended with http code 200 and compensation is being invoked for the first time.
//                 await serviceDetails[i].LogCompensationCommunicationStartedEvent();
//                 await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
//               }
//               else 
//               {
//                 // at that point the tx action has to return ack and then a decison if to do compensation should be made based on tx return code.
//                 const httpResCode = await serviceDetails[i].InvokeTransactionLogicAndLogCommunicationEndedEvent();
//                 // in cases the transactional action returned HTTP 200 we now have to compensate to service action
//                 if(httpResCode === 200)
//                 {
//                   //compensation for the first time.
//                   await serviceDetails[i].LogCompensationCommunicationStartedEvent();
//                   await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
//                 } 
//               }
//           }
//           }
//     }
//     catch (e)
//     {
//       console.log(e);
//       //By using this appraoch we will try to compensate as many compnents as we can upon every execution of the rolling back logic.
//       failureDetectedDuringCompensation = true;
//     }
//   }

//   if (failureDetectedDuringCompensation)
//   {
//     throw new Error ('the entire saga compensation logic wasnt successful!!');
//   }
// }

// async function InvokeSagaBackwordsRecoveryLogic(sagaId:string, serviceDetails:ServiceInteractionManager[], sagaLog) :Promise<any>
// {
//   var failureDetectedDuringCompensation : boolean = false;

//   for(let i=0; i<serviceDetails.length; i++)
//   {
//     try
//     {
//       const relevantLog = sagaLog.filter(x=>x["serviceName"] ===serviceDetails[i].serviceName);

//       // Checking to see if the saga was interacting with the service in the past.
//       // in cases where no interaction was made, no need for any kind of action to assure compensation.
//       // in cases this conidition passes we know for a fact that a request sent entry has been saved in the database because it the first log entry for service communication. 
//       if (relevantLog.length > 0)
//       {
//           //Running compensation for a given cases only for cases that compensation wasnt completed in previous attempts.
//           if (relevantLog.filter(x => x["status"] === "compensationCommunicationEnded").length === 0)
//           {
//               var txHttpResponseCode : number;
//               var compensationRequestShouldBeInvoked = false;
              
//               // in order to be sure compensation is being invoked only for services that returned ACK before
//               if (relevantLog.filter( x=> x ["status"] === "transactionCommunicationEnded").length === 0)
//               {
//                txHttpResponseCode = await serviceDetails[i].InvokeServiceTxLogic();
//                serviceDetails[i].LogTransactionCommunicationEndedWithHttpCodeEvent(txHttpResponseCode);
//                if(txHttpResponseCode===200)
//                {
//                  compensationRequestShouldBeInvoked = true;
//                }
//               }
//               else
//               {
//                 // If a previous http response code was returned to the saga, we will check to see if its 200.
//                 txHttpResponseCode = relevantLog.filter( x => x ["status"] === "transactionCommunicationEnded")[0].httpCode;
//                 if (txHttpResponseCode === 200)
//                 {
//                   compensationRequestShouldBeInvoked = true;
//                 }
//               }
              
//               // The actual compensation logic should be invoked ONLY when external endpoint successfully manipulated a resource for the saga (http 200).
//               if(compensationRequestShouldBeInvoked)
//               {
//                 // in case of first attempt to compensate, we will log compensationRequestSent status to the saga log, in cases of retry attmept to compensate
//                 // we will just invoke the compensation logic again.
//                 var previousCompensationAttemptHasBeenMade = relevantLog.filter( x=> x ["status"] === "compensationCommunicationStarted")[0].httpCode;
//                 if (previousCompensationAttemptHasBeenMade.length === 0)
//                 {
//                   await serviceDetails[i].LogCompensationCommunicationStartedEvent();
//                 }

//                 await serviceDetails[i].InvokeServiceCompensationLogic();
//               }
//           }
//       }
//     }
//     catch (e)
//     {
//       console.log(e);
//       //By using this appraoch we will try to compensate as many compnents as we can upon every execution of the rolling back logic.
//       failureDetectedDuringCompensation = true;
//     }
//   }

//   if (failureDetectedDuringCompensation)
//   {
//     throw new Error ('the entire saga compensation logic wasnt successful!!');
//   }
// }








// ---------------------------------------------------------------------


// async function InvokeSagaBackwordsRecoveryLogic(sagaId:string, serviceName:string, sagaLog, transacitonLogic: () => Promise<number>, compensationLogic: () => Promise<number>)
// {
//   const relevantLog = sagaLog.filter(x=>x["serviceName"] ===serviceName);
  
//   // Checking to see if the saga was interacting with the service in the past.
//   // in cases where no interaction was made, no need for any kind of compensation. 
//   if (relevantLog.length > 0)
//     {
//         // Running compensation for a given cases only for cases that compensation wasnt completed in previous attempts.
//         if (relevantLog.filter(x => x["status"] === "compensationRequetCompleted").length === 0)
//         {
//             var txHttpResponseCode : number;
//             // in order to be sure compensation is being invoked only for services that returned ACK before
//             if (relevantLog.filter( x=> x ["status"] === "requestCompleted").length === 0)
//             {
//               txHttpResponseCode = await transacitonLogic();
//               await sagaStepModel.create([{sagaId: sagaId, serviceName: serviceName, status: 'requestCompleted', httpCode:txHttpResponseCode}]);
//             }

//             else
//             {
//               txHttpResponseCode = relevantLog.filter( x=> x ["status"] === "requestCompleted")[0].httpCode;
//             }

//             if(txHttpResponseCode === 200)
//             {
//               await InvokeCompensationAlgorithmForAservice(sagaId, serviceName, compensationLogic);

//               //Tx logic worked okay, at that point its essential to invoke compensation logic.
//               if (relevantLog.filter(x=>x["status"] === "compensationRequestSent").length === 0)
//               {
//                 await sagaStepModel.create([{sagaId: sagaId, serviceName:serviceName, status: 'compensationRequestSent'}]);
//               }
              
//               const httpResCode = await compensationLogic();
//               if(httpResCode!=200)
//               {
//                 throw new Error('compensation has to succeed!');
//               }
//               else
//               {
//                 await sagaStepModel.create([{sagaId: sagaId, serviceName: serviceName, status: 'compensationRequetCompleted'}]);
//               }
//             }
//         }
//     }
// };

//  async function InvokeTransactionAlgorithmForAservice(sagaId:string, serviceName:string, transacitonLogic: () => Promise<number>) : Promise<number>
// {
//    await sagaStepModel.create([{sagaId: sagaId, serviceName: serviceName, status: 'requestSent', date:new Date().toISOString()}]);
//    const httpResCode = await transacitonLogic();
//    await sagaStepModel.create([{sagaId: sagaId, serviceName: serviceName, status: 'requestCompleted', httpCode:httpResCode,date:new Date().toISOString()}]);
//    if(httpResCode!=200)
//    {
//      throw new Error('Ack was not 200, so from now on saga will enter compensation mode.');
//    }
//    return httpResCode;
// } 

// async function InvokeCompensationAlgorithmForAservice(sagaId:string, serviceName:string, compensationLogic:()=>Promise<number>) :Promise<any>
// {
//    await sagaStepModel.create([{sagaId: sagaId, serviceName:serviceName, status: 'compensationRequestSent',date:new Date().toISOString()}]);
//    const httpResCode = await compensationLogic();
//    if(httpResCode!=200)
//    {
//      throw new Error('compensation has to succeed!');
//    }
//    else
//    {
//     await sagaStepModel.create([{sagaId: sagaId, serviceName: serviceName, status: 'compensationRequestCompleted', httpCode:httpResCode,date:new Date().toISOString()}]);
//    }
   
// }



bootstrap();
