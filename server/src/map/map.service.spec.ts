import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MapService, BatchGeocodeItem } from './map.service';

describe('MapService', () => {
  async function createService(apiKey: string): Promise<MapService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: ConfigService,
          useValue: {
            get: () => apiKey,
          },
        },
      ],
    }).compile();

    return module.get(MapService);
  }

  it('throws BAD_REQUEST when address is empty', async () => {
    const service = await createService('mock-key');

    await expect(service.geocode('')).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws BAD_REQUEST with correct message when address is empty', async () => {
    const service = await createService('mock-key');

    try {
      await service.geocode('');
      fail('Expected geocode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).message).toBe('地址参数不能为空');
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('throws BAD_REQUEST when address is whitespace-only', async () => {
    const service = await createService('mock-key');

    await expect(service.geocode('   ')).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws INTERNAL_SERVER_ERROR with correct message when map key is missing', async () => {
    const service = await createService('');

    try {
      await service.geocode('北京市朝阳区');
      fail('Expected geocode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).message).toBe('腾讯地图 Key 未配置');
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  });

  it('throws HttpException instance for invalid input', async () => {
    const service = await createService('mock-key');

    try {
      await service.geocode('');
      fail('Expected geocode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
    }
  });
});

describe('MapService.batchGeocode dedup', () => {
  async function createServiceWithMock(
    geocodeMock: (addr: string) => Promise<{
      address: string;
      lat: number;
      lng: number;
      formattedAddress: string;
    }>,
  ): Promise<MapService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: ConfigService,
          useValue: { get: () => 'mock-key' },
        },
      ],
    }).compile();

    const service = module.get(MapService);
    jest.spyOn(service, 'geocode').mockImplementation(async (addr: string) => {
      return geocodeMock(addr);
    });

    return service;
  }

  it('deduplicates identical addresses and only calls geocode once per unique address', async () => {
    const callLog: string[] = [];
    const service = await createServiceWithMock(async (addr) => {
      callLog.push(addr);
      return { address: addr, lat: 1, lng: 2, formattedAddress: addr };
    });

    const results = await service.batchGeocode(['北京', '北京', '北京']);

    expect(callLog).toEqual(['北京']);
    expect(results.length).toBe(1);
    expect(results[0].address).toBe('北京');
    expect(results[0].lat).toBe(1);
  });

  it('deduplicates addresses that differ only in whitespace/casing', async () => {
    const callLog: string[] = [];
    const service = await createServiceWithMock(async (addr) => {
      callLog.push(addr);
      return { address: addr, lat: 1, lng: 2, formattedAddress: addr };
    });

    const results = await service.batchGeocode(['北京', '  北京  ', 'beijing']);

    expect(callLog.length).toBe(2);
    expect(results.length).toBe(2);
  });

  it('handles mixed success and failure with duplicate addresses', async () => {
    const callLog: string[] = [];
    const service = await createServiceWithMock(async (addr) => {
      callLog.push(addr);
      if (addr === '不存在的地方') {
        throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
      }
      return { address: addr, lat: 39.9, lng: 116.4, formattedAddress: addr };
    });

    const results = await service.batchGeocode([
      '北京',
      '不存在的地方',
      '  北京  ',
    ]);

    expect(callLog.length).toBe(2);
    expect(results.length).toBe(2);

    const successItems = results.filter((r) => !r.error);
    const failedItems = results.filter((r) => r.error);

    expect(successItems.length).toBe(1);
    expect(successItems[0].lat).toBe(39.9);
    expect(failedItems.length).toBe(1);
    expect(failedItems[0].address).toBe('不存在的地方');
  });

  it('throws BAD_REQUEST when all addresses are empty', async () => {
    const service = await createServiceWithMock(async (addr) => ({
      address: addr,
      lat: 1,
      lng: 2,
      formattedAddress: addr,
    }));

    await expect(service.batchGeocode(['', '  ', ''])).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws BAD_REQUEST with message when input array is empty', async () => {
    const service = await createServiceWithMock(async (addr) => ({
      address: addr,
      lat: 1,
      lng: 2,
      formattedAddress: addr,
    }));

    try {
      await service.batchGeocode([]);
      fail('Expected batchGeocode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).message).toBe('地址列表不能为空');
    }
  });

  it('throws BAD_REQUEST with message when all addresses are whitespace', async () => {
    const service = await createServiceWithMock(async (addr) => ({
      address: addr,
      lat: 1,
      lng: 2,
      formattedAddress: addr,
    }));

    try {
      await service.batchGeocode(['   ', '\t', '\n']);
      fail('Expected batchGeocode to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).message).toBe('地址列表不能为空');
    }
  });
});

describe('MapService.batchGeocode concurrent failure isolation', () => {
  async function createServiceWithMock(
    geocodeMock: (addr: string) => Promise<{
      address: string;
      lat: number;
      lng: number;
      formattedAddress: string;
    }>,
  ): Promise<MapService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: ConfigService,
          useValue: { get: () => 'mock-key' },
        },
      ],
    }).compile();

    const service = module.get(MapService);
    jest.spyOn(service, 'geocode').mockImplementation(async (addr: string) => {
      return geocodeMock(addr);
    });

    return service;
  }

  it('failed results contain error field but no lat/lng, successes are unaffected', async () => {
    const service = await createServiceWithMock(async (addr) => {
      if (addr === '失败地址') {
        throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
      }
      return {
        address: addr,
        lat: 39.9,
        lng: 116.4,
        formattedAddress: addr,
      };
    });

    const results = await service.batchGeocode(
      ['北京', '失败地址', '上海'],
      2,
    );

    const successes = results.filter((r) => !r.error);
    const failures = results.filter((r) => r.error);

    expect(successes.length).toBe(2);
    successes.forEach((item) => {
      expect(typeof item.lat).toBe('number');
      expect(typeof item.lng).toBe('number');
      expect(Number.isFinite(item.lat!)).toBe(true);
      expect(Number.isFinite(item.lng!)).toBe(true);
    });

    expect(failures.length).toBe(1);
    failures.forEach((item) => {
      expect(item.error).toBeTruthy();
      expect(item.lat).toBeUndefined();
      expect(item.lng).toBeUndefined();
    });
  });

  it('concurrent geocode calls with concurrency > 1 do not corrupt success/error partitioning', async () => {
    let callCount = 0;
    const service = await createServiceWithMock(async (addr) => {
      callCount++;
      if (addr.includes('失败')) {
        throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
      }
      return {
        address: addr,
        lat: callCount,
        lng: callCount * 10,
        formattedAddress: addr,
      };
    });

    const addresses = [
      '地址1',
      '失败A',
      '地址2',
      '失败B',
      '地址3',
      '地址4',
    ];

    const results = await service.batchGeocode(addresses, 3);

    expect(results.length).toBe(6);

    const successes = results.filter((r) => !r.error);
    const failures = results.filter((r) => r.error);

    expect(successes.length).toBe(4);
    expect(failures.length).toBe(2);

    successes.forEach((item) => {
      expect(Number.isFinite(item.lat!)).toBe(true);
      expect(Number.isFinite(item.lng!)).toBe(true);
    });

    failures.forEach((item) => {
      expect(item.error).toBeTruthy();
      expect(item.lat).toBeUndefined();
      expect(item.lng).toBeUndefined();
    });
  });

  it('all-failed batchGeocode returns only error entries, no stale lat/lng leaks', async () => {
    const service = await createServiceWithMock(async () => {
      throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
    });

    const results = await service.batchGeocode(
      ['不存在1', '不存在2', '不存在3'],
      2,
    );

    expect(results.length).toBe(3);
    results.forEach((item) => {
      expect(item.error).toBeTruthy();
      expect(item.lat).toBeUndefined();
      expect(item.lng).toBeUndefined();
    });
  });
});
