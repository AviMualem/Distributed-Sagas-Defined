export  class SagaFailedToCompleteInTransactionModeError extends Error {
    public  aggregatedErrors :Array<TransactionModeSagaServiceErrorDetails>;
    constructor(m: string, aggregatedErrorsInfo:Array<TransactionModeSagaServiceErrorDetails>) {
        super(m);
        this.aggregatedErrors = aggregatedErrorsInfo;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SagaFailedToCompleteInTransactionModeError.prototype);
    }
}


export enum CommunicationType
{
    transaction="transaction",
    compensation='compensation'
}

export class TransactionModeSagaServiceErrorDetails 
{
   public CommunicationType:CommunicationType;
   public RelevantError:Error;
   public serviceName:String;
   constructor(methodType:CommunicationType,relevantError:Error,serviceName:string)
   {
        this.CommunicationType =methodType;
        this.RelevantError =relevantError;
        this.serviceName =serviceName;
   }

}