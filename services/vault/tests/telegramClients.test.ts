import { cognitoPool, invalidParameter, userNameExists } from '../src/telegram/cognitoPool';
import {
  parameterAlreadyExists,
  parameterNotFound,
  parameterStore,
  type SendsToTheParameterStore,
} from '../src/telegram/parameterStore';
import { type Fetches, reachesTelegram } from '../src/telegram/reachesTelegram';
import type { SendsToThePool } from '../src/telegram/cognitoPool';

/**
 * The three clients the sign in with Telegram is bound to: the parameter store, the pool and the
 * way out to Telegram. Each one is a pass through, so every case reads either what left or what
 * came back, and the two answers that are outcomes rather than faults are read as outcomes.
 */

const userPoolId = 'eu-central-1_NOTAPOOL';
const userName = 'tg_ABCDEFGHJKMNPQRSTVWXYZ012';
const aName = '/emi/accounts/telegram/salt';

interface Sent {
  readonly command: string;
  readonly input: unknown;
}

function anErrorNamed(name: string): Error {
  const thrown = new Error(`the service refused: ${name}`);

  thrown.name = name;

  return thrown;
}

function parameterClientThatAnswers(answer: unknown): {
  client: SendsToTheParameterStore;
  sent: Sent[];
} {
  const sent: Sent[] = [];

  return {
    sent,
    client: {
      send: (command) => {
        sent.push({ command: command.constructor.name, input: command.input });

        return Promise.resolve(answer as never);
      },
    },
  };
}

function parameterClientThatRefuses(name: string): SendsToTheParameterStore {
  return { send: () => Promise.reject(anErrorNamed(name)) };
}

function poolClientThatAnswers(): { client: SendsToThePool; sent: Sent[] } {
  const sent: Sent[] = [];

  return {
    sent,
    client: {
      send: (command) => {
        sent.push({ command: command.constructor.name, input: command.input });

        return Promise.resolve({});
      },
    },
  };
}

function poolClientThatRefuses(name: string): SendsToThePool {
  return { send: () => Promise.reject(anErrorNamed(name)) };
}

describe('the parameter store, reached the way the sign in reads it', () => {
  describe('a read', () => {
    it('asks for the plaintext, because the two values that matter are secure strings', async () => {
      const recording = parameterClientThatAnswers({ Parameter: { Value: 'a written value' } });

      const held = await parameterStore(recording.client).read(aName);

      expect(held).toBe('a written value');
      expect(recording.sent).toEqual([
        { command: 'GetParameterCommand', input: { Name: aName, WithDecryption: true } },
      ]);
    });

    it('reads a name that holds nothing as nothing at all, which is what makes the salt', async () => {
      const held = await parameterStore(parameterClientThatRefuses(parameterNotFound)).read(aName);

      expect(held).toBeUndefined();
    });

    it('lets a refusal that is not an absent name travel out', async () => {
      const refused = parameterStore(parameterClientThatRefuses('AccessDeniedException'));

      await expect(refused.read(aName)).rejects.toThrow('AccessDeniedException');
    });
  });

  describe('a write', () => {
    it('names no overwrite, so a salt that exists survives a function that lost the race', async () => {
      const recording = parameterClientThatAnswers({});

      const wrote = await parameterStore(recording.client).writeIfAbsent(aName, 'a fresh salt');

      expect(wrote).toBe('written');
      expect(recording.sent).toEqual([
        {
          command: 'PutParameterCommand',
          input: { Name: aName, Value: 'a fresh salt', Type: 'SecureString' },
        },
      ]);
    });

    it('reads a value already there as the value that won, and not as a failure', async () => {
      const met = parameterStore(parameterClientThatRefuses(parameterAlreadyExists));

      expect(await met.writeIfAbsent(aName, 'a fresh salt')).toBe('already-there');
    });

    it('lets a refusal that is not a value already there travel out', async () => {
      const refused = parameterStore(parameterClientThatRefuses('AccessDeniedException'));

      await expect(refused.writeIfAbsent(aName, 'a fresh salt')).rejects.toThrow(
        'AccessDeniedException',
      );
    });
  });
});

