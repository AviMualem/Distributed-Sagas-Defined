import * as mongoose from 'mongoose';

export const connectionProvider = {
  provide: 'mongo',
  useFactory: async () =>
  {
     // const uri = 'mongodb://localhost:37017,localhost:37018,localhost:37019/avitests?replicaSet=rs0';

     const uri = process.env.mongo_connection_string;
     try
    {
      await mongoose.connect(uri);
      const mongoDbConnection = mongoose.connection;
      const coll = await mongoDbConnection.db.listCollections().toArray();
      const carsCollection = coll.find(x => x.name === 'apartments');
      const idempotencyTranckingCollection = coll.find(x => x.name === 'idempotencytrackingapartments');
      if  (carsCollection === undefined)
        {
          await mongoDbConnection.createCollection('apartments');
        }

      if  (idempotencyTranckingCollection === undefined)
        {
          await mongoDbConnection.createCollection('idempotencytrackingapartments');
        }
      return mongoDbConnection;
    }
    catch (e)
    {
      // log.
      throw e;
    }
  },
  };
