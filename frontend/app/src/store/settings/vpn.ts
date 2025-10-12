import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref } from 'vue';
import { useVpnSettingsApi } from '@/composables/api/settings/vpn-api';
import type {
  VpnProfileDraft,
  VpnProfileRecord,
  VpnRoutingRuleDraft,
  VpnRoutingRuleRecord,
  VpnSnapshot,
} from '@/types/settings/vpn';

export const useVpnSettingsStore = defineStore('settings/vpn', () => {
  const loading = ref(false);
  const profiles = ref<VpnProfileRecord[]>([]);
  const routingRules = ref<VpnRoutingRuleRecord[]>([]);
  const status = ref<VpnSnapshot | null>(null);

  const api = useVpnSettingsApi();

  const load = async (): Promise<void> => {
    loading.value = true;
    try {
      const [fetchedProfiles, fetchedRules, snapshot] = await Promise.all([
        api.fetchProfiles(),
        api.fetchRules(),
        api.fetchStatus(),
      ]);
      profiles.value = fetchedProfiles;
      routingRules.value = fetchedRules;
      status.value = snapshot;
    }
    finally {
      loading.value = false;
    }
  };

  const refreshStatus = async (): Promise<VpnSnapshot | null> => {
    try {
      const snapshot = await api.fetchStatus();
      status.value = snapshot;
      return snapshot;
    }
    catch (error) {
      console.error(error);
      return null;
    }
  };

  const addProfile = async (profile: VpnProfileDraft): Promise<VpnProfileRecord> => {
    const result = await api.createProfile(profile);
    profiles.value = [...profiles.value, result];
    return result;
  };

  const editProfile = async (profile: VpnProfileRecord): Promise<VpnProfileRecord> => {
    const result = await api.updateProfile(profile);
    profiles.value = profiles.value.map(existing => (existing.identifier === result.identifier ? result : existing));
    return result;
  };

  const removeProfile = async (identifier: number): Promise<boolean> => {
    const success = await api.deleteProfile(identifier);
    if (success)
      profiles.value = profiles.value.filter(profile => profile.identifier !== identifier);

    return success;
  };

  const addRule = async (rule: VpnRoutingRuleDraft): Promise<VpnRoutingRuleRecord> => {
    const result = await api.createRule(rule);
    routingRules.value = [...routingRules.value, result];
    return result;
  };

  const editRule = async (rule: VpnRoutingRuleRecord): Promise<VpnRoutingRuleRecord> => {
    const result = await api.updateRule(rule);
    routingRules.value = routingRules.value.map(existing => (existing.identifier === result.identifier ? result : existing));
    return result;
  };

  const removeRule = async (identifier: number): Promise<boolean> => {
    const success = await api.deleteRule(identifier);
    if (success)
      routingRules.value = routingRules.value.filter(rule => rule.identifier !== identifier);

    return success;
  };

  return {
    loading,
    profiles,
    routingRules,
    status,
    addProfile,
    addRule,
    editProfile,
    editRule,
    load,
    refreshStatus,
    removeProfile,
    removeRule,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useVpnSettingsStore, import.meta.hot));
