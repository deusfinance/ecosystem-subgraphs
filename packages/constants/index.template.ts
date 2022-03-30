import {BigDecimal, BigInt} from '@graphprotocol/graph-ts'

export const NULL_CALL_RESULT_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000001'
export const CHAIN_ID = '{{ chainId }}'

export const SCALE = BigInt.fromI32(18)

export const BIG_INT_ZERO = BigInt.fromI32(0)
export const BIG_INT_ONE = BigInt.fromI32(1)
export const BIG_INT_TWO = BigInt.fromI32(2)

export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')
