import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { seedDatabase } from './database/seed';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 全局参数校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 允许跨域（小程序开发调试用）
  app.enableCors();

  // 执行 Seed 数据初始化
  const dataSource = app.get(DataSource);
  await seedDatabase(dataSource);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`服务已启动: http://localhost:${port}`);
}

void bootstrap();
