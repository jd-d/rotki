import { createPinia, type Pinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVpnSettingsStore } from '@/store/settings/vpn';
import type {
  VpnProfileRecord,
  VpnRoutingRuleRecord,
  VpnSnapshot,
} from '@/types/settings/vpn';

const apiMock = {
  fetchProfiles: vi.fn<[], Promise<VpnProfileRecord[]>>(),
  createProfile: vi.fn<[Omit<VpnProfileRecord, 'identifier'>], Promise<VpnProfileRecord>>(),
  updateProfile: vi.fn<[VpnProfileRecord], Promise<VpnProfileRecord>>(),
  deleteProfile: vi.fn<[number], Promise<boolean>>(),
  fetchRules: vi.fn<[], Promise<VpnRoutingRuleRecord[]>>(),
  createRule: vi.fn<[Omit<VpnRoutingRuleRecord, 'identifier'>], Promise<VpnRoutingRuleRecord>>(),
  updateRule: vi.fn<[VpnRoutingRuleRecord], Promise<VpnRoutingRuleRecord>>(),
  deleteRule: vi.fn<[number], Promise<boolean>>(),
  fetchStatus: vi.fn<[], Promise<VpnSnapshot>>(),
};

vi.mock('@/composables/api/settings/vpn-api', () => ({
  useVpnSettingsApi: () => apiMock,
}));

describe('settings/vpn store', () => {
  let pinia: Pinia;

  const sampleProfile: VpnProfileRecord = {
    identifier: 1,
    name: 'primary',
    endpoint: 'wireguard://primary',
    auth_token: null,
    routing_strategy: 'round_robin',
    max_parallel: 1,
    enabled: true,
  };

  const updatedProfile: VpnProfileRecord = {
    ...sampleProfile,
    name: 'primary-updated',
  };

  const sampleRule: VpnRoutingRuleRecord = {
    identifier: 11,
    profile_id: 1,
    destination: 'api.rotki.com',
    action: 'prefer',
    priority: 5,
    enabled: true,
  };

  const snapshot: VpnSnapshot = {
    profiles: [sampleProfile],
    rules: [sampleRule],
    tunnels: [],
  };

  beforeEach(() => {
    pinia = createPinia();
    Object.values(apiMock).forEach(mock => mock.mockReset());
    apiMock.fetchProfiles.mockResolvedValue([sampleProfile]);
    apiMock.fetchRules.mockResolvedValue([sampleRule]);
    apiMock.fetchStatus.mockResolvedValue(snapshot);
  });

  it('loads VPN data from the API', async () => {
    const store = useVpnSettingsStore(pinia);
    await store.load();

    expect(apiMock.fetchProfiles).toHaveBeenCalledOnce();
    expect(apiMock.fetchRules).toHaveBeenCalledOnce();
    expect(apiMock.fetchStatus).toHaveBeenCalledOnce();
    expect(store.profiles).toEqual([sampleProfile]);
    expect(store.routingRules).toEqual([sampleRule]);
    expect(store.status).toEqual(snapshot);
  });

  it('adds, edits, and removes profiles', async () => {
    const store = useVpnSettingsStore(pinia);
    await store.load();

    apiMock.createProfile.mockResolvedValue({
      ...sampleProfile,
      identifier: 2,
      name: 'backup',
    });
    const created = await store.addProfile({
      identifier: null,
      name: 'backup',
      endpoint: 'wireguard://backup',
      auth_token: null,
      routing_strategy: 'round_robin',
      max_parallel: 1,
      enabled: true,
    });

    expect(apiMock.createProfile).toHaveBeenCalledOnce();
    expect(created.name).toBe('backup');
    expect(store.profiles).toHaveLength(2);

    apiMock.updateProfile.mockResolvedValue(updatedProfile);
    const result = await store.editProfile(updatedProfile);

    expect(apiMock.updateProfile).toHaveBeenCalledOnce();
    expect(result.name).toBe('primary-updated');
    expect(store.profiles?.find(profile => profile.identifier === 1)?.name).toBe('primary-updated');

    apiMock.deleteProfile.mockResolvedValue(true);
    const removed = await store.removeProfile(1);

    expect(apiMock.deleteProfile).toHaveBeenCalledWith(1);
    expect(removed).toBe(true);
    expect(store.profiles?.some(profile => profile.identifier === 1)).toBe(false);
  });

  it('adds, edits, and removes routing rules', async () => {
    const store = useVpnSettingsStore(pinia);
    await store.load();

    apiMock.createRule.mockResolvedValue({
      identifier: 22,
      profile_id: 1,
      destination: 'ws.rotki.com',
      action: 'require',
      priority: 10,
      enabled: true,
    });
    const createdRule = await store.addRule({
      identifier: null,
      profile_id: 1,
      destination: 'ws.rotki.com',
      action: 'require',
      priority: 10,
      enabled: true,
    });

    expect(apiMock.createRule).toHaveBeenCalledOnce();
    expect(createdRule.destination).toBe('ws.rotki.com');
    expect(store.routingRules).toHaveLength(2);

    const updatedRule: VpnRoutingRuleRecord = {
      ...sampleRule,
      destination: 'api.rotki.io',
    };
    apiMock.updateRule.mockResolvedValue(updatedRule);
    const saved = await store.editRule(updatedRule);

    expect(apiMock.updateRule).toHaveBeenCalledOnce();
    expect(saved.destination).toBe('api.rotki.io');
    expect(store.routingRules?.find(rule => rule.identifier === sampleRule.identifier)?.destination)
      .toBe('api.rotki.io');

    apiMock.deleteRule.mockResolvedValue(true);
    const deleted = await store.removeRule(sampleRule.identifier ?? 0);

    expect(apiMock.deleteRule).toHaveBeenCalledWith(sampleRule.identifier);
    expect(deleted).toBe(true);
    expect(store.routingRules?.some(rule => rule.identifier === sampleRule.identifier)).toBe(false);
  });

  it('refreshes cached status', async () => {
    const store = useVpnSettingsStore(pinia);
    await store.load();

    const updatedSnapshot: VpnSnapshot = {
      profiles: [],
      rules: [],
      tunnels: [],
    };
    apiMock.fetchStatus.mockResolvedValue(updatedSnapshot);

    await store.refreshStatus();

    expect(apiMock.fetchStatus).toHaveBeenCalledTimes(2);
    expect(store.status).toEqual(updatedSnapshot);
  });
});
