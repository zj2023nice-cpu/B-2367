import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('api/map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /** GET /api/map/geocode?address=xxx — 地址解析为经纬度 */
  @Get('geocode')
  geocode(@Query('address') address: string) {
    return this.mapService.geocode(address);
  }
}
