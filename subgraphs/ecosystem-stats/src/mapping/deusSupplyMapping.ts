import {DEUSMinted} from '../../generated/DEUSToken/DEUSToken'
import {
  createDEUSSupplySnapshot,
  updateDailyDEUSSupplySnapshot,
  updateHourlyDEUSSupplySnapshot,
  updateLatestDeusSupplySnapshot,
} from '../entities'

export function handleDeusMinted(event: DEUSMinted): void {
  // Create a Snapshot
  const snapshot = createDEUSSupplySnapshot(event)

  // Update Latest entity
  updateLatestDeusSupplySnapshot(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlyDEUSSupplySnapshot(snapshot)
  updateDailyDEUSSupplySnapshot(snapshot)
}

export function handleDeusBurned(event: DEUSMinted): void {
  // Create a Snapshot
  const snapshot = createDEUSSupplySnapshot(event)

  // Update Latest entity
  updateLatestDeusSupplySnapshot(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlyDEUSSupplySnapshot(snapshot)
  updateDailyDEUSSupplySnapshot(snapshot)
}
