import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly repo: Repository<UserProfile>,
  ) {}

  /** 获取默认用户资料 */
  async getProfile(): Promise<{ nickname: string; avatarUrl: string }> {
    this.logger.log('获取用户资料');
    const profile = await this.repo.findOne({ where: { key: 'default' } });
    if (!profile) {
      return { nickname: '游客', avatarUrl: '' };
    }
    return { nickname: profile.nickname, avatarUrl: profile.avatarUrl };
  }

  /** 更新默认用户资料 */
  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    this.logger.log(`更新用户资料: nickname=${dto.nickname}`);
    let profile = await this.repo.findOne({ where: { key: 'default' } });
    if (!profile) {
      profile = this.repo.create({
        key: 'default',
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl || '',
      });
    } else {
      profile.nickname = dto.nickname;
      if (dto.avatarUrl !== undefined) {
        profile.avatarUrl = dto.avatarUrl;
      }
    }
    await this.repo.save(profile);
  }
}
