Telemetry dashboard
===================

The telemetry dashboard surfaces recent networking activity captured by rotki.
It combines HTTP requests, WebSocket broadcasts, and VPN probes into a single
view so you can audit connectivity problems or latency spikes at a glance.

Opening the dashboard
---------------------

1. Unlock rotki and wait for the periodic monitor to finish its initial poll.
2. Open :menuselection:`Settings -> Telemetry` in the application sidebar.
3. The page automatically refreshes whenever new telemetry batches arrive from
   the backend periodic query.

Working with the data
---------------------

* **Filters** – Narrow results by direction (inbound or outbound), subsystem
  (HTTP, WebSocket, or VPN), and routing path. Use the search box to match
  endpoints or hosts.
* **Latency column** – Displays the measured request or message round trip in
  milliseconds. High values highlight potential congestion or slow upstream
  services.
* **Status column** – Shows HTTP status codes, transport errors, or VPN probe
  failures. Hover over table rows in the UI to view the complete endpoint.

Data retention
--------------

The dashboard presents the 100 most recent events kept in memory for the
current session. Signing out or restarting rotki clears the buffer.
