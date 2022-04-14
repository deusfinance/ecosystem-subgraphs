import {BigDecimal, BigInt} from '@graphprotocol/graph-ts'
import {BIG_INT_ZERO, BIG_INT_ONE, BIG_DECIMAL_ZERO} from 'const'

import {Partner} from '../generated/schema'

export function getAction(method: string): BigInt {
  const value = method == 'open' ? 1 : 0
  return BigInt.fromI32(value)
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = BIG_INT_ZERO; i.lt(decimals as BigInt); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function convertAmountToDecimal(amount: BigInt, decimals: BigInt): BigDecimal {
  if (decimals == BIG_INT_ZERO) {
    return amount.toBigDecimal()
  }
  return amount.toBigDecimal().div(exponentToBigDecimal(decimals))
}

export function getPartnerFee(partner: Partner, type: string): BigDecimal {
  if (type === 'stock') {
    return partner.stockFee
  }
  if (type === 'crypto') {
    return partner.cryptoFee
  }
  if (type === 'forex') {
    return partner.forexFee
  }
  if (type === 'commodity') {
    return partner.commodityFee
  }
  return partner.miscFee
}

export function getRegistrarVolume(type: string, quoteAmount: BigDecimal): BigDecimal[] {
  let stockVolume = BIG_DECIMAL_ZERO
  let cryptoVolume = BIG_DECIMAL_ZERO
  let forexVolume = BIG_DECIMAL_ZERO
  let commodityVolume = BIG_DECIMAL_ZERO
  let miscVolume = BIG_DECIMAL_ZERO

  if (type === 'stock') {
    stockVolume = quoteAmount
  } else if (type === 'crypto') {
    cryptoVolume = quoteAmount
  } else if (type === 'forex') {
    forexVolume = quoteAmount
  } else if (type === 'commodity') {
    commodityVolume = quoteAmount
  } else {
    miscVolume = quoteAmount
  }

  return [stockVolume, cryptoVolume, forexVolume, commodityVolume, miscVolume]
}

export function getQuoteAmount(
  amountIn: BigDecimal,
  amountOut: BigDecimal,
  totalFee: BigDecimal,
  method: string
): BigDecimal {
  return method == 'open' ? amountIn : amountOut.plus(totalFee)
}
