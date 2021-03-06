const { eventHandler } = require('../eventBus');
const { logEvent } = require('../logger');
const networkPresets = require('../data/networkConditions');
let requestPromises, network;

const createdSessionListener = (client) => {
  let resolve;
  eventHandler.emit(
    'handlerActingOnNewSession',
    new Promise((r) => {
      resolve = r;
    }),
  );
  network = client.Network;
  requestPromises = {};
  network.requestWillBeSent(emitXHREvent);
  network.loadingFinished(resolveXHREvent);
  network.loadingFailed(resolveXHREvent);
  network.responseReceived(responseHandler);
  network.setCacheDisabled({ cacheDisabled: true });
  resolve();
};
eventHandler.on('createdSession', createdSessionListener);

const resetPromises = () => {
  requestPromises = {};
};

const emitXHREvent = (p) => {
  eventHandler.emit('requestStarted', p);
  if (!(requestPromises && requestPromises[p.requestId])) {
    logEvent(`Request started:\t RequestId : ${p.requestId}\tRequest Url : ${p.request.url}`);
    let resolve;
    eventHandler.emit('xhrEvent', {
      request: p,
      promise: new Promise((r) => {
        resolve = r;
      }),
    });
    requestPromises[p.requestId] = resolve;
  }
};

const resolveXHREvent = (p) => {
  if (requestPromises && requestPromises[p.requestId]) {
    logEvent(`Request resolved:\t RequestId : ${p.requestId}`);
    requestPromises[p.requestId]();
    delete requestPromises[p.requestId];
  }
};

const responseHandler = (response) => {
  logEvent(`Response Recieved: Request id: ${response.requestId}`);
  eventHandler.emit('responseReceived', response);
};

const setNetworkEmulation = async (networkType) => {
  const _networkType = process.env.TAIKO_EMULATE_NETWORK;
  if (!networkType && _networkType) {
    networkType = _networkType;
  }
  const emulate = networkPresets[networkType];
  let networkModes = Object.keys(networkPresets);
  if (emulate === undefined) {
    throw new Error(`Please set one of the given network types \n${networkModes.join('\n')}`);
  }
  await network.emulateNetworkConditions(emulate).catch((err) => {
    console.warn(`Could not emulate network ${err}`);
  });
};

module.exports = {
  setNetworkEmulation,
  resetPromises,
};
