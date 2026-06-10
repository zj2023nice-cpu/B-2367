import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/user/profile — 获取用户资料 */
  @Get('profile')
  getProfile() {
    return this.userService.getProfile();
  }

  /** PUT /api/user/profile — 更新用户资料 */
  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(dto);
  }

  /** POST /api/user/profile/reset — 恢复默认资料 */
  @Post('profile/reset')
  resetProfile() {
    return this.userService.resetProfile();
  }
}
