/**
 * The root certificate a notification of the App Store is verified against, held in this repository
 * rather than read from the machine the function runs on.
 *
 * A notification carries its own chain of certificates. A reader that believed the chain on its own
 * would believe anything that arrived carrying three certificates, so the root at the end of the
 * chain is what makes the rest of it mean something. It is pinned here: the bundle carries these
 * bytes, the list of certificate authorities the platform trusts is never read, and a root that
 * changes changes one line of one file, where a reviewer sees it.
 *
 * Apple publishes these bytes and nobody else does. They were read from
 * https://www.apple.com/certificateauthority/AppleRootCA-G3.cer on 24 November 2026, over Transport
 * Layer Security, and `tests/storeNotifications.test.ts` holds them to the subject, the serial
 * number and the self signature they carry.
 */

/**
 * Apple Root CA G3, as base 64 of the bytes Apple publishes. Apple signs the chain of a version 2
 * notification under this root, and the three products of contract PAY-1 are sold under it.
 */
export const appleRootG3 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

/**
 * Every root a notification may stand on. It is a list rather than one value because Apple may sign
 * under a second root one day, and a second root is then one line here and nothing else at all.
 */
export const appleRoots: readonly string[] = [appleRootG3];
