import { SocketTimeoutError } from './CustomErrors/SocketTimeoutError';
import { ConnectionRefusedError } from './CustomErrors/ConnectionRefusedError';
import { InternalServerFailureError } from './CustomErrors/InternalServerFailureError';
const request = require('request');
const rp = require('request-promise');



export class HttpRequestDetails
{
    Uri:string;
    JsonBody;
    constructor(uri:string,jsonBody)
    {
      this.Uri =uri;
      this.JsonBody =jsonBody;
    }
}

export async function InvokeHttpPostMethod(uri:string, body, timeoutImMs?: number) : Promise<number>
{

  const w =timeoutImMs;
  const request = {
    resolveWithFullResponse: true,
    method: 'POST',
    uri: uri,
    body: body,
    json: true,
    //timeoutImMs: 100
   };

   if(timeoutImMs!= undefined)
   {
     //@ts-ignore
     request.timeout = timeoutImMs;
   }

   try
   {
      let response = await rp(request);
      // if(response.statusCode === 500)
      // {
      //   throw new Error('500 is invalid');
      // }

      return response.statusCode;
   }
   catch(e)
   {
      if (e.name === 'StatusCodeError')
      {
        const code  = e.error.statusCode as number;
        if(code===408)
        {
          throw new SocketTimeoutError(uri +' ' +e);
        }

        if(code === 500)
        {
          throw new InternalServerFailureError(uri +' ' +e);
        }

        else return code;
      }
      
      if (e.error.code === 'ETIMEDOUT' || e.error.code === 'ESOCKETTIMEDOUT')
      {
        throw new SocketTimeoutError(uri +' ' +e);
      }

      if (e.error.code === 'ECONNREFUSED')
      {
        throw new ConnectionRefusedError(uri +' ' +e);
      }

      //Throwing an other non expected exception.
      throw e;
   }
}