import {Address, BigDecimal, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {ERC20 as IERC20} from '../../generated/templates/Registrar/ERC20'
import {Transaction, UserBalanceSnapshot} from '../../generated/schema'
import {convertAmountToDecimal} from '../helpers'

export function createSnapshotOnTransaction(tx: Transaction): void {
  const from = tx.from.toHexString()
  const to = tx.to.toHexString()

  // handle the from address
  let snapshot = new UserBalanceSnapshot(tx.id.concat(':').concat(from))
  snapshot.timestamp = tx.timestamp
  snapshot.user = tx.from
  snapshot.registrar = tx.registrar
  snapshot.amount = getUserBalance(Address.fromString(from), Address.fromString(tx.registrar))
  snapshot.save()

  // user has used a receipient field
  if (from != to) {
    let toSnapshot = new UserBalanceSnapshot(tx.id.concat(':').concat(to))
    toSnapshot.timestamp = tx.timestamp
    toSnapshot.user = tx.to
    toSnapshot.registrar = tx.registrar
    toSnapshot.amount = getUserBalance(Address.fromString(to), Address.fromString(tx.registrar))
    toSnapshot.save()
  }
}

export function createSnapshotOnTransfer(event: ethereum.Event, from: Address, to: Address): void {
  const hash = event.transaction.hash.toHexString()
  const registrar = event.address

  let fromSnapshot = new UserBalanceSnapshot(hash.concat(':').concat(from.toHexString()))
  fromSnapshot.timestamp = event.block.timestamp
  fromSnapshot.user = from
  fromSnapshot.registrar = registrar.toHexString()
  fromSnapshot.amount = getUserBalance(from, registrar)
  fromSnapshot.save()

  let toSnapshot = new UserBalanceSnapshot(hash.concat(':').concat(to.toHexString()))
  toSnapshot.timestamp = event.block.timestamp
  toSnapshot.user = to
  toSnapshot.registrar = registrar.toHexString()
  toSnapshot.amount = getUserBalance(to, registrar)
  toSnapshot.save()
}

function getUserBalance(user: Address, address: Address): BigDecimal {
  const contract = IERC20.bind(address)
  const result = contract.try_balanceOf(user)
  if (result.reverted) {
    return BIG_DECIMAL_ZERO
  }
  return convertAmountToDecimal(result.value, SCALE)
}
