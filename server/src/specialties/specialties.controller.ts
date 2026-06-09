import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';

@Controller('api/specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  /** GET /api/specialties — 获取特产列表 */
  @Get()
  findAll() {
    return this.specialtiesService.findAll();
  }

  /** PUT /api/specialties/:id/address — 更新特产地址 */
  @Put(':id/address')
  updateAddress(@Param('id') id: string, @Body('address') address: string) {
    return this.specialtiesService.updateAddress(+id, address);
  }
}
