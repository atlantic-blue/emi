# @emi/vault

The service behind `api.emi`. It stores an encrypted record and answers with an encrypted record,
and it holds no key of any kind, so it cannot read one line of what it keeps.

This package is where the account lives. There is no email address and no password anywhere in Emi.
An account is an Ed25519 key pair made on her phone, and the account identifier is the first sixteen
bytes of the digest of the public key, written in Crockford base 32. She sends that public key once,
signed by the key itself, and the service writes it down. Every later request carries three headers
and a digest of its own body, and the authorizer checks the signature against the stored public key
before the request reaches anything else.

Two rules here are worth reading before changing anything. A request signed more than 300 seconds
from now is refused, and a signature that was used once is refused the second time, which is what
stops a captured request being sent again. An account that does not exist is refused with the words
a bad signature is refused with, and it pays for the same Ed25519 verification first, so the time
the answer takes tells a caller nothing about who holds an account.

The storage is a port. The DynamoDB implementation behind it arrives with the record endpoints.
