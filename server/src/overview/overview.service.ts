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

export interface OverviewQuickEntry {
  key: string;
  label: string;
  icon: string;
  path: string;
}

export interface OverviewStats {
  specialtyCount: number;
  regionCount: number;
  scheduleCount: number;
}

export interface OverviewResult {
  defaultNickname: string;
  stats: OverviewStats;
  latestSchedule: OverviewLatestSchedule | null;
  recentSpecialties: OverviewRecentSpecialty[];
  quickEntries: OverviewQuickEntry[];
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

  private static readonly QUICK_ENTRIES: OverviewQuickEntry[] = [
    { key: 'specialties', label: '特产', icon: '🎁', path: '/pages/specialties/index' },
    { key: 'schedule', label: '日程', icon: '📅', path: '/pages/schedule/index' },
    { key: 'map', label: '地图', icon: '🗺️', path: '/pages/map/index' },
    { key: 'user', label: '我的', icon: '👤', path: '/pages/user/index' },
  ];

  async getOverview(visitedIds: number[] = []): Promise<OverviewResult> {
    this.logger.log('获取首页总览数据');

    const recentSpecialtiesPromise =
      visitedIds.length > 0
        ? this.specialtyRepo
            .createQueryBuilder('s')
            .select(['s.id', 's.title', 's.imageUrl', 's.address'])
            .where('s.id IN (:...ids)', { ids: visitedIds })
            .getMany()
        : Promise.resolve([]);

    const [
      specialtyCountResult,
      addressRowsResult,
      scheduleCountResult,
      scheduleRowsResult,
      defaultProfileResult,
      recentSpecialtiesResult,
    ] = await Promise.allSettled([
      this.specialtyRepo.count(),
      this.specialtyRepo
        .createQueryBuilder('s')
        .select('s.address', 'address')
        .getRawMany(),
      this.scheduleRepo.count(),
      this.scheduleRepo
        .createQueryBuilder('sc')
        .select(['sc.id', 'sc.title', 'sc.dateText'])
        .orderBy('sc.id', 'DESC')
        .getMany(),
      this.userProfileRepo.findOne({ where: { key: 'default' } }),
      recentSpecialtiesPromise,
    ]);

    const specialtyCount =
      specialtyCountResult.status === 'fulfilled' ? specialtyCountResult.value : 0;

    const addressRows =
      addressRowsResult.status === 'fulfilled' ? addressRowsResult.value : [];
    const addresses = addressRows.map(
      (row: { address?: string }) => row.address ?? '',
    );
    const regionCount = countDistinctRegions(addresses);

    const scheduleCount =
      scheduleCountResult.status === 'fulfilled' ? scheduleCountResult.value : 0;

    const scheduleRows =
      scheduleRowsResult.status === 'fulfilled' ? scheduleRowsResult.value : [];
    const latestSchedule = this.pickLatestParseableSchedule(scheduleRows);

    const defaultProfile =
      defaultProfileResult.status === 'fulfilled'
        ? defaultProfileResult.value
        : null;

    const recentRows =
      recentSpecialtiesResult.status === 'fulfilled'
        ? recentSpecialtiesResult.value
        : [];
    const recentById = new Map<number, OverviewRecentSpecialty>();
    for (const r of recentRows as Pick<Specialty, 'id' | 'title' | 'imageUrl' | 'address'>[]) {
      recentById.set(r.id, {
        id: r.id,
        title: r.title,
        imageUrl: r.imageUrl,
        address: r.address,
      });
    }
    const recentSpecialties: OverviewRecentSpecialty[] = visitedIds
      .filter((id) => recentById.has(id))
      .map((id) => recentById.get(id)!);

    return {
      defaultNickname: defaultProfile?.nickname ?? '游客',
      stats: { specialtyCount, regionCount, scheduleCount },
      latestSchedule,
      recentSpecialties,
      quickEntries: OverviewService.QUICK_ENTRIES,
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
