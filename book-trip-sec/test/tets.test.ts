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

describe('Testing 3 services saga Flow in transaction mode', () => {
  it('Running saga in transaction mode with all 3 services works properly', async () => 
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
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);
  
  }
  ).timeout(9000);

  it('Running Saga in transaction mode with first service that returns connection refused', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

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
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);


  }
  ).timeout(111000);


  it('Running Saga in transaction mode with first service that returns 408 (timeout)', async () => 
  {
    await bootstrap();
    const sagaId =  uuid4();
    const carId ='car-id-for-saga-'+ sagaId;
    const apartmentId ='apartment-id-for-saga-' + sagaId ;
    const resturantId='resturant-id-for-saga-' + sagaId ; 

    await InvokeHttpPostMethod('http://localhost:3000/create',{CarId:carId,CarName:'this is a nice car' });
    await InvokeHttpPostMethod('http://localhost:3001/create',{ApartmentId:apartmentId,ApartmentName:'this is a nice apartment' });
    await InvokeHttpPostMethod('http://localhost:3002/create',{RestaurantId:resturantId,RestaurantName:'this is a nice resturantId' });

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
    expect(failureDetectedInSagaExecution).equal(true);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);


  }
  ).timeout(111000);

  it('Running saga in transaction mode with 2 services that work okay, third one that returns http 408 (timeout) while compensation for first services executes successfuly', async () => 
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
    expect(failureDetectedInSagaExecution).equal(true);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);


  }
  ).timeout(111000);

  it('Running saga in transaction mode with 2 services that work okay and third one that returns http 408 (timeout) and both services that worked failed to compensate', async () => 
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
    expect(failureDetectedInSagaExecution).equal(true);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(0);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);


  }
  ).timeout(111000);

  it('Running saga in transaction mode with 2 services that work okay and third one that returns http 408 (timeout) and only the first service that succeded failed to compensate', async () => 
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
    expect(failureDetectedInSagaExecution).equal(true);
    const sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(0);
  

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);


  }
  ).timeout(111000);


  it('Running saga in transaction mode with 2 ok services, last service of the saga returns http code different than 200 and compensation logic executed successfuly for the first 2 services ', async () => 
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
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length ).equal(1);
    
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    
    const transactionCommunicationEndedEventForRestaurantService = sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' )[0];
    
    //@ts-ignore
    expect(transactionCommunicationEndedEventForRestaurantService.httpCode).equal(simulatedHttpCodeForFailingService);
    
    }
  ).timeout(15000);
  
  it('Running saga in transaction mode with first two services that works okay, 3rd service of the saga returns connection refused and compensation logic executed successfuly for the first 2 services', async () => 
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

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length ).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length ).equal(0);

  }).timeout(9000);


  it('Running saga in transacion mode with two first services that returns ok, 3rd service than return connection refused with failing invocation of compensation logic for the first successful service', async () => 
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

    expect(sagaLogicFailed).equal(true);

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(0);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    //return z;

  }).timeout(9000);


  it('Running saga in transaction mode with 2 ok services, 3rd service than return connection refused with failing invocation of compensation logic for second successful service', async () => 
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
    new HttpRequestDetails('http://localhost:3000/'+ carId + '/CancelBook',{CarId: carId,LetMyRequestPass: true,BusinessTxId:sagaId}))

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

    expect(sagaLogicFailed).equal(true);

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    //return z;

  }).timeout(9000);


  
  it('Running saga in transaction mode with 2 ok services, 3rd service than return connection refused with failing invocation of both successful services compensation logic', async () => 
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

    expect(sagaLogicFailed).equal(true);

    const sagaLog = await sagaStepModel.find({sagaId: sagaId});

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService').length ).equal(0);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(0);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    //return z;

  }).timeout(9000);

  

});

