import {AddLiquidity, RemoveLiquidity, TokenSwap} from '../generated/Factory/SwapFlashLoan'
import {updateLatestBDeiPool} from './entities/BDeiPoolLatestSnapshot'
import {createBDeiPoolSnapshot} from './entities/BDeiPoolSnapshot'
import {updateLatestVdeusPool} from './entities/VDeusPoolLatestSnapshot'
import {createVdeusPoolSnapshot} from './entities/VDeusPoolSnapshot'

export function handleVdeusTokenSwap(event: TokenSwap): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)

  // // Aggregate Snapshot into chunks
  // updateHourlySnapshot(snapshot)
  // updateDailySnapshot(snapshot)
}

export function handleVdeusAddLiquidity(event: AddLiquidity): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)
}

export function handleVdeusRemoveLiquidity(event: RemoveLiquidity): void {
  // Create a Snapshot
  const snapshot = createVdeusPoolSnapshot(event)

  // Update Latest entity
  updateLatestVdeusPool(snapshot)
}

export function handleBDeiTokenSwap(event: TokenSwap): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)

  // // Aggregate Snapshot into chunks
  // updateHourlySnapshot(snapshot)
  // updateDailySnapshot(snapshot)
}

export function handleBDeiAddLiquidity(event: AddLiquidity): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)
}

export function handleBDeiRemoveLiquidity(event: RemoveLiquidity): void {
  // Create a Snapshot
  const snapshot = createBDeiPoolSnapshot(event)

  // Update Latest entity
  updateLatestBDeiPool(snapshot)
}
