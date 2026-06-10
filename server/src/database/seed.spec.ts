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
    expect(
      schedules.every((item) => item.imageUrl.startsWith('/images/')),
    ).toBe(true);
    expect(
      schedules.every((item) => /^\d{4}年\d{2}月\d{2}日/.test(item.dateText)),
    ).toBe(true);
    expect(schedules.some((item) => item.title.includes('北京'))).toBe(true);
  });

  it('seeds specialties with region for empty database', async () => {
    await seedDatabase(dataSource);

    const specialties = await dataSource.getRepository(Specialty).find({
      order: { id: 'ASC' },
    });

    expect(specialties.length).toBe(8);
    expect(specialties.every((s) => s.region && s.region.length > 0)).toBe(
      true,
    );
    const beijing = specialties.find((s) => s.title === '北京烤鸭');
    expect(beijing?.region).toBe('北京');
  });

  it('backfills region for existing specialties without region', async () => {
    const specialtyRepo = dataSource.getRepository(Specialty);

    await specialtyRepo.save([
      {
        title: '北京烤鸭',
        description: '北京烤鸭',
        imageUrl: '/images/duck.jpg',
        address: '北京市东城区王府井大街',
        region: '',
      },
      {
        title: '杭州龙井茶',
        description: '西湖龙井',
        imageUrl: '/images/tea.jpg',
        address: '浙江省杭州市西湖区龙井路',
        region: '',
      },
    ]);

    await seedDatabase(dataSource);

    const specialties = await specialtyRepo.find({ order: { id: 'ASC' } });
    expect(specialties.length).toBe(2);

    const beijing = specialties.find((s) => s.title === '北京烤鸭');
    expect(beijing?.region).toBe('北京');

    const hangzhou = specialties.find((s) => s.title === '杭州龙井茶');
    expect(hangzhou?.region).toBe('浙江');
  });

  it('does not overwrite existing region values during backfill', async () => {
    const specialtyRepo = dataSource.getRepository(Specialty);

    await specialtyRepo.save([
      {
        title: '北京烤鸭',
        description: '北京烤鸭',
        imageUrl: '/images/duck.jpg',
        address: '北京市东城区王府井大街',
        region: '北京',
      },
    ]);

    await seedDatabase(dataSource);

    const specialties = await specialtyRepo.find({ order: { id: 'ASC' } });
    expect(specialties.length).toBe(1);
    expect(specialties[0].region).toBe('北京');
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
    expect(
      schedules.some((item) => item.imageUrl.includes('placeholder')),
    ).toBe(false);
    expect(schedules.some((item) => item.dateText.includes('【日期'))).toBe(
      false,
    );
    expect(schedules.some((item) => item.title.includes('【日程标题'))).toBe(
      false,
    );
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
    expect(
      schedules.some((item) =>
        /^第[一二三四五六七八九十]+天/.test(item.dateText),
      ),
    ).toBe(false);
    expect(schedules.some((item) => item.title === '抵达目的地')).toBe(false);
    expect(schedules.some((item) => item.title === '返程')).toBe(false);
  });

  it('does NOT replace schedules when some are valid and some are placeholders', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '真实日程',
        description: '这是一个合法的日程描述',
        imageUrl: '/images/duck.jpg',
        dateText: '2026年06月01日 · 周日',
      },
      {
        title: '【日程标题1】',
        description: '【请在此处填写日程1的详细描述】',
        imageUrl: '/images/placeholder1.jpg',
        dateText: '【日期1】',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBe(2);
    expect(schedules.some((s) => s.title === '真实日程')).toBe(true);
    expect(
      schedules.some((s) => s.title.includes('【日程标题')),
    ).toBe(true);
  });

  it('does NOT replace schedules when some are valid and some are legacy generic', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '成都宽窄巷子火锅底料选品',
        description: '下午在宽窄巷子周边门店对比火锅底料口味。',
        imageUrl: '/images/hotpot.jpg',
        dateText: '2026年05月01日 · 周五',
      },
      {
        title: '抵达目的地',
        description: '乘坐高铁前往目的城市。',
        imageUrl: '/images/arrive.jpg',
        dateText: '第一天 09:00',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBe(2);
    expect(
      schedules.some((s) => s.title === '抵达目的地'),
    ).toBe(true);
    expect(
      schedules.some((s) => s.title === '成都宽窄巷子火锅底料选品'),
    ).toBe(true);
  });

  it('fixes schedules with null completed field to false and completedAt to null', async () => {
    const nullableSource = new DataSource({
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      entities: [Specialty, Schedule, UserProfile],
    });
    await nullableSource.initialize();

    try {
      await nullableSource.query(`DROP TABLE schedules`);
      await nullableSource.query(`
        CREATE TABLE schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          image_url TEXT NOT NULL,
          date_text TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          completed_at DATETIME DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT (datetime('now')),
          updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
        )
      `);

      const scheduleRepo = nullableSource.getRepository(Schedule);

      await scheduleRepo.save([
        {
          title: '真实日程A',
          description: '描述A',
          imageUrl: '/images/duck.jpg',
          dateText: '2026年06月01日 · 周日',
          completed: null,
          completedAt: null,
        },
        {
          title: '真实日程B',
          description: '描述B',
          imageUrl: '/images/tea.jpg',
          dateText: '2026年06月02日 · 周一',
          completed: true,
          completedAt: new Date('2026-06-02'),
        },
      ] as Array<Partial<Schedule>>);

      await seedDatabase(nullableSource);

      const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

      expect(schedules.length).toBe(2);
      const fixed = schedules.find((s) => s.title === '真实日程A');
      expect(fixed!.completed).toBe(false);
      expect(fixed!.completedAt).toBeNull();

      const kept = schedules.find((s) => s.title === '真实日程B');
      expect(kept!.completed).toBe(true);
      expect(kept!.completedAt).not.toBeNull();
    } finally {
      await nullableSource.destroy();
    }
  });

  it('detects schedules with empty required fields as invalid and replaces when all are invalid', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '',
        description: '有描述',
        imageUrl: '/images/duck.jpg',
        dateText: '2026年06月01日 · 周日',
      },
      {
        title: '有标题',
        description: '',
        imageUrl: '/images/tea.jpg',
        dateText: '2026年06月02日 · 周一',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBeGreaterThanOrEqual(6);
    expect(schedules.every((s) => s.title.length > 0)).toBe(true);
    expect(schedules.every((s) => s.description.length > 0)).toBe(true);
  });

  it('detects schedules with placeholder imageUrl as invalid and replaces when all are invalid', async () => {
    const scheduleRepo = dataSource.getRepository(Schedule);

    await scheduleRepo.save([
      {
        title: '占位日程',
        description: '占位描述',
        imageUrl: '/images/placeholder3.jpg',
        dateText: '2026年06月01日 · 周日',
      },
      {
        title: '占位日程2',
        description: '占位描述2',
        imageUrl: '/images/placeholder7.jpg',
        dateText: '2026年06月02日 · 周一',
      },
    ]);

    await seedDatabase(dataSource);

    const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });

    expect(schedules.length).toBeGreaterThanOrEqual(6);
    expect(
      schedules.every((s) => !s.imageUrl.includes('placeholder')),
    ).toBe(true);
  });

  it('seeds default user profile when none exists', async () => {
    await seedDatabase(dataSource);

    const profileRepo = dataSource.getRepository(UserProfile);
    const profile = await profileRepo.findOne({ where: { key: 'default' } });

    expect(profile).not.toBeNull();
    expect(profile!.nickname).toBe('游客');
    expect(profile!.avatarUrl).toBe('');
    expect(profile!.bio).toBe('');
  });

  it('does not overwrite existing user profile', async () => {
    const profileRepo = dataSource.getRepository(UserProfile);

    await profileRepo.save({
      key: 'default',
      nickname: '自定义昵称',
      avatarUrl: 'https://example.com/avatar.png',
      bio: '自定义简介',
    });

    await seedDatabase(dataSource);

    const profile = await profileRepo.findOne({ where: { key: 'default' } });

    expect(profile!.nickname).toBe('自定义昵称');
    expect(profile!.avatarUrl).toBe('https://example.com/avatar.png');
    expect(profile!.bio).toBe('自定义简介');
  });
});
