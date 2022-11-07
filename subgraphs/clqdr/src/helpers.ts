import {BigDecimal, BigInt} from '@graphprotocol/graph-ts'
import {BIG_INT_ZERO, BIG_INT_ONE} from 'const'

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
