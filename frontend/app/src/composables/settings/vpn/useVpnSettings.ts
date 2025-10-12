import { storeToRefs } from 'pinia';
import { useVpnSettingsStore } from '@/store/settings/vpn';

export function useVpnSettings() {
  const store = useVpnSettingsStore();
  const { profiles, routingRules, status, loading } = storeToRefs(store);

  return {
    profiles,
    routingRules,
    status,
    loading,
    load: store.load,
    refreshStatus: store.refreshStatus,
    createProfile: store.addProfile,
    updateProfile: store.editProfile,
    deleteProfile: store.removeProfile,
    createRule: store.addRule,
    updateRule: store.editRule,
    deleteRule: store.removeRule,
  };
}
