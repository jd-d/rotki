import { libraryDefaults } from '@test/utils/provide-defaults';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TelemetrySettingsPage from '@/pages/settings/telemetry/index.vue';
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

describe('settings telemetry page', () => {
  beforeEach(() => {
    fetchPeriodicData.mockReset();
  });

  it('renders telemetry rows and filters by search', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const telemetrySample = [
      {
        direction: 'outbound',
        endpoint: 'https://example.com/api',
        error: null,
        latencyMs: 8.5,
        metadata: {},
        route: 'direct',
        statusCode: 200,
        subsystem: 'http',
        success: true,
        timestamp: 1700000000000,
      },
      {
        direction: 'inbound',
        endpoint: 'broadcast:status',
        error: null,
        latencyMs: 2.1,
        metadata: {},
        route: 'vpn-route',
        statusCode: null,
        subsystem: 'websocket',
        success: true,
        timestamp: 1700000000500,
      },
    ];

    fetchPeriodicData.mockResolvedValue({
      connectedNodes: {},
      failedToConnect: {},
      lastBalanceSave: 0,
      lastDataUploadTs: 0,
      telemetry: telemetrySample,
    });

    const wrapper = mount(TelemetrySettingsPage, {
      pinia,
      global: {
        provide: libraryDefaults,
      },
    });

    await flushPromises();
    const store = usePeriodicStore();
    expect(store.telemetry).toHaveLength(2);

    const rows = wrapper.findAll('[data-cy="telemetry-row"]');
    expect(rows).toHaveLength(2);

    const searchInput = wrapper.find('input[data-cy="telemetry-filter-search"]');
    await searchInput.setValue('broadcast');
    await flushPromises();
    expect(wrapper.findAll('[data-cy="telemetry-row"]').length).toBe(1);
  });
});
