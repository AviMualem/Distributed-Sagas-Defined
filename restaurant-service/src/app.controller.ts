import { Controller, Get, Post, Body, Param, HttpCode, Inject, Req, HttpStatus, HttpException, Res } from '@nestjs/common';
import { AppService } from './app.service';
import {ApiUseTags} from '@nestjs/swagger';
import { Connection } from 'mongoose';
import {idempotencyTrackingModel} from './DomianObjects/IdempotencyTracking';
import { CreateRestaurantRequest } from './dto/CreateRestaurantRequest';
import { restaurantModel } from './DomianObjects/Restaurant';
import { BookRestaurantRequest } from './dto/BookRestaurantRequest';
import { CancelBookRestaurantRequest } from './dto/CancelBookRestaurantRequest';

@Controller()
@ApiUseTags('restaurants')
export class AppController {
  connection: Connection  ;
  constructor(@Inject('mongo')private readonly mongo: Connection) {
    this.connection = mongo;
  }

  @Post(':id/Book')
  @HttpCode(200)
  async BookRestaurantsAsync(@Body() request: BookRestaurantRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
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
        await idempotencyTrackingModel.create([{idempotencyKey: idempotencyKey, actionWasDone: true}], {session: session});
        const res = await restaurantModel.findOneAndUpdate({restaurantId: request.RestaurantId, isBooked:false}, { $set: { isBooked: true} }).session(session);
        if(res!=null)
        {
          await session.commitTransaction();
          return "endpoint successfully booked the resource.";
        }
        else
        {
          await session.abortTransaction();
          throw new Error('entity doenst exist.')
        }
        
      }
      return "endpoint has previously processed that request so no action has been done.";
    } else {
      throw new Error('artifical failures has been simulated');
    }
  }

  @Post(':id/CancelBook')
  @HttpCode(200)
  async CancelBookCarAsync(@Body() request: CancelBookRestaurantRequest, @Param('id') id, @Req() incomingWebRequest): Promise<string> {
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
        await idempotencyTrackingModel.create([{idempotencyKey:idempotencyKey, actionWasDone: true}],{ session: session });
        const res = await restaurantModel.findOneAndUpdate({restaurantId: request.RestaurantId, isBooked:true}, { $set: { isBooked: false} }).session(session);
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
      throw new Error('artifical failure has been simulated');}
  }

  @Post('Create')
  @HttpCode(201)
  async CreateRestaurantsAsync(@Body() request: CreateRestaurantRequest): Promise<string> {
    await restaurantModel.create([{restaurantId: request.RestaurantId, restaurantName: request.RestaurantName, isBooked: false}]);
    return 'ok!';

  }
}
