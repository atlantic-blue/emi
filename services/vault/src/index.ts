/**
 * The vault service. It holds ciphertext and it holds no key, so everything here is about who is
 * asking rather than about what she wrote.
 */
export const packageName = '@emi/vault';

export * from './api';
export * from './auth/authorizer';
export * from './auth/signedBody';
export * from './handlers/register';
export * from './store/accounts';
