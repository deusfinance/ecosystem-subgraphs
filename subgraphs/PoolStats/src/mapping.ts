import {AddLiquidity, RemoveLiquidity, TokenSwap} from '../generated/Factory/SwapFlashLoan'
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
