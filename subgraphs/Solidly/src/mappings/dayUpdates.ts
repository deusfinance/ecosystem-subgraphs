import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO} from 'const'

import {Pair, PairDayData, Token, TokenDayData, SolidlyDayData, PairHourData} from '../../generated/schema'
import {getBundle, getFactory} from './factory'

export function updateUniswapDayData(event: ethereum.Event): SolidlyDayData {
  let factory = getFactory()

  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let uniswapDayData = SolidlyDayData.load(dayID.toString())
  if (!uniswapDayData) {
    uniswapDayData = new SolidlyDayData(dayID.toString())
    uniswapDayData.date = dayStartTimestamp
    uniswapDayData.dailyVolumeUSD = BIG_DECIMAL_ZERO
    uniswapDayData.dailyVolumeFTM = BIG_DECIMAL_ZERO
    uniswapDayData.totalVolumeUSD = BIG_DECIMAL_ZERO
    uniswapDayData.totalVolumeFTM = BIG_DECIMAL_ZERO
    uniswapDayData.dailyVolumeUntracked = BIG_DECIMAL_ZERO
  }

  if (factory) {
    uniswapDayData.totalLiquidityUSD = factory.totalLiquidityUSD
    uniswapDayData.totalLiquidityFTM = factory.totalLiquidityFTM
    uniswapDayData.txCount = factory.txCount
    uniswapDayData.save()
  }

  return uniswapDayData as SolidlyDayData
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  let pair = Pair.load(event.address.toHexString())

  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(dayID).toString())

  let pairDayData = PairDayData.load(dayPairID)
  if (!pairDayData) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.pairAddress = event.address
    pairDayData.dailyVolumeToken0 = BIG_DECIMAL_ZERO
    pairDayData.dailyVolumeToken1 = BIG_DECIMAL_ZERO
    pairDayData.dailyVolumeUSD = BIG_DECIMAL_ZERO
    pairDayData.dailyTxns = BIG_INT_ZERO

    if (pair) {
      pairDayData.token0 = pair.token0
      pairDayData.token1 = pair.token1
    }
  }

  if (pair) {
    pairDayData.totalSupply = pair.totalSupply
    pairDayData.reserve0 = pair.reserve0
    pairDayData.reserve1 = pair.reserve1
    pairDayData.reserveUSD = pair.reserveUSD
    pairDayData.dailyTxns = pairDayData.dailyTxns.plus(BIG_INT_ONE)
  }
  pairDayData.save()

  return pairDayData as PairDayData
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  let pair = Pair.load(event.address.toHexString())

  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(hourIndex).toString())
  let pairHourData = PairHourData.load(hourPairID)

  if (!pairHourData) {
    pairHourData = new PairHourData(hourPairID)
    pairHourData.hourStartUnix = hourStartUnix
    pairHourData.pair = event.address.toHexString()
    pairHourData.hourlyVolumeToken0 = BIG_DECIMAL_ZERO
    pairHourData.hourlyVolumeToken1 = BIG_DECIMAL_ZERO
    pairHourData.hourlyVolumeUSD = BIG_DECIMAL_ZERO
    pairHourData.hourlyTxns = BIG_INT_ZERO
  }

  if (pair) {
    pairHourData.totalSupply = pair.totalSupply
    pairHourData.reserve0 = pair.reserve0
    pairHourData.reserve1 = pair.reserve1
    pairHourData.reserveUSD = pair.reserveUSD
    pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(BIG_INT_ONE)
  }
  pairHourData.save()

  return pairHourData as PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let bundle = getBundle()
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id.toString().concat('-').concat(BigInt.fromI32(dayID).toString())

  let tokenDerivedFTM = token.derivedFTM ? token.derivedFTM : BIG_DECIMAL_ZERO
  let bundledFTMPrice = bundle ? bundle.ftmPrice : BIG_DECIMAL_ZERO

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (!tokenDayData) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.dailyVolumeToken = BIG_DECIMAL_ZERO
    tokenDayData.dailyVolumeFTM = BIG_DECIMAL_ZERO
    tokenDayData.dailyVolumeUSD = BIG_DECIMAL_ZERO
    tokenDayData.dailyTxns = BIG_INT_ZERO
    tokenDayData.totalLiquidityUSD = BIG_DECIMAL_ZERO
  }

  tokenDayData.priceUSD = tokenDerivedFTM.times(bundledFTMPrice)
  tokenDayData.totalLiquidityToken = token.totalLiquidity
  tokenDayData.totalLiquidityFTM = token.totalLiquidity.times(tokenDerivedFTM)
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityFTM.times(bundledFTMPrice)
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(BIG_INT_ONE)
  tokenDayData.save()

  return tokenDayData as TokenDayData
}
