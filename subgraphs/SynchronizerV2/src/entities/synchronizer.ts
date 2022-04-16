import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO} from 'const'

import {PLATFORM_ADDRESS, SYNCHRONIZER_ADDRESS} from '../../constants'
import {
  Registrar,
  Transaction,
  Synchronizer,
  Partner,
  SynchronizerDayData,
  RegistrarDayData,
} from '../../generated/schema'
import {getQuoteAmount, getRegistrarVolume} from '../helpers'

export function getSynchronizer(): Synchronizer {
  const synchronizerId = SYNCHRONIZER_ADDRESS.toHexString()
  let synchronizer = Synchronizer.load(synchronizerId)
  if (!synchronizer) {
    synchronizer = new Synchronizer(synchronizerId)
  }
  return synchronizer
}

export function updateGlobalData(tx: Transaction, event: ethereum.Event): void {
  const totalFee = tx.platformFee.plus(tx.partnerFee)
  const quoteAmount = getQuoteAmount(tx.amountIn, tx.amountOut, totalFee, tx.method)

  // registrar
  let registrar = Registrar.load(tx.registrar)
  if (registrar) {
    registrar.quoteVolume = registrar.quoteVolume.plus(quoteAmount)
    registrar.paidFees = registrar.paidFees.plus(totalFee)
    registrar.save()
  }

  // synchronizer
  let synchronizer = getSynchronizer()
  synchronizer.totalVolumeDEI = synchronizer.totalVolumeDEI.plus(quoteAmount)
  synchronizer.txCount = synchronizer.txCount.plus(BIG_INT_ONE)
  synchronizer.platformFees = synchronizer.platformFees.plus(tx.platformFee)
  synchronizer.partnerFees = synchronizer.partnerFees.plus(tx.partnerFee)
  if (registrar) {
    const volumeBreakdown = getRegistrarVolume(registrar.type, quoteAmount)
    synchronizer.stockVolumeDEI = synchronizer.stockVolumeDEI.plus(volumeBreakdown[0])
    synchronizer.cryptoVolumeDEI = synchronizer.cryptoVolumeDEI.plus(volumeBreakdown[1])
    synchronizer.forexVolumeDEI = synchronizer.forexVolumeDEI.plus(volumeBreakdown[2])
    synchronizer.commodityVolumeDEI = synchronizer.commodityVolumeDEI.plus(volumeBreakdown[3])
    synchronizer.miscVolumeDEI = synchronizer.miscVolumeDEI.plus(volumeBreakdown[4])
  }
  synchronizer.save()

  // partner
  let partner = Partner.load(tx.partner)
  if (partner && registrar) {
    const volumeBreakdown = getRegistrarVolume(registrar.type, quoteAmount)

    partner.stockVolumeDEI = partner.stockVolumeDEI.plus(volumeBreakdown[0])
    partner.cryptoVolumeDEI = partner.cryptoVolumeDEI.plus(volumeBreakdown[1])
    partner.forexVolumeDEI = partner.forexVolumeDEI.plus(volumeBreakdown[2])
    partner.commodityVolumeDEI = partner.commodityVolumeDEI.plus(volumeBreakdown[3])
    partner.miscVolumeDEI = partner.miscVolumeDEI.plus(volumeBreakdown[4])

    partner.cumulativeFees = partner.cumulativeFees.plus(tx.partnerFee)
    partner.claimableFees = partner.claimableFees.plus(tx.partnerFee)
    partner.save()
  }

  // platform
  let platform = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (platform) {
    // We don't have to update the volume because it's recorded in the Synchronizer
    platform.cumulativeFees = platform.cumulativeFees.plus(tx.platformFee)
    platform.claimableFees = platform.claimableFees.plus(tx.platformFee)
    platform.save()
  }

  // daily synchronizer data
  let synchronizerDayData = getSynchronizerDayData(event)
  synchronizerDayData.volumeDEI = synchronizerDayData.volumeDEI.plus(quoteAmount)
  synchronizerDayData.totalVolumeDEI = synchronizer.totalVolumeDEI
  synchronizerDayData.txCount = synchronizerDayData.txCount.plus(BIG_INT_ONE)
  synchronizerDayData.totalTxCount = synchronizer.txCount

  synchronizerDayData.platformFees = synchronizerDayData.platformFees.plus(tx.platformFee)
  synchronizerDayData.partnerFees = synchronizerDayData.partnerFees.plus(tx.partnerFee)
  synchronizerDayData.save()

  // daily registrar data
  if (registrar) {
    let registrarDayData = getRegistrarDayData(registrar, event)
    registrarDayData.volumeDEI = registrarDayData.volumeDEI.plus(quoteAmount)
    registrarDayData.totalVolumeDEI = registrar.quoteVolume
    registrarDayData.txCount = registrarDayData.txCount.plus(BIG_INT_ONE)
    registrarDayData.platformFees = registrarDayData.platformFees.plus(tx.platformFee)
    registrarDayData.partnerFees = registrarDayData.partnerFees.plus(tx.partnerFee)
    registrarDayData.save()
  }
}

function getSynchronizerDayData(event: ethereum.Event): SynchronizerDayData {
  const timestamp = event.block.timestamp.toI32()
  const dayID = timestamp / 86400
  const dayStartTimestamp = dayID * 86400
  let synchronizerDayData = SynchronizerDayData.load(dayID.toString())

  if (!synchronizerDayData) {
    synchronizerDayData = new SynchronizerDayData(dayID.toString())
    synchronizerDayData.date = dayStartTimestamp
    synchronizerDayData.synchronizer = SYNCHRONIZER_ADDRESS.toHexString()
    synchronizerDayData.volumeDEI = BIG_DECIMAL_ZERO
    synchronizerDayData.txCount = BIG_INT_ZERO
    synchronizerDayData.platformFees = BIG_DECIMAL_ZERO
    synchronizerDayData.partnerFees = BIG_DECIMAL_ZERO
  }

  return synchronizerDayData as SynchronizerDayData
}

function getRegistrarDayData(registar: Registrar, event: ethereum.Event): RegistrarDayData {
  const timestamp = event.block.timestamp.toI32()
  const dayID = timestamp / 86400
  const dayStartTimestamp = dayID * 86400
  const dayPairID = registar.id.concat('-').concat(BigInt.fromI32(dayID).toHexString())

  let registrarDayData = RegistrarDayData.load(dayPairID)
  if (!registrarDayData) {
    registrarDayData = new RegistrarDayData(dayPairID)
    registrarDayData.date = dayStartTimestamp
    registrarDayData.registrar = registar.id.toString()
    registrarDayData.volumeDEI = BIG_DECIMAL_ZERO
    registrarDayData.txCount = BIG_INT_ZERO
    registrarDayData.platformFees = BIG_DECIMAL_ZERO
    registrarDayData.partnerFees = BIG_DECIMAL_ZERO
  }

  return registrarDayData as RegistrarDayData
}
