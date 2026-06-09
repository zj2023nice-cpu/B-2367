import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { seedDatabase } from './seed';
import { Specialty } from '../specialties/specialty.entity';
import { Schedule } from '../schedule/schedule.entity';
import { UserProfile } from '../user/user-profile.entity';

describe('seedDatabase', () => {
  let dataSource: DataSource;

  async function createDataSource(): Promise<DataSource> {
    const source = new DataSource({
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      entities: [Specialty, Schedule, UserProfile],
    });

    await source.initialize();
    return source;
  }

  beforeEach(async () => {
    dataSource = await createDataSource();
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('seeds concrete schedules for empty database', async () => {
    await seedDatabase(dataSource);

    const schedules = await dataSource.getRepository(Schedule).find({
      order: { id: 'ASC' },
    });

    expect(schedules.length).toBeGreaterThanOrEqual(6);
    expect(schedules.every((item) => item.imageUrl.startsWith('/images/'))).toBe(true);
    expect(schedules.every((item) => /^\d{4}年\d{2}月\d{2}日/.test(item.dateText))).toBe(true);
    expect(schedules.some((item) => item.title.includes('北京'))).toBe(true);
  });

  it('replaces placeholder schedules with concrete defaults', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '【日程标题1】',
        description: '【请在此处填写日程1的详细描述】',
        imageUrl: '/images/placeholder1.jpg',
        dateText: '【日期1】',
      },
      {
        title: '【日程标题2】',
        description: '【请在此处填写日程2的详细描述】',
        imageUrl: '/images/placeholder2.jpg',
        dateText: '【日期2】',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBeGreaterThanOrEqual(6);
    expect(schedules.some((item) => item.imageUrl.includes('placeholder'))).toBe(false);
    expect(schedules.some((item) => item.dateText.includes('【日期'))).toBe(false);
    expect(schedules.some((item) => item.title.includes('【日程标题'))).toBe(false);
  });

  it('replaces legacy generic schedules with concrete defaults', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '抵达目的地',
        description: '乘坐高铁/飞机前往目的城市，入住酒店并休息调整。',
        imageUrl: '/images/arrive.jpg',
        dateText: '第一天 09:00',
      },
      {
        title: '返程',
        description: '收拾行李，前往车站/机场，踏上归途。',
        imageUrl: '/images/hotpot.jpg',
        dateText: '第三天 14:00',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBeGreaterThanOrEqual(6);
    expect(schedules.some((item) => /^第[一二三四五六七八九十]+天/.test(item.dateText))).toBe(false);
    expect(schedules.some((item) => item.title === '抵达目的地')).toBe(false);
    expect(schedules.some((item) => item.title === '返程')).toBe(false);
  });
});
