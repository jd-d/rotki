<script setup lang="ts">
import { computed } from 'vue';
import SimpleTable from '@/components/common/SimpleTable.vue';
import { useVpnRuntimeStatus } from '@/composables/settings/vpn/useVpnRuntimeStatus';
import { useVpnSettings } from '@/composables/settings/vpn/useVpnSettings';

const { runtimeStatus } = useVpnRuntimeStatus();
const { status, refreshStatus } = useVpnSettings();

const runtimeProfiles = computed(() => runtimeStatus.value?.profiles ?? []);
const snapshotRules = computed(() => status.value?.rules ?? []);
const snapshotTunnels = computed(() => status.value?.tunnels ?? []);
const snapshotProfiles = computed(() => status.value?.profiles ?? []);
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">
        VPN status
      </h2>
      <RuiButton @click="refreshStatus()">
        Refresh
      </RuiButton>
    </header>

    <div class="space-y-2">
      <h3 class="font-medium">Runtime</h3>
      <SimpleTable v-if="runtimeProfiles.length">
        <template #default>
          <tr v-for="item in runtimeProfiles" :key="item.profile.identifier">
            <td class="font-semibold">
              {{ item.profile.name }}
            </td>
            <td>
              <ul class="space-y-1">
                <li v-for="tunnel in item.tunnels" :key="tunnel.identifier">
                  {{ tunnel.endpoint }}
                </li>
              </ul>
            </td>
          </tr>
        </template>
      </SimpleTable>
      <p v-else class="text-rui-text-secondary text-sm">
        No active VPN tunnels
      </p>
    </div>

    <div class="space-y-2">
      <h3 class="font-medium">Snapshot</h3>
      <div v-if="snapshotProfiles.length" class="space-y-1">
        <h4 class="text-sm font-semibold text-rui-text-secondary">
          Profiles
        </h4>
        <ul class="space-y-1">
          <li v-for="profile in snapshotProfiles" :key="profile.identifier">
            {{ profile.name }} - {{ profile.endpoint }}
          </li>
        </ul>
      </div>
      <div v-if="snapshotRules.length" class="space-y-1">
        <h4 class="text-sm font-semibold text-rui-text-secondary">
          Routing rules
        </h4>
        <SimpleTable>
          <template #default>
            <tr v-for="rule in snapshotRules" :key="rule.identifier">
              <td>{{ rule.destination }}</td>
              <td>{{ rule.action }}</td>
            </tr>
          </template>
        </SimpleTable>
      </div>
      <div v-if="snapshotTunnels.length" class="space-y-1">
        <h4 class="text-sm font-semibold text-rui-text-secondary">
          Tunnels
        </h4>
        <ul class="space-y-1">
          <li v-for="tunnel in snapshotTunnels" :key="tunnel.identifier">
            {{ tunnel.endpoint }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
