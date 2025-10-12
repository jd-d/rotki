<script setup lang="ts">
import { onMounted } from 'vue';
import VpnProfileManager from '@/components/settings/vpn/VpnProfileManager.vue';
import VpnRuleManager from '@/components/settings/vpn/VpnRuleManager.vue';
import VpnStatusDashboard from '@/components/settings/vpn/VpnStatusDashboard.vue';
import { useVpnSettings } from '@/composables/settings/vpn/useVpnSettings';

const { load } = useVpnSettings();

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="space-y-6">
    <VpnStatusDashboard />
    <VpnProfileManager />
    <VpnRuleManager />
  </div>
</template>
