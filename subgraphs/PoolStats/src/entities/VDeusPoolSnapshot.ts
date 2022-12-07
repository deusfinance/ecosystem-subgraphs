import {BigDecimal, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {DEUS_TOKEN_INDEX, VDEUS_POOL_FACTORY_ADDRESS, VDEUS_TOKEN_INDEX} from '../../constants'
import {SwapFlashLoan} from '../../generated/Factory/SwapFlashLoan'

import {VDeusPoolSnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createVdeusPoolSnapshot(event: ethereum.Event): VDeusPoolSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const vDeusBalance = fetchVdeusBalance()
  const deusBalance = fetchDeusBalance()

  const snapshot = new VDeusPoolSnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.vDeusBalance = convertDecimalFromWei(vDeusBalance, SCALE)
  snapshot.deusBalance = convertDecimalFromWei(deusBalance, SCALE)
  snapshot.vDeusPerDeus = calculateRatio(vDeusBalance, deusBalance)
  snapshot.deusPerVDeus = calculateRatio(deusBalance, vDeusBalance)
  snapshot.save()

  return snapshot
}

function fetchVdeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(VDEUS_TOKEN_INDEX).toBigDecimal()
}

function fetchDeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(DEUS_TOKEN_INDEX).toBigDecimal()
}

function calculateRatio(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return a.div(b)
}
