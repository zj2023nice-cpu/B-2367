import { Controller, Get, Query } from '@nestjs/common';
import { OverviewService } from './overview.service';

@Controller('api/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  getOverview(@Query('visitedIds') visitedIds?: string) {
    const ids = visitedIds
      ? visitedIds
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
    return this.overviewService.getOverview(ids);
  }
}
