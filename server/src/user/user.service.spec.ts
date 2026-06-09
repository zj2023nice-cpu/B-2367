import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { UserProfile } from './user-profile.entity';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('UserService', () => {
  let service: UserService;
  let mockRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((partial) => partial),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('updateProfile — nickname validation', () => {
    it('rejects emoji-only nickname', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '😀😂🤣';
      dto.avatarUrl = '';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateProfile(dto)).rejects.toThrow('昵称不能只由表情或空白组成');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('rejects nickname shorter than 2 characters after sanitization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = 'A';
      dto.avatarUrl = '';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateProfile(dto)).rejects.toThrow('昵称长度需在2到12个字符之间');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('rejects nickname longer than 12 characters after sanitization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '一二三四五六七八九十十一十';
      dto.avatarUrl = '';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a valid nickname with spaces in the middle', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = 'Hello  World';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: 'Hello World' }),
      );
    });

    it('trims leading/trailing whitespace and collapses internal whitespace', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '  张   三  ';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '张 三' }),
      );
    });
  });

  describe('updateProfile — avatarUrl wxfile fallback', () => {
    it('falls back to empty string when avatarUrl is a wxfile preview path', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.avatarUrl = 'wxfile://tmp_xxx.jpg';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: '' }),
      );
    });

    it('preserves a valid remote avatarUrl', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.avatarUrl = 'https://example.com/avatar.png';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: 'https://example.com/avatar.png' }),
      );
    });
  });

  describe('getProfile — fallback', () => {
    it('returns guest defaults when no profile exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getProfile();
      expect(result).toEqual({ nickname: '游客', avatarUrl: '' });
    });

    it('returns stored profile when it exists', async () => {
      mockRepo.findOne.mockResolvedValue({
        nickname: '小明',
        avatarUrl: '/images/avatar.png',
      });
      const result = await service.getProfile();
      expect(result).toEqual({ nickname: '小明', avatarUrl: '/images/avatar.png' });
    });
  });
});
