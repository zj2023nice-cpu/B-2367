import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** 更新用户资料 DTO */
export class UpdateProfileDto {
  @IsNotEmpty({ message: '昵称不能为空' })
  @IsString()
  nickname: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
