import { z } from 'zod';

export const vpnProfileRecordValidator = z.object({
  identifier: z.number().nullable(),
  name: z.string(),
  endpoint: z.string(),
  auth_token: z.string().nullable(),
  routing_strategy: z.enum(['round_robin', 'parallel']),
  max_parallel: z.number(),
  enabled: z.boolean(),
});

export const vpnProfileRecordWithIdValidator = vpnProfileRecordValidator.extend({
  identifier: z.number(),
});

export type VpnProfileRecord = z.infer<typeof vpnProfileRecordWithIdValidator>;
export type VpnProfileDraft = z.infer<typeof vpnProfileRecordValidator>;

export const vpnRoutingRuleRecordValidator = z.object({
  identifier: z.number().nullable(),
  profile_id: z.number(),
  destination: z.string(),
  action: z.enum(['prefer', 'require', 'avoid']),
  priority: z.number(),
  enabled: z.boolean(),
});

export const vpnRoutingRuleRecordWithIdValidator = vpnRoutingRuleRecordValidator.extend({
  identifier: z.number(),
});

export type VpnRoutingRuleRecord = z.infer<typeof vpnRoutingRuleRecordWithIdValidator>;
export type VpnRoutingRuleDraft = z.infer<typeof vpnRoutingRuleRecordValidator>;

export const vpnTunnelStateRecordValidator = z.object({
  identifier: z.number(),
  profile_id: z.number(),
  endpoint: z.string(),
  state: z.string(),
  last_heartbeat: z.number().nullable(),
  failure_count: z.number(),
  rotation_cursor: z.number().nullable(),
});

export type VpnTunnelStateRecord = z.infer<typeof vpnTunnelStateRecordValidator>;

export const vpnSnapshotValidator = z.object({
  profiles: z.array(vpnProfileRecordWithIdValidator),
  rules: z.array(vpnRoutingRuleRecordWithIdValidator),
  tunnels: z.array(vpnTunnelStateRecordValidator),
});

export type VpnSnapshot = z.infer<typeof vpnSnapshotValidator>;

export const vpnRuntimeStatusValidator = z.object({
  profiles: z.array(
    z.object({
      profile: vpnProfileRecordWithIdValidator,
      tunnels: z.array(vpnTunnelStateRecordValidator),
    }),
  ),
});

export type VpnRuntimeStatus = z.infer<typeof vpnRuntimeStatusValidator>;

export interface UseVpnSettingsState {
  readonly profiles: VpnProfileRecord[];
  readonly routingRules: VpnRoutingRuleRecord[];
  readonly status: VpnSnapshot | null;
}
