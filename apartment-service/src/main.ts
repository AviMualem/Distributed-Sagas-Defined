import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  require('dotenv').config();
  const app = await NestFactory.create(AppModule);
  const options = new DocumentBuilder()
    .setTitle('apartment Rental service')
    .setDescription('apartment Rental Api')
    .setVersion('1.0')
    .addTag('apartment')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
  await app.listen(3001);
}
bootstrap();
