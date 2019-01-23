export  class SagaFailedToCompleteInCompensationModeError extends Error {
    public  aggregatedErrors :Array<CompensationModeSagaServiceErrorDetails>;
    constructor(m: string, aggregatedErrorsInfo:Array<CompensationModeSagaServiceErrorDetails>) {
        super(m);
        this.aggregatedErrors = aggregatedErrorsInfo;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, SagaFailedToCompleteInCompensationModeError.prototype);
    }
}


export class CompensationModeSagaServiceErrorDetails 
{
   public RelevantError:Error;
   public serviceName:String;
   constructor(relevantError:Error,serviceName:string)
   {
        this.RelevantError =relevantError;
        this.serviceName =serviceName;
   }
}