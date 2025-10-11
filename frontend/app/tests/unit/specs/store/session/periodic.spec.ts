import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePeriodicStore } from '@/store/session/periodic';

const fetchPeriodicData = vi.fn();

vi.mock('@/composables/api/session', () => ({
  useSessionApi: () => ({
    fetchPeriodicData,
  }),
}));

vi.mock('@shared/utils', () => ({
  backoff: (_retries: number, call: () => Promise<any>) => call(),
}));

describe('session periodic store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchPeriodicData.mockReset();
  });

  it('stores telemetry payload', async () => {
    const store = usePeriodicStore();
    fetchPeriodicData.mockResolvedValue({
      connectedNodes: {},
      failedToConnect: {},
      lastBalanceSave: 10,
      lastDataUploadTs: 20,
      telemetry: [
        {
          direction: 'outbound',
          endpoint: 'https://example.com/api',
          error: null,
          latencyMs: 12.5,
          metadata: {},
          route: 'direct',
          statusCode: 200,
          subsystem: 'http',
          success: true,
          timestamp: 1700000000000,
        },
      ],
    });

    await store.check();
    expect(fetchPeriodicData).toHaveBeenCalledTimes(1);
    expect(store.telemetry).toHaveLength(1);
    expect(store.telemetry[0].endpoint).toBe('https://example.com/api');
  });
});
