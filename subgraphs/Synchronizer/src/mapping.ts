import {Conducted as ConductedEvent, Liquidated as LiquidatedEvent} from '../generated/Conductor/Conductor'
import {
  Buy as BuyEvent,
  Sell as SellEvent,
  WithdrawFee as WithdrawFeeEvent,
} from '../generated/Synchronizer/Synchronizer'
import {PartnerAdded as PartnerAddedEvent} from '../generated/PartnerManager/PartnerManager'

// templates
import {Transfer as TransferEvent} from '../generated/templates/Registrar/ERC20'
import {Registrar} from '../generated/templates'

import {
  conductRegistrar,
  liquidateRegistrar,
  withdrawFee,
  createPartner,
  createTransaction,
  updateGlobalData,
  createSnapshotOnTransaction,
  createSnapshotOnTransfer,
} from './entities'

export function handleConduct(event: ConductedEvent): void {
  conductRegistrar(event.params._id, event.params.short, event.params.long)
  Registrar.create(event.params.short)
  Registrar.create(event.params.long)
}

export function handleLiquidate(event: LiquidatedEvent): void {
  liquidateRegistrar(event.params.liquidatedRegistrar, event.params.newRegistrar)
  Registrar.create(event.params.newRegistrar)
}

export function handlePartnerAdded(event: PartnerAddedEvent): void {
  createPartner(event.address, event.params.owner, event.params.partnerFee)
}

// TODO: 'event.params.platform' is a typo in ISynchronizer, it should be the msg.sender
export function handleWithdrawFee(event: WithdrawFeeEvent): void {
  withdrawFee(event.params.platform, event.params.partnerFee, event.params.platformFee)
}

export function handleBuy(event: BuyEvent): void {
  const tx = createTransaction(
    event,
    'open',
    event.params.partnerId,
    event.params.receipient,
    event.params.registrar,
    event.params.amountIn,
    event.params.price,
    event.params.feeAmount
  )
  updateGlobalData(tx)
  createSnapshotOnTransaction(tx)
}

export function handleSell(event: SellEvent): void {
  const tx = createTransaction(
    event,
    'close',
    event.params.partnerId,
    event.params.receipient,
    event.params.registrar,
    event.params.amountIn,
    event.params.price,
    event.params.feeAmount
  )
  updateGlobalData(tx)
  createSnapshotOnTransaction(tx)
}

export function handleRegistrarTransfer(event: TransferEvent): void {
  createSnapshotOnTransfer(event, event.params.from, event.params.to)
}
