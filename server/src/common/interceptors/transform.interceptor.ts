import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

/** 统一响应拦截器：包装成功响应为 { code: 0, message: "ok", data } */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccessResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => ({
        code: 0,
        message: 'ok',
        data: data ?? null,
      })),
    );
  }
}
