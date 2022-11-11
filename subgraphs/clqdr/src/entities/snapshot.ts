import {BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'

import {CLQDR_ADDRESS} from '../../constants'
import {PerpetualEscrowToken} from '../../generated/cLQDR/PerpetualEscrowToken'
import {DailySnapshot, HourlySnapshot, Snapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createSnapshot(event: ethereum.Event): Snapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const totalReserve = fetchTotalReserve()
  const totalSupply = fetchTotalSupply()

  const snapshot = new Snapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.totalReserve = convertDecimalFromWei(totalReserve, SCALE)
  snapshot.totalSupply = convertDecimalFromWei(totalSupply, SCALE)
  snapshot.priceShare = calculateRatio(totalSupply, totalReserve)
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
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = HourlySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlySnapshot(hourlyId)
  }
  return hourlySnapshot
}

export function updateDailySnapshot(snapshot: Snapshot): void {
  const dailySnapshot = getDailySnapshot(snapshot.timestamp)
  dailySnapshot.totalReserve = snapshot.totalReserve
  dailySnapshot.totalSupply = snapshot.totalSupply
  dailySnapshot.priceShare = snapshot.priceShare

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getDailySnapshot(timestamp: BigInt): DailySnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = DailySnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new DailySnapshot(dailyId)
  }
  return dailySnapshot
}

function fetchTotalReserve(): BigDecimal {
  const contract = PerpetualEscrowToken.bind(CLQDR_ADDRESS)
  return contract.totalReserve().toBigDecimal()
}

function fetchTotalSupply(): BigDecimal {
  const contract = PerpetualEscrowToken.bind(CLQDR_ADDRESS)
  return contract.totalSupply().toBigDecimal()
}

function calculateRatio(totalSupply: BigDecimal, totalReserve: BigDecimal): BigDecimal {
  if (totalReserve.equals(BIG_DECIMAL_ZERO) || totalSupply.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return totalSupply.div(totalReserve)
}
