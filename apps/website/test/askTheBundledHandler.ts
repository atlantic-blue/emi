/**
 * Asks one address of the handler inside a built server function package, the way the runtime
 * asks it: a function url event in, the answer out.
 *
 * It runs as its own process on purpose. The runtime loads the handler by file name from the root
 * of the package it was given, and the package carries its own copy of Next.js and of every chunk
 * the pages need, so a loader inside the test runner would resolve none of it the same way.
 *
 * Takes the directory of the package and the address, and writes the answer to stdout as JSON.
 */

const [directory, address] = process.argv.slice(2);

if (directory === undefined || address === undefined) {
  process.stderr.write('name the package directory and the address to ask for\n');
  process.exit(2);
}

interface Answer {
  readonly statusCode: number;
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}

async function ask(): Promise<void> {
  const loaded = (await import(`${directory}/index.mjs`)) as {
    handler: (event: unknown) => Promise<Answer>;
  };

  const answer = await loaded.handler({
    version: '2.0',
    rawPath: address,
    rawQueryString: '',
    headers: { host: 'myemi.app', 'x-forwarded-host': 'myemi.app' },
    requestContext: {
      http: {
        method: 'GET',
        path: address,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'the test that reads the built package',
      },
    },
    isBase64Encoded: false,
  });

  const body = answer.body ?? '';

  process.stdout.write(
    JSON.stringify({
      statusCode: answer.statusCode,
      location: answer.headers?.location ?? null,
      body: answer.isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body,
    }),
  );
}

// Not a top level await: the workspace declares no module type, so node reads this file as
// CommonJS and refuses one.
ask().catch((reason: unknown) => {
  process.stderr.write(`${String(reason)}\n`);
  process.exit(1);
});
