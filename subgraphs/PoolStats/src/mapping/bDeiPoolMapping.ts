import {AddLiquidity, RemoveLiquidity, TokenSwap} from '../../generated/bDeiPoolFactory/SwapFlashLoan'
import {
  createBDeiPoolSnapshot,
  updateBDeiPoolDailySnapshot,
  updateBDeiPoolHourlySnapshot,
  updateLatestBDeiPool,
} from '../entities'

export function handleBDeiTokenSwap(event: TokenSwap): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)

  // Aggregate Snapshot into chunks
  updateBDeiPoolHourlySnapshot(snapshot)
  updateBDeiPoolDailySnapshot(snapshot)
}

export function handleBDeiAddLiquidity(event: AddLiquidity): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)

  // Aggregate Snapshot into chunks
  updateBDeiPoolHourlySnapshot(snapshot)
  updateBDeiPoolDailySnapshot(snapshot)
}

export function handleBDeiRemoveLiquidity(event: RemoveLiquidity): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)

  // Aggregate Snapshot into chunks
  updateBDeiPoolHourlySnapshot(snapshot)
  updateBDeiPoolDailySnapshot(snapshot)
}
