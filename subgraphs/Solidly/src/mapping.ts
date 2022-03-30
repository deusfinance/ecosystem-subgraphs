import {PairCreated} from '../generated/Solidly/BaseV1Factory'
import {createPair} from './entities'

export function handlePairCreated(event: PairCreated): void {
  createPair(event.params.pair, event.params.token0, event.params.token1, event.params.stable, event)

  // TODO: this is for templating
  // Registrar.create(event.params.short)
  // Registrar.create(event.params.long)
}
