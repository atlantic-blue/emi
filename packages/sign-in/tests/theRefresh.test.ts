import { ASignInProblem, type HowItAsks, THE_POOL_HOST, theSignInFor } from '../src';

const THE_PHONE_CLIENT = 'the-phone-client';
const THE_TOKEN_SHE_HOLDS = 'the-refresh-token-she-holds';
const THE_TOKEN_IT_HANDS_BACK = 'the-refresh-token-it-hands-back';

interface ACall {
  readonly target: string;
  readonly body: Record<string, unknown>;
}

function aPoolThatAnswers(
  answer: Record<string, unknown>,
  status = 200,
): { how: HowItAsks; calls: ACall[] } {
  const calls: ACall[] = [];
  const how: HowItAsks = async (where, init) => {
    expect(where).toBe(THE_POOL_HOST);
    const headers = init?.headers as Record<string, string>;
    calls.push({
      target: headers['x-amz-target'] ?? '',
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });

    return new Response(JSON.stringify(answer), { status });
  };

  return { how, calls };
}

const theRefreshedTokens = (refreshToken?: string): Record<string, unknown> => ({
  AuthenticationResult: {
    IdToken: 'a-new-id-token',
    AccessToken: 'a-new-access-token',
    ...(refreshToken === undefined ? {} : { RefreshToken: refreshToken }),
  },
});

const theRefresh = theSignInFor({ clientId: THE_PHONE_CLIENT }).refreshHerTokens;

describe('the refresh of a sign in', () => {
  describe('what goes out', () => {
    it('should spend the token through GetTokensFromRefreshToken', async () => {
      const pool = aPoolThatAnswers(theRefreshedTokens(THE_TOKEN_IT_HANDS_BACK));

      await theRefresh(THE_TOKEN_SHE_HOLDS, pool.how);

      expect(pool.calls).toEqual([
        {
          target: 'AWSCognitoIdentityProviderService.GetTokensFromRefreshToken',
          body: { ClientId: THE_PHONE_CLIENT, RefreshToken: THE_TOKEN_SHE_HOLDS },
        },
      ]);
    });
  });

  describe('what comes back', () => {
    it('should hand back the new refresh token the pool rotated to', async () => {
      const pool = aPoolThatAnswers(theRefreshedTokens(THE_TOKEN_IT_HANDS_BACK));

      const came = await theRefresh(THE_TOKEN_SHE_HOLDS, pool.how);

      expect(came).toEqual({
        kind: 'sheIsStillSignedIn',
        held: {
          idToken: 'a-new-id-token',
          accessToken: 'a-new-access-token',
          refreshToken: THE_TOKEN_IT_HANDS_BACK,
        },
      });
    });

    it('should hand back no refresh token where the pool rotated none', async () => {
      const pool = aPoolThatAnswers(theRefreshedTokens());

      const came = await theRefresh(THE_TOKEN_SHE_HOLDS, pool.how);

      expect(came).toEqual({
        kind: 'sheIsStillSignedIn',
        held: {
          idToken: 'a-new-id-token',
          accessToken: 'a-new-access-token',
          refreshToken: undefined,
        },
      });
    });

    it('should say the pool refused the token where it is spent', async () => {
      const pool = aPoolThatAnswers(
        {
          __type: 'com.amazon.coral.service#NotAuthorizedException',
          message: 'Refresh Token has been revoked',
        },
        400,
      );

      expect(await theRefresh(THE_TOKEN_SHE_HOLDS, pool.how)).toEqual({
        kind: 'thePoolRefusedTheToken',
      });
    });

    it('should raise for a refusal that is not the token, so nothing of hers is touched', async () => {
      const pool = aPoolThatAnswers(
        { __type: 'com.amazon.coral.service#TooManyRequestsException', message: '' },
        400,
      );

      await expect(theRefresh(THE_TOKEN_SHE_HOLDS, pool.how)).rejects.toThrow(ASignInProblem);
    });

    it('should raise where nothing reached the pool', async () => {
      const how: HowItAsks = () => Promise.reject(new TypeError('Network request failed'));

      await expect(theRefresh(THE_TOKEN_SHE_HOLDS, how)).rejects.toMatchObject({
        because: 'nothingReachedTheService',
      });
    });

    it('should raise where the answer carries no tokens at all', async () => {
      const pool = aPoolThatAnswers({});

      await expect(theRefresh(THE_TOKEN_SHE_HOLDS, pool.how)).rejects.toThrow(ASignInProblem);
    });
  });
});
