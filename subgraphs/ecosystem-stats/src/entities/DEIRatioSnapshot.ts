import {BigDecimal, BigInt} from '@graphprotocol/graph-ts'
import {BIG_INT_FOUR} from 'const'

import {DEI_STRATEGY} from '../../constants'
import {DEIStrategy, SetRedeemCollateralRatio} from '../../generated/DEIStrategy/DEIStrategy'
import {DailyDEIRatioSnapshot, HourlyDEIRatioSnapshot, DEIRatioSnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createDEIRatioSnapshot(event: SetRedeemCollateralRatio): DEIRatioSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const deiMintingRatio = fetchMintingRatio()
  const deiRedeemRatio = fetchRedeemRatio()

  const snapshot = new DEIRatioSnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.deiMintingRatio = convertDecimalFromWei(deiMintingRatio, BIG_INT_FOUR)
  snapshot.deiRedeemRatio = convertDecimalFromWei(deiRedeemRatio, BIG_INT_FOUR)
  snapshot.save()

  return snapshot
}

export function updateHourlyDEIRatioSnapshot(snapshot: DEIRatioSnapshot): void {
  const hourlySnapshot = getHourlyDEIRatioSnapshot(snapshot.timestamp)
  hourlySnapshot.deiMintingRatio = snapshot.deiMintingRatio
  hourlySnapshot.deiRedeemRatio = snapshot.deiRedeemRatio

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getHourlyDEIRatioSnapshot(timestamp: BigInt): HourlyDEIRatioSnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = HourlyDEIRatioSnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlyDEIRatioSnapshot(hourlyId)
    hourlySnapshot.timestamp = timestamp
  }
  return hourlySnapshot
}

export function updateDailyDEIRatioSnapshot(snapshot: DEIRatioSnapshot): void {
  const dailySnapshot = getDailyDEIRatioSnapshot(snapshot.timestamp)
  dailySnapshot.deiMintingRatio = snapshot.deiMintingRatio
  dailySnapshot.deiRedeemRatio = snapshot.deiRedeemRatio

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getDailyDEIRatioSnapshot(timestamp: BigInt): DailyDEIRatioSnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = DailyDEIRatioSnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new DailyDEIRatioSnapshot(dailyId)
    dailySnapshot.timestamp = timestamp
  }
  return dailySnapshot
}

function fetchMintingRatio(): BigDecimal {
  const contract = DEIStrategy.bind(DEI_STRATEGY)
  return contract.mintCollateralRatio().toBigDecimal()
}

function fetchRedeemRatio(): BigDecimal {
  const contract = DEIStrategy.bind(DEI_STRATEGY)
  return contract.redeemCollateralRatio().toBigDecimal()
}
