import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { seedDatabase } from './database/seed';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin });
    logger.log(`CORS 已启用，允许来源: ${corsOrigin}`);
  } else {
    app.enableCors();
    logger.warn('CORS 已启用（允许所有来源），生产环境建议设置 CORS_ORIGIN');
  }

  const dataSource = app.get(DataSource);
  await seedDatabase(dataSource);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`服务已启动: http://localhost:${port}`);
}

void bootstrap();
