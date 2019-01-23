import { expect, assert } from 'chai';
import * as TypeMoq from 'typemoq';
import { InvokeSagaTransactionsLogic, InvokeSagaBackwordsRecoveryLogicFinal } from '../src/SagaFlowManager';
import { sagaStepModel } from '../src/DomianObjects/SagaLog';
import { ConnectionRefusedError } from '../src/CustomErrors/ConnectionRefusedError';
import { InvokeHttpPostMethod, HttpRequestDetails } from '../src/HttpUtil';
import { ServiceInteractionManager } from '../src/serviceIntegration';
import { bootstrap } from '../src/bootstrapperManager';
var uuid4 = require('uuid4');
import { doesNotReject, AssertionError } from 'assert';
import { SocketTimeoutError } from '../src/CustomErrors/SocketTimeoutError';
import { InternalServerFailureError } from '../src/CustomErrors/InternalServerFailureError';
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe('3 services saga flow - (Tx mode) - first execution attempt for saga', () => {
  it('Completes successfully when all services succeed', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
   
    await InvokeSagaTransactionsLogic(serviceDetails);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1, 'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1, 'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1, 'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0,'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0),'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly';

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1, 'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode,compensation process shouldnt be started for any service if all of the services manage to invoke their tx method properly');
  
  }
  ).timeout(9000000);

  it('Completes successfully when the first service returns connection refused', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    //setting the car endpoint to port 3009 in tx request in order to simulate connection refused response.
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3009/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
  
    await InvokeSagaTransactionsLogic(serviceDetails);
   
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1, 'in transaction mode the S.E.C should log transaction communication ended event for a service that returns connection refused when running its tx method');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt start compensation process for a service that returned connection refused when its tx mehtod was invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt start compensation process for a service that returned connection refused when its tx mehtod was invoked.');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0),'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly';
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');


  }
  ).timeout(111000);


  it('fails when the first service returns HTTP code 408 (timeout)', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    //Simulating http return code 408 for the transacion request.
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{ReturnThisHttpCode:408,CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

   
   let failureDetectedInSagaExecution = false;  
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails);
    }
    catch(e)
    {
      failureDetectedInSagaExecution = true;
    }
    expect(failureDetectedInSagaExecution).equal(true,'saga in tx mode should fail when any service return http code 408(timeout) when running it tx method.');
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'S.E.C should never log transaction communication ended event for any service that returned socket timeout when running it tx method.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt start compensation process for a service that returned http code 408 when its tx mehtod was invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt start compensation process for a service that returned http code 408 when its tx mehtod was invoked.');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'in transaction mode, the S.E.C shouldnt continue to interact with services after a previous service failed to invoke its tx method properly');


  }
  ).timeout(111000);

  it('fails when 2 first services work okay, third one that returns http 408 (timeout) while compensation for 2 first services that succeed executes successfuly', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    //simulating return code 408 for the transacion request.
    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

   
   let failureDetectedInSagaExecution = false;  
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails);
    }
    catch(e)
    {
      failureDetectedInSagaExecution = true;
    }
    expect(failureDetectedInSagaExecution).equal(true,'saga in tx mode should fail when a given service returns socket timeout (HTTP code 408) when running its tx method.');
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'S.E.C should never log transaction communication ended event for any service that returned socket timeout when running it tx method.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');


  }
  ).timeout(111000);

  it('fails when 2 first services that work okay and third one that returns http 408 (timeout) while both first services that worked fail to compensate', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    //simulating failure in compensation mode
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{ReturnThisHttpCode:412,CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    //simulating failure in compensation mode
    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ReturnThisHttpCode:412,ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

   
   let failureDetectedInSagaExecution = false;  
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails);
    }
    catch(e)
    {
      failureDetectedInSagaExecution = true;
    }
    expect(failureDetectedInSagaExecution).equal(true,'saga in tx mode should fail when a given service returns socket timeout (HTTP code 408) when running its tx method.');
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'S.E.C should never log transaction communication ended event for any service that returned socket timeout when running it tx method.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');


  }
  ).timeout(111000);

  it('fails when 2 first services that work okay and third one that returns http 408 (timeout) and only the first service that succeded failed to compensate', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{ReturnThisHttpCode:412,CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    //simulating a socket timeout in tx request - faking HTTP code 408
    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

   
   let failureDetectedInSagaExecution = false;  
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails);
    }
    catch(e)
    {
      failureDetectedInSagaExecution = true;
    }
    expect(failureDetectedInSagaExecution).equal(true,'saga in tx mode should fail when a given service returns socket timeout (HTTP code 408) when running its tx method.');
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'S.E.C should never log transaction communication ended event for any service that returned socket timeout when running it tx method.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return socket timeout when its tx method was being invoked.');


  }
  ).timeout(111000);


  it('Completes successfully when 2 first services work okay, and last service of the saga returns http code different than 200 while compensation logic executed successfuly for the first 2 services ', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 
    const simulatedHttpCodeForFailingService = 412;

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    //simulating return which is different than 200.
    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:simulatedHttpCodeForFailingService,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
   
    await InvokeSagaTransactionsLogic(serviceDetails);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code which isnt 500/408');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return http code which isnt 200 when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return http code which isnt 200 when its tx method was being invoked.');
    
    const transactionCommunicationEndedEventForRestaurantService = sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' )[0];
    
    //@ts-ignore
    expect(transactionCommunicationEndedEventForRestaurantService.httpCode).equal(simulatedHttpCodeForFailingService);
    
    }
  ).timeout(15000);
  
  it('Completes successfully when first two services that works okay, 3rd service of the saga returns connection refused and compensation logic executed successfuly for the first 2 services', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    // using wrong port in order to simulate connection refused.
    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

   

    await InvokeSagaTransactionsLogic(serviceDetails);

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    const x = sagaLog.filter(x => x["status"] === "compensationCommunicationEnded").length === 1;

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for every service that return response which is connection refused');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');

  }).timeout(9000);


  it('fails when two first services returns ok, 3rd service than return connection refused while there is a failure in invocation of compensation logic for the first successful service', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });


    // Simulating failure on compensation request
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{ReturnThisHttpCode:500,CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));


    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);



    let sagaLogicFailed=false;
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails)
    }
    catch (e)
    {
      sagaLogicFailed=true;
    }

    expect(sagaLogicFailed).equal(true,'saga in tx mode should fail when a given service returns connnection refused when running its tx method, and all previous services that were exeucted successfully fail to compensate');

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for every service that return response which is connection refused');
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    //return z;

  }).timeout(900000);


  it('fails when 2 first services return ok, 3rd service than return connection refused while there is a failure in invocation of compensation logic for second successful service', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

     // Simulating failure on compensation request
    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ReturnThisHttpCode:500,ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));


    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

 

    let sagaLogicFailed=false;
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails)
    }
    catch (e)
    {
      sagaLogicFailed=true;
    }

    // var expect = chai.expect;
    // var assert = chai.assert;

    // //verifying throw of a promise.
    // const z = assert.isRejected(InvokeSagaTransactionsLogic(serviceDetails),Error);

    expect(sagaLogicFailed).equal(true,'saga in tx mode should fail when a given service returns connnection refused when running its tx method, and all previous services that were exeucted successfully fail to compensate');

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for every service that return response which is connection refused');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    //return z;

  }).timeout(9000);


  
  it('fails when 2 first services return ok, 3rd service than return connection refused, with failing invocation of both successful services compensation logic', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });


    // Simulating failure on compensation request
    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{ReturnThisHttpCode:500,CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    // Simulating failure on compensation request
    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ReturnThisHttpCode:500,ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));


    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);



    let sagaLogicFailed=false;
    try
    {
      await InvokeSagaTransactionsLogic(serviceDetails)
    }
    catch (e)
    {
      sagaLogicFailed=true;
    }

    // var expect = chai.expect;
    // var assert = chai.assert;

    // //verifying throw of a promise.
    // const z = assert.isRejected(InvokeSagaTransactionsLogic(serviceDetails),Error);

    expect(sagaLogicFailed).equal(true,'saga in tx mode should fail when a given service returns connnection refused when running its tx method, and all previous services that were exeucted successfully fail to compensate');

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for a service that returns HTTP code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it should start compensation process for a service that returned 200 when its tx method was invoked');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0,'S.E.C should never log compensation communication ended event for any service that return HTTP code different than 200 when its compensation method was being invoked.');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log transaction communication started event before excuting tx method for a given service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in transaction mode the S.E.C should log transaction communication ended event for every service that return response which is connection refused');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'when running S.E.C in tx mode that fails to invoke all of the services tx method properly it shouldnt invoke compensation method / log any compensation event for any service that the return connection refused when its tx method was being invoked.');
    //return z;

  }).timeout(9000000);

  

});

