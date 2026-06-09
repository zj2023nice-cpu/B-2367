import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { ScheduleService, CompletionFilter } from './schedule.service';

@Controller('api/schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  findAll(@Query('filter') filter?: string) {
    const validFilter: CompletionFilter =
      filter === 'completed' || filter === 'pending' ? filter : 'all';
    return this.scheduleService.findAll(validFilter);
  }

  @Get('stats')
  getStats() {
    return this.scheduleService.getStats();
  }

  @Put(':id/complete')
  markComplete(@Param('id') id: string) {
    return this.scheduleService.markComplete(Number(id));
  }

  @Put(':id/undo')
  undoComplete(@Param('id') id: string) {
    return this.scheduleService.undoComplete(Number(id));
  }
}
