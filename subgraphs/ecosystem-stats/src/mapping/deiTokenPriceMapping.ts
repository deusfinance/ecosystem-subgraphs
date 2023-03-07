import {Swap} from '../../generated/Vault/Vault'
import {
  createDeiTokenPriceSnapshot,
  updateDailyDEITokenPriceSnapshot,
  updateHourlyDEITokenPriceSnapshot,
  updateLatestDeiTokenPriceSnapshot,
} from '../entities'

const ANOTHER_DOLLAR_ANOTHER_DEI_POOL_ID = '0x4e415957aa4fd703ad701e43ee5335d1d7891d8300020000000000000000053b'

export function handleSwapEvent(event: Swap): void {
  //createUserEntity(event.transaction.from);
  const poolId = event.params.poolId

  if (poolId.toHexString() != ANOTHER_DOLLAR_ANOTHER_DEI_POOL_ID) return

  // Create a Snapshot
  const snapshot = createDeiTokenPriceSnapshot(event)

  // Update Latest entity
  updateLatestDeiTokenPriceSnapshot(snapshot)

  // Aggregate Snapshot into chunks
  updateHourlyDEITokenPriceSnapshot(snapshot)
  updateDailyDEITokenPriceSnapshot(snapshot)
}
