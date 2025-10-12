import { ref } from 'vue';
import type { VpnRuntimeStatus } from '@/types/settings/vpn';

const runtimeStatus = ref<VpnRuntimeStatus>({ profiles: [] });

export function useVpnRuntimeStatus() {
  return { runtimeStatus };
}
