const chromeLauncher = require('chrome-launcher');
const chromeInterface = require('chrome-remote-interface');
const debug = require('debug')('prerender');

module.exports = function (source, options = {}) {
  debug('Calling prerender function for page %s', source);
  const chromeFlags = options.length ? options : options.chromeFlags;
  const delayLaunch = options.delayLaunch || 0;
  const delayPageLoad = options.delayPageLoad || 0;

  debug(`Launching chrome in ${delayLaunch}ms`);
  return wait(delayLaunch).then(() =>
  chain(
    () => launchChrome(source, chromeFlags),
    connectDebuggingInterface
  )
  .then(([chrome, client]) => {
    const { Page, Runtime } = client;
    return chain(
      () => debug('Enabling Page remote interface'),
      () => Page.enable(),

      () => debug('Waiting for page load event to be fired'),
      () => Page.loadEventFired(),
      () => debug(`Waiting ${delayPageLoad}ms after page load event`),
      () => wait(delayPageLoad),

      () => debug('Extracting HTML from the page'),
      () => Runtime.evaluate(expression(getHTML)),

      (result) => extractHtml(result),

      () => debug('Closing the debugging interface client'),
      () => client.close(),
      () => debug('Terminating Chrome'),
      () => chrome.kill()
    );
  })
  .then(
    (results) => results.find(r => r && r.extractedHTML).extractedHTML
  ));
}

function extractHtml(evaluatedCode) {
  debug('Got result from runtime');
  return { extractedHTML: `<!doctype html>${evaluatedCode.result.value}` };
}

function launchChrome(url, flags) {
  debug('Launching Chrome headless for url "%s"', url);
  const chromeFlags = [
    '--disable-gpu',
    '--headless',
  ].concat(flags).filter(Boolean);
  debug('Chrome flags: %s', chromeFlags);

  return chromeLauncher.launch({
    startingUrl: url,
    chromeFlags,
  });
}

function connectDebuggingInterface(chrome) {
  debug('Connecting debugging interface on port %s', chrome.port);
  return chromeInterface({ port: chrome.port });
}

function getHTML() {
  /* eslint-env browser */
  return document.documentElement.outerHTML;
}

function expression(code) {
  return { expression: `(${code})()` };
}

function chain(...actions) {
  const results = [];
  return actions.reduce((promise, fn, index) => {
    return promise.then((previous) => {
      if (index > 0) {
        results[index - 1] = previous;
      }
      return fn(previous);
    });
  }, Promise.resolve())
  .then((last) => {
    results.push(last);
    return results;
  });
}

function wait(time) {
  if (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
  return Promise.resolve();
}
