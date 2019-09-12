Implementation of a proposed protocol for airdropping stellar assets to accounts that may not have trustlines or even exist yet.

```
➜  airdrop-script git:(master) ✗ node transfer.js
transfer.js: Exhibit transfer of non-native assets to various accounts:
  - Account with a trustline (trivial)
  - Account with funds but no trustline
  - Account with no funds and no trustline
  - User with no account

  We will create an issuer account, and exhibit sending the ABC asset to these account types
Green messages come from the anchor
Blue messages come from the wallet
[Anchor] Creating Issuer account GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB
[Wallet] Creating a funded account without a trustline to the requested asset
[Wallet] Generated account GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5
[Wallet] Funding account
>>> Wallet Account Before Request
┌───────────┬────────┐
│  (index)  │ Values │
├───────────┼────────┤
│   asset   │ 'ABC'  │
│  amount   │   0    │
│ trustline │ false  │
└───────────┴────────┘
[Anchor] Received asset request from account GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5
[Anchor] Generated intermediate account keys GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI
[Anchor] Sending transaction with ops:
[Anchor]   ----------
[Anchor]   Creating the intermediate account with a starting balance of 4 lumens to cover the reserve, trustline, future merge payment to the users main account, and possible account creation if the user doesn't have an account created yet
[Anchor]   createAccount
[Anchor]     destination: "GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI"
[Anchor]     startingBalance: "4"
[Anchor]   ----------
[Anchor]   Adding the trustline to the intermediate account
[Anchor]   changeTrust
[Anchor]     asset: {"code":"ABC","issuer":"GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB"}
[Anchor]     amount: "100"
[Anchor]     source: "GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI"
[Anchor]   ----------
[Anchor]   Sending the assets to be transfered into the intermediate account
[Anchor]   payment
[Anchor]     destination: "GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI"
[Anchor]     asset: {"code":"ABC","issuer":"GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB"}
[Anchor]     amount: "100"
[Anchor]   ----------
[Anchor]   Removing the anchors signing power over the intermediate account, and replacing that signer with the final destination account
[Anchor]   setOptions
[Anchor]     source: "GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI"
[Anchor]     masterWeight: 0
[Anchor]     signer: {"ed25519PublicKey":"GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5","weight":1}
[Anchor]   ----------
[Anchor] Transaaction succeded
https://horizon-testnet.stellar.org/accounts?signer=GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5
[Wallet] Listening for accounts where i am a signer
[Wallet] Found claimable account: GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI
[Wallet] Merge the temporary account created by the anchor for me into my main account
[Wallet] The main account exists, we need to check if it needs a trustline or already has one.
Sending transaction with ops:
  ----------
  The main account needs a trustline. We need to ensure it has enough lumens for one offer and one trustline so we give it 0.5xlm
  payment
    asset: {"code":"XLM"}
    amount: "1.0"
    source: "GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI"
    destination: "GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5"
  ----------
  Add the trustline to the main account to enable the following payment of the asset
  changeTrust
    asset: {"code":"ABC","issuer":"GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB"}
    source: "GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5"
  ----------
  Move the actual assets from the intermediate account into the main account
  payment
    asset: {"code":"ABC","issuer":"GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB"}
    destination: "GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5"
    amount: "100"
  ----------
  Remove the trustline of the asset from the intermediate account so it can be merged to the main account
  changeTrust
    asset: {"code":"ABC","issuer":"GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB"}
    limit: "0"
  ----------
  Merge the intermediate account into the main account to absorb any leftover lumens
  accountMerge
    destination: "GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5"
  ----------
Transaction succeded
>>> Wallet Account After Merge
┌───────────┬───────────────┐
│  (index)  │    Values     │
├───────────┼───────────────┤
│   asset   │     'ABC'     │
│  amount   │ '100.0000000' │
│ trustline │     true      │
└───────────┴───────────────┘
Issuer account: https://stellar.expert/explorer/testnet/account/GDPFDWQD3E5WTQAFFTNK6F5E4UXUDCKVXSWEXI3AWIV4N5BSUBGINXVB
Claimed account: https://stellar.expert/explorer/testnet/account/GDEDFMFK4X7WYWGYU7IXMQMEXQWYPEAJHA57WHHSNOMCKJ4METLWO6EI
Wallet account https://stellar.expert/explorer/testnet/account/GD6FFYNHC5SGC66R7MN56CSRPRUY7K2ZTOPPBJB3LCQVU6MD3A4LY5K5
```