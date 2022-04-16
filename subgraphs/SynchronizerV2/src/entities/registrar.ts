import {Address} from '@graphprotocol/graph-ts'

import {Registrar} from '../../generated/schema'
import {ERC20} from '../../generated/Conductor/ERC20'
import {Registrar as IRegistrar} from '../../generated/Conductor/Registrar'
import {getSynchronizer} from './synchronizer'
import {BIG_INT_ONE, BIG_INT_THREE, BIG_INT_TWO, BIG_INT_ZERO} from 'const'

export function conductRegistrar(_id: string, short: Address, long: Address): void {
  createRegistrar(_id, short)
  createRegistrar(_id, long)
}

export function liquidateRegistrar(oldRegistrar: Address, newRegistrar: Address): void {
  let liquidatedRegistrar = Registrar.load(oldRegistrar.toHexString())
  if (liquidatedRegistrar) {
    liquidatedRegistrar.liquidated = true
    liquidatedRegistrar.save()
    createRegistrar(liquidatedRegistrar.ticker, newRegistrar)
  }
}

export function createRegistrar(ticker: string, contract: Address): void {
  let registrar = new Registrar(contract.toHexString())
  registrar.ticker = ticker
  registrar.name = fetchTokenName(contract)
  registrar.symbol = fetchTokenSymbol(contract)
  registrar.version = fetchTokenVersion(contract)
  registrar.type = fetchTokenType(contract)
  registrar.liquidated = false
  registrar.save()

  let synchronizer = getSynchronizer()
  synchronizer.registrarCount++
  synchronizer.save()
}

export function fetchTokenName(contractAddress: Address): string {
  let contract = ERC20.bind(contractAddress)
  return contract.name()
}

export function fetchTokenSymbol(contractAddress: Address): string {
  let contract = ERC20.bind(contractAddress)
  return contract.symbol()
}

export function fetchTokenVersion(contractAddress: Address): string {
  let contract = IRegistrar.bind(contractAddress)
  return contract.version()
}

export function fetchTokenType(contractAddress: Address): string {
  let contract = IRegistrar.bind(contractAddress)
  const result = contract.registrarType()

  // note: switch-case breaks compilation
  if (result.toString() == '0' || result.equals(BIG_INT_ZERO)) {
    return 'stock'
  }
  if (result.toString() == '1' || result.equals(BIG_INT_ONE)) {
    return 'crypto'
  }
  if (result.toString() == '2' || result.equals(BIG_INT_TWO)) {
    return 'forex'
  }
  if (result.toString() == '3' || result.equals(BIG_INT_THREE)) {
    return 'commodity'
  }
  return 'misc'
}
