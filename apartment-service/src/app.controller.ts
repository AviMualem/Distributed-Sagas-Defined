import { Controller, Get, Post, Body, Param, HttpCode, Inject, Req, HttpException } from '@nestjs/common';
import { AppService } from './app.service';
import {ApiUseTags} from '@nestjs/swagger';
import { Connection } from 'mongoose';
import {  apartmentModel } from './DomianObjects/Apartment';
import {idempotencyTrackingModel} from './DomianObjects/IdempotencyTracking';
import { BookApartmentRequest } from './dto/BookApartmentRequest';
import { CreateApartmentRequest } from './dto/CreateApartmentRequest';
import { CancelBookApartmentRequest } from './dto/CancelBookApartmentRequest';

@Controller()
@ApiUseTags('apartment')
export class AppController {
  connection: Connection  ;
  constructor(@Inject('mongo')private readonly mongo: Connection) {
    this.connection = mongo;
  }

  @Post(':id/Book')
  @HttpCode(200)
  async BookApartmentAsync(@Body() request: BookApartmentRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
    if (request.ReturnThisHttpCode!=undefined)
    {
      throw new HttpException('simulated response',request.ReturnThisHttpCode);
    }
    if (request.LetMyRequestPass) {
      const idempotencyKey= request.BusinessTxId+'-'+incomingWebRequest.method+'-'+incomingWebRequest.path;
      const a = await idempotencyTrackingModel.find({idempotencyKey: idempotencyKey});
      if (a.length === 0) {
        const session = await this.connection.startSession();
        await session.startTransaction();
        await idempotencyTrackingModel.create([{idempotencyKey: idempotencyKey, actionWasDone: true}], {session: session});
        const res = await apartmentModel.findOneAndUpdate({apartmentId: request.ApartmentId, isBooked:false}, { $set: { isBooked: true} }).session(session);
        if (res!=null)
        {
          // entity was found and manipulated
          await session.commitTransaction();
          return "endpoint successfully booked the resource.";
        }
        else
        {
          //entity doesnt exist. aborting tx.
          await session.abortTransaction();
          throw new Error('entity doenst exist.')
        }
      }
      return "endpoint has previously processed that request so no action has been done.";
    } else {
      throw new Error('artifical failure has been simulated');
    }
  }

  @Post(':id/CancelBook')
  @HttpCode(200)
  async CancelBookCarAsync(@Body() request: CancelBookApartmentRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
    if (request.ReturnThisHttpCode!=undefined)
    {
      throw new HttpException('simulated response', request.ReturnThisHttpCode);
    }
   
    if (request.LetMyRequestPass) {
      const idempotencyKey= request.BusinessTxId+'-'+incomingWebRequest.method+'-'+incomingWebRequest.path;
      const a = await idempotencyTrackingModel.find({idempotencyKey: idempotencyKey});
      if (a.length === 0) {
        const session = await this.connection.startSession();
        await session.startTransaction();
        await idempotencyTrackingModel.create([{idempotencyKey: idempotencyKey, actionWasDone: true}],{ session: session });
        const res = await apartmentModel.findOneAndUpdate({apartmentId: request.ApartmentId, isBooked:true}, { $set: { isBooked: false} }).session(session);
          if (res!=null)
          {
            //entity was found and manipulated
            await session.commitTransaction();
            return "endpoint successfully canceled booking of the resource.";
          }
          else
          {
            //entity doesnt exist. aborting tx.
            await session.abortTransaction();
            throw new Error('entity doenst exist.')
          }
        
      }
      return "endpoint has previously processed that request so no action has been done.";
    } else {
      throw new Error('artifical failure has been simulated');
    }
  }

  @Post('Create')
  @HttpCode(201)
  async CreateApartmentAsync(@Body() request: CreateApartmentRequest): Promise<string> {
    await apartmentModel.create([{apartmentId: request.ApartmentId, apartmentName: request.ApartmentName, isBooked: false}]);
    return 'ok!';

  }
}
