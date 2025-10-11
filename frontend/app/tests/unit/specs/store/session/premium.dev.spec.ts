import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePremiumStore } from '@/store/session/premium';

function withMutableEnv(): Record<string, any> {
  return import.meta.env as unknown as Record<string, any>;
}

describe('premium store developer override', () => {
  let originalFlag: unknown;

  beforeEach(() => {
    const env = withMutableEnv();
    originalFlag = env.VITE_ROTKI_DEV_UNLOCK_ALL;
    env.VITE_ROTKI_DEV_UNLOCK_ALL = 'true';

    const pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    const env = withMutableEnv();
    if (originalFlag === undefined)
      delete env.VITE_ROTKI_DEV_UNLOCK_ALL;
    else
      env.VITE_ROTKI_DEV_UNLOCK_ALL = originalFlag;
  });

  it('keeps premium enabled when the override is active', () => {
    const store = usePremiumStore();

    expect(store.premium.value).toBe(true);

    store.premium.value = false;
    expect(store.premium.value).toBe(true);
  });
});
