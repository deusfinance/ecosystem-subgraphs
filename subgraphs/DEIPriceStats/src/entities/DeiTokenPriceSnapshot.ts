import {Address, BigDecimal, log} from '@graphprotocol/graph-ts'
import {DEI_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS} from '../../constants'
import {DeiTokenPriceSnapshot} from '../../generated/schema'
import {Swap} from '../../generated/Vault/Vault'
import {scaleDown} from '../helpers'

export function createDeiTokenPriceSnapshot(event: Swap): DeiTokenPriceSnapshot {
  const id = `${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`

  const snapshot = new DeiTokenPriceSnapshot(id)
  snapshot.block = event.block.number
  snapshot.txHash = event.transaction.hash
  snapshot.timestamp = event.block.timestamp
  snapshot.poolId = event.params.poolId

  const tokenInAddress: Address = event.params.tokenIn

  log.info('token in address in string', [tokenInAddress.toHexString()])

  if (tokenInAddress.toHexString() == USDC_TOKEN_ADDRESS) {
    const tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, 6)
    const tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, 18)

    snapshot.deiPrice = tokenAmountIn.div(tokenAmountOut)
    snapshot.tokenIn = 'USDC'
    snapshot.tokenOut = 'DEI'
    snapshot.swapType = 'Buy'
    snapshot.amountIn = tokenAmountIn
    snapshot.amountOut = tokenAmountOut
  }

  if (tokenInAddress.toHexString() == DEI_TOKEN_ADDRESS) {
    const tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, 18)
    const tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, 6)

    snapshot.deiPrice = tokenAmountOut.div(tokenAmountIn)
    snapshot.tokenIn = 'DEI'
    snapshot.tokenOut = 'USDC'
    snapshot.swapType = 'Sell'
    snapshot.amountIn = tokenAmountIn
    snapshot.amountOut = tokenAmountOut
  }

  snapshot.save()

  return snapshot
}
