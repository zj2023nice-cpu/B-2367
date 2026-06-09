import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('api/map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('geocode')
  geocode(@Query('address') address: string) {
    return this.mapService.geocode(address);
  }

  @Post('geocode/batch')
  batchGeocode(@Body() body: { addresses: string[] }) {
    return this.mapService.batchGeocode(body.addresses || []);
  }
}
