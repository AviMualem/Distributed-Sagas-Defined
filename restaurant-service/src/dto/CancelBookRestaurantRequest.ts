import {ApiModelProperty} from '@nestjs/swagger';

export class CancelBookRestaurantRequest {
  @ApiModelProperty({required : true})
  readonly RestaurantId: string;

  @ApiModelProperty({required : true})
  readonly LetMyRequestPass: boolean;

  @ApiModelProperty({required : true})
  readonly BusinessTxId: string;

  @ApiModelProperty({required : false})
  readonly ReturnThisHttpCode: number;


}
