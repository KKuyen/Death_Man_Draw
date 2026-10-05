'use strict';
const {contextBridge} = require('electron');
const endpoint = process.argv.find(a => a.startsWith('--saloon-endpoint='))?.slice('--saloon-endpoint='.length);
if (endpoint) contextBridge.exposeInMainWorld('saloonDesktop', Object.freeze({endpoint}));
