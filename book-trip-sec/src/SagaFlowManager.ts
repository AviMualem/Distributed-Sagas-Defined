import { ServiceInteractionManager } from './serviceIntegration';
import { ConnectionRefusedError } from './CustomErrors/ConnectionRefusedError';
import { SagaFailedToCompleteInTransactionModeError, TransactionModeSagaServiceErrorDetails, CommunicationType } from './CustomErrors/SagaFailedToCompleteInTransactionModeError';
import { CompensationModeSagaServiceErrorDetails, SagaFailedToCompleteInCompensationModeError } from './CustomErrors/SagaFailedToCompleteInCompensationModeError';



export class SagaInTransactionModeExecutionResult
{
   public AllResourcesWereSuccessfullyManipulated:boolean;
   constructor(allResourcesWereSuccessfullyManipulated:boolean)
   {
     this.AllResourcesWereSuccessfullyManipulated = allResourcesWereSuccessfullyManipulated;
   };
}

export async function InvokeSagaTransactionsLogic(serviceDetails:ServiceInteractionManager[]) : Promise<SagaInTransactionModeExecutionResult>
{
  // in backwards recovery sagas, this method will be called only once due to the fact that after a first failure only compensation mode will be executed.
  const servicesThatCompletedSuccessfully: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
  //During transaction mode a single failure (HTTP code which isnt 200 \ Connection refused will lead to compensation logic to be invoked.
  //var logicalFailureDetectedDuringTransactionMode = false;
  let logicalFailureDetectedDuringTransactionMode = false;
  let unexpectedFailureOccuredInSagaTransacionMode = false;
  let aggregatedServiceErrors = new Array<TransactionModeSagaServiceErrorDetails>();
  for(let i=0; i<serviceDetails.length; i++)
  {
    let httpResCode:number;
    try
    {
      await serviceDetails[i].LogTransactionCommunicationStartedEvent();
      httpResCode = await serviceDetails[i].InvokeTransactionLogicAndLogCommunicationEndedEvent();
      if (httpResCode === 200)
      {
        servicesThatCompletedSuccessfully.push(serviceDetails[i]);
      }
      else
      {
        //HTTP code different than 200 should state the saga to start compensating services that returned 200.
        logicalFailureDetectedDuringTransactionMode = true;
        break;
      }
    }
    catch(error)
    {
      if(error instanceof ConnectionRefusedError)
      {
        await serviceDetails[i].LogTransactionCommunicationEndedWithConnectionRefusedEvent();
        logicalFailureDetectedDuringTransactionMode = true;
      }
      else 
      {
        //any error beside service communication error will be thrown.
        unexpectedFailureOccuredInSagaTransacionMode = true;
        aggregatedServiceErrors.push(new TransactionModeSagaServiceErrorDetails(CommunicationType.transaction,error,serviceDetails[i].serviceName));

      }
      break;
    }
  }

  //analyzing failures.
  if (logicalFailureDetectedDuringTransactionMode || unexpectedFailureOccuredInSagaTransacionMode)
  {
    var failureOccuerInCompensationValidation = false;
    for(let j=0; j<servicesThatCompletedSuccessfully.length; j++)
    {
      try
      {
        await serviceDetails[j].LogCompensationCommunicationStartedEvent();
        await serviceDetails[j].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
      }
      catch(error)
      {
        failureOccuerInCompensationValidation = true;
        aggregatedServiceErrors.push(new TransactionModeSagaServiceErrorDetails(CommunicationType.compensation,error,serviceDetails[j].serviceName));
      }
    }

    if(unexpectedFailureOccuredInSagaTransacionMode)
    {
      if(failureOccuerInCompensationValidation)
      {
        //throw new Error('unexpected failure happend. in addition failure detected in compensation logic')
        throw new SagaFailedToCompleteInTransactionModeError('failure happend in one of the services tx method. in addition at least one failure detected in compensation logic for relevant services',aggregatedServiceErrors);
      }

      //throw new Error('unexpected failure happend. saga transaction mode failed.')
      throw new SagaFailedToCompleteInTransactionModeError('failure happend in one of the services tx method.',aggregatedServiceErrors);

    }

    if(failureOccuerInCompensationValidation)
    {
      //throw new Error('saga compensation logic failed / partially succeded .')
      throw new SagaFailedToCompleteInTransactionModeError('at least one failure detected in compensation logic for relevant services',aggregatedServiceErrors);
    }

    return new SagaInTransactionModeExecutionResult(false);
  }
  else
  {
    return new SagaInTransactionModeExecutionResult(true);
  }
}

