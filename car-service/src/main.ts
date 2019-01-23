import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  require('dotenv').config();
  // console.log(require('dotenv').config().parsed)
  // console.log('starting nest bootsrapping')
  const app = await NestFactory.create(AppModule);
  const options = new DocumentBuilder()
    .setTitle('Car Rental service')
    .setDescription('Car Rental Api')
    .setVersion('1.0')
    .addTag('cars')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
