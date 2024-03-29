import {SetRedeemCollateralRatio} from '../../generated/DEIStrategy/DEIStrategy'
import {
  createDEIRatioSnapshot,
  updateDailyDEIRatioSnapshot,
  updateHourlyDEIRatioSnapshot,
  updateLatestDeiRatioSnapshot,
} from '../entities'

export function handleSetRedeemCollateralRatio(event: SetRedeemCollateralRatio): void {
  // Create a Snapshot
  const snapshot = createDEIRatioSnapshot(event)

  // Update Latest entity
  updateLatestDeiRatioSnapshot(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlyDEIRatioSnapshot(snapshot)
  updateDailyDEIRatioSnapshot(snapshot)
}
