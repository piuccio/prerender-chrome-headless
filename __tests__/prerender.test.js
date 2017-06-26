const render = require('../index');

describe('Pre-renderer', () => {
  it('pre-renders a web page', () => {
    return expect(render('https://google.com')).resolves.toMatch(/google/i);
  });
});
