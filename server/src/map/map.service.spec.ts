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

  it('throws INTERNAL_SERVER_ERROR when map key is missing', async () => {
    const service = await createService('');

    await expect(service.geocode('北京市朝阳区')).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('throws INTERNAL_SERVER_ERROR when map key uses placeholder', async () => {
    const service = await createService('YOUR_KEY_HERE');

    await expect(service.geocode('北京市朝阳区')).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
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
});
