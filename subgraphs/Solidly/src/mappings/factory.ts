import {log} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, BIG_INT_ZERO} from 'const'

import {PairCreated} from '../../generated/Factory/BaseV1Factory'
import {Bundle, Pair, SolidlyFactory, Token} from '../../generated/schema'
import {Pair as PairTemplate} from '../../generated/templates'

import {FACTORY_ADDRESS} from '../../constants'
import {fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply} from '../helpers'

export function getFactory(): SolidlyFactory {
  const id = FACTORY_ADDRESS.toHexString()
  let factory = SolidlyFactory.load(id)

  if (!factory) {
    factory = new SolidlyFactory(id)
    factory.pairCount = 0
    factory.totalVolumeFTM = BIG_DECIMAL_ZERO
    factory.totalLiquidityFTM = BIG_DECIMAL_ZERO
    factory.totalVolumeUSD = BIG_DECIMAL_ZERO
    factory.untrackedVolumeUSD = BIG_DECIMAL_ZERO
    factory.totalLiquidityUSD = BIG_DECIMAL_ZERO
    factory.txCount = BIG_INT_ZERO
    factory.save()

    // create initial bundle
    getBundle()
  }

  return factory
}

export function getBundle(): Bundle {
  let bundle = Bundle.load('1')
  if (!bundle) {
    bundle = new Bundle('1')
    bundle.ftmPrice = BIG_DECIMAL_ZERO
    bundle.save()
  }

  return bundle
}

export function handlePairCreated(event: PairCreated): void {
  let factory = getFactory()
  factory.pairCount = factory.pairCount + 1
  factory.save()

  // create the tokens
  let token0 = Token.load(event.params.token0.toHexString())
  let token1 = Token.load(event.params.token1.toHexString())

  if (!token0) {
    token0 = new Token(event.params.token0.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token0)
    token0.name = fetchTokenName(event.params.token0)
    token0.totalSupply = fetchTokenTotalSupply(event.params.token0)
    let decimals = fetchTokenDecimals(event.params.token0)

    // bail if we can't figure out the decimals
    if (!decimals) {
      log.debug('a decimal on token0 was null {}', [token0.id])
      return
    }

    token0.decimals = decimals
    token0.derivedFTM = BIG_DECIMAL_ZERO
    token0.tradeVolume = BIG_DECIMAL_ZERO
    token0.tradeVolumeUSD = BIG_DECIMAL_ZERO
    token0.untrackedVolumeUSD = BIG_DECIMAL_ZERO
    token0.totalLiquidity = BIG_DECIMAL_ZERO
    token0.txCount = BIG_INT_ZERO
  }

  if (!token1) {
    token1 = new Token(event.params.token1.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.token1)
    token1.name = fetchTokenName(event.params.token1)
    token1.totalSupply = fetchTokenTotalSupply(event.params.token1)
    let decimals = fetchTokenDecimals(event.params.token1)

    // bail if we can't figure out the decimals
    if (!decimals) {
      log.debug('a decimal on token1 was null {}', [token1.id])
      return
    }

    token1.decimals = decimals
    token1.derivedFTM = BIG_DECIMAL_ZERO
    token1.tradeVolume = BIG_DECIMAL_ZERO
    token1.tradeVolumeUSD = BIG_DECIMAL_ZERO
    token1.untrackedVolumeUSD = BIG_DECIMAL_ZERO
    token1.totalLiquidity = BIG_DECIMAL_ZERO
    token1.txCount = BIG_INT_ZERO
  }

  let pairAddress = event.params.pair
  let pair = new Pair(pairAddress.toHexString())

  pair.stable = event.params.stable
  pair.name = fetchTokenName(pairAddress)
  pair.symbol = fetchTokenSymbol(pairAddress)
  pair.decimals = fetchTokenDecimals(pairAddress)
  pair.token0 = token0.id
  pair.token1 = token1.id

  pair.liquidityProviderCount = BIG_INT_ZERO
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.txCount = BIG_INT_ZERO
  pair.reserve0 = BIG_DECIMAL_ZERO
  pair.reserve1 = BIG_DECIMAL_ZERO
  pair.trackedReserveFTM = BIG_DECIMAL_ZERO
  pair.reserveFTM = BIG_DECIMAL_ZERO
  pair.reserveUSD = BIG_DECIMAL_ZERO
  pair.totalSupply = BIG_DECIMAL_ZERO
  pair.volumeToken0 = BIG_DECIMAL_ZERO
  pair.volumeToken1 = BIG_DECIMAL_ZERO
  pair.volumeUSD = BIG_DECIMAL_ZERO
  pair.untrackedVolumeUSD = BIG_DECIMAL_ZERO
  pair.token0Price = BIG_DECIMAL_ZERO
  pair.token1Price = BIG_DECIMAL_ZERO

  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair)

  // save updated values
  token0.save()
  token1.save()
  pair.save()
  factory.save()
}
