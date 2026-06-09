import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialty } from '../specialties/specialty.entity';
import { Schedule } from '../schedule/schedule.entity';
import { UserProfile } from '../user/user-profile.entity';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Specialty, Schedule, UserProfile])],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
