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
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoSave: true,
      location: join(__dirname, '..', 'data', 'app.db'),
      entities: [Specialty, Schedule, UserProfile],
      synchronize: true,
      logging: false,
    }),
    SpecialtiesModule,
    ScheduleModule,
    UserModule,
    MapModule,
    OverviewModule,
  ],
})
export class AppModule {}
