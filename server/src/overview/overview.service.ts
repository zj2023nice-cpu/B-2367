import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from '../specialties/specialty.entity';
import { Schedule } from '../schedule/schedule.entity';
import { UserProfile } from '../user/user-profile.entity';

export interface OverviewLatestSchedule {
  id: number;
  title: string;
  dateText: string;
}

export interface OverviewResult {
  specialtyCount: number;
  regionCount: number;
  scheduleCount: number;
  latestSchedule: OverviewLatestSchedule | null;
  defaultNickname: string;
  recentSpecialties: Specialty[];
}

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(
    @InjectRepository(Specialty)
    private readonly specialtyRepo: Repository<Specialty>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
  ) {}

  async getOverview(): Promise<OverviewResult> {
    this.logger.log('获取首页总览数据');

    const [
      specialtyCount,
      regionCount,
      scheduleCount,
      latestSchedule,
      defaultProfile,
    ] = await Promise.all([
      this.specialtyRepo.count(),
      this.specialtyRepo
        .createQueryBuilder('s')
        .select('COUNT(DISTINCT s.address)', 'cnt')
        .getRawOne()
        .then((row) => Number(row?.cnt ?? 0)),
      this.scheduleRepo.count(),
      this.scheduleRepo
        .createQueryBuilder('sc')
        .orderBy('sc.id', 'DESC')
        .limit(1)
        .getOne(),
      this.userProfileRepo.findOne({ where: { key: 'default' } }),
    ]);

    const latest: OverviewLatestSchedule | null = latestSchedule
      ? {
          id: latestSchedule.id,
          title: latestSchedule.title,
          dateText: latestSchedule.dateText,
        }
      : null;

    return {
      specialtyCount,
      regionCount,
      scheduleCount,
      latestSchedule: latest,
      defaultNickname: defaultProfile?.nickname ?? '游客',
      recentSpecialties: [],
    };
  }
}
