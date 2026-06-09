import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from './specialty.entity';

@Injectable()
export class SpecialtiesService {
  private readonly logger = new Logger(SpecialtiesService.name);

  constructor(
    @InjectRepository(Specialty)
    private readonly repo: Repository<Specialty>,
  ) {}

  /** 获取全部特产列表 */
  async findAll(): Promise<Specialty[]> {
    this.logger.log('查询特产列表');
    return this.repo.find({ order: { id: 'ASC' } });
  }

  /** 更新特产地址 */
  async updateAddress(id: number, address: string): Promise<Specialty> {
    const item = await this.repo.findOneBy({ id });
    if (!item) {
      throw new Error('特产不存在');
    }
    item.address = address;
    return this.repo.save(item);
  }
}
