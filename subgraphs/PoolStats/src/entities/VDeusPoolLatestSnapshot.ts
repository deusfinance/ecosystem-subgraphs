import {VDeusPoolLatestSnapshot, VDeusPoolSnapshot} from '../../generated/schema'

const LATEST_ID = 'latest'

export function updateLatestVdeusPool(snapshot: VDeusPoolSnapshot): void {
  const latest = getLatest()
  latest.vDeusBalance = snapshot.vDeusBalance
  latest.deusBalance = snapshot.deusBalance
  latest.vDeusDeusRatio = snapshot.vDeusDeusRatio
  latest.deusVDeusRatio = snapshot.deusVDeusRatio
  latest.save()
}

export function getLatest(): VDeusPoolLatestSnapshot {
  let latest = VDeusPoolLatestSnapshot.load(LATEST_ID)
  if (!latest) {
    latest = new VDeusPoolLatestSnapshot(LATEST_ID)
  }
  return latest
}
