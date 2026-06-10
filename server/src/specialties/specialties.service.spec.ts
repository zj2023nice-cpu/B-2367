import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Specialty } from './specialty.entity';
import { SpecialtiesService } from './specialties.service';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';

describe('SpecialtiesService', () => {
  let service: SpecialtiesService;
  let mockQb: any;

  beforeEach(async () => {
    mockQb = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOneBy: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialtiesService,
        {
          provide: getRepositoryToken(Specialty),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SpecialtiesService>(SpecialtiesService);
  });

  it('trims and collapses multiple spaces in keyword', async () => {
    const dto: QuerySpecialtyDto = { keyword: '  hello   world  ' };
    await service.findAll(dto);
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(s.title LIKE :kw OR s.description LIKE :kw OR s.address LIKE :kw)',
      { kw: '%hello world%' },
    );
  });

  it('matches keyword against title, description, and address', async () => {
    const dto: QuerySpecialtyDto = { keyword: '烤鸭' };
    await service.findAll(dto);
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(s.title LIKE :kw OR s.description LIKE :kw OR s.address LIKE :kw)',
      { kw: '%烤鸭%' },
    );
  });

  it('does not add keyword filter when keyword is empty after trim', async () => {
    const dto: QuerySpecialtyDto = { keyword: '   ' };
    await service.findAll(dto);
    expect(mockQb.andWhere).not.toHaveBeenCalled();
  });

  it('splits region by comma and filters with IN clause', async () => {
    const dto: QuerySpecialtyDto = { region: '北京,天津' };
    await service.findAll(dto);
    expect(mockQb.andWhere).toHaveBeenCalledWith('s.region IN (:...regions)', {
      regions: ['北京', '天津'],
    });
  });

  it('filters out empty region segments', async () => {
    const dto: QuerySpecialtyDto = { region: '北京,,天津,' };
    await service.findAll(dto);
    expect(mockQb.andWhere).toHaveBeenCalledWith('s.region IN (:...regions)', {
      regions: ['北京', '天津'],
    });
  });

  it('applies limit via take', async () => {
    const dto: QuerySpecialtyDto = { limit: 10 };
    await service.findAll(dto);
    expect(mockQb.take).toHaveBeenCalledWith(10);
  });

  it('applies offset via skip', async () => {
    const dto: QuerySpecialtyDto = { offset: 20 };
    await service.findAll(dto);
    expect(mockQb.skip).toHaveBeenCalledWith(20);
  });

  it('returns { list, total } from getManyAndCount', async () => {
    const fakeList = [{ id: 1, title: 'test' }] as Specialty[];
    mockQb.getManyAndCount.mockResolvedValue([fakeList, 1]);
    const dto: QuerySpecialtyDto = {};
    const result = await service.findAll(dto);
    expect(result).toEqual({ list: fakeList, total: 1 });
  });

  it('combines keyword and region filters', async () => {
    const dto: QuerySpecialtyDto = { keyword: '烤鸭', region: '北京' };
    await service.findAll(dto);
    expect(mockQb.andWhere).toHaveBeenCalledTimes(2);
  });
});
