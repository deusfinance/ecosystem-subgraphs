import {BigInt} from '@graphprotocol/graph-ts'

import {PLATFORM_ADDRESS} from '../constants'
import {Conducted as ConductedEvent, Liquidated as LiquidatedEvent} from '../generated/Conductor/Conductor'
import {
  Buy as BuyEvent,
  Sell as SellEvent,
  WithdrawFee as WithdrawFeeEvent,
} from '../generated/Synchronizer/Synchronizer'
import {
  RegistrarFeeAdded as RegistrarFeeAddedEvent,
  PlatformFeeAdded as PlatformFeeAddedEvent,
} from '../generated/PartnerManager/PartnerManager'

// templates
import {Transfer as TransferEvent} from '../generated/templates/Registrar/ERC20'
import {Registrar} from '../generated/templates'

import {
  conductRegistrar,
  liquidateRegistrar,
  withdrawFee,
  addPartnerFee,
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

export function handleRegistrarFeeAdded(event: RegistrarFeeAddedEvent): void {
  for (let i = 0; i < event.params.registrarType.length; i++) {
    addPartnerFee(event.params.owner, event.params.registrarType[i], event.params.partnerFee[i])
  }
}

export function handlePlatformFeeAdded(event: PlatformFeeAddedEvent): void {
  for (let i = 0; i < event.params.registrarType.length; i++) {
    addPartnerFee(PLATFORM_ADDRESS, event.params.registrarType[i], event.params.minPlatformFee[i])
  }
}

export function handleWithdrawFee(event: WithdrawFeeEvent): void {
  withdrawFee(event.params.partner, event.params.partnerFee, event.params.platformFee)
}

export function handleBuy(event: BuyEvent): void {
  const tx = createTransaction(
    event,
    'open',
    event.params.partnerId,
    event.params.recipient,
    event.params.registrar,
    event.params.amountIn,
    event.params.price,
    event.params.feeAmount
  )
  updateGlobalData(tx, event)
  createSnapshotOnTransaction(tx)
}

export function handleSell(event: SellEvent): void {
  const tx = createTransaction(
    event,
    'close',
    event.params.partnerId,
    event.params.recipient,
    event.params.registrar,
    event.params.amountIn,
    event.params.price,
    event.params.feeAmount
  )
  updateGlobalData(tx, event)
  createSnapshotOnTransaction(tx)
}

export function handleRegistrarTransfer(event: TransferEvent): void {
  createSnapshotOnTransfer(event, event.params.from, event.params.to)
}
