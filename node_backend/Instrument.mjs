// Import and initialize Sentry as early as possible!
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://1e6c56149142128d5b23c17e4e3d8dee@o4509397661581312.ingest.us.sentry.io/4509397673246720",
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Capture 100% of the transactions for tracing
  tracesSampleRate: 1.0,
  // Capture 100% of profiling sessions
  profileSessionSampleRate: 1.0,
  // Profile lifecycle: automatically enables profiling during active traces
  profileLifecycle: 'trace',
  // Send default PII (e.g., IP address) to Sentry
  sendDefaultPii: true,
});

// Optionally, you can start a manual span for profiling custom code blocks
// Sentry.startSpan({ name: "My Span" }, () => {
//   // Code to be profiled
// });
