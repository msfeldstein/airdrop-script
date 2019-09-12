Implementation of a proposed protocol for airdropping stellar assets to accounts that may not have trustlines or even exist yet.

```
➜  airdrop-script git:(master) npx msfeldstein-airdrop-script
transfer.js: Exhibit transfer of non-native assets to various accounts:
  - Account with a trustline (trivial)
  - Account with funds but no trustline
  - Account with no funds and no trustline
  - User with no account

  We will create an issuer account, and exhibit sending the ABC asset to these account types
[Anchor] Creating Issuer account GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ
[Wallet] Creating a funded account without a trustline to the requested asset
[Wallet] Generated account GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U
[Wallet] Funding account
>>> Wallet Account Before Request
┌───────────┬────────┐
│  (index)  │ Values │
├───────────┼────────┤
│   asset   │ 'ABC'  │
│  amount   │   0    │
│ trustline │ false  │
└───────────┴────────┘
[Anchor] Received asset request from account GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U
[Anchor] Generated intermediate account keys GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O
[Anchor] Sending transaction with ops:
[Anchor]   ----------
[Anchor]   Creating the intermediate account with a starting balance of 4 lumens to cover the reserve, trustline, future merge payment to the users main account, and possible account creation if the user doesn't have an account created yet
[Anchor]   createAccount
[Anchor]     destination: "GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O"
[Anchor]     startingBalance: "4"
[Anchor]   ----------
[Anchor]   Adding the trustline to the intermediate account
[Anchor]   changeTrust
[Anchor]     asset: {"code":"ABC","issuer":"GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ"}
[Anchor]     amount: "100"
[Anchor]     source: "GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O"
[Anchor]   ----------
[Anchor]   Sending the assets to be transfered into the intermediate account
[Anchor]   payment
[Anchor]     destination: "GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O"
[Anchor]     asset: {"code":"ABC","issuer":"GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ"}
[Anchor]     amount: "100"
[Anchor]   ----------
[Anchor]   Removing the anchors signing power over the intermediate account, and replacing that signer with the final destination account
[Anchor]   setOptions
[Anchor]     source: "GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O"
[Anchor]     masterWeight: 0
[Anchor]     signer: {"ed25519PublicKey":"GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U","weight":1}
[Anchor]   ----------
[Anchor] Transaction succeded
[Wallet] Listening for accounts where i am a signer via Horizon's accounts-for-signer endpoint
[Wallet] Found claimable account: GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O
[Wallet] Merge the temporary account created by the anchor for me into my main account
[Wallet] The main account exists, we need to check if it needs a trustline or already has one.
[Wallet] Sending transaction with ops:
[Wallet]   ----------
[Wallet]   The main account needs a trustline. We need to ensure it has enough lumens for one offer and one trustline so we give it 0.5xlm
[Wallet]   payment
[Wallet]     asset: {"code":"XLM"}
[Wallet]     amount: "1.0"
[Wallet]     source: "GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O"
[Wallet]     destination: "GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U"
[Wallet]   ----------
[Wallet]   Add the trustline to the main account to enable the following payment of the asset
[Wallet]   changeTrust
[Wallet]     asset: {"code":"ABC","issuer":"GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ"}
[Wallet]     source: "GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U"
[Wallet]   ----------
[Wallet]   Move the actual assets from the intermediate account into the main account
[Wallet]   payment
[Wallet]     asset: {"code":"ABC","issuer":"GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ"}
[Wallet]     destination: "GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U"
[Wallet]     amount: "100"
[Wallet]   ----------
[Wallet]   Remove the trustline of the asset from the intermediate account so it can be merged to the main account
[Wallet]   changeTrust
[Wallet]     asset: {"code":"ABC","issuer":"GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ"}
[Wallet]     limit: "0"
[Wallet]   ----------
[Wallet]   Merge the intermediate account into the main account to absorb any leftover lumens
[Wallet]   accountMerge
[Wallet]     destination: "GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U"
[Wallet]   ----------
[Wallet] Transaction succeded
>>> Wallet Account After Merge
┌───────────┬───────────────┐
│  (index)  │    Values     │
├───────────┼───────────────┤
│   asset   │     'ABC'     │
│  amount   │ '100.0000000' │
│ trustline │     true      │
└───────────┴───────────────┘
Issuer account: https://stellar.expert/explorer/testnet/account/GCGDPZWUQ4SFQ355N7IWAELCDMVT5B2KPJPWMGK55WORVVZ62MCUNKYJ
Claimed account: https://stellar.expert/explorer/testnet/account/GDWSKZZRF2L23AI7DEDQU44GWYJ6S5WQFVYVQLKCHDD2WUYK4ZW35V6O
Wallet account https://stellar.expert/explorer/testnet/account/GD36QNEWKR7C4M3B7S4YRW2KISOM77D2IPGKE5A54MLF6VQ67D6MDK6U
```