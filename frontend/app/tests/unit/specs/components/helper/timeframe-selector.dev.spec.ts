import type { TimeFrameSetting } from '@rotki/common';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TimeframeSelector from '@/components/helper/TimeframeSelector.vue';

function withMutableEnv(): Record<string, any> {
  return import.meta.env as unknown as Record<string, any>;
}

describe('TimeframeSelector premium override', () => {
  let originalFlag: unknown;
  let pinia: Pinia;

  beforeEach(() => {
    const env = withMutableEnv();
    originalFlag = env.VITE_ROTKI_DEV_UNLOCK_ALL;
    env.VITE_ROTKI_DEV_UNLOCK_ALL = 'true';

    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    const env = withMutableEnv();
    if (originalFlag === undefined)
      delete env.VITE_ROTKI_DEV_UNLOCK_ALL;
    else
      env.VITE_ROTKI_DEV_UNLOCK_ALL = originalFlag;
  });

  it('renders all timeframe controls unlocked when override is active', () => {
    const timeframes = ['remember', 'extended'] as unknown as TimeFrameSetting[];

    const wrapper = mount(TimeframeSelector, {
      props: {
        disabled: false,
        modelValue: timeframes[0],
        visibleTimeframes: timeframes,
      },
      global: {
        plugins: [pinia],
        stubs: {
          PremiumLock: {
            template: '<div data-test="premium-lock" />',
          },
          RuiButtonGroup: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div data-test="button-group"><slot /></div>',
          },
          RuiButton: {
            props: ['disabled'],
            template: '<button :disabled="disabled" data-test="timeframe-button"><slot /></button>',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="premium-lock"]').exists()).toBe(false);

    const buttons = wrapper.findAll('[data-test="timeframe-button"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[1].attributes('disabled')).toBeUndefined();

    expect(wrapper.html()).toMatchSnapshot();
  });
});