describe('testing 3 services saga execution in compensation mode.', () => {
  it('Running saga in compensation mode with 2 first services that executed and logged their tx logic successfully, and 3rd service is in state transaction communication started', async () => 
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
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
  }
  ).timeout(1200000000);

 
    it('Running saga in compensation mode with 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns connection refused when trying to invoke its transaction logic ', async () => 
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
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
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
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    }
    ).timeout(1200000000);

    it('Running saga in compensation mode with 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns http code 408 when trying to invoke its transaction logic', async () => 
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
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
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
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    }
    ).timeout(1200000000);

    it('Running saga in compensation mode with 2 first services that executed and logged their tx logic successfully, 3rd one that in state transaction communicaiton started and returns http code which isnt 200 when trying to invoke its transaction logic ', async () => 
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
      let sagaLog = await sagaStepModel.find({sagaId: sagaId});
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId, serviceDetails, sagaLog);
      sagaLog = await sagaStepModel.find({sagaId: sagaId});
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
  
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
      expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    }
    ).timeout(1200000000);
  

  it('Running saga in compensation mode with 2 first services that executed and logged their tx logic successfully, and no entry exist for third service ', async () => 
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
   // await apartmentServiceInteractionDetails.LogTransactionCommunicationEndedWithHttpCode(200);
    
    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'carService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'carService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);

    // await sagaStepModel.create([{sagaId: sagaId, serviceName: 'apartmentService', status: 'transactionCommunicationStarted', date:new Date().toISOString()}]);
    // await sagaStepModel.create([{sagaId: sagaId, serviceName:'apartmentService', status: 'transactionCommunicationEnded',httpCode:200,date:new Date().toISOString()}]);

    
    //await carServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3000/'+ carId + '/book',{CarId: carId,LetMyRequestPass: true,BusinessTxId: sagaId});

    //await apartmentServiceInteractionDetails.InvokeTransactionLogic();
    //await InvokeHttpPostMethod('http://localhost:3001/'+ apartmentId + '/book',{ApartmentId: apartmentId,LetMyRequestPass: true,BusinessTxId: sagaId});

   
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(0);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);

  }
  ).timeout(1111111);

  it('Running saga in compensation mode with 2 first services that executed and logged their tx and compensation logic successfully, and 3rd service that in state compensation communication started', async () => 
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
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();
    
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();

    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantRes = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantRes).equal(200);
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();

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

    
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);

  }
  );

  it('Running saga in compensation mode with 2 first services that executed and logged their tx and compensation logic successfully, and 3rd one that started compensation but didnt finish and return connection refused when trying to compensate it ', async () => 
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
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();
    
    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentRes = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentRes).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();
    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();
    
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantRes = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantRes).equal(200);
    
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();


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
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
    let sagaRecoveryProcessFailed = false;
    try
    {
      await InvokeSagaBackwordsRecoveryLogicFinal(sagaId,serviceDetails,sagaLog);

    }
    catch
    {
      sagaRecoveryProcessFailed =true;
    }

    expect(sagaRecoveryProcessFailed).equal(true);
    sagaLog = await sagaStepModel.find({sagaId: sagaId});
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
 
  }
  ).timeout(90000);

  it('Running saga in compensation mode with 2 first services that executed and logged their tx and compensation logic successfully, and 3rd one that currently in state compensation communication started and returns reponse which isnt http 200 when trying to compensate it ', async () => 
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
    await carServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();

    await apartmentServiceInteractionDetails.LogTransactionCommunicationStartedEvent();
    const apartmentResponse = await apartmentServiceInteractionDetails.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(apartmentResponse).equal(200);
    await apartmentServiceInteractionDetails.LogCompensationCommunicationStartedEvent();


    await apartmentServiceInteractionDetails.InvokeCompensationLogicAndLogCompensationCommunicationEndedEventOnSuccessfulResponse();
    
    await restaurantServiceInteraction.LogTransactionCommunicationStartedEvent();
    const restaurantResponse = await restaurantServiceInteraction.InvokeTransactionLogicAndLogCommunicationEndedEvent();
    expect(restaurantResponse).equal(200);
    await restaurantServiceInteraction.LogCompensationCommunicationStartedEvent();


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
    let sagaLog = await sagaStepModel.find({sagaId: sagaId});
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
    expect(sagaRecoveryProcessFailed).equal(true);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='carService').length ).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='carService' ).length ).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='apartmentService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='apartmentService' ).length).equal(1);

    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "transactionCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationStarted" && x["serviceName"]==='restaurantService' ).length).equal(1);
    expect(sagaLog.filter(x => x["status"] === "compensationCommunicationEnded" && x["serviceName"]==='restaurantService' ).length).equal(0);
 
  }
  ).timeout(11111111);
});





describe('Http request invoker tests', () => {
  it('veirfy that error code 408 raise a socket timeout exception', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:408,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),SocketTimeoutError);
  }).timeout(9000);

  it('veirfy that connection refused error being thrown when server isnt reachable', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3009/'+ 'fad' + '/CancelBook',{CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),ConnectionRefusedError);
  }).timeout(9000);

  it('veirfy that internal error exception is being returned for http code 500', async () => 
  {
     return chai.assert.isRejected(InvokeHttpPostMethod( 'http://localhost:3000/'+ 'fad' + '/CancelBook',{ReturnThisHttpCode:500,CarId: 'dsf',LetMyRequestPass: true,BusinessTxId:'fsd'}),InternalServerFailureError);
  }).timeout(9000);

  it('veirfy socket timeout will return socket timeout error.', async () => 
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