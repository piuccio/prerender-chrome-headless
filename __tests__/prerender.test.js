const render = require('../index');
const http = require('http');
const chromeFlags = ['--no-sandbox'];

describe('Pre-renderer', () => {
  it('pre-renders a web page', () => {
    return expect(render('https://google.com', { chromeFlags })).resolves.toMatch(/google/i);
  });

  it('pre-renders a web page with options', () => {
    return expect(render('https://google.com', {
      delayLaunch: 100,
      delayPageLoad: 100,
      chromeFlags,
    })).resolves.toMatch(/google/i);
  });

  it('reports console messages', () => {
    const onPageError = jest.fn();
    return listen(() => render('http://localhost:4100', { onPageError, chromeFlags }))
      .then((result) => {
        expect(result).toMatch(/test page/);
        expect(onPageError).toHaveBeenCalledWith(expect.any(Error));
        const error = onPageError.mock.calls[0][0];
        expect(error.message).toMatch(/object is not defined/);
      });
  })
});

function listen(cb) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/html'
        });
        res.end(`
        <html>
          <head>
            <title>test page</title>
          </head>
          <body>
            <script>
              object.fn();
            </script>
          </body>
        </html>
        `);
      })
      .listen(4100, () => {
        cb().then((args) => {
          server.close();
          resolve(args);
        }).catch((err) => {
          server.close();
          reject(err);
        });
      });
  });
}
