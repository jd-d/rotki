import { backoff } from '@shared/utils';
import { useSessionApi } from '@/composables/api/session';
import { useNotificationsStore } from '@/store/notifications';
import type { TelemetryEvent } from '@/types/session';

export const usePeriodicStore = defineStore('session/periodic', () => {
  const lastBalanceSave = ref(0);
  const lastDataUpload = ref(0);
  const connectedNodes = ref<Record<string, string[]>>({});
  const failedToConnect = ref<Record<string, string[]>>({});
  const periodicRunning = ref(false);
  const telemetry = ref<TelemetryEvent[]>([]);

  const { notify } = useNotificationsStore();
  const { t } = useI18n({ useScope: 'global' });
  const { fetchPeriodicData } = useSessionApi();

  const check = async (): Promise<void> => {
    if (get(periodicRunning))
      return;

    set(periodicRunning, true);
    try {
      const result = await backoff(3, async () => fetchPeriodicData(), 10000);
      if (Object.keys(result).length === 0) {
        // an empty object means user is not logged in yet
        return;
      }

      const {
        connectedNodes: connected,
        failedToConnect: failed,
        lastBalanceSave: balance,
        lastDataUploadTs: upload,
        telemetry: telemetryEvents,
      } = result;

      if (get(lastBalanceSave) !== balance)
        set(lastBalanceSave, balance);

      if (get(lastDataUpload) !== upload)
        set(lastDataUpload, upload);

      set(connectedNodes, connected);
      set(failedToConnect, failed);
      set(telemetry, telemetryEvents);
    }
    catch (error: any) {
      notify({
        display: true,
        message: t('actions.session.periodic_query.error.message', {
          message: error.message,
        }),
        title: t('actions.session.periodic_query.error.title'),
      });
    }
    finally {
      set(periodicRunning, false);
    }
  };

  return {
    check,
    connectedNodes,
    failedToConnect,
    lastBalanceSave,
    lastDataUpload,
    telemetry,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(usePeriodicStore, import.meta.hot));
