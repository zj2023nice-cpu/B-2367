import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Specialty } from '../specialties/specialty.entity';
import { Schedule } from '../schedule/schedule.entity';
import { UserProfile } from '../user/user-profile.entity';

const logger = new Logger('SeedData');

const DEFAULT_SCHEDULES: Array<
  Pick<Schedule, 'title' | 'description' | 'imageUrl' | 'dateText'>
> = [
  {
    title: '北京南锣鼓巷美食探店',
    description:
      '2026 年春季美食行第一站，上午走访南锣鼓巷与后海片区，记录北京烤鸭门店排队情况和游客试吃反馈。',
    imageUrl: '/images/duck.jpg',
    dateText: '2026年04月18日 · 周六',
  },
  {
    title: '天津十八街麻花制作参观',
    description:
      '到十八街老字号门店了解麻花制作流程，补充门店营业时间、礼盒规格和现场试吃记录。',
    imageUrl: '/images/mahua.jpg',
    dateText: '2026年04月19日 · 周日',
  },
  {
    title: '杭州龙井村采茶体验',
    description:
      '上午前往龙井村茶园，拍摄采茶和炒茶过程，整理龙井茶口感笔记与游客体验事件记录。',
    imageUrl: '/images/tea.jpg',
    dateText: '2026年04月25日 · 周六',
  },
  {
    title: '成都宽窄巷子火锅底料选品',
    description:
      '下午在宽窄巷子周边门店对比火锅底料口味，记录麻辣度、配料差异以及门店推荐榜。',
    imageUrl: '/images/hotpot.jpg',
    dateText: '2026年05月01日 · 周五',
  },
  {
    title: '西安回民街夜市巡游',
    description:
      '傍晚走访回民街小吃摊位，重点记录肉夹馍、冰峰和夜市高峰时段的人流及消费情况。',
    imageUrl: '/images/roujiamo.jpg',
    dateText: '2026年05月02日 · 周六',
  },
  {
    title: '长沙坡子街小吃打卡',
    description:
      '晚间打卡坡子街臭豆腐热门摊位，整理试吃评分、排队时长和游客互动照片清单。',
    imageUrl: '/images/tofu.jpg',
    dateText: '2026年05月03日 · 周日',
  },
  {
    title: '广州早茶门店探访',
    description:
      '早晨前往荔湾区老字号茶楼，补齐肠粉与点心图文素材，记录上菜节奏和招牌菜推荐。',
    imageUrl: '/images/changfen.jpg',
    dateText: '2026年05月04日 · 周一',
  },
];

const LEGACY_GENERIC_SCHEDULE_TITLES = new Set([
  '抵达目的地',
  '城市地标游览',
  '品尝当地美食',
  '自然风光之旅',
  '特产购物',
  '文化体验活动',
  '返程',
]);

function isInvalidScheduleSeed(schedule: Schedule): boolean {
  const title = schedule.title?.trim() ?? '';
  const description = schedule.description?.trim() ?? '';
  const imageUrl = schedule.imageUrl?.trim() ?? '';
  const dateText = schedule.dateText?.trim() ?? '';

  return (
    !title ||
    !description ||
    !imageUrl ||
    !dateText ||
    title.startsWith('【日程标题') ||
    description.startsWith('【请在此处填写日程') ||
    dateText.startsWith('【日期') ||
    imageUrl.includes('/images/placeholder')
  );
}

function isLegacyGenericSchedule(schedule: Schedule): boolean {
  const title = schedule.title?.trim() ?? '';
  const dateText = schedule.dateText?.trim() ?? '';

  return (
    LEGACY_GENERIC_SCHEDULE_TITLES.has(title) ||
    /^第[一二三四五六七八九十]+天\s+\d{2}:\d{2}$/.test(dateText)
  );
}

