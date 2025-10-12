import { libraryDefaults } from '@test/utils/provide-defaults';
import { mount, shallowMount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { ref, defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VpnProfileManager from '@/components/settings/vpn/VpnProfileManager.vue';
import VpnRuleManager from '@/components/settings/vpn/VpnRuleManager.vue';
import VpnSettings from '@/components/settings/vpn/VpnSettings.vue';
import VpnStatusDashboard from '@/components/settings/vpn/VpnStatusDashboard.vue';
import type {
  VpnProfileRecord,
  VpnRoutingRuleRecord,
  VpnRuntimeStatus,
  VpnSnapshot,
  VpnTunnelStateRecord,
} from '@/types/settings/vpn';

const mockProfiles = ref<VpnProfileRecord[]>([]);
const mockRules = ref<VpnRoutingRuleRecord[]>([]);
const mockStatus = ref<VpnSnapshot | null>(null);
const runtimeStatus = ref<VpnRuntimeStatus>({ profiles: [] });

const loadMock = vi.fn();
const refreshStatusMock = vi.fn();
const createProfileMock = vi.fn();
const updateProfileMock = vi.fn();
const deleteProfileMock = vi.fn();
const createRuleMock = vi.fn();
const updateRuleMock = vi.fn();
const deleteRuleMock = vi.fn();

vi.mock('@/composables/settings/vpn/useVpnSettings', () => ({
  useVpnSettings: () => ({
    load: loadMock,
    refreshStatus: refreshStatusMock,
    profiles: mockProfiles,
    routingRules: mockRules,
    status: mockStatus,
    createProfile: createProfileMock,
    updateProfile: updateProfileMock,
    deleteProfile: deleteProfileMock,
    createRule: createRuleMock,
    updateRule: updateRuleMock,
    deleteRule: deleteRuleMock,
  }),
}));

vi.mock('@/composables/settings/vpn/useVpnRuntimeStatus', () => ({
  useVpnRuntimeStatus: () => ({ runtimeStatus }),
}));

const SimpleTableStub = defineComponent({
  setup(_, { slots }) {
    return () => h('table', [h('tbody', slots.default?.())]);
  },
});

const RuiButtonStub = defineComponent({
  emits: ['click'],
  setup(_, { emit, slots }) {
    return () => h('button', { onClick: () => emit('click') }, slots.default?.());
  },
});

const RuiTextFieldStub = defineComponent({
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('input', {
      value: props.modelValue,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    });
  },
});

const RuiCheckboxStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('input', {
      type: 'checkbox',
      checked: props.modelValue,
      onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
    });
  },
});

const SlotStub = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.();
  },
});

describe('VPN settings components', () => {
  const pinia = createPinia();
  const stubs = {
    SimpleTable: SimpleTableStub,
    RuiButton: RuiButtonStub,
    RuiTextField: RuiTextFieldStub,
    RuiCheckbox: RuiCheckboxStub,
    RuiBadge: SlotStub,
    RowActions: SlotStub,
    BigDialog: SlotStub,
  };

  beforeEach(() => {
    document.body.dataset.app = 'true';
    mockProfiles.value = [];
    mockRules.value = [];
    mockStatus.value = null;
    runtimeStatus.value = { profiles: [] };
    loadMock.mockReset();
    refreshStatusMock.mockReset();
    createProfileMock.mockReset();
    updateProfileMock.mockReset();
    deleteProfileMock.mockReset();
    createRuleMock.mockReset();
    updateRuleMock.mockReset();
    deleteRuleMock.mockReset();
  });

  it('invokes load when mounting VpnSettings', async () => {
    shallowMount(VpnSettings, {
      global: {
        plugins: [pinia],
        provide: libraryDefaults,
        stubs: {
          VpnStatusDashboard: true,
          VpnProfileManager: true,
          VpnRuleManager: true,
        },
      },
    });

    expect(loadMock).toHaveBeenCalledOnce();
  });

  it('renders runtime and snapshot status in VpnStatusDashboard', () => {
    const tunnels: VpnTunnelStateRecord[] = [
      {
        identifier: 5,
        profile_id: 1,
        endpoint: 'wireguard://primary#0',
        state: 'active',
        last_heartbeat: 123,
        failure_count: 0,
        rotation_cursor: 0,
      },
    ];

    runtimeStatus.value = {
      profiles: [
        {
          profile: {
            identifier: 1,
            name: 'primary',
            endpoint: 'wireguard://primary',
            auth_token: null,
            routing_strategy: 'parallel',
            max_parallel: 1,
            enabled: true,
          },
          tunnels,
        },
      ],
    } satisfies VpnRuntimeStatus;

    mockStatus.value = {
      profiles: runtimeStatus.value.profiles.map(entry => entry.profile),
      rules: [
        {
          identifier: 10,
          profile_id: 1,
          destination: 'api.rotki.com',
          action: 'prefer',
          priority: 5,
          enabled: true,
        },
      ],
      tunnels,
    } satisfies VpnSnapshot;

    const wrapper = mount(VpnStatusDashboard, {
      global: {
        plugins: [pinia],
        provide: libraryDefaults,
        stubs,
      },
    });

    expect(wrapper.text()).toContain('primary');
    expect(wrapper.text()).toContain('wireguard://primary#0');
    expect(wrapper.text()).toContain('api.rotki.com');

    wrapper.findComponent(RuiButtonStub).trigger('click');
    expect(refreshStatusMock).toHaveBeenCalledOnce();
  });

  it('lists profiles in VpnProfileManager', () => {
    mockProfiles.value = [
      {
        identifier: 1,
        name: 'primary',
        endpoint: 'wireguard://primary',
        auth_token: null,
        routing_strategy: 'round_robin',
        max_parallel: 1,
        enabled: true,
      },
    ];

    const wrapper = mount(VpnProfileManager, {
      global: {
        plugins: [pinia],
        provide: libraryDefaults,
        stubs,
      },
    });

    expect(wrapper.text()).toContain('primary');
    expect(wrapper.text()).toContain('wireguard://primary');
  });

  it('lists routing rules in VpnRuleManager', () => {
    mockRules.value = [
      {
        identifier: 3,
        profile_id: 1,
        destination: 'rpc.rotki.com',
        action: 'require',
        priority: 2,
        enabled: true,
      },
    ];

    const wrapper = mount(VpnRuleManager, {
      global: {
        plugins: [pinia],
        provide: libraryDefaults,
        stubs,
      },
    });

    expect(wrapper.text()).toContain('rpc.rotki.com');
    expect(wrapper.text()).toContain('require');
  });
});
