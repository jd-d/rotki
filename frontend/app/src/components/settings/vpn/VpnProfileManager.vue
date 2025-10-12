<script setup lang="ts">
import { computed } from 'vue';
import SimpleTable from '@/components/common/SimpleTable.vue';
import { useVpnSettings } from '@/composables/settings/vpn/useVpnSettings';

const { profiles } = useVpnSettings();
const profileList = computed(() => profiles.value);
</script>

<template>
  <section class="space-y-3">
    <header>
      <h2 class="text-lg font-semibold">
        VPN profiles
      </h2>
    </header>
    <SimpleTable v-if="profileList.length">
      <template #default>
        <tr v-for="profile in profileList" :key="profile.identifier ?? profile.name">
          <td class="font-semibold">
            {{ profile.name }}
          </td>
          <td>{{ profile.endpoint }}</td>
        </tr>
      </template>
    </SimpleTable>
    <p v-else class="text-sm text-rui-text-secondary">
      No VPN profiles configured
    </p>
  </section>
</template>
