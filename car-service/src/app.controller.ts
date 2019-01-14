import { Controller, Get, Post, Body, Param, HttpCode, Inject, Req, BadRequestException, HttpException } from '@nestjs/common';
import { AppService } from './app.service';
import { BookCarRequest } from './dto/BookCarRequest';
import {ApiUseTags} from '@nestjs/swagger';
import { CreateCarRequest } from './dto/CreateCarRequest';
import { Connection } from 'mongoose';
import {carModel} from './DomianObjects/Car';
import {idempotencyTrackingModel} from './DomianObjects/IdempotencyTracking';
import { CancelBookCarRequest } from './dto/CancelBookCarRequest';
import { ContextCreator } from '@nestjs/core/helpers/context-creator';

@Controller()
@ApiUseTags('cars')
export class AppController {
  connection: Connection  ;
  constructor(@Inject('mongo')private readonly mongo: Connection) {
    this.connection = mongo;
  }

  @Post(':id/Book')
  @HttpCode(200)
  async BookCarAsync(@Body() request: BookCarRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
    if (request.ReturnThisHttpCode!=undefined)
    {
      throw new HttpException('simulated response',request.ReturnThisHttpCode);
    }
    if (request.LetMyRequestPass) {
      const idempotencyKey= request.BusinessTxId+'-'+incomingWebRequest.method+'-'+incomingWebRequest.path;
      const a = await idempotencyTrackingModel.find({idempotencyKey:idempotencyKey});
      if (a.length === 0) {
        const session = await this.connection.startSession();
        await session.startTransaction();
        await idempotencyTrackingModel.create([{idempotencyKey: idempotencyKey, actionWasDone: true}],{ session: session });
        const res = await carModel.findOneAndUpdate({carId: request.CarId, isBooked:false}, { $set: { isBooked: true} }).session(session);
          if (res!=null)
          {
            //entity was found and manipulated
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
      //returns 500.
      throw new Error('artifical failures has been simulated');
    }
  }


  @Post(':id/CancelBook')
  @HttpCode(200)
  async CancelBookCarAsync(@Body() request: CancelBookCarRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
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
        await idempotencyTrackingModel.create([{idempotencyKey: idempotencyKey, actionWasDone: true}],{ session: session });
        const res = await carModel.findOneAndUpdate({carId: request.CarId, isBooked:true}, { $set: { isBooked: false} }).session(session);
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
  async CreateCarAsync(@Body() request: CreateCarRequest): Promise<string> {
    await carModel.create([{carId: request.CarId, carName: request.CarName, isBooked: false}]);
    return 'ok!';
  }

}
