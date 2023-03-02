import {Transfer} from '../../generated/DEIStablecoin/DEIStablecoin'
import {createDEISupplySnapshot, updateDailyDEISupplySnapshot, updateHourlyDEISupplySnapshot} from '../entities'
import {updateLatestDeiSupplySnapshot} from '../entities/LatestDEISupplySnapshot'

export function handleDeiTransfer(event: Transfer): void {
  // Create a Snapshot
  const snapshot = createDEISupplySnapshot(event)

  // Update Latest entity
  updateLatestDeiSupplySnapshot(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlyDEISupplySnapshot(snapshot)
  updateDailyDEISupplySnapshot(snapshot)
}