describe('Running saga in compensation mode (not the first execution attempt)', () => {
  it('completes successfully when 2 first services that executed and logged their tx logic successfully, and 3rd service is in state transaction communication started returns okay when running its tx logic while all 3 services execute their compensation logic successfully', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });


    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    
    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(carResponse).equal(200);
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
    //simlating 2 services that were okay in transaction mode (first run of saga).
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // //simulating service which have only communication started event
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    //const s =await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});
    //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});
    //aaa
    
    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
   
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
   
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in compensation mode the S.E.C should run the tx method of every service which is in state transaction communicaiton started and log transaction communication ended event if the tx method returns http code 200');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'in compensation mode when the S.E.C executes tx method of a given service and that service returns http code 200 it shoud invoke the service compensation method and log compensation communication started event');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
  }
  ).timeout(1200000000);

 
    it('fails when 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns connection refused when trying to invoke its transaction logic while 2 first service compensate successfully ', async () => 
    {
      await bootstrap();
      const sagaId =  uuid4();
      const carId ='car-id-for-saga-'+ sagaId;
      const apartmentId ='apartment-id-for-saga-' + sagaId ;
      const resturantId='resturant-id-for-saga-' + sagaId ; 
  
      await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
      await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
      await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });
  
  
      const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))
  
      const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      //simulating connection refused for transacion action by providing bad port.
      const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3008/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
      serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
  
      await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(carResponse).equal(200);
      await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(apartmentResponse).equal(200);
      await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
      //simlating 2 services that were okay in transaction mode (first run of saga).
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // //simulating service which have only communication started event
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      //const s =await carServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //aaa
      let sagaExecutionFailed =false;
      
      try
      {
        await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
      }
      catch
      {
        sagaExecutionFailed=true;
      }
      expect(sagaExecutionFailed).equal(true);
      
      sagaLog = await sagaStepModel.find({sagaId: sagaId});
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode the S.E.C should run the tx method of every service which is in state transaction communicaiton started - in case the method returned connection refused it shouldnt log transaction communication ended event');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C executes tx method of a given service and that service returns connection refused it shouldnt start compensation proces for the given service');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C executes tx method of a given service and that service returns connection refused it shouldnt start compensation proces for the given service');
    }
    ).timeout(1200000000);

    it('fails when 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns http code 408 when trying to invoke its transaction logic while 2 first services compensate successfully', async () => 
    {
      await bootstrap();
      const sagaId =  uuid4();
      const carId ='car-id-for-saga-'+ sagaId;
      const apartmentId ='apartment-id-for-saga-' + sagaId ;
      const resturantId='resturant-id-for-saga-' + sagaId ; 
  
      await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
      await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
      await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });
  
  
      const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))
  
      const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      //Faking http code 408 when running tx logic.
      const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
      serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
  
      await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(carResponse).equal(200);
      await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(apartmentResponse).equal(200);
      await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');

      //simlating 2 services that were okay in transaction mode (first run of saga).
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // //simulating service which have only communication started event
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      //const s =await carServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //aaa
      let sagaExecutionFailed =false;
    
      try
      {
        await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
      }
      catch
      {
        sagaExecutionFailed=true;
      }
      expect(sagaExecutionFailed).equal(true);
      
      sagaLog = await sagaStepModel.find({sagaId: sagaId});
     
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode the S.E.C should run the tx method of every service which is in state transaction communicaiton started - in case the method returned http code 408/socket timeout it shouldnt log transaction communication ended event');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C executes tx method of a given service and that service returns http code 408/socket timeout it shouldnt start compensation proces for the given service');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C executes tx method of a given service and that service returns http code 408/socket timeout it shouldnt start compensation proces for the given service');
    }
    ).timeout(1200000000);

    it('completes successfully when 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns http code which isnt 200 when trying to invoke its transaction logic while first 2 services compensate correctly ', async () => 
    {
      await bootstrap();
      const sagaId =  uuid4();
      const carId ='car-id-for-saga-'+ sagaId;
      const apartmentId ='apartment-id-for-saga-' + sagaId ;
      const resturantId='resturant-id-for-saga-' + sagaId ; 
  
      await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
      await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
      await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });
  
  
      const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))
  
      const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:412,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
      new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));
  
      let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
      serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);
  
      await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(carResponse).equal(200);
      await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
      const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
      expect(apartmentResponse).equal(200);
      await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
      //simlating 2 services that were okay in transaction mode (first run of saga).
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
      // //simulating service which have only communication started event
      // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
      //const s =await carServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
      //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});
      //aaa
     
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
      sagaLog = await sagaStepModel.find({sagaId: sagaId});
      
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');
      
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in compensation mode the S.E.C should run the tx method of every service which is in state transaction communicaiton started - in case the method returned http code which isnt 500/408 it should log transaction communication ended event');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C inokes a given service tx method and log transaction communication ended event with http code which isnt 200 there is no need  to invoke compensation process for the given service');
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode when the S.E.C inokes a given service tx method and log transaction communication ended event with http code which isnt 200 there is no need  to invoke compensation process for the given service');
    }
    ).timeout(1200000000);
  

  it('completes when 2 first services that executed and logged their tx logic successfully, no entry has been logged for third service, while 2 first services compensate successfully', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });


    //simlating 2 services that were okay in transaction mode (first run of saga).

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    //await carServiceInteractionDetails.LogTransactionCommunicationEndedWithHttpCode(200);
    expect(carResponse).equal(200);

    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
   
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');


   // await apartmentServiceInteractionDetails.LogTransactionCommunicationEndedWithHttpCode(200);
    
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);

    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);

    
    //await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});


    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'in compensation mode the S.E.C should start compensation process for a service which got to transaction communication ended state with http code 200 and log compensation started event.');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'S.E.C should log compensation communication ended event when a compensation method of a given service returns HTTP code 200');

  }
  ).timeout(1111111);

  it('completes successfully when 2 first services that executed and logged their tx and compensation logic successfully, and 3rd service that in state compensation communication started completes its compensation action successfully.', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    
    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });


    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const  carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(carResponse).equal(200);
    //await carServiceInteractionDetails.LogTransactionCommunicationEndedWithHttpCode(200);
    await carServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();

    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantRes = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantRes).equal(200);
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'Verifying compensation communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication ended event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying compensation communication started event has been logged for restaurant service');


    // //simlating 2 services that were okay in transaction mode (first run of saga).
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'restaurantService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);

    //await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await restaurantServiceInteraction.InvokeTransactionLogic();
