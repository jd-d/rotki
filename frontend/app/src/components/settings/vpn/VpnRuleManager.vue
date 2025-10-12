<script setup lang="ts">
import { computed } from 'vue';
import SimpleTable from '@/components/common/SimpleTable.vue';
import { useVpnSettings } from '@/composables/settings/vpn/useVpnSettings';

const { routingRules } = useVpnSettings();
const rules = computed(() => routingRules.value);
</script>

<template>
  <section class="space-y-3">
    <header>
      <h2 class="text-lg font-semibold">
        Routing rules
      </h2>
    </header>
    <SimpleTable v-if="rules.length">
      <template #default>
        <tr v-for="rule in rules" :key="rule.identifier ?? rule.destination">
          <td>{{ rule.destination }}</td>
          <td class="capitalize">{{ rule.action }}</td>
        </tr>
      </template>
    </SimpleTable>
    <p v-else class="text-sm text-rui-text-secondary">
      No routing rules configured
    </p>
  </section>
</template>
