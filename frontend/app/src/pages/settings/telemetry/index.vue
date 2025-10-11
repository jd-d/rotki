<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import '@/utils/date';
import SettingsPage from '@/components/settings/controls/SettingsPage.vue';
import SettingCategory from '@/components/settings/SettingCategory.vue';
import SimpleTable from '@/components/common/SimpleTable.vue';
import { usePeriodicStore } from '@/store/session/periodic';
import type { TelemetryEvent } from '@/types/session';

definePage({});

const { t } = useI18n({ useScope: 'global' });
const periodicStore = usePeriodicStore();
const { telemetry } = storeToRefs(periodicStore);

const search = ref('');
const directionFilter = ref<'all' | TelemetryEvent['direction']>('all');
const subsystemFilter = ref<'all' | TelemetryEvent['subsystem']>('all');
const routeFilter = ref<'all' | string>('all');

const routeOptions = computed(() => {
  const routes = new Set<string>();
  for (const entry of telemetry.value) {
    if (entry.route)
      routes.add(entry.route);
  }
  return ['all', ...Array.from(routes).sort()];
});

const filteredTelemetry = computed(() => {
  const query = search.value.trim().toLowerCase();
  const direction = directionFilter.value;
  const subsystem = subsystemFilter.value;
  const route = routeFilter.value;

  return telemetry.value
    .filter((event) => {
      if (direction !== 'all' && event.direction !== direction)
        return false;
      if (subsystem !== 'all' && event.subsystem !== subsystem)
        return false;
      if (route !== 'all' && (event.route ?? 'direct') !== route)
        return false;
      if (!query)
        return true;

      const haystack = `${event.endpoint} ${event.route ?? ''} ${event.subsystem}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => b.timestamp - a.timestamp);
});

const hasTelemetry = computed(() => filteredTelemetry.value.length > 0);

function formatTimestamp(timestamp: number): string {
  return dayjs(timestamp).format('LLL');
}

function formatLatency(latencyMs: number): string {
  return `${latencyMs.toFixed(2)} ms`;
}

function formatStatus(event: TelemetryEvent): string {
  if (event.error)
    return event.error;
  if (event.statusCode !== null && event.statusCode !== undefined)
    return `${event.statusCode}${event.success ? '' : ' ⚠️'}`;

  return event.success ? t('telemetry.status.success') : t('telemetry.status.failed');
}

onMounted(() => {
  void periodicStore.check();
});
</script>

<template>
  <SettingsPage>
    <SettingCategory>
      <template #title>
        {{ t('telemetry.title') }}
      </template>
      <template #subtitle>
        {{ t('telemetry.subtitle') }}
      </template>
      <div class="flex flex-col gap-6 pt-6">
        <div class="border border-default rounded-lg p-4 md:p-6 space-y-4">
          <h6 class="text-h6 font-semibold">
            {{ t('telemetry.filters.title') }}
          </h6>
          <div class="grid gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-2">
              <span class="text-caption text-rui-grey-600 dark:text-rui-grey-400">
                {{ t('telemetry.filters.search') }}
              </span>
              <input
                v-model="search"
                type="search"
                class="rui-input"
                :placeholder="t('telemetry.filters.search_placeholder')"
                data-cy="telemetry-filter-search"
              >
            </label>
            <label class="flex flex-col gap-2">
              <span class="text-caption text-rui-grey-600 dark:text-rui-grey-400">
                {{ t('telemetry.filters.direction') }}
              </span>
              <select
                v-model="directionFilter"
                class="rui-input"
                data-cy="telemetry-filter-direction"
              >
                <option value="all">
                  {{ t('telemetry.filters.direction_all') }}
                </option>
                <option value="outbound">
                  {{ t('telemetry.filters.direction_outbound') }}
                </option>
                <option value="inbound">
                  {{ t('telemetry.filters.direction_inbound') }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-2">
              <span class="text-caption text-rui-grey-600 dark:text-rui-grey-400">
                {{ t('telemetry.filters.subsystem') }}
              </span>
              <select
                v-model="subsystemFilter"
                class="rui-input"
                data-cy="telemetry-filter-subsystem"
              >
                <option value="all">
                  {{ t('telemetry.filters.subsystem_all') }}
                </option>
                <option value="http">
                  HTTP
                </option>
                <option value="websocket">
                  WebSocket
                </option>
                <option value="vpn">
                  VPN
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-2">
              <span class="text-caption text-rui-grey-600 dark:text-rui-grey-400">
                {{ t('telemetry.filters.route') }}
              </span>
              <select
                v-model="routeFilter"
                class="rui-input"
                data-cy="telemetry-filter-route"
              >
                <option
                  v-for="option in routeOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option === 'all' ? t('telemetry.filters.route_all') : option }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div class="border border-default rounded-lg overflow-hidden">
          <div class="border-b border-default bg-rui-grey-50 dark:bg-[#1a1a1a] p-4">
            <h6 class="text-h6 font-semibold">
              {{ t('telemetry.table.title') }}
            </h6>
          </div>
          <div class="p-4 overflow-x-auto">
            <template v-if="hasTelemetry">
              <SimpleTable class="min-w-[720px]">
                <thead>
                  <tr>
                    <th class="text-left">{{ t('telemetry.table.headers.timestamp') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.subsystem') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.direction') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.endpoint') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.route') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.latency') }}</th>
                    <th class="text-left">{{ t('telemetry.table.headers.status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="event in filteredTelemetry"
                    :key="`${event.timestamp}-${event.endpoint}-${event.subsystem}`"
                    data-cy="telemetry-row"
                  >
                    <td>{{ formatTimestamp(event.timestamp) }}</td>
                    <td class="capitalize">{{ event.subsystem }}</td>
                    <td class="capitalize">{{ event.direction }}</td>
                    <td class="break-all">{{ event.endpoint }}</td>
                    <td>{{ event.route ?? t('telemetry.table.direct_route') }}</td>
                    <td>{{ formatLatency(event.latencyMs) }}</td>
                    <td>{{ formatStatus(event) }}</td>
                  </tr>
                </tbody>
              </SimpleTable>
            </template>
            <p
              v-else
              class="text-sm text-rui-grey-600 dark:text-rui-grey-400"
              data-cy="telemetry-empty"
            >
              {{ t('telemetry.table.empty') }}
            </p>
          </div>
        </div>
      </div>
    </SettingCategory>
  </SettingsPage>
</template>
