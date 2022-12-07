import {BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {DEUS_TOKEN_INDEX, VDEUS_POOL_FACTORY_ADDRESS, VDEUS_TOKEN_INDEX} from '../../constants'

import {VDeusPoolSnapshot, VDeusPoolHourlySnapshot, VDeusPoolDailySnapshot} from '../../generated/schema'
import {SwapFlashLoan} from '../../generated/vDeusPoolFactory/SwapFlashLoan'
import {convertDecimalFromWei} from '../helpers'

export function createVdeusPoolSnapshot(event: ethereum.Event): VDeusPoolSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const vDeusBalance = fetchVdeusBalance()
  const deusBalance = fetchDeusBalance()

  const snapshot = new VDeusPoolSnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.vDeusBalance = convertDecimalFromWei(vDeusBalance, SCALE)
  snapshot.deusBalance = convertDecimalFromWei(deusBalance, SCALE)
  snapshot.vDeusPerDeus = calculateRatio(vDeusBalance, deusBalance)
  snapshot.deusPerVDeus = calculateRatio(deusBalance, vDeusBalance)
  snapshot.save()

  return snapshot
}

export function updateVDeusPoolHourlySnapshot(snapshot: VDeusPoolSnapshot): void {
  const hourlySnapshot = getVDeusPoolHourlySnapshot(snapshot.timestamp)
  hourlySnapshot.vDeusBalance = snapshot.vDeusBalance
  hourlySnapshot.deusBalance = snapshot.deusBalance
  hourlySnapshot.vDeusPerDeus = snapshot.vDeusPerDeus
  hourlySnapshot.deusPerVDeus = snapshot.deusPerVDeus

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getVDeusPoolHourlySnapshot(timestamp: BigInt): VDeusPoolHourlySnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = VDeusPoolHourlySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new VDeusPoolHourlySnapshot(hourlyId)
  }
  return hourlySnapshot
}

export function updateVDeusPoolDailySnapshot(snapshot: VDeusPoolSnapshot): void {
  const dailySnapshot = getVDeusPoolDailySnapshot(snapshot.timestamp)
  dailySnapshot.vDeusBalance = snapshot.vDeusBalance
  dailySnapshot.deusBalance = snapshot.deusBalance
  dailySnapshot.vDeusPerDeus = snapshot.vDeusPerDeus
  dailySnapshot.deusPerVDeus = snapshot.deusPerVDeus

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getVDeusPoolDailySnapshot(timestamp: BigInt): VDeusPoolDailySnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = VDeusPoolDailySnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new VDeusPoolDailySnapshot(dailyId)
  }
  return dailySnapshot
}

function fetchVdeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(VDEUS_TOKEN_INDEX).toBigDecimal()
}

function fetchDeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(DEUS_TOKEN_INDEX).toBigDecimal()
}

function calculateRatio(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return a.div(b)
}
