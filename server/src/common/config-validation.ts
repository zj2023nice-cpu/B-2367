import { Logger } from '@nestjs/common';

const logger = new Logger('ConfigValidation');

interface EnvRule {
  required: boolean;
  default?: string;
  validate?: (value: string) => string | null;
  hint?: string;
}

const ENV_RULES: Record<string, EnvRule> = {
  PORT: {
    required: false,
    default: '3001',
    validate: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        return 'PORT 必须是 1–65535 之间的整数';
      }
      return null;
    },
    hint: '示例: PORT=3001',
  },
  TENCENT_MAP_KEY: {
    required: false,
    validate: (v) => {
      if (!v || v === 'YOUR_KEY_HERE') {
        return null;
      }
      return null;
    },
    hint: '在 .env 中设置 TENCENT_MAP_KEY=<你的密钥>；未配置时地图 geocode 接口不可用',
  },
  DB_PATH: {
    required: false,
    default: 'data/app.db',
    hint: '示例: DB_PATH=data/app.db',
  },
  CORS_ORIGIN: {
    required: false,
    hint: '留空则允许所有来源；生产环境建议设置，如 CORS_ORIGIN=https://example.com',
  },
};

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, rule] of Object.entries(ENV_RULES)) {
    const raw = config[key] as string | undefined;
    const value = raw?.trim() || undefined;

    if (!value) {
      if (rule.required) {
        errors.push(`缺少必填环境变量 ${key}。${rule.hint || ''}`);
      } else if (rule.default) {
        config[key] = rule.default;
      }
      continue;
    }

    if (rule.validate) {
      const err = rule.validate(value);
      if (err) {
        errors.push(`${key}: ${err}。${rule.hint || ''}`);
      }
    }
  }

  if (config.TENCENT_MAP_KEY === 'YOUR_KEY_HERE' || !config.TENCENT_MAP_KEY) {
    warnings.push(
      'TENCENT_MAP_KEY 未配置或仍为占位值，地图 geocode 接口将返回 500。' +
        '请在 .env 中设置有效密钥，参考 server/.env.example。',
    );
  }

  for (const w of warnings) {
    logger.warn(w);
  }

  if (errors.length > 0) {
    throw new Error(
      '环境变量校验失败，服务无法启动:\n  ' +
        errors.join('\n  ') +
        '\n\n请复制 server/.env.example 为 server/.env 并按提示填写。',
    );
  }

  return config;
}
