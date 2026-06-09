import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Specialty } from './specialties/specialty.entity';
import { Schedule } from './schedule/schedule.entity';
import { UserProfile } from './user/user-profile.entity';
import { SpecialtiesModule } from './specialties/specialties.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UserModule } from './user/user.module';
import { MapModule } from './map/map.module';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    // 静态资源服务（上传图片/本地图片）
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    // SQLite 数据库（使用 sql.js 驱动）
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoSave: true,
      location: join(__dirname, '..', 'data', 'app.db'),
      entities: [Specialty, Schedule, UserProfile],
      synchronize: true, // MVP 开发阶段自动同步表结构
      logging: false,
    }),
    // 业务模块
    SpecialtiesModule,
    ScheduleModule,
    UserModule,
    MapModule,
  ],
})
export class AppModule {}
