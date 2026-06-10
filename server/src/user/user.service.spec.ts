import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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

  describe('updateProfile — nickname validation (normalize-first)', () => {
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

    it('rejects whitespace-only nickname', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '   ';
      dto.avatarUrl = '';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('rejects emoji + spaces only nickname', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '  😀  😂  ';
      dto.avatarUrl = '';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateProfile(dto)).rejects.toThrow('昵称不能只由表情或空白组成');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a valid nickname with leading/trailing spaces after normalization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '  张三  ';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '张三' }),
      );
    });

    it('accepts a valid nickname with consecutive internal spaces after normalization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = 'Hello   World';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: 'Hello World' }),
      );
    });

    it('trims and collapses all whitespace patterns', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '  张   三  ';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '张 三' }),
      );
    });

    it('accepts a 2-character nickname that is valid after normalization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '  小明  ';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '小明' }),
      );
    });
  });

  describe('UpdateProfileDto — @Transform normalizes before validation', () => {
    it('normalizes leading/trailing/consecutive whitespace before @Length check', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '  张   三  ',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.nickname).toBe('张 三');
    });

    it('rejects nickname that becomes empty after normalization', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '   ',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects emoji-only nickname after normalization', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '  😀😂  ',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts mixed emoji + text nickname after normalization', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '小明😀',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.nickname).toBe('小明😀');
    });

    it('rejects nickname shorter than 2 after normalization', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: ' A ',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects nickname longer than 12 after normalization', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '一二三四五六七八九十十一十',
        avatarUrl: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
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
      expect(result).toEqual({ nickname: '游客', avatarUrl: '', bio: '' });
    });

    it('returns stored profile when it exists', async () => {
      mockRepo.findOne.mockResolvedValue({
        nickname: '小明',
        avatarUrl: '/images/avatar.png',
        bio: '热爱旅行的美食家',
      });
      const result = await service.getProfile();
      expect(result).toEqual({ nickname: '小明', avatarUrl: '/images/avatar.png', bio: '热爱旅行的美食家' });
    });
  });

  describe('updateProfile — bio validation', () => {
    it('accepts a valid bio', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '热爱旅行';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bio: '热爱旅行' }),
      );
    });

    it('accepts an empty bio', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bio: '' }),
      );
    });

    it('trims and collapses whitespace in bio', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '  热爱   旅行  ';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bio: '热爱 旅行' }),
      );
    });

    it('rejects whitespace-only bio', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '   ';

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateProfile(dto)).rejects.toThrow('简介不能仅由空白组成');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('rejects bio longer than 60 characters after sanitization', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '一'.repeat(61);

      await expect(service.updateProfile(dto)).rejects.toThrow(BadRequestException);
      await expect(service.updateProfile(dto)).rejects.toThrow('简介最多60个字符');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('accepts bio at exactly 60 characters', async () => {
      const dto = new UpdateProfileDto();
      dto.nickname = '测试用户';
      dto.bio = '一'.repeat(60);

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bio: '一'.repeat(60) }),
      );
    });
  });

  describe('updateProfile — multi-field concurrent editing safety', () => {
    it('updating bio preserves existing nickname and avatarUrl', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '旧昵称',
        avatarUrl: 'https://example.com/old.png',
        bio: '旧简介',
      });

      const dto = new UpdateProfileDto();
      dto.nickname = '旧昵称';
      dto.avatarUrl = 'https://example.com/old.png';
      dto.bio = '新简介';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '旧昵称',
          avatarUrl: 'https://example.com/old.png',
          bio: '新简介',
        }),
      );
    });

    it('updating nickname preserves existing bio and avatarUrl', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '旧昵称',
        avatarUrl: 'https://example.com/old.png',
        bio: '保留的简介',
      });

      const dto = new UpdateProfileDto();
      dto.nickname = '新昵称';
      dto.avatarUrl = 'https://example.com/old.png';
      dto.bio = '保留的简介';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '新昵称',
          avatarUrl: 'https://example.com/old.png',
          bio: '保留的简介',
        }),
      );
    });

    it('does not overwrite bio when bio is omitted from dto', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '旧昵称',
        avatarUrl: '',
        bio: '不应被覆盖的简介',
      });

      const dto = new UpdateProfileDto();
      dto.nickname = '新昵称';
      dto.avatarUrl = '';

      await service.updateProfile(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '新昵称',
          bio: '不应被覆盖的简介',
        }),
      );
    });

    it('sequential updates with latest values do not revert old values', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '昵称A',
        avatarUrl: '',
        bio: '简介A',
      });

      const dto1 = new UpdateProfileDto();
      dto1.nickname = '昵称A';
      dto1.avatarUrl = '';
      dto1.bio = '简介B';
      await service.updateProfile(dto1);

      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '昵称A',
        avatarUrl: '',
        bio: '简介B',
      });

      const dto2 = new UpdateProfileDto();
      dto2.nickname = '昵称B';
      dto2.avatarUrl = '';
      dto2.bio = '简介B';
      await service.updateProfile(dto2);

      const saved = mockRepo.save.mock.calls[mockRepo.save.mock.calls.length - 1][0];
      expect(saved.nickname).toBe('昵称B');
      expect(saved.bio).toBe('简介B');
    });
  });

  describe('UpdateProfileDto — bio field passes through without transform', () => {
    it('accepts a valid bio string', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '小明',
        avatarUrl: '',
        bio: '热爱旅行',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.bio).toBe('热爱旅行');
    });

    it('accepts an empty bio string', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '小明',
        avatarUrl: '',
        bio: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('accepts bio with whitespace (service sanitizes)', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '小明',
        avatarUrl: '',
        bio: '  热爱   旅行  ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.bio).toBe('  热爱   旅行  ');
    });

    it('accepts whitespace-only bio (service rejects)', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nickname: '小明',
        avatarUrl: '',
        bio: '   ',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('updateProfile — avatar+bio sequential confirmation regression', () => {
    it('saves avatar then bio, final result reflects last confirmed values', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '用户',
        avatarUrl: '',
        bio: '',
      });

      const dto1 = new UpdateProfileDto();
      dto1.nickname = '用户';
      dto1.avatarUrl = 'https://example.com/avatar1.png';
      dto1.bio = '';
      await service.updateProfile(dto1);

      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '用户',
        avatarUrl: 'https://example.com/avatar1.png',
        bio: '',
      });

      const dto2 = new UpdateProfileDto();
      dto2.nickname = '用户';
      dto2.avatarUrl = 'https://example.com/avatar1.png';
      dto2.bio = '美食家';
      await service.updateProfile(dto2);

      const saved = mockRepo.save.mock.calls[mockRepo.save.mock.calls.length - 1][0];
      expect(saved.avatarUrl).toBe('https://example.com/avatar1.png');
      expect(saved.bio).toBe('美食家');
    });

    it('saves bio then avatar, final result reflects last confirmed values', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '用户',
        avatarUrl: '',
        bio: '',
      });

      const dto1 = new UpdateProfileDto();
      dto1.nickname = '用户';
      dto1.avatarUrl = '';
      dto1.bio = '旅行者';
      await service.updateProfile(dto1);

      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '用户',
        avatarUrl: '',
        bio: '旅行者',
      });

      const dto2 = new UpdateProfileDto();
      dto2.nickname = '用户';
      dto2.avatarUrl = 'https://example.com/avatar2.png';
      dto2.bio = '旅行者';
      await service.updateProfile(dto2);

      const saved = mockRepo.save.mock.calls[mockRepo.save.mock.calls.length - 1][0];
      expect(saved.avatarUrl).toBe('https://example.com/avatar2.png');
      expect(saved.bio).toBe('旅行者');
    });
  });

  describe('resetProfile', () => {
    it('resets existing profile to default values', async () => {
      mockRepo.findOne.mockResolvedValue({
        key: 'default',
        nickname: '自定义昵称',
        avatarUrl: 'https://example.com/avatar.png',
        bio: '自定义简介',
      });

      const result = await service.resetProfile();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: '游客',
          avatarUrl: '',
          bio: '',
        }),
      );
      expect(result).toEqual({ nickname: '游客', avatarUrl: '', bio: '' });
    });

    it('creates profile with defaults when none exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.resetProfile();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'default',
          nickname: '游客',
          avatarUrl: '',
          bio: '',
        }),
      );
      expect(result).toEqual({ nickname: '游客', avatarUrl: '', bio: '' });
    });

    it('returns default values matching getProfile fallback', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const resetResult = await service.resetProfile();
      mockRepo.findOne.mockResolvedValue(null);
      const getResult = await service.getProfile();

      expect(resetResult).toEqual(getResult);
    });
  });
});
