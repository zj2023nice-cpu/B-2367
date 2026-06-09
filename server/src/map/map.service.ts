import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

/** 地理编码响应 */
export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
}

type JsonObject = Record<string, unknown>;
type TencentGeocodeResponse = JsonObject & {
  status: number;
  message?: unknown;
  result?: unknown;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TENCENT_MAP_KEY', '');
    if (!this.apiKey || this.apiKey === 'YOUR_KEY_HERE') {
      this.logger.warn('腾讯地图 Key 未配置，geocode 接口将无法正常工作');
    }
  }

  /** 调用腾讯位置服务将地址转为经纬度 */
  async geocode(address: string): Promise<GeocodeResult> {
    if (!address || address.trim() === '') {
      throw new HttpException('地址参数不能为空', HttpStatus.BAD_REQUEST);
    }

    if (!this.apiKey || this.apiKey === 'YOUR_KEY_HERE') {
      throw new HttpException(
        '腾讯地图 Key 未配置',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`地理编码请求: address=${address}`);

    const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${this.apiKey}`;

    try {
      const rawData = await this.httpGet(url);
      const parsed = this.parseTencentResponse(rawData);

      const status = parsed.status;
      const result = isJsonObject(parsed.result) ? parsed.result : undefined;
      const location =
        result && isJsonObject(result.location) ? result.location : undefined;
      const lat = location?.lat;
      const lng = location?.lng;

      this.logger.log(`腾讯地图响应 status=${status}`);

      if (status !== 0 || !isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        const msg =
          typeof parsed.message === 'string' && parsed.message.trim() !== ''
            ? parsed.message
            : '未知错误';
        this.logger.error(
          `腾讯地图 API 错误: status=${status}, message=${msg}`,
        );
        throw new HttpException(
          `地址解析失败 (腾讯地图: ${msg})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const title =
        typeof result?.title === 'string' && result.title.trim() !== ''
          ? result.title
          : undefined;
      const fullAddress =
        typeof result?.address === 'string' && result.address.trim() !== ''
          ? result.address
          : undefined;
      const formattedAddress = title ?? fullAddress ?? address;

      return { address, lat, lng, formattedAddress };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : '未知地理编码异常';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`地理编码异常: ${errorMessage}`, errorStack);

      throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
    }
  }

  /** 简易 HTTPS GET 请求 */
  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client
        .get(url, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => resolve(body));
        })
        .on('error', reject);
    });
  }

  /** 解析并校验腾讯地图基础响应结构 */
  private parseTencentResponse(rawData: string): TencentGeocodeResponse {
    const parsed: unknown = JSON.parse(rawData);
    if (!isJsonObject(parsed)) {
      throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
    }

    const status = parsed.status;
    if (!isFiniteNumber(status)) {
      throw new HttpException('地址解析失败', HttpStatus.BAD_REQUEST);
    }

    return { ...parsed, status };
  }
}