export async function InvokeSagaBackwordsRecoveryLogicFinal(sagaId:string, serviceDetails:ServiceInteractionManager[], sagaLog) :Promise<any>
{
  var failureDetectedDuringCompensation : boolean = false;
  const aggregatedErrors = new Array<CompensationModeSagaServiceErrorDetails>();
  for(let i=0; i<serviceDetails.length; i++)
  {
    try
    {
      const relevantLog = sagaLog.filter(x=>x["serviceName"] ===serviceDetails[i].serviceName);

      // Checking to see if the saga was interacting with the service in the past.
      // in cases where no interaction was made, no need for any kind of action to assure compensation.
      // in cases this conidition passes we know for a fact that a request sent entry has been saved in the database because it the first log entry for service communication. 
      if (relevantLog.length > 0)
      {
          const compensationCommunicationEndedEventExist = relevantLog.filter(x => x["status"] === "compensationCommunicationEnded").length === 1;
          const compensationCommunicationStartedEventExist = relevantLog.filter(x => x["status"] === "compensationCommunicationStarted").length === 1;
          const transactionCommunicationEndedEventExist = relevantLog.filter(x => x["status"] === "transactionCommunicationEnded").length === 1;
          let transactionCommunicationEndedEvent;
          let transactionEndedWithConnectionRefused =false;
          let transactionEndedWithNonSuccessfulHttpCode =false;
          let transactionEndedWithSuccessfulHttpCode= false;
          if (transactionCommunicationEndedEventExist)
          {
            const transactionCommunicationEndedEvent = relevantLog.filter(x => x["status"] === "transactionCommunicationEnded")[0];
            transactionEndedWithConnectionRefused =  transactionCommunicationEndedEvent.serviceWasUnreachable === true;
            transactionEndedWithNonSuccessfulHttpCode =  transactionCommunicationEndedEvent.httpCode!=200;
            transactionEndedWithSuccessfulHttpCode =  transactionCommunicationEndedEvent.httpCode===200;
          }
          // compensation should be invoked only for service that are NOT met with ANY of these conditions.
          // 1. service compensation logic was ended.
          // 2. service has transactionCommunicationEnded event with code different than 200.
          // 3. service has transactionCommunicationEnded event with connection refused status.
          if(!compensationCommunicationEndedEventExist && !(transactionEndedWithNonSuccessfulHttpCode) && !(transactionEndedWithConnectionRefused))
          {
              if(compensationCommunicationStartedEventExist)
              {
                // Compenstaion communication allready been initiated. so now it just need to be replayed again. 
                await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
              }
              else if (transactionEndedWithSuccessfulHttpCode)
              {
                // service has a transactionCommunication ended with http code 200 and compensation is being invoked for the first time.
                await serviceDetails[i].LogCompensationCommunicationStartedEvent();
                await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
              }
              else 
              {
                // at that point the tx action has to return ack and then a decison if to do compensation should be made based on tx return code.
                const httpResCode = await serviceDetails[i].InvokeTransactionLogicAndLogCommunicationEndedEvent();
                // in cases the transactional action returned HTTP 200 we now have to compensate to service action
                if(httpResCode === 200)
                {
                  //compensation for the first time.
                  await serviceDetails[i].LogCompensationCommunicationStartedEvent();
                  await serviceDetails[i].InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
                } 
              }
          }
          }
    }
    catch (e)
    {
      console.log(e);
      //By using this appraoch we will try to compensate as many compnents as we can upon every execution of the rolling back logic.
      failureDetectedDuringCompensation = true;
      aggregatedErrors.push(new CompensationModeSagaServiceErrorDetails(e,serviceDetails[i].serviceName));
    }
  }

  if (failureDetectedDuringCompensation)
  {
    throw new SagaFailedToCompleteInCompensationModeError ('A failure detected during compensation of one or more relevant service ',aggregatedErrors);
  }
}

