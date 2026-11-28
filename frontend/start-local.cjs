'use strict';

// Loaded before Angular/Vite so proxy diagnostics cannot print request URLs,
// and PORT cannot override the origin enforced by the provenance gate.
delete process.env.DEBUG;
delete process.env.PORT;
