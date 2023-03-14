import {BigDecimal, BigInt, ethereum, log} from '@graphprotocol/graph-ts'
import {SCALE} from 'const'

import {DEUS_ADDRESS} from '../../constants'
import {DEUSToken} from '../../generated/DEUSToken/DEUSToken'
import {DEUSSupplySnapshot, HourlyDEUSSupplySnapshot, DailyDEUSSupplySnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createDEUSSupplySnapshot(event: ethereum.Event): DEUSSupplySnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  log.info('ID is', [id])
  const deusSupply = fetchDeusSupply()

  const snapshot = new DEUSSupplySnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.deusSupply = deusSupply
  snapshot.save()

  return snapshot
}

export function updateHourlyDEUSSupplySnapshot(snapshot: DEUSSupplySnapshot): void {
  const hourlySnapshot = getHourlyDEUSSupplySnapshot(snapshot.timestamp)
  hourlySnapshot.deusSupply = snapshot.deusSupply

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getHourlyDEUSSupplySnapshot(timestamp: BigInt): HourlyDEUSSupplySnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = HourlyDEUSSupplySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlyDEUSSupplySnapshot(hourlyId)
    hourlySnapshot.timestamp = timestamp
    hourlySnapshot.snapshots = []
  }
  return hourlySnapshot
}

export function updateDailyDEUSSupplySnapshot(snapshot: DEUSSupplySnapshot): void {
  const dailySnapshot = getDailyDEUSSupplySnapshot(snapshot.timestamp)
  dailySnapshot.deusSupply = snapshot.deusSupply

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getDailyDEUSSupplySnapshot(timestamp: BigInt): DailyDEUSSupplySnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = DailyDEUSSupplySnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new DailyDEUSSupplySnapshot(dailyId)
    dailySnapshot.timestamp = timestamp
    dailySnapshot.snapshots = []
  }
  return dailySnapshot
}

function fetchDeusSupply(): BigDecimal {
  const contract = DEUSToken.bind(DEUS_ADDRESS)
  return convertDecimalFromWei(contract.totalSupply().toBigDecimal(), SCALE)
}