describe('the pool, reached the way the sign in holds her user', () => {
  it('creates her in the pool it was given, with no message and no attribute of hers', async () => {
    const recording = poolClientThatAnswers();

    const made = await cognitoPool(recording.client, userPoolId).createUser({ userName });

    expect(made).toBe('made');
    expect(recording.sent).toEqual([
      {
        command: 'AdminCreateUserCommand',
        input: { UserPoolId: userPoolId, Username: userName, MessageAction: 'SUPPRESS' },
      },
    ]);
  });

  it('sends the password on the second path, as the one the pool makes her change', async () => {
    const recording = poolClientThatAnswers();

    await cognitoPool(recording.client, userPoolId).createUser({
      userName,
      password: 'nothing can present this',
    });

    expect(recording.sent[0]?.input).toEqual({
      UserPoolId: userPoolId,
      Username: userName,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: 'nothing can present this',
    });
  });

  it('reads a user name the pool already holds as a woman signing in again', async () => {
    const held = cognitoPool(poolClientThatRefuses(userNameExists), userPoolId);

    expect(await held.createUser({ userName })).toBe('already-there');
  });

  it('reads a refused create with no password as the pool asking for one', async () => {
    const refused = cognitoPool(poolClientThatRefuses(invalidParameter), userPoolId);

    expect(await refused.createUser({ userName })).toBe('a-password-is-needed');
  });

  it('lets the same refusal travel out when the create did carry a password', async () => {
    const refused = cognitoPool(poolClientThatRefuses(invalidParameter), userPoolId);

    await expect(refused.createUser({ userName, password: 'one it refused' })).rejects.toThrow(
      invalidParameter,
    );
  });

  it('sets the password permanently, which is what leaves her confirmed', async () => {
    const recording = poolClientThatAnswers();

    await cognitoPool(recording.client, userPoolId).setPermanentPassword(userName, 'a password');

    expect(recording.sent).toEqual([
      {
        command: 'AdminSetUserPasswordCommand',
        input: {
          UserPoolId: userPoolId,
          Username: userName,
          Password: 'a password',
          Permanent: true,
        },
      },
    ]);
  });
});

describe('the way out to Telegram', () => {
  it('sends the method, the headers and the body, and reads the status and the text', async () => {
    const asked: { address?: string; init?: RequestInit } = {};
    const fetches: Fetches = (address, init) => {
      asked.address = address;
      asked.init = init;

      return Promise.resolve(new Response('{"id_token":"a token"}', { status: 200 }));
    };

    const answered = await reachesTelegram(fetches)('https://oauth.telegram.org/token', {
      method: 'POST',
      headers: { authorization: 'Basic nothing' },
      body: 'grant_type=authorization_code',
    });

    expect(answered).toEqual({ status: 200, body: '{"id_token":"a token"}' });
    expect(asked.address).toBe('https://oauth.telegram.org/token');
    expect(asked.init).toEqual({
      method: 'POST',
      headers: { authorization: 'Basic nothing' },
      body: 'grant_type=authorization_code',
    });
  });

  it('sends no body at all for a call that carries none, which is the read of the key set', async () => {
    const asked: { init?: RequestInit } = {};
    const fetches: Fetches = (_address, init) => {
      asked.init = init;

      return Promise.resolve(new Response('{"keys":[]}', { status: 200 }));
    };

    await reachesTelegram(fetches)('https://oauth.telegram.org/.well-known/jwks.json', {
      method: 'GET',
      headers: {},
    });

    expect(asked.init).toEqual({ method: 'GET', headers: {} });
    expect(Object.keys(asked.init ?? {})).not.toContain('body');
  });

  it('reads an answer that is not 200 rather than raising, so the sign in refuses the code', async () => {
    const fetches: Fetches = () => Promise.resolve(new Response('no', { status: 400 }));

    expect(
      await reachesTelegram(fetches)('https://oauth.telegram.org/token', {
        method: 'POST',
        headers: {},
      }),
    ).toEqual({ status: 400, body: 'no' });
  });

  it('lets a network that answered nothing travel out, which the sign in reads as a refusal', async () => {
    const fetches: Fetches = () => Promise.reject(new Error('the network went away'));

    await expect(
      reachesTelegram(fetches)('https://oauth.telegram.org/token', { method: 'GET', headers: {} }),
    ).rejects.toThrow('the network went away');
  });
});
