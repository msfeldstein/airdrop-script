#!/usr/bin/python3

import pickle
import pprint
import requests
import stellar_base
from stellar_base.keypair import Keypair
from stellar_base.address import Address
from stellar_base.asset import Asset
from stellar_base.operation import Payment, CreateAccount, ChangeTrust, SetOptions, AccountMerge
from stellar_base.transaction import Transaction
from stellar_base.transaction_envelope import TransactionEnvelope as Te
from stellar_base.memo import TextMemo
from stellar_base.horizon import horizon_testnet

horizon = horizon_testnet()


def setup_account(ID):
    """
    Setup and cache some account from friendbot
    """
    try:
        return pickle.load(open(ID, "rb"))
    except:
        kp = Keypair.random()
        publickey = kp.address().decode()
        url = 'https://friendbot.stellar.org'
        r = requests.get(url, params={'addr': publickey})
        pickle.dump(kp, open(ID, "wb"))
        return setup_account(ID)


def create_empty_acct(r_kp):
    """
    Creates a tmp account which is empty except for min balance (no fees even)
    """
    r = Address(address=r_kp.address().decode())
    r.get()

    kp = Keypair.random()
    dest = kp.address().decode()
    tx = Transaction(
        source=r.address,
        sequence=r.sequence,
        fee=100,
        operations=[
            CreateAccount(destination=dest, starting_balance="1")
        ]
    )
    env = Te(tx=tx, network_id="TESTNET")
    env.sign(r_kp)
    horizon.submit(env.xdr())
    return kp


def balance_to_asset(b):
    if b['asset_type'] == 'native':
        return Asset.native()
    return Asset(b['asset_code'], b['asset_issuer'])


def transfer_send(sender_kp, receiver_address, asset, amount):
    """
    Execute the send portion of a transfer. This is used by the issuer,
    airdropper, or sender of an asset. When this is done, a new temporary
    account exists, which contains the transferred asset and enough XLM to
    merge it into the receiving account.

    Args:
        sender_kp (Keypair): keypair of sending account
        receiver_address (string): address of account to receive asset
        asset (Asset): asset to send
        amount (string): amount to transfer, float encoded as string
    Returns:
        response, tmp_dest: the Horizon response and the newly created
            account holding the transfer

    """
    sender = Address(sender_kp.address())
    sender.get()
    # Generate a tmp keypair
    tmp_kp = Keypair.random()
    tmp_dest = tmp_kp.address().decode()

    # This is a speculative transaction!
    # It may fail if someone pre-empts the CreateAccount -- in which case, it
    # should be either re-run with a new kp or it should be attempted again with
    # a payment to ensure at least 2.00006 native instead of create account
    # This has been left out of this demo for simplicity
    txn = Transaction(
        source=sender.address,
        sequence=sender.sequence,
        fee=400,
        operations=[
            CreateAccount(destination=tmp_dest,
                          starting_balance="4.1"),
            ChangeTrust(asset, amount, tmp_dest),
            Payment(tmp_dest, asset, amount),
            SetOptions(master_weight=0, signer_weight=1,
                       source=tmp_dest, signer_address=receiver_address)
        ]
    )
    txe = Te(tx=txn, network_id="TESTNET")
    txe.sign(sender_kp)
    txe.sign(tmp_kp)
    xdr = txe.xdr()
    response = horizon.submit(xdr)

    return response, tmp_dest


