import {BigDecimal, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {BDEI_POOL_FACTORY_ADDRESS, BDEI_TOKEN_INDEX, DEI_TOKEN_INDEX} from '../../constants'
import {SwapFlashLoan} from '../../generated/bDeiPoolFactory/SwapFlashLoan'

import {BDeiPoolSnapshot} from '../../generated/schema'
import {convertDecimalFromWei} from '../helpers'

export function createBDeiPoolSnapshot(event: ethereum.Event): BDeiPoolSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
  const bDeiBalance = fetchBDeiBalance()
  const deiBalance = fetchDeiBalance()

  const snapshot = new BDeiPoolSnapshot(id)
  snapshot.block = event.block.number
  snapshot.hash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.bDeiBalance = convertDecimalFromWei(bDeiBalance, SCALE)
  snapshot.deiBalance = convertDecimalFromWei(deiBalance, SCALE)
  snapshot.bDeiPerDei = calculateRatio(bDeiBalance, deiBalance)
  snapshot.deiPerBDei = calculateRatio(deiBalance, bDeiBalance)
  snapshot.save()

  return snapshot
}

function fetchBDeiBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(BDEI_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(BDEI_TOKEN_INDEX).toBigDecimal()
}

function fetchDeiBalance(): BigDecimal {
  const contract = SwapFlashLoan.bind(BDEI_POOL_FACTORY_ADDRESS)
  return contract.getTokenBalance(DEI_TOKEN_INDEX).toBigDecimal()
}

function calculateRatio(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  return a.div(b)
}
