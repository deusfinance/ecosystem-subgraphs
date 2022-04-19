import {BigDecimal, Address, BigInt} from '@graphprotocol/graph-ts/index'
import {BIG_DECIMAL_ZERO, BIG_DECIMAL_ONE, ADDRESS_ZERO} from 'const'

import {Pair, Token} from '../generated/schema'
import {factoryContract} from './helpers'
import {getBundle} from './mappings'

const WFTM_ADDRESS = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
const USDC_WFTM_PAIR = '0xbad7d3df8e1614d985c3d9ba9f6ecd32ae7dc20a' // created at 30523830

// TODO add more stablepairs á la:
// https://github.com/Uniswap/v2-subgraph/blob/537e5392719ea9b02b3e56a42c1f3eba116d6918/src/mappings/pricing.ts#L11
export function getFtmPriceInUSD(): BigDecimal {
  let usdcPair = Pair.load(USDC_WFTM_PAIR) // usdc is token0

  if (usdcPair !== null) {
    return usdcPair.token0Price
  } else {
    return BIG_DECIMAL_ZERO
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  // main
  '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', // WFTM
  '0x04068da6c83afcfa0e13ba15a6696662335d5b75', // USDC
  '0x888ef71766ca594ded1f0fa3ae64ed2941740a20', // SOLID
  '0xde5ed76e7c05ec5e4572cfc88d1acea165109e44', // DEUS
  '0xde12c7959e1a72bbe8a5f7a1dc8f8eef9ab011b3', // DEI

  // misc, alphabetical
  '0xc5a9848b9d145965d821aaec8fa32aaee026492d', // 0XD V2
  '0x8d7d3409881b51466b483b11ea1b8a03cded89ae', // BASED
  '0xca3f508b8e4dd382ee878a314789373d80a5190a', // BIFI
  '0x841fad6eae12c286d1fd18d1d525dffa75c7effe', // BOO
  '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0xdc301622e621166bd8e82f2ca0a26c13ad0be355', // FRAX
  '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', // FXS
  '0x10010078a54396f62c96df8532dc2b4847d47ed3', // HND
  '0x10b620b2dbac4faa7d7ffd71da486f5d44cd86f9', // LQDR
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3', // MIM
  '0xa3fa99a148fa48d14ed51d610c367c61876997f1', // MIMATIC
  '0x65ef703f5594d2573eb71aaf55bc0cb548492df4', // MULTICHAIN
  '0xdbf31df14b66535af65aac99c32e9ea844e14501', // renBTC
  '0xd31fcd1f7ba190dbc75354046f6024a9b86014d7', // SEX
  '0x41adac6c1ff52c5e27568f27998d747f7b69795b', // SOLIDsex
  '0x6c021ae822bea943b2e66552bde1d2696a53fbb7', // TOMB
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
]

// minimum liquidity required to count towards tracked volume for pairs with small # of LP's
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('1')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_FTM = BigDecimal.fromString('1')

export function findFtmPerToken(token: Token, stable: boolean): BigDecimal {
  if (token.id == WFTM_ADDRESS) {
    return BIG_DECIMAL_ONE
  }

  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    const pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]), stable)
    if (pairAddress.toHexString() == ADDRESS_ZERO) continue

    const pair = Pair.load(pairAddress.toHexString())
    if (!pair) continue

    if (pair.token0 == token.id && pair.reserveFTM.gt(MINIMUM_LIQUIDITY_THRESHOLD_FTM)) {
      const token1 = Token.load(pair.token1)
      if (token1) {
        return pair.token1Price.times(token1.derivedFTM as BigDecimal) // return token1 per our token * FTM per token 1
      }
    }

    if (pair.token1 == token.id && pair.reserveFTM.gt(MINIMUM_LIQUIDITY_THRESHOLD_FTM)) {
      let token0 = Token.load(pair.token0)
      if (token0) {
        return pair.token0Price.times(token0.derivedFTM) // return token0 per our token * FTM per token 0
      }
    }
  }
  return BIG_DECIMAL_ZERO // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = getBundle()

  let price0 = token0.derivedFTM.times(bundle.ftmPrice)
  let price1 = token1.derivedFTM.times(bundle.ftmPrice)

  // if less than 5 LP's, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = pair.reserve0.times(price0)
    let reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = getBundle()

  let price0 = token0.derivedFTM.times(bundle.ftmPrice)
  let price1 = token1.derivedFTM.times(bundle.ftmPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO
}
