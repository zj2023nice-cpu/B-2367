import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const NICKNAME_REGEX = /^[^\s].*[^\s]$|^[^\s]$/;
const NO_EMOJI_ONLY = /^(?![\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$).*/u;

export class UpdateProfileDto {
  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @Length(2, 12, { message: '昵称长度需在2到12个字符之间' })
  @Matches(NICKNAME_REGEX, {
    message: '昵称首尾不能包含空格',
  })
  @Matches(NO_EMOJI_ONLY, {
    message: '昵称不能只由表情或空白组成',
  })
  nickname: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
