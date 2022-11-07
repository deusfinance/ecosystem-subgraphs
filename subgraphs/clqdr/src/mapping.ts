import {Transfer} from '../generated/cLQDR/PerpetualEscrowToken'
import {createSnapshot, updateHourlySnapshot} from './entities'
import {updateLatest} from './entities/latest'

export function handleTransfer(event: Transfer): void {
  // Create a Snapshot
  const snapshot = createSnapshot(event)

  // Update Latest entity
  updateLatest(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlySnapshot(snapshot)
}
