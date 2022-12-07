import {AddLiquidity, RemoveLiquidity, TokenSwap} from '../../generated/vDeusPoolFactory/SwapFlashLoan'
import {
  createVdeusPoolSnapshot,
  updateLatestVdeusPool,
  updateVDeusPoolDailySnapshot,
  updateVDeusPoolHourlySnapshot,
} from '../entities'

export function handleVdeusTokenSwap(event: TokenSwap): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)

  // Aggregate Snapshot into chunks
  updateVDeusPoolHourlySnapshot(snapshot)
  updateVDeusPoolDailySnapshot(snapshot)
}

export function handleVdeusAddLiquidity(event: AddLiquidity): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)

  // Aggregate Snapshot into chunks
  updateVDeusPoolHourlySnapshot(snapshot)
  updateVDeusPoolDailySnapshot(snapshot)
}

export function handleVdeusRemoveLiquidity(event: RemoveLiquidity): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)

  // Aggregate Snapshot into chunks
  updateVDeusPoolHourlySnapshot(snapshot)
  updateVDeusPoolDailySnapshot(snapshot)
}
