import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_INT_ZERO, SCALE} from 'const'

import {CLQDR_ADDRESS} from '../../constants'
import {PerpetualEscrowToken} from '../../generated/cLQDR/PerpetualEscrowToken'
import {HourlySnapshot, Snapshot} from '../../generated/schema'
import {convertAmountToDecimal} from '../helpers'

export function createSnapshot(event: ethereum.Event): Snapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const totalReserve = fetchTotalReserve()
  const totalSupply = fetchTotalSupply()

  const snapshot = new Snapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.totalReserve = convertAmountToDecimal(totalReserve, SCALE)
  snapshot.totalSupply = convertAmountToDecimal(totalSupply, SCALE)
  snapshot.priceShare = convertAmountToDecimal(calculateRatio(totalReserve, totalSupply), BIG_INT_ZERO)
  snapshot.save()

  return snapshot
}
export function updateHourlySnapshot(snapshot: Snapshot): void {
  const hourlySnapshot = getHourlySnapshot(snapshot.timestamp)
  hourlySnapshot.totalReserve = snapshot.totalReserve
  hourlySnapshot.totalSupply = snapshot.totalSupply
  hourlySnapshot.priceShare = snapshot.priceShare

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getHourlySnapshot(timestamp: BigInt): HourlySnapshot {
  const hourlyId = (timestamp.toI32() / 3600).toString()
  let hourlySnapshot = HourlySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlySnapshot(hourlyId)
  }
  return hourlySnapshot
}

function fetchTotalReserve(): BigInt {
  const contract = PerpetualEscrowToken.bind(CLQDR_ADDRESS)
  return contract.totalReserve()
}

function fetchTotalSupply(): BigInt {
  const contract = PerpetualEscrowToken.bind(CLQDR_ADDRESS)
  return contract.totalSupply()
}

function calculateRatio(totalReserve: BigInt, totalSupply: BigInt): BigInt {
  if (totalReserve.isZero() || totalSupply.isZero()) {
    return BIG_INT_ZERO
  }
  return totalReserve.div(totalSupply)
}
