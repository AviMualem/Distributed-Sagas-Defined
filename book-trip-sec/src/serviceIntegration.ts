import { sagaStepModel } from './DomianObjects/SagaLog';
import { HttpRequestDetails,InvokeHttpPostMethod } from './HttpUtil';


export class ServiceInteractionManager
{
    private txHttpRequest : HttpRequestDetails;
    private compensationHttpRequest :HttpRequestDetails;
    public sagaId:string;
    public serviceName:string;
 
    constructor(sagaId:string, serviceName:string, txHttpRequest:HttpRequestDetails, compensationHttpRequest:HttpRequestDetails)
    {
      this.txHttpRequest = txHttpRequest;
      this.compensationHttpRequest = compensationHttpRequest;
      this.sagaId = sagaId;
      this.serviceName = serviceName;
    }

    public async LogTransactionCommunicationStartedEvent() : Promise<any>
    {
      await sagaStepModel.create([{sagaId: this.sagaId, serviceName: this.serviceName, status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    }

    public async LogTransactionCommunicationEndedWithConnectionRefusedEvent() : Promise<any>
    {
      await sagaStepModel.create([{sagaId: this.sagaId, serviceName: this.serviceName, status: 'transactionCommunicationEnded',serviceWasUnreachable:true, date:new Date().toISOString()}]);
    }

    public async InvokeTransactionLogicAndLogCommunicationEndedEvent() : Promise<number>
    {
        const  httpResCode = await InvokeHttpPostMethod(this.txHttpRequest.Uri, this.txHttpRequest.JsonBody);
        await sagaStepModel.create([{sagaId: this.sagaId, serviceName:this.serviceName, status: 'transactionCommunicationEnded',httpCode:httpResCode,date:new Date().toISOString()}]);
        return httpResCode;
    } 

    public async LogCompensationCommunicationStartedEvent() : Promise<any>
    {
      await sagaStepModel.create([{sagaId: this.sagaId, serviceName:this.serviceName, status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    } 

    public async InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent() : Promise<any>
    {
      const httpResCode = await InvokeHttpPostMethod(this.compensationHttpRequest.Uri,this.compensationHttpRequest.JsonBody);
      if(httpResCode === 200)
      {
        await sagaStepModel.create([{sagaId: this.sagaId, serviceName:this.serviceName, status: 'compensationCommunicationEnded',httpCode:httpResCode,date:new Date().toISOString()}]);
      }
      else
      {
        throw new Error('Compensation communication can be completed only with http 200 code. returned code was ' + httpResCode)
      }
    } 
}