import { Module } from '@nestjs/common';
import { connectionProvider } from '../Providers/database.providers';

@Module({
  providers: [connectionProvider],
  exports: [connectionProvider],
})
export class DatabaseModule {}