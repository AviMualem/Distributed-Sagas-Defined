import {ApiModelProperty} from '@nestjs/swagger';

export class CreateApartmentRequest {
  @ApiModelProperty({required : true})
  readonly ApartmentId: string;

  @ApiModelProperty({required : true})
  readonly ApartmentName: string;

}
