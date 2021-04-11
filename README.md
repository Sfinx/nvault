About:
------

Secrets vault with TOTP Auth for DevOps usage. Can be used for secure credentials distribute among servers/realms

Usage:
------

- build with 'yarn b'
- init vault with 'yarn i'
- start server with 'yarn r'

OR

- do all with one command 'yarn ibr'


createUser:
-----------

curl -kv -X POST https://localhost:8443/createUser -H 'Accept: application/json' -H 'Token-User: someServer' -H 'Secrets-Realm: someRealm'

- remember user token, scan QR code with Google Authenticator

setSecret:
----------

curl -kv -X POST https://localhost:8443/setSecret -H 'Accept: application/json' -H 'Token-User: root' -H 'Secret-ID: someId' -H 'Secret: SomeSecret' \
	-H 'Secrets-Realm: someRealm' -H "TOTP-Token: <user OTP code>"

OR lazy variant

curl -kv -X POST https://localhost:8443/setSecret -H 'Accept: application/json' -H 'Token-User: root' -H 'Secret-ID: someId' -H 'Secret: SomeSecret' \
	-H 'Secrets-Realm: someRealm' -H "TOTP-Token: `oathtool --totp --base32 <user token>`"

getSecret:
----------

curl -kv -X POST https://localhost:8443/getSecret -H 'Accept: application/json' -H 'Token-User: crunch' -H 'Secret-ID: someId' -H "TOTP-Token: `oathtool --totp --base32 <user token>`"