//    await InvokeHttpPostMethod('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId});

  
    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'in compensation mode the S.E.C should run compensation method for as service which is in state compensation communication started and log compensation communicaiton ended event if the method returns http code 200.');

  }
  );

  it('fails when 2 first services that executed and logged their tx and compensation logic successfully, and 3rd one that started compensation but didnt finish and return connection refused when trying to compensate it ', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 
    
    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const carResponse =  await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent()
    expect(carResponse).equal(200);
    await carServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentRes = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentRes).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantRes = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantRes).equal(200);
    
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'Verifying compensation communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication ended event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying compensation communication started event has been logged for restaurant service');


    // //simlating 2 services that were okay in transaction mode (first run of saga).
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'restaurantService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);

    //await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

   // await apartmentServiceInteractionDetails.InvokeTransactionLogic();

    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await await restaurantServiceInteraction.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId});
    
    let sagaRecoveryProcessFailed = false;
    try
    {
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);

    }
    catch
    {
      sagaRecoveryProcessFailed =true;
    }

    expect(sagaRecoveryProcessFailed).equal(true,'when running in compensation mode saga cant be complete if a called to a compensation method returns connection refused');
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode the S.E.C should run compensation method for a service which is in state compensation communication started and but shouldnt log compensation ended event if the response is connection refused');
 
  }
  ).timeout(90000);




  it('fails when 2 first services that executed and logged their tx and compensation logic successfully, and 3rd one that started compensation but didnt finish and return http code 408 (socket timeout) when trying to compensate it ', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 
    
    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    //simulating socket timeout in compensation request.
    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3003/'+ resturantId + '/CancelBook',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const carResponse =  await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent()
    expect(carResponse).equal(200);
    await carServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentRes = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentRes).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantRes = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantRes).equal(200);
    
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'Verifying compensation communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication ended event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying compensation communication started event has been logged for restaurant service');


    // //simlating 2 services that were okay in transaction mode (first run of saga).
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'restaurantService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);

    //await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

   // await apartmentServiceInteractionDetails.InvokeTransactionLogic();

    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await await restaurantServiceInteraction.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId});
    
    let sagaRecoveryProcessFailed = false;
    try
    {
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);

    }
    catch
    {
      sagaRecoveryProcessFailed =true;
    }

    expect(sagaRecoveryProcessFailed).equal(true,'when running in compensation mode saga cant be complete if a called to a compensation method returns connection refused');
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode the S.E.C should run compensation method for a service which is in state compensation communication started and but shouldnt log compensation ended event if the response is socket timouet (http 408)');
 
  }
  ).timeout(90000);


  it('fails when 2 first services that executed and logged their tx and compensation logic successfully, and 3rd one that currently in state compensation communication started and returns reponse which isnt http 200 when trying to compensate it ', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 
    const SimulatedFailedHttpCode = 412;

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });


    const carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    const apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    const restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{ReturnThisHttpCode:SimulatedFailedHttpCode,RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    await carServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const carResponse = await carServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(carResponse).equal(200);
    await carServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();

    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();


    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEvent();
    
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantResponse = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantResponse).equal(200);
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying transaction communication ended event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1,'Verifying compensation communication started event has been logged for car service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying transaction communication ended event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication started event has been logged for apartment service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1,'Verifying compensation communication ended event has been logged for car service');

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication started event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying transaction communication ended event has been logged for restaurant service');
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1,'Verifying compensation communication started event has been logged for restaurant service');


    //simlating 2 services that were okay in transaction mode (first run of saga).
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'compensationCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);


    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'restaurantService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'restaurantService', status: 'compensationCommunicationStarted', date:new Date().toISOString()}]);

    
 
    //await carServiceInteractionDetails.InvokeTransactionLogic();
    // await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await restaurantServiceInteraction.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3002/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId});
    let sagaRecoveryProcessFailed = false;
    try
    {
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);

    }
    catch
    {
      sagaRecoveryProcessFailed =true;
    }
    
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaRecoveryProcessFailed).equal(true,'when running in compensation mode saga cant be complete if a called to a compensation method returns http code which isnt 200');
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0,'in compensation mode the S.E.C should run compensation method for a service which is in state compensation communication started and but shouldnt log compensation ended event if the response is http code which isnt 200');
 
  }
  ).timeout(11111111);
});

