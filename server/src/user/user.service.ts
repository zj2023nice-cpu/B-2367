import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const EMOJI_ONLY_REGEX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$/u;

function sanitizeNickname(raw: string): string {
  const trimmed = raw.trim();
  const collapsed = trimmed.replace(/\s+/g, ' ');
  return collapsed;
}

function isEmojiOnly(text: string): boolean {
  return EMOJI_ONLY_REGEX.test(text);
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly repo: Repository<UserProfile>,
  ) {}

  async getProfile(): Promise<{ nickname: string; avatarUrl: string }> {
    this.logger.log('获取用户资料');
    const profile = await this.repo.findOne({ where: { key: 'default' } });
    if (!profile) {
      return { nickname: '游客', avatarUrl: '' };
    }
    return { nickname: profile.nickname, avatarUrl: profile.avatarUrl };
  }

  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    const sanitized = sanitizeNickname(dto.nickname);

    if (sanitized.length < 2 || sanitized.length > 12) {
      throw new BadRequestException('昵称长度需在2到12个字符之间');
    }

    if (isEmojiOnly(sanitized)) {
      throw new BadRequestException('昵称不能只由表情或空白组成');
    }

    let avatarUrl = dto.avatarUrl;
    if (avatarUrl && /^wxfile:\/\//i.test(avatarUrl)) {
      this.logger.warn('忽略 wxfile 本地预览路径，回退为空');
      avatarUrl = '';
    }

    this.logger.log(`更新用户资料: nickname=${sanitized}`);
    let profile = await this.repo.findOne({ where: { key: 'default' } });
    if (!profile) {
      profile = this.repo.create({
        key: 'default',
        nickname: sanitized,
        avatarUrl: avatarUrl ?? '',
      });
    } else {
      profile.nickname = sanitized;
      if (avatarUrl !== undefined) {
        profile.avatarUrl = avatarUrl;
      }
    }
    await this.repo.save(profile);
  }
}
