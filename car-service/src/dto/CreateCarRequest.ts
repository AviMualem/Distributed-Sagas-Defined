import {ApiModelProperty} from '@nestjs/swagger';

export class CreateCarRequest {
  @ApiModelProperty({required : true})
  readonly CarId: string;

  @ApiModelProperty({required : true})
  readonly CarName: string;

}
