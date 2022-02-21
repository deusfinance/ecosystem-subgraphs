import {Address} from '@graphprotocol/graph-ts'

import {Registrar} from '../../generated/schema'
import {ERC20} from '../../generated/Conductor/ERC20'
import {Registrar as IRegistrar} from '../../generated/Conductor/Registrar'
import {getSynchronizer} from './synchronizer'

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
  return contract.try_name().value
}

export function fetchTokenSymbol(contractAddress: Address): string {
  let contract = ERC20.bind(contractAddress)
  return contract.try_symbol().value
}

export function fetchTokenVersion(contractAddress: Address): string {
  let contract = IRegistrar.bind(contractAddress)
  return contract.try_version().value
}

export function fetchTokenType(contractAddress: Address): string {
  let contract = IRegistrar.bind(contractAddress)
  const result = contract.try_registrarType().value

  // note: switch-case breaks compilation
  if (result.toString() == '0') {
    return 'stock'
  }
  if (result.toString() == '1') {
    return 'crypto'
  }
  if (result.toString() == '2') {
    return 'forex'
  }
  if (result.toString() == '3') {
    return 'commodity'
  }
  return 'misc'
}
