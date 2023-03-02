import {Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'
import {DEI_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS} from '../../constants'
import {DailyDeiTokenPriceSnapshot, DeiTokenPriceSnapshot, HourlyDeiTokenPriceSnapshot} from '../../generated/schema'
import {Swap} from '../../generated/Vault/Vault'
import {scaleDown} from '../helpers'

export function createDeiTokenPriceSnapshot(event: Swap): DeiTokenPriceSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`

  const snapshot = new DeiTokenPriceSnapshot(id)
  snapshot.block = event.block.number
  snapshot.txHash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.poolId = event.params.poolId

  const tokenInAddress: Address = event.params.tokenIn

  log.info('token in address in string', [tokenInAddress.toHexString()])

  if (tokenInAddress.toHexString() == USDC_TOKEN_ADDRESS) {
    const tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, 6)
    const tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, 18)

    snapshot.deiPrice = tokenAmountIn.div(tokenAmountOut)
    snapshot.tokenIn = 'USDC'
    snapshot.tokenOut = 'DEI'
    snapshot.swapType = 'Buy'
    snapshot.amountIn = tokenAmountIn
    snapshot.amountOut = tokenAmountOut
  }

  if (tokenInAddress.toHexString() == DEI_TOKEN_ADDRESS) {
    const tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, 18)
    const tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, 6)

    snapshot.deiPrice = tokenAmountOut.div(tokenAmountIn)
    snapshot.tokenIn = 'DEI'
    snapshot.tokenOut = 'USDC'
    snapshot.swapType = 'Sell'
    snapshot.amountIn = tokenAmountIn
    snapshot.amountOut = tokenAmountOut
  }

  snapshot.save()

  return snapshot
}

export function updateHourlyDEITokenPriceSnapshot(snapshot: DeiTokenPriceSnapshot): void {
  const hourlySnapshot = getHourlyDEITokenPriceSnapshot(snapshot.timestamp)

  hourlySnapshot.poolId = snapshot.poolId
  hourlySnapshot.txHash = snapshot.txHash
  hourlySnapshot.block = snapshot.block
  hourlySnapshot.timestamp = snapshot.timestamp
  hourlySnapshot.deiPrice = hourlySnapshot.deiPrice
    .times(BigDecimal.fromString(hourlySnapshot.snapshots.length.toString()))
    .plus(snapshot.deiPrice)
    .div(BigDecimal.fromString((hourlySnapshot.snapshots.length + 1).toString()))

  const snapshots = hourlySnapshot.snapshots
  snapshots.push(snapshot.id)
  hourlySnapshot.snapshots = snapshots

  hourlySnapshot.save()
}

function getHourlyDEITokenPriceSnapshot(timestamp: BigInt): HourlyDeiTokenPriceSnapshot {
  const hourlyId = (timestamp.toI32() / (60 * 60)).toString()
  let hourlySnapshot = HourlyDeiTokenPriceSnapshot.load(hourlyId)
  if (!hourlySnapshot) {
    hourlySnapshot = new HourlyDeiTokenPriceSnapshot(hourlyId)
    hourlySnapshot.timestamp = timestamp
  }
  return hourlySnapshot
}

export function updateDailyDEITokenPriceSnapshot(snapshot: DeiTokenPriceSnapshot): void {
  const dailySnapshot = getDailyDEITokenPriceSnapshot(snapshot.timestamp)

  dailySnapshot.poolId = snapshot.poolId
  dailySnapshot.txHash = snapshot.txHash
  dailySnapshot.block = snapshot.block
  dailySnapshot.timestamp = snapshot.timestamp
  dailySnapshot.deiPrice = dailySnapshot.deiPrice
    .times(BigDecimal.fromString(dailySnapshot.snapshots.length.toString()))
    .plus(snapshot.deiPrice)
    .div(BigDecimal.fromString((dailySnapshot.snapshots.length + 1).toString()))

  const snapshots = dailySnapshot.snapshots
  snapshots.push(snapshot.id)
  dailySnapshot.snapshots = snapshots

  dailySnapshot.save()
}

function getDailyDEITokenPriceSnapshot(timestamp: BigInt): DailyDeiTokenPriceSnapshot {
  const dailyId = (timestamp.toI32() / (24 * 60 * 60)).toString()
  let dailySnapshot = DailyDeiTokenPriceSnapshot.load(dailyId)
  if (!dailySnapshot) {
    dailySnapshot = new DailyDeiTokenPriceSnapshot(dailyId)
    dailySnapshot.timestamp = timestamp
  }
  return dailySnapshot
}
