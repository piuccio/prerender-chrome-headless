const chromeLauncher = require('chrome-launcher');
const chromeInterface = require('chrome-remote-interface');
const debug = require('debug')('prerender');

module.exports = function (source, chromeFlags) {
  debug('Calling prerender function for page %s', source);
  return chain(
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

      () => debug('Extracting HTML from the page'),
      () => Runtime.evaluate(expression(getHTML)),

      (result) => extractHtml(result),

      () => client.close(),
      () => chrome.kill()
    );
  })
  .then((results) => results.find(r => r && r.extractedHTML).extractedHTML);
}

function extractHtml(evaluatedCode) {
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
