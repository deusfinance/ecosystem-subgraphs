import {BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {SCALE} from 'const'

import {DEI_STABLECOIN} from '../../constants'
import {DEIStablecoin} from '../../generated/DEIStablecoin/DEIStablecoin'
import {DEISupplySnapshot, HourlyDEISupplySnapshot, DailyDEISupplySnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createDEISupplySnapshot(event: ethereum.Event): DEISupplySnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const deiSupply = fetchDeiSupply()

  const snapshot = new DEISupplySnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.deiSupply = convertDecimalFromWei(deiSupply, SCALE)
  snapshot.save()

  return snapshot
}

export function updateHourlyDEISupplySnapshot(snapshot: DEISupplySnapshot): void {
  const hourlySnapshot = getHourlyDEISupplySnapshot(snapshot.timestamp)
  hourlySnapshot.deiSupply = snapshot.deiSupply

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getHourlyDEISupplySnapshot(timestamp: BigInt): HourlyDEISupplySnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = HourlyDEISupplySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlyDEISupplySnapshot(hourlyId)
    hourlySnapshot.timestamp = timestamp
  }
  return hourlySnapshot
}

export function updateDailyDEISupplySnapshot(snapshot: DEISupplySnapshot): void {
  const dailySnapshot = getDailyDEISupplySnapshot(snapshot.timestamp)
  dailySnapshot.deiSupply = snapshot.deiSupply

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getDailyDEISupplySnapshot(timestamp: BigInt): DailyDEISupplySnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = DailyDEISupplySnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new DailyDEISupplySnapshot(dailyId)
    dailySnapshot.timestamp = timestamp
  }
  return dailySnapshot
}

function fetchDeiSupply(): BigDecimal {
  const contract = DEIStablecoin.bind(DEI_STABLECOIN)
  return contract.totalSupply().toBigDecimal()
}
