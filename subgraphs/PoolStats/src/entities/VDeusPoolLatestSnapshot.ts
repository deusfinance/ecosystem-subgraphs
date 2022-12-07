import {VDeusPoolLatestSnapshot, VDeusPoolSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestVdeusPool(snapshot: VDeusPoolSnapshot): void {
  const latest = getLatest()
  latest.vDeusBalance = snapshot.vDeusBalance
  latest.deusBalance = snapshot.deusBalance
  latest.vDeusPerDeus = snapshot.vDeusPerDeus
  latest.deusPerVDeus = snapshot.deusPerVDeus
  latest.save()
}

function getLatest(): VDeusPoolLatestSnapshot {
  let latest = VDeusPoolLatestSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new VDeusPoolLatestSnapshot(LATEST_ID)
  }
  return latest
}
