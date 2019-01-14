import {ApiModelProperty} from '@nestjs/swagger';

export class CreateRestaurantRequest {
  @ApiModelProperty({required : true})
  readonly RestaurantId: string;

  @ApiModelProperty({required : true})
  readonly RestaurantName: string;

}
