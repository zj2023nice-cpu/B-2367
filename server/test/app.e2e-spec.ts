import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { MapService } from './../src/map/map.service';
import { seedDatabase } from './../src/database/seed';
import { DataSource } from 'typeorm';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface SpecialtyDto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  address: string;
  region: string;
}

interface PaginatedSpecialties {
  list: SpecialtyDto[];
  total: number;
}

interface ScheduleDto {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  dateText: string;
}

interface UserProfileDto {
  nickname: string;
  avatarUrl: string;
}

interface OverviewRecentSpecialtyDto {
  id: number;
  title: string;
  imageUrl: string;
  address: string;
}

interface OverviewDto {
  stats: {
    specialtyCount: number;
    regionCount: number;
    scheduleCount: number;
  };
  latestSchedule: {
    id: number;
    title: string;
    dateText: string;
  } | null;
  defaultNickname: string;
  recentSpecialties: OverviewRecentSpecialtyDto[];
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const geocodeMock = jest.fn((address: string) => {
    if (address === '___INVALID_ADDRESS___') {
      throw new HttpException(
        '地址解析失败 (腾讯地图: 参数错误)',
        HttpStatus.BAD_REQUEST,
      );
    }

    return Promise.resolve({
      address,
      lat: 39.9087,
      lng: 116.3975,
      formattedAddress: '北京市东城区王府井大街',
    });
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MapService)
      .useValue({ geocode: geocodeMock })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    const dataSource = app.get(DataSource);
    await seedDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/specialties returns paginated result with list and total', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data.list)).toBe(true);
    expect(body.data.list.length).toBeGreaterThanOrEqual(6);
    expect(typeof body.data.total).toBe('number');
    expect(body.data.total).toBeGreaterThanOrEqual(6);
  });

  it('GET /api/specialties?keyword=烤鸭 filters by keyword in title/description/address', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties?keyword=烤鸭')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    expect(body.data.list.length).toBeGreaterThan(0);
    body.data.list.forEach((item) => {
      const match =
        item.title.includes('烤鸭') ||
        item.description.includes('烤鸭') ||
        item.address.includes('烤鸭');
      expect(match).toBe(true);
    });
  });

  it('GET /api/specialties?keyword=  酥脆  trims and collapses spaces', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties?keyword=%20%20酥脆%20%20')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    expect(body.data.list.length).toBeGreaterThan(0);
  });

  it('GET /api/specialties?region=北京,天津 filters by region column', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties?region=北京,天津')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    expect(body.data.list.length).toBeGreaterThan(0);
    body.data.list.forEach((item) => {
      const match = item.region === '北京' || item.region === '天津';
      expect(match).toBe(true);
    });
  });

  it('GET /api/specialties?keyword=北京&region=北京 combines filters with AND', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties?keyword=北京&region=北京')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    if (body.data.list.length > 0) {
      body.data.list.forEach((item) => {
        const kwMatch =
          item.title.includes('北京') ||
          item.description.includes('北京') ||
          item.address.includes('北京');
        expect(kwMatch).toBe(true);
        expect(item.region).toBe('北京');
      });
    }
  });

  it('GET /api/specialties?limit=2 paginates results', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties?limit=2')
      .expect(200);

    const body = response.body as ApiResponse<PaginatedSpecialties>;

    expect(body.code).toBe(0);
    expect(body.data.list.length).toBeLessThanOrEqual(2);
    expect(body.data.total).toBeGreaterThanOrEqual(6);
  });

  it('GET /api/specialties?limit=2&offset=2 skips first results', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/api/specialties?limit=2&offset=0')
      .expect(200);

    const secondPage = await request(app.getHttpServer())
      .get('/api/specialties?limit=2&offset=2')
      .expect(200);

    const firstBody = firstPage.body as ApiResponse<PaginatedSpecialties>;
    const secondBody = secondPage.body as ApiResponse<PaginatedSpecialties>;

    expect(firstBody.data.list.length).toBeLessThanOrEqual(2);
    expect(secondBody.data.list.length).toBeLessThanOrEqual(2);

    if (firstBody.data.list.length > 0 && secondBody.data.list.length > 0) {
      expect(firstBody.data.list[0].id).not.toBe(secondBody.data.list[0].id);
    }
  });

  it('GET /api/specialties?limit=0 returns validation error', async () => {
    await request(app.getHttpServer())
      .get('/api/specialties?limit=0')
      .expect(400);
  });

  it('GET /api/specialties?offset=-1 returns validation error', async () => {
    await request(app.getHttpServer())
      .get('/api/specialties?offset=-1')
      .expect(400);
  });

  it('GET /api/specialties?limit=51 returns validation error', async () => {
    await request(app.getHttpServer())
      .get('/api/specialties?limit=51')
      .expect(400);
  });

  it('GET /api/schedules returns wrapped list with at least 6 records', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/schedules')
      .expect(200);

    const body = response.body as ApiResponse<ScheduleDto[]>;

    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(6);
  });

  it('PUT + GET /api/user/profile persists nickname update', async () => {
    const nickname = `e2e${Date.now() % 10000}`;

    const updateResponse = await request(app.getHttpServer())
      .put('/api/user/profile')
      .send({ nickname, avatarUrl: '' })
      .expect(200);

    const updateBody = updateResponse.body as ApiResponse<null>;
    expect(updateBody.code).toBe(0);
    expect(updateBody.message).toBe('ok');
    expect(updateBody.data).toBeNull();

    const profileResponse = await request(app.getHttpServer())
      .get('/api/user/profile')
      .expect(200);

    const profileBody = profileResponse.body as ApiResponse<UserProfileDto>;

    expect(profileBody.code).toBe(0);
    expect(profileBody.message).toBe('ok');
    expect(profileBody.data.nickname).toBe(nickname);
  });

  it('GET /api/map/geocode succeeds for a valid address', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/map/geocode?address=北京市东城区王府井大街')
      .expect(200);

    const body = response.body as ApiResponse<{
      address: string;
      lat: number;
      lng: number;
      formattedAddress?: string;
    }>;

    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect(typeof body.data.lat).toBe('number');
    expect(typeof body.data.lng).toBe('number');
    expect(geocodeMock).toHaveBeenCalledWith('北京市东城区王府井大街');
  });

  it('GET /api/map/geocode returns wrapped error for invalid address', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/map/geocode?address=___INVALID_ADDRESS___')
      .expect(400);

    const body = response.body as ApiResponse<null>;

    expect(body.code).toBe(1);
    expect(body.message).toContain('地址解析失败');
    expect(body.data).toBeNull();
    expect(geocodeMock).toHaveBeenCalledWith('___INVALID_ADDRESS___');
  });

  it('GET /api/overview returns aggregated stats with semantic correctness', async () => {
    const overviewRes = await request(app.getHttpServer())
      .get('/api/overview')
      .expect(200);

    const overviewBody = overviewRes.body as ApiResponse<OverviewDto>;

    expect(overviewBody.code).toBe(0);
    expect(overviewBody.message).toBe('ok');

    expect(typeof overviewBody.data.stats.specialtyCount).toBe('number');
    expect(overviewBody.data.stats.specialtyCount).toBeGreaterThanOrEqual(0);

    expect(typeof overviewBody.data.stats.regionCount).toBe('number');
    expect(typeof overviewBody.data.stats.scheduleCount).toBe('number');
    expect(overviewBody.data.stats.scheduleCount).toBeGreaterThanOrEqual(0);

    expect(typeof overviewBody.data.defaultNickname).toBe('string');
    expect(overviewBody.data.defaultNickname.length).toBeGreaterThan(0);

    expect(Array.isArray(overviewBody.data.recentSpecialties)).toBe(true);

    const specialtiesRes = await request(app.getHttpServer())
      .get('/api/specialties')
      .expect(200);

    const specialtiesBody =
      specialtiesRes.body as ApiResponse<PaginatedSpecialties>;

    const regionsFromData = new Set<string>();
    for (const s of specialtiesBody.data.list) {
      if (s.region) {
        regionsFromData.add(s.region);
      }
    }

    expect(overviewBody.data.stats.regionCount).toBe(regionsFromData.size);

    const distinctAddresses = new Set(
      specialtiesBody.data.list.map((s) => s.address),
    );
    expect(distinctAddresses.size).toBeGreaterThan(0);
    expect(overviewBody.data.stats.regionCount).toBeLessThanOrEqual(
      distinctAddresses.size,
    );

    const schedulesRes = await request(app.getHttpServer())
      .get('/api/schedules')
      .expect(200);

    const schedulesBody = schedulesRes.body as ApiResponse<ScheduleDto[]>;

    const CHINESE_FULL =
      /^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/;
    const WEEKDAY_SUFFIX =
      /\s*[·\s]+\s*(?:星期[一二三四五六日天]|周[一二三四五六日天]|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*)\s*$/i;

    let expectedLatest: {
      id: number;
      title: string;
      dateText: string;
      ts: number;
    } | null = null;

    for (const sch of schedulesBody.data) {
      const stripped = sch.dateText
        .replace(WEEKDAY_SUFFIX, '')
        .trim();
      const m = stripped.match(CHINESE_FULL);
      if (!m) continue;
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      const day = parseInt(m[3], 10);
      const d = new Date(year, month - 1, day);
      if (
        d.getFullYear() !== year ||
        d.getMonth() !== month - 1 ||
        d.getDate() !== day
      )
        continue;
      const ts = d.getTime();
      if (!expectedLatest || ts > expectedLatest.ts) {
        expectedLatest = { id: sch.id, title: sch.title, dateText: sch.dateText, ts };
      }
    }

    expect(overviewBody.data.latestSchedule).not.toBeNull();
    const ls = overviewBody.data.latestSchedule!;

    if (expectedLatest) {
      expect(ls.id).toBe(expectedLatest.id);
      expect(ls.title).toBe(expectedLatest.title);
      expect(ls.dateText).toBe(expectedLatest.dateText);
    }

    const chineseDateRe = /^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日?/;
    expect(ls.dateText).toMatch(chineseDateRe);
  });
});
