import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BaseV1Pair} from '../../generated/Solidly/BaseV1Pair'
import {Factory, Pair} from '../../generated/schema'
import {FACTORY_ADDRESS} from '../../constants'
import {getToken} from './token'

export function createPair(
  contract: Address,
  token0: Address,
  token1: Address,
  stable: boolean,
  event: ethereum.Event
): Pair {
  // create factory
  let factory = Factory.load(FACTORY_ADDRESS.toHexString())
  if (!factory) {
    factory = new Factory(FACTORY_ADDRESS.toHexString())
    factory.pairCount = 0
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  // create pair
  let pair = new Pair(contract.toHexString())
  pair.name = fetchPairName(contract)
  pair.symbol = fetchPairSymbol(contract)
  pair.decimals = fetchPairDecimals(contract)
  pair.createdAt = event.block.timestamp
  pair.stable = stable

  // create or get tokens
  pair.token0 = getToken(token0).id
  pair.token1 = getToken(token1).id
  pair.save()

  return pair as Pair
}

export function fetchPairName(pair: Address): string {
  let contract = BaseV1Pair.bind(pair)
  return contract.try_name().value
}

export function fetchPairSymbol(pair: Address): string {
  let contract = BaseV1Pair.bind(pair)
  return contract.try_symbol().value
}

export function fetchPairDecimals(pair: Address): BigInt {
  const contract = BaseV1Pair.bind(pair)

  // try types uint8 for decimals
  let decimalValue = null

  const decimalResult = contract.try_decimals()

  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }

  return BigInt.fromI32(decimalValue as i32)
}
