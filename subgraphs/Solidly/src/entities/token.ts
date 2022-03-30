import {Address, BigInt} from '@graphprotocol/graph-ts'
import {NULL_CALL_RESULT_VALUE} from 'const'

import {Token} from '../../generated/schema'
import {ERC20} from '../../generated/Solidly/ERC20'
import {ERC20NameBytes} from '../../generated/Solidly/ERC20NameBytes'
import {ERC20SymbolBytes} from '../../generated/Solidly/ERC20SymbolBytes'

export function getToken(address: Address): Token {
  let token = Token.load(address.toHexString())
  if (!token) {
    token = new Token(address.toHexString())
    token.name = fetchTokenName(address)
    token.symbol = fetchTokenSymbol(address)
    token.decimals = fetchTokenDecimals(address)
  }
  token.save()

  return token as Token
}

export function fetchTokenSymbol(address: Address): string {
  const contract = ERC20.bind(address)
  const contractSymbolBytes = ERC20SymbolBytes.bind(address)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  const symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    const symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (symbolResultBytes.value.toHex() != NULL_CALL_RESULT_VALUE) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(address: Address): string {
  const contract = ERC20.bind(address)
  const contractNameBytes = ERC20NameBytes.bind(address)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  const nameResult = contract.try_name()
  if (nameResult.reverted) {
    const nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (nameResultBytes.value.toHex() != NULL_CALL_RESULT_VALUE) {
        nameValue = nameResultBytes.value.toString()
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenDecimals(address: Address): BigInt {
  const contract = ERC20.bind(address)

  // try types uint8 for decimals
  let decimalValue = null

  const decimalResult = contract.try_decimals()

  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }

  return BigInt.fromI32(decimalValue as i32)
}
