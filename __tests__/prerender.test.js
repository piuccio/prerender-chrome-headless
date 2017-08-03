const render = require('../index');

describe('Pre-renderer', () => {
  it('pre-renders a web page', () => {
    return expect(render('https://google.com')).resolves.toMatch(/google/i);
  });

  it('pre-renders a web page with options', () => {
    return expect(render('https://google.com', {
      delayLaunch: 100,
      delayPageLoad: 100,
    })).resolves.toMatch(/google/i);
  });
});
