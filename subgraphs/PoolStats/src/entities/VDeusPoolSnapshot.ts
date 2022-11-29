import {BigDecimal, BigInt, ethereum, log} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {
  DEUS_TOKEN_ADDRESS,
  DEUS_TOKEN_INDEX,
  VDEUS_POOL_FACTORY_ADDRESS,
  VDEUS_TOKEN_ADDRESS,
  VDEUS_TOKEN_INDEX,
} from '../../constants'
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
  snapshot.vDeusPerDeus = fetchVDeusPerDeusSwapRatio()
  snapshot.deusPerVDeus = fetchDeusPerVDeusSwapRatio()
  snapshot.save()

  return snapshot
}

function fetchVdeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  const vDeusTokenId = contract.getTokenIndex(VDEUS_TOKEN_ADDRESS)
  return contract.getTokenBalance(vDeusTokenId).toBigDecimal()
}

function fetchDeusBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  const deusTokenId = contract.getTokenIndex(DEUS_TOKEN_ADDRESS)
  return contract.getTokenBalance(deusTokenId).toBigDecimal()
}

function fetchVDeusPerDeusSwapRatio(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  const callResult = contract.try_calculateSwap(DEUS_TOKEN_INDEX, VDEUS_TOKEN_INDEX, SCALE)

  if (callResult.reverted) {
    log.info('try_calculateSwap reverted', [])
  } else {
    return callResult.value.toBigDecimal()
  }

  return BIG_DECIMAL_ZERO
}

function fetchDeusPerVDeusSwapRatio(): BigDecimal {
  const contract = SwapFlashLoan.bind(VDEUS_POOL_FACTORY_ADDRESS)
  const callResult = contract.try_calculateSwap(VDEUS_TOKEN_INDEX, DEUS_TOKEN_INDEX, SCALE)

  if (callResult.reverted) {
    log.info('try_calculateSwap reverted', [])
  } else {
    return callResult.value.toBigDecimal()
  }

  return BIG_DECIMAL_ZERO
}
