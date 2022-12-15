import {BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_HUNDRED, BIG_DECIMAL_ZERO, SCALE, USDC_DECIMALS} from 'const'

import {
  DEI_STABLECOIN,
  USDC_ADDRESS,
  USDC_COLLATERAL_POOL_ADDRESS,
  USDC_RESERVES_3_ADDRESS,
  USDC_RESERVES_4_ADDRESS,
} from '../../constants'
import {DEIStablecoin} from '../../generated/DEIStablecoin/DEIStablecoin'
import {USDC} from '../../generated/DEIStablecoin/USDC'
import {DEISupplySnapshot, HourlyDEISupplySnapshot, DailyDEISupplySnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createDEISupplySnapshot(event: ethereum.Event): DEISupplySnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const deiSupply = fetchDeiSupply()
  const totalUSDCReserves = fetchUSDCReserves()

  const snapshot = new DEISupplySnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.deiSupply = deiSupply
  snapshot.totalUSDCReserves = totalUSDCReserves
  snapshot.collaterizationRatio = calculateRatio(deiSupply, totalUSDCReserves).times(BIG_DECIMAL_HUNDRED)
  snapshot.save()

  return snapshot
}

export function updateHourlyDEISupplySnapshot(snapshot: DEISupplySnapshot): void {
  const hourlySnapshot = getHourlyDEISupplySnapshot(snapshot.timestamp)
  hourlySnapshot.deiSupply = snapshot.deiSupply
  hourlySnapshot.totalUSDCReserves = snapshot.totalUSDCReserves
  hourlySnapshot.collaterizationRatio = snapshot.collaterizationRatio

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
  dailySnapshot.totalUSDCReserves = snapshot.totalUSDCReserves
  dailySnapshot.collaterizationRatio = snapshot.collaterizationRatio

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
  return convertDecimalFromWei(contract.totalSupply().toBigDecimal(), SCALE)
}

function fetchUSDCReserves(): BigDecimal {
  const contract = USDC.bind(USDC_ADDRESS)
  const usdcReserves3 = convertDecimalFromWei(contract.balanceOf(USDC_RESERVES_3_ADDRESS).toBigDecimal(), USDC_DECIMALS)
  const usdcReserves4 = convertDecimalFromWei(contract.balanceOf(USDC_RESERVES_4_ADDRESS).toBigDecimal(), USDC_DECIMALS)
  const collateralPoolReserves = convertDecimalFromWei(
    contract.balanceOf(USDC_COLLATERAL_POOL_ADDRESS).toBigDecimal(),
    USDC_DECIMALS
  )

  return usdcReserves3.plus(usdcReserves4).plus(collateralPoolReserves)
}

function calculateRatio(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return a.div(b)
}
