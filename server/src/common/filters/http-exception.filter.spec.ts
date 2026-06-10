import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { Response, Request } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  function createMockHost(): any {
    const mockRequest = {} as Request;
    return {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  }

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus as any,
    } as Partial<Response>;
  });

  it('handles HttpException with string response → { code: 1, message, data: null }', () => {
    const exception = new HttpException('自定义错误', HttpStatus.BAD_REQUEST);

    filter.catch(exception, createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '自定义错误',
      data: null,
    });
  });

  it('handles HttpException with object response containing string message', () => {
    const exception = new HttpException(
      { message: '昵称不能为空', error: 'Bad Request', statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '昵称不能为空',
      data: null,
    });
  });

  it('handles HttpException with object response containing array message', () => {
    const exception = new HttpException(
      {
        message: ['昵称长度需在2到12个字符之间', '昵称不能为空'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '昵称长度需在2到12个字符之间; 昵称不能为空',
      data: null,
    });
  });

  it('handles non-HttpException → 500 with generic message', () => {
    const exception = new Error('something unexpected');

    filter.catch(exception, createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '服务器内部错误',
      data: null,
    });
  });

  it('handles plain string thrown as exception → 500 with generic message', () => {
    filter.catch('unexpected string', createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '服务器内部错误',
      data: null,
    });
  });

  it('preserves correct HTTP status from HttpException', () => {
    const exception = new HttpException('未授权', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, createMockHost());

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith({
      code: 1,
      message: '未授权',
      data: null,
    });
  });

  it('always sets code: 1 and data: null for any exception', () => {
    const testCases = [
      new HttpException('bad', HttpStatus.BAD_REQUEST),
      new HttpException('not found', HttpStatus.NOT_FOUND),
      new Error('unknown'),
    ];

    for (const exception of testCases) {
      mockJson.mockClear();
      mockStatus.mockClear().mockReturnValue({ json: mockJson });

      filter.catch(exception, createMockHost());

      const call = mockJson.mock.calls[0][0];
      expect(call.code).toBe(1);
      expect(call.data).toBeNull();
    }
  });
});
