import {ApiModelProperty} from '@nestjs/swagger';

export class CancelBookApartmentRequest {
  @ApiModelProperty({required : true})
  readonly ApartmentId: string;

  @ApiModelProperty({required : true})
  readonly LetMyRequestPass: boolean;

  @ApiModelProperty({required : true})
  readonly BusinessTxId: string;

  @ApiModelProperty({required : false})
  readonly ReturnThisHttpCode: number;

}
