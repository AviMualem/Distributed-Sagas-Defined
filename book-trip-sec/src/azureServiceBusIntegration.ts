import { HttpRequestDetails } from './HttpUtil';
import { ServiceInteractionManager } from './serviceIntegration';
import {InvokeSagaTransactionsLogic,InvokeSagaBackwordsRecoveryLogicFinal} from './SagaFlowManager'
import { sagaStepModel } from './DomianObjects/SagaLog';


export function checkForMessages(sbService, queueName: string)
 {
    sbService.receiveQueueMessage(queueName, {isPeekLock: true, timeoutIntervalInS:300}, async (err, lockedMessage) =>
     {
      if (err)
      {
        if (err === 'No messages to receive ' + new Date().getTime()) {
          console.log('No messages ' + new Date().getTime());
        } else {
          const a = err;
        }
      }
      else
      {
        try
        {
          console.log('processing msg: '+ lockedMessage.brokerProperties.MessageId + ' (delivery count is : ' + lockedMessage.brokerProperties.DeliveryCount + ")")
          const rawBody: string = lockedMessage.body;
          const jsonRawBody = rawBody.substring(
            rawBody.indexOf('{'),
            rawBody.lastIndexOf('}') + 1);
          const parsedJsonBody = JSON.parse(jsonRawBody);
          const sagaLog = await sagaStepModel.find({sagaId: parsedJsonBody['sagaId']});
          
          // Composing every service interaction details.
          // todo: move that initalization to bootstrapping logic.
          const carServiceInteractionDetails = new ServiceInteractionManager(parsedJsonBody['sagaId'],'carService',new HttpRequestDetails('http://localhost:3000/'+ parsedJsonBody['carId'] + '/book',{CarId: parsedJsonBody['carId'],LetMyRequestPass: parsedJsonBody['letCarRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}),
          new HttpRequestDetails('http://localhost:3000/'+ parsedJsonBody['carId'] + '/CancelBook',{CarId: parsedJsonBody['carId'],LetMyRequestPass: parsedJsonBody['letCarRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}))

          const apartmentServiceInteractionDetails = new ServiceInteractionManager(parsedJsonBody['sagaId'],'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ parsedJsonBody['apartmentId'] + '/book',{ApartmentId: parsedJsonBody['apartmentId'],LetMyRequestPass: parsedJsonBody['letApartmentRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}),
          new HttpRequestDetails('http://localhost:3001/'+ parsedJsonBody['apartmentId'] + '/CancelBook',{ApartmentId: parsedJsonBody['apartmentId'],LetMyRequestPass: parsedJsonBody['letApartmentRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}));

          const restaurantServiceInteraction = new ServiceInteractionManager(parsedJsonBody['sagaId'],'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ parsedJsonBody['restaurantId'] + '/book',{RestaurantId: parsedJsonBody['restaurantId'],LetMyRequestPass: parsedJsonBody['letRestaurantRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}),
          new HttpRequestDetails('http://localhost:3002/'+ parsedJsonBody['restaurantId'] + '/CancelBook',{RestaurantId: parsedJsonBody['restaurantId'],LetMyRequestPass: parsedJsonBody['letRestaurantRequestPass'],BusinessTxId: parsedJsonBody['sagaId']}));

          let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
          serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

          if (sagaLog.length === 0)
          {
            //This is the first time saga is being handeled. 
            console.log('Playing the saga in transaction mode.');
            await InvokeSagaTransactionsLogic(serviceDetails);
          }
          else
          {
            console.log('this is not the first attempt to play the saga. compensation mode is on!!.');
            await InvokeSagaBackwordsRecoveryLogicFinal(parsedJsonBody['sagaId'], serviceDetails, sagaLog)
          }
          console.log('deleting msg from the service bus!');
          sbService.deleteMessage(lockedMessage, (deleteError) =>
          {
            if (deleteError) 
            {
              console.log('Failed to delete message: ', deleteError);
            } 
            else 
            {
              console.log('Deleted message was okay ' + new Date().getTime());
            }
          });
        }
        catch(e)
        {
          console.log('failed to complete msg processing. msg will be replayed. :( !!  ex was :' + e);
          sbService.unlockMessage(lockedMessage, (unlockError) =>
          {
            if (unlockError) 
            {
              console.log('Failed to unlock message: ', unlockError);
            } 
            else 
            {
              console.log('unlock message was successfull' + new Date().getTime());
            }
          });
        }
      }
     },
    );
}