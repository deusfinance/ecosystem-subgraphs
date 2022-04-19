import {log, BigInt, BigDecimal, Address, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO, NULL_CALL_RESULT_VALUE, SCALE} from 'const'

import {ERC20} from '../generated/Factory/ERC20'
import {ERC20SymbolBytes} from '../generated/Factory/ERC20SymbolBytes'
import {ERC20NameBytes} from '../generated/Factory/ERC20NameBytes'
import {User, Token, LiquidityPosition, LiquidityPositionSnapshot, Pair} from '../generated/schema'
import {BaseV1Factory as FactoryContract} from '../generated/templates/Pair/BaseV1Factory'

import {FACTORY_ADDRESS} from '../constants'
import {getBundle} from './mappings'

export let factoryContract = FactoryContract.bind(FACTORY_ADDRESS)

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = BIG_INT_ZERO; i.lt(decimals as BigInt); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString('1000000000000000000')
}

export function convertFtmToDecimal(ftm: BigInt): BigDecimal {
  return ftm.toBigDecimal().div(exponentToBigDecimal(SCALE))
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == BIG_INT_ZERO) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

export function equalToZero(value: BigDecimal): boolean {
  const formattedVal = parseFloat(value.toString())
  const zero = parseFloat(BIG_DECIMAL_ZERO.toString())
  if (zero == formattedVal) {
    return true
  }
  return false
}

export function isNullEthValue(value: string): boolean {
  return value == NULL_CALL_RESULT_VALUE
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let totalSupplyResult = contract.try_totalSupply()
  return totalSupplyResult.reverted ? BIG_INT_ONE : totalSupplyResult.value
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = null
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return BigInt.fromI32(decimalValue as i32)
}

export function createLiquidityPosition(exchange: Address, user: Address): LiquidityPosition {
  let id = exchange.toHexString().concat('-').concat(user.toHexString())
  let liquidityTokenBalance = LiquidityPosition.load(id)

  if (!liquidityTokenBalance) {
    liquidityTokenBalance = new LiquidityPosition(id)
    liquidityTokenBalance.liquidityTokenBalance = BIG_DECIMAL_ZERO
    liquidityTokenBalance.pair = exchange.toHexString()
    liquidityTokenBalance.user = user.toHexString()
    liquidityTokenBalance.save()

    let pair = Pair.load(exchange.toHexString())
    if (pair) {
      pair.liquidityProviderCount = pair.liquidityProviderCount.plus(BIG_INT_ONE)
      pair.save()
    }
  }
  if (liquidityTokenBalance === null) log.error('LiquidityTokenBalance is null', [id])
  return liquidityTokenBalance as LiquidityPosition
}

export function createUser(address: Address): void {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.usdSwapped = BIG_DECIMAL_ZERO
    user.save()
  }
}

export function createLiquiditySnapshot(position: LiquidityPosition, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32()
  let bundle = getBundle()
  let pair = Pair.load(position.pair)

  if (!pair) return
  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)

  if (!token0 || !token1) return
  let token0DerivedFTM = token0.derivedFTM ? token0.derivedFTM : BIG_DECIMAL_ZERO
  let token1DerivedFTM = token1.derivedFTM ? token1.derivedFTM : BIG_DECIMAL_ZERO

  // create new snapshot
  let snapshot = new LiquidityPositionSnapshot(position.id.concat(timestamp.toString()))
  snapshot.liquidityPosition = position.id
  snapshot.timestamp = timestamp
  snapshot.block = event.block.number.toI32()
  snapshot.user = position.user
  snapshot.pair = position.pair
  snapshot.token0PriceUSD = token0DerivedFTM.times(bundle.ftmPrice)
  snapshot.token1PriceUSD = token1DerivedFTM.times(bundle.ftmPrice)
  snapshot.reserve0 = pair.reserve0
  snapshot.reserve1 = pair.reserve1
  snapshot.reserveUSD = pair.reserveUSD
  snapshot.liquidityTokenTotalSupply = pair.totalSupply
  snapshot.liquidityTokenBalance = position.liquidityTokenBalance
  snapshot.liquidityPosition = position.id
  snapshot.save()
}
