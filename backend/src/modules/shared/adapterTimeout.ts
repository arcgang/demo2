const DEFAULT_TIMEOUT_MS = 1500;

export function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`ADAPTER_TIMEOUT: exceeded ${timeoutMs}ms`));
    }, timeoutMs);

    fn().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('ADAPTER_TIMEOUT');
}

export function getSlowAdapterMs(): number {
  const val = process.env['SLOW_ADAPTER_MS'];
  if (!val) return 0;
  const ms = parseInt(val, 10);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}
