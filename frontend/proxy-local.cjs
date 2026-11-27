'use strict';

const { createLocalProxyConfiguration } = require('./proxy-local-gate.cjs');

module.exports = createLocalProxyConfiguration(process.env);
