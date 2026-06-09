import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly repo: Repository<Schedule>,
  ) {}

  /** 获取全部日程列表 */
  async findAll(): Promise<Schedule[]> {
    this.logger.log('查询日程列表');
    return this.repo.find({ order: { id: 'ASC' } });
  }
}
