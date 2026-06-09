import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from './specialty.entity';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';

@Injectable()
export class SpecialtiesService {
  private readonly logger = new Logger(SpecialtiesService.name);

  constructor(
    @InjectRepository(Specialty)
    private readonly repo: Repository<Specialty>,
  ) {}

  async findAll(query: QuerySpecialtyDto): Promise<Specialty[]> {
    this.logger.log('查询特产列表');
    const qb = this.repo.createQueryBuilder('s').orderBy('s.id', 'ASC');

    const keyword = query.keyword?.trim();
    if (keyword) {
      qb.andWhere(
        '(s.title LIKE :kw OR s.address LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    if (query.limit) {
      qb.take(query.limit);
    }

    return qb.getMany();
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
