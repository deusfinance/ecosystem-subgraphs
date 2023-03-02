import {DeiTokenPriceSnapshot, LatestDeiTokenPriceSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestDeiTokenPriceSnapshot(snapshot: DeiTokenPriceSnapshot): void {
  const latest = getLatest()

  latest.block = snapshot.block
  latest.txHash = snapshot.txHash
  latest.poolId = snapshot.poolId
  latest.timestamp = snapshot.timestamp
  latest.deiPrice = snapshot.deiPrice
  latest.tokenIn = snapshot.tokenIn
  latest.tokenOut = snapshot.tokenOut
  latest.swapType = snapshot.swapType
  latest.amountIn = snapshot.amountIn
  latest.amountOut = snapshot.amountOut

  latest.save()
}

function getLatest(): LatestDeiTokenPriceSnapshot {
  let latest = LatestDeiTokenPriceSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new LatestDeiTokenPriceSnapshot(LATEST_ID)
  }
  return latest
}
