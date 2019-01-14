import * as mongoose from 'mongoose';


export async function InitDbConnection() :Promise<any>
{
    require('dotenv').config();
    const uri = process.env.mongo_connection_string;
    await mongoose.connect(uri);
    const mongoDbConnection = mongoose.connection;
    const coll = await mongoDbConnection.db.listCollections().toArray();
    const sagaLogCollection = coll.find(x => x.name === 'sagalogs');
    if  (sagaLogCollection === undefined) {

        await mongoDbConnection.createCollection('sagalogs');
    }
}