import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ThemeSettingsCategory from '@/components/settings/frontend/ThemeSettingsCategory.vue';

function withMutableEnv(): Record<string, any> {
  return import.meta.env as unknown as Record<string, any>;
}

describe('ThemeSettingsCategory premium override', () => {
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

  it('renders theme manager when override is active', () => {
    const wrapper = mount(ThemeSettingsCategory, {
      global: {
        plugins: [pinia],
        stubs: {
          SettingCategory: {
            template:
              '<section data-test="setting-category"><header><slot name="title" /></header><p><slot name="subtitle" /></p><div><slot /></div></section>',
          },
          SettingsItem: {
            template: '<div data-test="settings-item"><slot /></div>',
          },
          ThemeManager: {
            name: 'ThemeManager',
            template: '<div data-test="theme-manager" />',
          },
          ThemeManagerPlaceholder: {
            template: '<div data-test="theme-placeholder" />',
          },
        },
      },
    });

    expect(wrapper.find('[data-test="theme-manager"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="theme-placeholder"]').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
