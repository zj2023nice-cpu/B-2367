import { Controller, Get } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('api/schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /** GET /api/schedules — 获取日程列表 */
  @Get()
  findAll() {
    return this.scheduleService.findAll();
  }
}
