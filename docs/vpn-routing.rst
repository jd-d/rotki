VPN routing configuration
=========================

Rotki can coordinate outbound requests across multiple VPN tunnels. The VPN
settings live under :menuselection:`Settings --> VPN Routing` and provide three
cooperating tools:

Profiles
   Define how to reach each VPN endpoint. A profile stores the friendly name,
   connection endpoint (for example a WireGuard URI), optional authentication
   token, routing strategy (round robin or parallel), maximum simultaneous
   tunnels, and whether the profile is currently enabled. The backend persists
   these profiles in the user database so that reconnecting or restarting
   rotki keeps the same configuration.

Routing rules
   Override the automatic dispatch for specific destinations. Rules let you
   require, prefer, or avoid a profile when contacting a host. They also
   support priorities so that the highest priority enabled rule wins for a
   given destination.

Status dashboard
   Shows two perspectives: the real time runtime state collected from the VPN
   lifecycle controller (active tunnels, last heartbeat, tunnel health) and the
   persisted snapshot (profiles, routing rules, and tunnel metadata stored in
   the database). Use the **Refresh snapshot** button if you changed data in
   another client and want to pull the latest state without reloading the page.

Typical workflow
----------------

1. Create one profile per VPN tunnel or gateway you can reach. Start with the
   default ``round_robin`` strategy unless a gateway supports fan out (set
   ``parallel`` when the endpoint can accept multiple simultaneous tunnels).
2. If you need to steer traffic for a specific hostname, add a routing rule.
   For example, set ``api.rotki.com`` to *require* a privacy focused tunnel
   while keeping the default routing for everything else.
3. Monitor the status dashboard. The runtime panel shows live tunnel changes
   as rotki rotates connections. The snapshot section helps verify what is
   stored on disk.

The VPN manager also exposes its runtime state through the periodic session
API. The frontend keeps the dashboard current as long as you remain logged in.
