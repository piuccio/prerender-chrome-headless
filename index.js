const debug = require('debug')('prerender');

const puppeteer = require('puppeteer');

module.exports = function (source, options = {}) {
  debug('Calling prerender function for page %s', source);
  const chromeFlags = (options.length ? options : options.chromeFlags) || [];
  const delayLaunch = options.delayLaunch || 0;
  const delayPageLoad = options.delayPageLoad || 0;
  const puppeteerArgs = { args: chromeFlags };

  debug(`Launching chrome in ${delayLaunch}ms`);
  return wait(delayLaunch).then(() =>
  chain(
    'puppeteer.launch',
    () => puppeteer.launch(puppeteerArgs),

    'browser.newPage',
    (browser) => browser.newPage(),

    `page.goto('${source}')`,
    (page) => page.goto(source)
  )
  .then(([browser, page]) => chain(
    `Waiting ${delayPageLoad}ms after page load event`,
    () => page.waitFor(delayPageLoad),

    'Extracting HTML from the page',
    () => page.content(),

    (result) => extractHtml(result),

    'Terminating Chrome',
    () => browser.close()
  ))
  .then(
    (results) => results.find(r => r && r.extractedHTML).extractedHTML
  ));
}

function extractHtml(result) {
  debug('Got result from runtime');
  return { extractedHTML: result };
}

function chain(...actions) {
  const results = [];
  let didCallAFunction = false;
  return actions.reduce((promise, fnOrString) => {
    return promise.then((previous) => {
      if (typeof fnOrString === 'function') {
        if (didCallAFunction) {
          results.push(previous);
        }
        didCallAFunction = true;
        return fnOrString(previous);
      } else {
        debug(fnOrString);
        return previous;
      }
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