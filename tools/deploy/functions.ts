/**
 * The deployed functions of Emi: the name each one carries in the account, the file its bundle is
 * built from, and the Terraform resource that creates it.
 *
 * One list, read by the build, by the load check and by the infrastructure test. A list read out of
 * a script with a pattern is a list that disagrees with itself the first time somebody renames a
 * variable, so there is one of these and everything imports it.
 */

export interface DeployedFunction {
  /** The name in the account, which is the project name and this suffix. */
  readonly name: string;
  /** The file esbuild is handed, written from the root of the repository. */
  readonly entryPoint: string;
  /** The resource in `infra/lambda.tf` that creates the function. */
  readonly resource: string;
}

/** The project name every function name begins with, which is what Terraform prefixes them by. */
export const projectName = 'emi';

/**
 * The seven functions of the account. Three answer the vault, and four carry the sign in with
 * Telegram: the function that answers a code, and the three triggers the pool calls.
 */
export const deployedFunctions: readonly DeployedFunction[] = [
  {
    name: `${projectName}-authorizer`,
    entryPoint: 'services/vault/src/functions/authorizer.ts',
    resource: 'aws_lambda_function.authorizer',
  },
  {
    name: `${projectName}-vault`,
    entryPoint: 'services/vault/src/functions/vault.ts',
    resource: 'aws_lambda_function.vault',
  },
  {
    name: `${projectName}-articles`,
    entryPoint: 'services/vault/src/functions/articles.ts',
    resource: 'aws_lambda_function.articles',
  },
  {
    name: `${projectName}-sign-in-telegram`,
    entryPoint: 'services/vault/src/functions/signInWithTelegram.ts',
    resource: 'aws_lambda_function.sign_in_telegram',
  },
  {
    name: `${projectName}-sign-in-challenge-define`,
    entryPoint: 'services/vault/src/functions/defineAuthChallenge.ts',
    resource: 'aws_lambda_function.sign_in_challenge_define',
  },
  {
    name: `${projectName}-sign-in-challenge-create`,
    entryPoint: 'services/vault/src/functions/createAuthChallenge.ts',
    resource: 'aws_lambda_function.sign_in_challenge_create',
  },
  {
    name: `${projectName}-sign-in-challenge-verify`,
    entryPoint: 'services/vault/src/functions/verifyAuthChallengeResponse.ts',
    resource: 'aws_lambda_function.sign_in_challenge_verify',
  },
];

/**
 * The file the runtime loads, at the root of the zip. The handler of every function is
 * `index.handler`, which is what `infra/lambda.tf` already sets, so the name is one constant here
 * rather than a field each entry repeats.
 */
export const bundleFileName = 'index.mjs';

/** The exported name the runtime resolves, which is the second half of `index.handler`. */
export const handlerName = 'handler';

/** Where the build writes, beside the service, the way `infra/build` sits beside the Terraform. */
export const buildDirectory = 'services/vault/build';

/** The zip of one function, named after the function so a log line says which one failed. */
export function archiveNameOf(held: DeployedFunction): string {
  return `${held.name}.zip`;
}

/** The metafile esbuild writes beside a bundle, which names every module the bundle carries. */
export function metafileNameOf(held: DeployedFunction): string {
  return `${held.name}.meta.json`;
}

/**
 * The order the pipeline uploads in, which `.github/workflows/deploy.yml` walks.
 *
 * The authorizer goes first. Registration stands behind no authorizer, so a woman can register the
 * moment the vault bundle is live, and a placeholder authorizer would then refuse every later
 * request of hers until the next upload finished. Neither order opens a route: a placeholder
 * authorizer refuses every request, and a placeholder vault answers 501.
 *
 * The three triggers go before the function that issues the answer they spend, so no sign in ever
 * hands out an answer that nothing in the pool can read.
 */
export const uploadOrder: readonly string[] = [
  `${projectName}-authorizer`,
  `${projectName}-articles`,
  `${projectName}-sign-in-challenge-define`,
  `${projectName}-sign-in-challenge-create`,
  `${projectName}-sign-in-challenge-verify`,
  `${projectName}-sign-in-telegram`,
  `${projectName}-vault`,
];
