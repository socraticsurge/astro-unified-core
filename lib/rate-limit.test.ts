import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should allow the first request', () => {
    const result = rateLimit('test-key-1', 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
  });

  it('should allow requests up to the limit', () => {
    const key = 'test-key-2';

    let result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);

    result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);

    result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should block requests over the limit', () => {
    const key = 'test-key-3';

    // Consume all limit
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);

    // Next request should fail
    const result = rateLimit(key, 2, 60_000);
    expect(result.success).toBe(false);
    expect(result.limit).toBe(2);
    expect(result.remaining).toBe(0);
  });

  it('should reset limit after windowMs has expired', () => {
    const key = 'test-key-4';

    // Consume limit
    rateLimit(key, 1, 60_000);

    // Ensure limit is reached
    let result = rateLimit(key, 1, 60_000);
    expect(result.success).toBe(false);

    // Advance time past the expiration window
    vi.advanceTimersByTime(60_001);

    // Request should be allowed again
    result = rateLimit(key, 1, 60_000);
    expect(result.success).toBe(true);
    expect(result.limit).toBe(1);
    expect(result.remaining).toBe(0);
  });

  it('should track multiple keys independently', () => {
    const key1 = 'test-key-5-a';
    const key2 = 'test-key-5-b';

    rateLimit(key1, 1, 60_000);
    const result1 = rateLimit(key1, 1, 60_000);
    expect(result1.success).toBe(false);

    const result2 = rateLimit(key2, 1, 60_000);
    expect(result2.success).toBe(true);
  });
});
