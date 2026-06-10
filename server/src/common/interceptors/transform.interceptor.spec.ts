import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;

  const mockExecutionContext = {} as any;
  const mockCallHandler = (data: unknown) =>
    ({
      handle: () => of(data),
    }) as any;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps data into { code: 0, message: "ok", data }', (done) => {
    const payload = { id: 1, name: 'test' };

    interceptor
      .intercept(mockExecutionContext, mockCallHandler(payload))
      .subscribe((result) => {
        expect(result.code).toBe(0);
        expect(result.message).toBe('ok');
        expect(result.data).toEqual(payload);
        done();
      });
  });

  it('maps null data to { code: 0, message: "ok", data: null }', (done) => {
    interceptor
      .intercept(mockExecutionContext, mockCallHandler(null))
      .subscribe((result) => {
        expect(result.code).toBe(0);
        expect(result.message).toBe('ok');
        expect(result.data).toBeNull();
        done();
      });
  });

  it('maps undefined data to { code: 0, message: "ok", data: null }', (done) => {
    interceptor
      .intercept(mockExecutionContext, mockCallHandler(undefined))
      .subscribe((result) => {
        expect(result.code).toBe(0);
        expect(result.message).toBe('ok');
        expect(result.data).toBeNull();
        done();
      });
  });

  it('preserves array data inside the data field', (done) => {
    const payload = [{ id: 1 }, { id: 2 }];

    interceptor
      .intercept(mockExecutionContext, mockCallHandler(payload))
      .subscribe((result) => {
        expect(result.code).toBe(0);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toEqual(payload);
        done();
      });
  });

  it('preserves string data inside the data field', (done) => {
    interceptor
      .intercept(mockExecutionContext, mockCallHandler('hello'))
      .subscribe((result) => {
        expect(result.data).toBe('hello');
        done();
      });
  });

  it('preserves numeric data inside the data field', (done) => {
    interceptor
      .intercept(mockExecutionContext, mockCallHandler(42))
      .subscribe((result) => {
        expect(result.data).toBe(42);
        done();
      });
  });
});