describe('Http request invoker tests', () => {
  it('returns HTTP code 408 raise a socket timeout exception', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:408,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),SocketTimeoutError);
  }).timeout(9000);

  it('returns connection refused exception being thrown when server isnt reachable', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3009/'+ 'fad' + '/CancelBook',{CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),ConnectionRefusedError);
  }).timeout(9000);

  it('returns internal error exception is being returned for http code 500', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:500,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),InternalServerFailureError);
  }).timeout(9000);

  it('returns socket timeout exception will return socket timeout error.', async () => 
  {
     //setting 1ms timeout for the sokcet.
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:500,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'},1),SocketTimeoutError);
  }).timeout(9000);

  it('avi', async () => 
  {
    try
    {
      await InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:408,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'},50);
    }
    catch(e2)
    {
      const adf =e2;
      const asfd =3;
    }

    try
    {
      await InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:404,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'});
    }
    
    catch(e)
    {
      const adf =e;
      const asfd =3;
    }

    try
    {
      await InvokeHttpPostMethod('http://localhost:3009/'+ 'fad' + '/CancelBook',{CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'});
    }
    catch(e)
    {
      const adf =e;
      const asfd =3;
    }
  }).timeout(11000);
});



describe('Testing Database constraints', () => {
  it('should fail when trying to insert multiple entries with same sagaid-servicename-status key', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();

    await sagaStepModel.create([{sagaId:sagaId, serviceName:'svc-sample', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    return chai.assert.isRejected(sagaStepModel.create([{sagaId:sagaId, serviceName:'svc-sample', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]));
    
  }).timeout(90000);

  

});


describe('temps', () => {
  it('aaaaa', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 
 
    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

    let carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{ReturnThisHttpCode:400,CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

    let apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3006/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    let restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/book',{ReturnThisHttpCode:408,RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));
    let serviceDetails: Array<ServiceInteractionManager> = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    try
    {
        const aaasaf = await InvokeSagaTransactionsLogic(serviceDetails);
        const asdf =34;
    }
    catch(e)
    {

        const dasfg=e;
    }

     carServiceInteractionDetails = new ServiceInteractionManager(sagaId,'carService',new HttpRequestDetails('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

     apartmentServiceInteractionDetails = new ServiceInteractionManager(sagaId,'apartmentService',new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3001/'+ apartmentId + '/CancelBook',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId}));

     restaurantServiceInteraction = new ServiceInteractionManager(sagaId,'restaurantService',new HttpRequestDetails('http://localhost:3004/'+ resturantId + '/book',{RestaurantId: resturantId,LetMyRequestPass:true,BusinessTxId: sagaId}),
    new HttpRequestDetails('http://localhost:3002/'+ resturantId + '/CancelBook',{RestaurantId: resturantId,LetMyRequestPass: true,BusinessTxId: sagaId}));

    serviceDetails = new Array<ServiceInteractionManager>();
    serviceDetails.push(carServiceInteractionDetails,apartmentServiceInteractionDetails,restaurantServiceInteraction);

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    try
    {
        await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);
    }
    catch(e)
    {
        const as =3
    }

    
  }).timeout(900000);

  

});