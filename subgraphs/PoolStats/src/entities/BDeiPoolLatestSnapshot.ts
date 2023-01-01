import {BDeiPoolLatestSnapshot, BDeiPoolSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestBDeiPool(snapshot: BDeiPoolSnapshot): void {
  const latest = getLatest()
  latest.bDeiBalance = snapshot.bDeiBalance
  latest.deiBalance = snapshot.deiBalance
  latest.bDeiPerDei = snapshot.bDeiPerDei
  latest.deiPerBDei = snapshot.deiPerBDei
  latest.swapRatio = snapshot.swapRatio
  latest.save()
}

function getLatest(): BDeiPoolLatestSnapshot {
  let latest = BDeiPoolLatestSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new BDeiPoolLatestSnapshot(LATEST_ID)
  }
  return latest
}
