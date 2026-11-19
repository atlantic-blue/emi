import { type HowItAsks, THE_POOL_HOST, aUsername, theSignInFor } from '../src';

const THE_PHONE_CLIENT = 'the-phone-client';
const HER_ADDRESS = 'her@example.com';

interface ACall {
  readonly target: string;
  readonly body: Record<string, unknown>;
}

function aServiceThatAnswers(answer: Record<string, unknown>): {
  how: HowItAsks;
  calls: ACall[];
} {
  const calls: ACall[] = [];
  const how: HowItAsks = async (where, init) => {
    expect(where).toBe(THE_POOL_HOST);
    const headers = init?.headers as Record<string, string>;
    calls.push({
      target: headers['x-amz-target'] ?? '',
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });

    return new Response(JSON.stringify(answer), { status: 200 });
  };

  return { how, calls };
}

describe('the sign in for one client of the pool', () => {
  it('should send the identifier of the client it was made for', async () => {
    const service = aServiceThatAnswers({ Session: 'a-session' });

    await theSignInFor({ clientId: THE_PHONE_CLIENT }).askForACode(HER_ADDRESS, service.how);

    expect(service.calls).toEqual([
      expect.objectContaining({
        target: 'AWSCognitoIdentityProviderService.SignUp',
        body: expect.objectContaining({ ClientId: THE_PHONE_CLIENT }),
      }),
    ]);
  });

  it('should keep two clients apart', async () => {
    const service = aServiceThatAnswers({});

    await theSignInFor({ clientId: 'first' }).signOut('a-refresh-token', service.how);
    await theSignInFor({ clientId: 'second' }).signOut('a-refresh-token', service.how);

    expect(service.calls.map((call) => call.body.ClientId)).toEqual(['first', 'second']);
  });

  it('should name the new user from the random source the client hands it', async () => {
    const service = aServiceThatAnswers({ Session: 'a-session' });
    const zeros = (bytes: Uint8Array): Uint8Array => bytes.fill(0);

    const waiting = await theSignInFor({ clientId: THE_PHONE_CLIENT, random: zeros }).askForACode(
      HER_ADDRESS,
      service.how,
    );

    expect(waiting.username).toBe('0'.repeat(26));
    expect(service.calls[0]?.body.Username).toBe(waiting.username);
  });

  it('should fall back to the web crypto of the runtime when no random source is handed', () => {
    expect(aUsername()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });
});
