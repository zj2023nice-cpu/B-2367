import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const NO_EMOJI_ONLY =
  /^(?![\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$).*/u;

function normalizeNickname(value: string): string {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ');
}

export class UpdateProfileDto {
  @Transform(({ value }) => normalizeNickname(value))
  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @Length(2, 12, { message: '昵称长度需在2到12个字符之间' })
  @Matches(NO_EMOJI_ONLY, {
    message: '昵称不能只由表情或空白组成',
  })
  nickname: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: '简介必须是字符串' })
  bio?: string;
}
