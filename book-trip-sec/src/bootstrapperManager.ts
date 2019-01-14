import { InitDbConnection } from './mongoDbIntegration';
import { checkForMessages } from './azureServiceBusIntegration';
const azure = require('azure-sb');
export async function bootstrap()
 {
    await InitDbConnection();
    
    // require('dotenv').config();
    // const uri = process.env.mongo_connection_string;
    // await mongoose.connect(uri);
    // const mongoDbConnection = mongoose.connection;
    // const coll = await mongoDbConnection.db.listCollections().toArray();
    // const sagaLogCollection = coll.find(x => x.name === 'sagalogs');
    // if  (sagaLogCollection === undefined) {

    //     await mongoDbConnection.createCollection('sagalogs');
    // }
   
    //bus integration.!!
    // const sbService = azure.createServiceBusService('Endpoint=sb://avitests.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=KdYr6P7yknynQRbEs5KoIVQoGsXpZMruxK6Doxu/lDQ=');
    // (checkForMessages.bind(null, sbService, 'avi'), 200);
}