/** 初始化 Seed 数据：空表插入，发现旧占位或旧通用默认数据时自动修复 */
export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const specialtyRepo = dataSource.getRepository(Specialty);
  const scheduleRepo = dataSource.getRepository(Schedule);
  const profileRepo = dataSource.getRepository(UserProfile);

  // === 特产 Seed（≥6 条） ===
  const specialtyCount = await specialtyRepo.count();
  if (specialtyCount === 0) {
    logger.log('初始化特产数据...');
    await specialtyRepo.save([
      {
        title: '北京烤鸭',
        description:
          '北京烤鸭是北京最著名的特色美食，皮脆肉嫩、色泽红润，配以薄饼、葱丝和甜面酱食用。',
        imageUrl: '/images/duck.jpg',
        address: '北京市东城区王府井大街',
      },
      {
        title: '天津麻花',
        description:
          '天津桂发祥十八街麻花，是天津三绝之一，香甜酥脆，有多种口味可选。',
        imageUrl: '/images/mahua.jpg',
        address: '天津市南开区十八街',
      },
      {
        title: '云南鲜花饼',
        description:
          '云南特产鲜花饼，以可食用玫瑰花入馅制成的酥饼，花香四溢、口感酥软。',
        imageUrl: '/images/flower.jpg',
        address: '云南省昆明市五华区翠湖南路',
      },
      {
        title: '杭州龙井茶',
        description:
          '西湖龙井是中国十大名茶之一，产于杭州西湖龙井村，色绿、香郁、味甘、形美。',
        imageUrl: '/images/tea.jpg',
        address: '浙江省杭州市西湖区龙井路',
      },
      {
        title: '成都火锅底料',
        description:
          '成都火锅底料选用上等辣椒、花椒、牛油等原料熬制，麻辣鲜香，是川味火锅的灵魂。',
        imageUrl: '/images/hotpot.jpg',
        address: '四川省成都市锦江区春熙路',
      },
      {
        title: '西安肉夹馍',
        description:
          '西安传统名小吃，外皮酥脆、馅料饱满，精选腊汁肉搭配白吉馍，一口下去满嘴留香。',
        imageUrl: '/images/roujiamo.jpg',
        address: '陕西省西安市莲湖区回民街',
      },
      {
        title: '长沙臭豆腐',
        description:
          '长沙臭豆腐闻起来臭吃起来香，外焦里嫩，佐以辣椒酱和香菜，回味无穷。',
        imageUrl: '/images/tofu.jpg',
        address: '湖南省长沙市天心区坡子街',
      },
      {
        title: '广州肠粉',
        description:
          '广州传统早茶名点，米浆蒸制成薄皮，内裹虾仁、猪肉或鸡蛋，配以酱油食用，滑嫩爽口。',
        imageUrl: '/images/changfen.jpg',
        address: '广东省广州市荔湾区上下九步行街',
      },
    ]);
    logger.log('特产数据初始化完成');
  }

  // === 日程 Seed（≥6 条） ===
  const schedules = await scheduleRepo.find({ order: { id: 'ASC' } });
  if (schedules.length === 0) {
    logger.log('初始化日程数据...');
    await scheduleRepo.save(DEFAULT_SCHEDULES);
    logger.log('日程数据初始化完成');
  } else if (
    schedules.every(
      (schedule) =>
        isInvalidScheduleSeed(schedule) || isLegacyGenericSchedule(schedule),
    )
  ) {
    logger.log('检测到旧的默认日程数据，开始自动修复...');
    await scheduleRepo.clear();
    await scheduleRepo.save(DEFAULT_SCHEDULES);
    logger.log('日程默认数据修复完成');
  }

  // === 用户资料 Seed ===
  const profileCount = await profileRepo.count();
  if (profileCount === 0) {
    logger.log('初始化用户资料...');
    await profileRepo.save({
      key: 'default',
      nickname: '游客',
      avatarUrl: '',
    });
    logger.log('用户资料初始化完成');
  }
}
