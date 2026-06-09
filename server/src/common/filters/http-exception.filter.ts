import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ExceptionResponseShape {
  message?: string | string[];
}

function isExceptionResponseShape(
  value: unknown,
): value is ExceptionResponseShape {
  return typeof value === 'object' && value !== null;
}

/** 全局异常过滤器：统一异常响应为 { code: 1, message, data: null } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (isExceptionResponseShape(exceptionResponse)) {
        const candidateMessage = exceptionResponse.message;
        if (typeof candidateMessage === 'string') {
          message = candidateMessage;
        } else if (Array.isArray(candidateMessage)) {
          message = candidateMessage.join('; ');
        }
      }
    }

    this.logger.error(
      `[${status}] ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      code: 1,
      message,
      data: null,
    });
  }
}
