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

The storage is a port, and the implementation behind it writes the items DynamoDB holds. It takes
the request shapes DynamoDB takes, so the item this service writes is the item a test reads, and
the test that reads one is the point of the whole service: it writes a day whose note carries a
rare word, then reads every attribute of the item that reached the table and finds the word in
none of them.

A record is written under an identifier of version 7 and nothing else, because the identifier is
the one part of a record that travels in the clear and a free text one would be somewhere to write
a date. A write whose revision is not higher than the stored one is refused with the revision that
is held, so two phones converge on the higher one rather than on whichever arrived last. A pull
reads one account's records in write order and stops before a page costs a megabyte, answering
with a cursor rather than cutting the answer short in silence.

One endpoint here takes no signature at all, and it is deliberate. The article catalogue answers
one article for a cycle phase, so a request says which phase is being read and never who is reading
it. The article is the newest of that phase, which is the same one for every reader. It stands behind no authorizer, it reads a table of its own through a role that cannot reach
the vault table, and it refuses any request that carries one of the four signed headers or that an
authorizer answered for. A caller who names herself to it is refused rather than served.

Nothing here can open an envelope. The service takes one function from the envelope, the one that
reads its shape, and a test walks these files from the entry point to prove it: no decrypting
function is imported, nothing comes from the cipher library, and no word for a key appears that is
not a key to the table or a public key.