def transfer_receive(tmp_address, receiver_kp, asset):
    """
    Receive a transfer. This is used by a wallet on behalf of the receiving
    user to pull the new asset in. When it's done the receiving account has
    all of the asset from tmp_address, and all of the XLM reserve required to
    perform the transfer.
    Args:
        tmp_address (string): address of temporary account containing the transfer asset
        receiver_kp (Keypair): Keypair for the (optionally created) receiving account
        asset (Asset): asset to receive
    Returns:
        response: the Horizon response
    """

    account_exists = False
    receiver_address = receiver_kp.address()
    receiver_acct = Address(receiver_address)
    try:
        receiver_acct.get()
        account_exists = True
    except stellar_base.exceptions.HorizonError:
        pass

    needs_trustline = True
    if account_exists:
        for b in receiver_acct.balances:
            if balance_to_asset(b) == asset:
                needs_trustline = False
                break

    tmp_acct = Address(tmp_address)
    tmp_acct.get()

    # assumes that the temp account cointains the specified asset
    amount = [b['balance']
              for b in tmp_acct.balances if balance_to_asset(b) == asset][0]

    operations = []
    if not account_exists:
        operations.append(CreateAccount(receiver_address, "1"))
    if needs_trustline:
        operations.extend([
            # enough for trustline and one offer
            Payment(receiver_address, Asset.native(), "1"),
            ChangeTrust(asset, source=receiver_kp.address())
        ])
    else:
        operations.append(
            # enough for one offer
            Payment(receiver_address, Asset.native(), "0.5"),
        )

    operations.extend([
        # Send Asset
        Payment(receiver_address, asset, amount),
        # Clear signers
        SetOptions(signer_weight=0, signer_address=receiver_address),
        # Clear trustlines
        ChangeTrust(asset, "0"),
        # Merge Account
        AccountMerge(receiver_address)
    ])

    txn = Transaction(
        source=tmp_acct.address,
        sequence=tmp_acct.sequence,
        fee=100 * len(operations),
        operations=operations
    )

    txe = Te(tx=txn, network_id="TESTNET")
    txe.sign(receiver_kp)
    # Potentially the issuer needs to sign this too with an allow trust --
    # depends on the asset in question!
    response = horizon.submit(txe.xdr())
    return response


def print_acct(name, acct):
    print("{} Has:".format(name))
    print_table(acct.balances, cols=['asset_code', 'balance', 'limit'], defaults={
                'asset_code': 'XLM'})
    print()


def print_table(dicts, cols=None, defaults={}):
    """ Pretty print a list of dictionaries (myDict) as a dynamically sized table.
    If column names (colList) aren't specified, they will show in random order.
    Author: Thierry Husson - Use it as you want but don't blame me.
    """
    if not dicts:
        print('-')
        return
    if not cols:
        cols = list(dicts[0].keys() if dicts else [])
    table_list = [cols]  # 1st row = header
    for item in dicts:
        table_list.append(
            [str(item.get(col, defaults.get(col, ''))) for col in cols])
    colSize = [max(map(len, col)) for col in zip(*table_list)]
    formatStr = ' | '.join(["{{:<{}}}".format(i) for i in colSize])
    table_list.insert(1, ['-' * i for i in colSize])  # Seperating line
    for item in table_list:
        print(formatStr.format(*item))


def main():
    alice = (setup_account("key.dat"))
    bob = setup_account("bob.dat")
    carol = create_empty_acct(bob)
    alice_addr = Address(address=alice.address())
    bob_addr = Address(address=bob.address())
    carol_addr = Address(address=carol.address())
    dave = Keypair.random()
    dave_addr = Address(address=dave.address())
    alice_addr.get()
    bob_addr.get()
    carol_addr.get()
    print("PRECONDITIONS\n")
    print_acct("Alice", alice_addr)
    print_acct("Bob", bob_addr)
    print_acct("Carol", carol_addr)
    print_acct("Dave", dave_addr)
    print("========================")
    fakeusd = Asset("USD", alice_addr.address)

    # Transfer Funds to Bob, who has an account (and a prior trustline)
    _, tmp_addr = transfer_send(
        sender_kp=alice, receiver_address=bob_addr.address, asset=fakeusd, amount="10")
    transfer_receive(tmp_address=tmp_addr, receiver_kp=bob, asset=fakeusd)
    # Transfer funds to Carol who has a bare-bones account (no funds, no trustline)
    _, tmp_addr = transfer_send(
        sender_kp=alice, receiver_address=carol_addr.address, asset=fakeusd, amount="10")
    transfer_receive(tmp_address=tmp_addr, receiver_kp=carol, asset=fakeusd)
    # Transfer Funds to Dave, who has no account
    _, tmp_addr = transfer_send(
        sender_kp=alice, receiver_address=dave_addr.address, asset=fakeusd, amount="10")
    transfer_receive(tmp_address=tmp_addr, receiver_kp=dave, asset=fakeusd)

    alice_addr.get()
    bob_addr.get()
    carol_addr.get()
    dave_addr.get()
    print("POSTCONDITIONS\n")
    print_acct("Alice", alice_addr)
    print_acct("Bob", bob_addr)
    print_acct("Carol", carol_addr)
    print_acct("Dave", dave_addr)


if __name__ == "__main__":
    main()
