import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from '../specialties/specialty.entity';
import { Schedule } from '../schedule/schedule.entity';
import { UserProfile } from '../user/user-profile.entity';
import { parseDateText } from './date-parser';
import { countDistinctRegions } from './region-extractor';

export interface OverviewLatestSchedule {
  id: number;
  title: string;
  dateText: string;
}

export interface OverviewRecentSpecialty {
  id: number;
  title: string;
  imageUrl: string;
  address: string;
}

export interface OverviewResult {
  specialtyCount: number;
  regionCount: number;
  scheduleCount: number;
  completedScheduleCount: number;
  latestSchedule: OverviewLatestSchedule | null;
  defaultNickname: string;
  recentSpecialties: OverviewRecentSpecialty[];
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
      addressRows,
      scheduleCount,
      completedScheduleCount,
      scheduleRows,
      defaultProfile,
    ] = await Promise.all([
      this.specialtyRepo.count(),
      this.specialtyRepo
        .createQueryBuilder('s')
        .select('s.address', 'address')
        .getRawMany(),
      this.scheduleRepo.count(),
      this.scheduleRepo.count({ where: { completed: true } }),
      this.scheduleRepo
        .createQueryBuilder('sc')
        .select(['sc.id', 'sc.title', 'sc.dateText'])
        .orderBy('sc.id', 'DESC')
        .getMany(),
      this.userProfileRepo.findOne({ where: { key: 'default' } }),
    ]);

    const addresses = addressRows.map(
      (row: { address?: string }) => row.address ?? '',
    );
    const regionCount = countDistinctRegions(addresses);

    const latestSchedule = this.pickLatestParseableSchedule(scheduleRows);

    return {
      specialtyCount,
      regionCount,
      scheduleCount,
      completedScheduleCount,
      latestSchedule,
      defaultNickname: defaultProfile?.nickname ?? '游客',
      recentSpecialties: [],
    };
  }

  private pickLatestParseableSchedule(
    rows: Pick<Schedule, 'id' | 'title' | 'dateText'>[],
  ): OverviewLatestSchedule | null {
    let best: { row: Pick<Schedule, 'id' | 'title' | 'dateText'>; ts: number } | null = null;

    for (const row of rows) {
      const parsed = parseDateText(row.dateText);
      if (!parsed.valid || !parsed.date) continue;
      const ts = parsed.date.getTime();
      if (!best || ts > best.ts) {
        best = { row, ts };
      }
    }

    if (!best) return null;
    return {
      id: best.row.id,
      title: best.row.title,
      dateText: best.row.dateText,
    };
  }
}
