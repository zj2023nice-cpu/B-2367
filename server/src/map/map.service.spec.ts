import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';

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
