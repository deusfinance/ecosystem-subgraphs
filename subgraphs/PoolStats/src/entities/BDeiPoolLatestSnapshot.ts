import {BDeiPoolLatestSnapshot, BDeiPoolSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestBDeiPool(snapshot: BDeiPoolSnapshot): void {
  const latest = getBDeiPoolLatest()
  latest.bDeiBalance = snapshot.bDeiBalance
  latest.deiBalance = snapshot.deiBalance
  latest.bDeiPerDei = snapshot.bDeiPerDei
  latest.deiPerBDei = snapshot.deiPerBDei
  latest.save()
}

export function getBDeiPoolLatest(): BDeiPoolLatestSnapshot {
  let latest = BDeiPoolLatestSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new BDeiPoolLatestSnapshot(LATEST_ID)
  }
  return latest
}
