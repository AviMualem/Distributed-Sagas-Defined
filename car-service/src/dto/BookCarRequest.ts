import {ApiModelProperty} from '@nestjs/swagger';

export class BookCarRequest {
  @ApiModelProperty({required : true})
  readonly CarId: string;

  @ApiModelProperty({required : true})
  readonly LetMyRequestPass: boolean;

  @ApiModelProperty({required : true})
  readonly BusinessTxId: string;

  @ApiModelProperty({required : false})
  readonly ReturnThisHttpCode: number;
  

}
