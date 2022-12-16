import {DEUSSupplySnapshot, LatestDEUSSupplySnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestDeusSupplySnapshot(snapshot: DEUSSupplySnapshot): void {
  const latest = getLatest()
  latest.deusSupply = snapshot.deusSupply
  latest.save()
}

function getLatest(): LatestDEUSSupplySnapshot {
  let latest = LatestDEUSSupplySnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new LatestDEUSSupplySnapshot(LATEST_ID)
  }
  return latest
}
