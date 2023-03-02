import {LatestDEIRatioSnapshot, DEIRatioSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestDeiRatioSnapshot(snapshot: DEIRatioSnapshot): void {
  const latest = getLatest()
  latest.deiMintingRatio = snapshot.deiMintingRatio
  latest.deiRedeemRatio = snapshot.deiRedeemRatio
  latest.save()
}

function getLatest(): LatestDEIRatioSnapshot {
  let latest = LatestDEIRatioSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new LatestDEIRatioSnapshot(LATEST_ID)
  }
  return latest
}
