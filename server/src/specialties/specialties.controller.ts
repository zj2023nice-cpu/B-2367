import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';

@Controller('api/specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  findAll(@Query() query: QuerySpecialtyDto) {
    return this.specialtiesService.findAll(query);
  }

  /** PUT /api/specialties/:id/address — 更新特产地址 */
  @Put(':id/address')
  updateAddress(@Param('id') id: string, @Body('address') address: string) {
    return this.specialtiesService.updateAddress(+id, address);
  }
}
