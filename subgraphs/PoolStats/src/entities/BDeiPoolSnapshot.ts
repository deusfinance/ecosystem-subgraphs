import {BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {BDEI_POOL_FACTORY_ADDRESS, BDEI_TOKEN_INDEX, DEI_TOKEN_INDEX} from '../../constants'
import {SwapFlashLoan} from '../../generated/bDeiPoolFactory/SwapFlashLoan'

import {BDeiPoolSnapshot, BDeiPoolHourlySnapshot, BDeiPoolDailySnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createBDeiPoolSnapshot(event: ethereum.Event): BDeiPoolSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const bDeiBalance = fetchBDeiBalance()
  const deiBalance = fetchDeiBalance()

  const snapshot = new BDeiPoolSnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.bDeiBalance = convertDecimalFromWei(bDeiBalance, SCALE)
  snapshot.deiBalance = convertDecimalFromWei(deiBalance, SCALE)
  snapshot.bDeiPerDei = calculateRatio(bDeiBalance, deiBalance)
  snapshot.deiPerBDei = calculateRatio(deiBalance, bDeiBalance)
  snapshot.save()

  return snapshot
}

export function updateBDeiPoolHourlySnapshot(snapshot: BDeiPoolSnapshot): void {
  const hourlySnapshot = getBDeiPoolHourlySnapshot(snapshot.timestamp)
  hourlySnapshot.bDeiBalance = snapshot.bDeiBalance
  hourlySnapshot.deiBalance = snapshot.deiBalance
  hourlySnapshot.bDeiPerDei = snapshot.bDeiPerDei
  hourlySnapshot.deiPerBDei = snapshot.deiPerBDei

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getBDeiPoolHourlySnapshot(timestamp: BigInt): BDeiPoolHourlySnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = BDeiPoolHourlySnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new BDeiPoolHourlySnapshot(hourlyId)
  }
  return hourlySnapshot
}

export function updateBDeiPoolDailySnapshot(snapshot: BDeiPoolSnapshot): void {
  const dailySnapshot = getBDeiPoolDailySnapshot(snapshot.timestamp)
  dailySnapshot.bDeiBalance = snapshot.bDeiBalance
  dailySnapshot.deiBalance = snapshot.deiBalance
  dailySnapshot.bDeiPerDei = snapshot.bDeiPerDei
  dailySnapshot.deiPerBDei = snapshot.deiPerBDei

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getBDeiPoolDailySnapshot(timestamp: BigInt): BDeiPoolDailySnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = BDeiPoolDailySnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new BDeiPoolDailySnapshot(dailyId)
  }
  return dailySnapshot
}

function fetchBDeiBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(BDEI_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(BDEI_TOKEN_INDEX).toBigDecimal()
}

function fetchDeiBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(BDEI_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(DEI_TOKEN_INDEX).toBigDecimal()
}

function calculateRatio(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return a.div(b)
}
