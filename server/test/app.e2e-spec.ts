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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/specialties returns wrapped list with at least 6 records', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/specialties')
      .expect(200);

    const body = response.body as ApiResponse<SpecialtyDto[]>;

    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(6);
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
    const nickname = `e2e-${Date.now()}`;

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
});
