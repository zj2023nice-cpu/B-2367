import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';

export type CompletionFilter = 'all' | 'completed' | 'pending';

export interface ScheduleStats {
  total: number;
  completed: number;
  pending: number;
}

function normalizeSchedule(schedule: Schedule): Schedule {
  if (schedule.completed === null || schedule.completed === undefined) {
    schedule.completed = false;
  }
  return schedule;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly repo: Repository<Schedule>,
  ) {}

  async findAll(filter: CompletionFilter = 'all'): Promise<Schedule[]> {
    this.logger.log(`查询日程列表, filter=${filter}`);
    const where: Record<string, unknown> = {};
    if (filter === 'completed') {
      where.completed = true;
    } else if (filter === 'pending') {
      where.completed = false;
    }
    const list = await this.repo.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { id: 'ASC' },
    });
    return list.map(normalizeSchedule);
  }

  async markComplete(id: number): Promise<Schedule> {
    const schedule = await this.repo.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`日程 #${id} 不存在`);
    }
    schedule.completed = true;
    schedule.completedAt = new Date();
    return this.repo.save(schedule);
  }

  async undoComplete(id: number): Promise<Schedule> {
    const schedule = await this.repo.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`日程 #${id} 不存在`);
    }
    schedule.completed = false;
    schedule.completedAt = null;
    return this.repo.save(schedule);
  }

  async getStats(): Promise<ScheduleStats> {
    const total = await this.repo.count();
    const completed = await this.repo.count({ where: { completed: true } });
    return {
      total,
      completed,
      pending: total - completed,
    };
  }
}
