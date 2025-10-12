import type { ActionResult } from '@rotki/common';
import { api } from '@/services/rotkehlchen-api';
import { handleResponse, validStatus } from '@/services/utils';
import type {
  VpnProfileDraft,
  VpnProfileRecord,
  VpnRoutingRuleDraft,
  VpnRoutingRuleRecord,
  VpnSnapshot,
} from '@/types/settings/vpn';
import { snakeCaseTransformer } from '@/services/axios-transformers';

interface UseVpnSettingsApiReturn {
  fetchProfiles: () => Promise<VpnProfileRecord[]>;
  createProfile: (profile: VpnProfileDraft) => Promise<VpnProfileRecord>;
  updateProfile: (profile: VpnProfileRecord) => Promise<VpnProfileRecord>;
  deleteProfile: (identifier: number) => Promise<boolean>;
  fetchRules: () => Promise<VpnRoutingRuleRecord[]>;
  createRule: (rule: VpnRoutingRuleDraft) => Promise<VpnRoutingRuleRecord>;
  updateRule: (rule: VpnRoutingRuleRecord) => Promise<VpnRoutingRuleRecord>;
  deleteRule: (identifier: number) => Promise<boolean>;
  fetchStatus: () => Promise<VpnSnapshot>;
}

export function useVpnSettingsApi(): UseVpnSettingsApiReturn {
  const fetchProfiles = async (): Promise<VpnProfileRecord[]> => {
    const response = await api.instance.get<ActionResult<VpnProfileRecord[]>>('/settings/vpn/profiles', {
      validateStatus: validStatus,
    });

    return handleResponse(response);
  };

  const createProfile = async (profile: VpnProfileDraft): Promise<VpnProfileRecord> => {
    const response = await api.instance.put<ActionResult<VpnProfileRecord>>(
      '/settings/vpn/profiles',
      snakeCaseTransformer(profile),
      { validateStatus: validStatus },
    );

    return handleResponse(response);
  };

  const updateProfile = async (profile: VpnProfileRecord): Promise<VpnProfileRecord> => {
    const response = await api.instance.patch<ActionResult<VpnProfileRecord>>(
      '/settings/vpn/profiles',
      snakeCaseTransformer(profile),
      { validateStatus: validStatus },
    );

    return handleResponse(response);
  };

  const deleteProfile = async (identifier: number): Promise<boolean> => {
    const response = await api.instance.delete<ActionResult<boolean>>('/settings/vpn/profiles', {
      data: snakeCaseTransformer({ identifier }),
      validateStatus: validStatus,
    });

    return handleResponse(response);
  };

  const fetchRules = async (): Promise<VpnRoutingRuleRecord[]> => {
    const response = await api.instance.get<ActionResult<VpnRoutingRuleRecord[]>>('/settings/vpn/rules', {
      validateStatus: validStatus,
    });

    return handleResponse(response);
  };

  const createRule = async (rule: VpnRoutingRuleDraft): Promise<VpnRoutingRuleRecord> => {
    const response = await api.instance.put<ActionResult<VpnRoutingRuleRecord>>(
      '/settings/vpn/rules',
      snakeCaseTransformer(rule),
      { validateStatus: validStatus },
    );

    return handleResponse(response);
  };

  const updateRule = async (rule: VpnRoutingRuleRecord): Promise<VpnRoutingRuleRecord> => {
    const response = await api.instance.patch<ActionResult<VpnRoutingRuleRecord>>(
      '/settings/vpn/rules',
      snakeCaseTransformer(rule),
      { validateStatus: validStatus },
    );

    return handleResponse(response);
  };

  const deleteRule = async (identifier: number): Promise<boolean> => {
    const response = await api.instance.delete<ActionResult<boolean>>('/settings/vpn/rules', {
      data: snakeCaseTransformer({ identifier }),
      validateStatus: validStatus,
    });

    return handleResponse(response);
  };

  const fetchStatus = async (): Promise<VpnSnapshot> => {
    const response = await api.instance.get<ActionResult<VpnSnapshot>>('/settings/vpn/status', {
      validateStatus: validStatus,
    });

    return handleResponse(response);
  };

  return {
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    fetchStatus,
  };
}
