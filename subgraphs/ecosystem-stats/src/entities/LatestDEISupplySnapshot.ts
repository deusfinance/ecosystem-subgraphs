import {DEISupplySnapshot, LatestDEISupplySnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestDeiSupplySnapshot(snapshot: DEISupplySnapshot): void {
  const latest = getLatest()
  latest.deiSupply = snapshot.deiSupply
  latest.save()
}

function getLatest(): LatestDEISupplySnapshot {
  let latest = LatestDEISupplySnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new LatestDEISupplySnapshot(LATEST_ID)
  }
  return latest
}
