import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {BIG_DECIMAL_ZERO, BIG_INT_ONE, BIG_INT_ZERO, PLATFORM_ADDRESS, SYNCHRONIZER_ADDRESS} from 'const'
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
  const totalFee = tx.daoFee.plus(tx.partnerFee)
  const quoteAmount = getQuoteAmount(tx.amountIn, tx.amountOut, totalFee, tx.method)

  // synchronizer
  let synchronizer = getSynchronizer()
  synchronizer.totalVolumeDEI = synchronizer.totalVolumeDEI.plus(quoteAmount)
  synchronizer.txCount = synchronizer.txCount.plus(BIG_INT_ONE)
  synchronizer.daoFees = synchronizer.daoFees.plus(tx.daoFee)
  synchronizer.partnerFees = synchronizer.partnerFees.plus(tx.partnerFee)
  synchronizer.save()

  // registrar
  let registrar = Registrar.load(tx.registrar)
  if (registrar) {
    registrar.quoteVolume = registrar.quoteVolume.plus(quoteAmount)
    registrar.paidFees = registrar.paidFees.plus(totalFee)
    registrar.save()
  }

  // partner
  let partner = Partner.load(tx.partner)
  if (partner && registrar) {
    const volumeBreakdown = getRegistrarVolume(registrar.type, quoteAmount)
    partner.stockVolumeDEI = partner.stockVolumeDEI.plus(volumeBreakdown[0])
    partner.cryptoVolumeDEI = partner.cryptoVolumeDEI.plus(volumeBreakdown[1])
    partner.forexVolumeDEI = partner.forexVolumeDEI.plus(volumeBreakdown[2])
    partner.cumulativeFees = partner.cumulativeFees.plus(tx.partnerFee)
    partner.claimableFees = partner.claimableFees.plus(tx.partnerFee)
    partner.save()
  }

  // dao
  let dao = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (dao) {
    dao.cumulativeFees = dao.cumulativeFees.plus(tx.daoFee)
    dao.claimableFees = dao.claimableFees.plus(tx.daoFee)
    dao.save()
  }

  // daily synchronizer data
  let synchronizerDayData = getSynchronizerDayData(event)
  synchronizerDayData.volumeDEI = synchronizerDayData.volumeDEI.plus(quoteAmount)
  synchronizerDayData.txCount = synchronizerDayData.txCount.plus(BIG_INT_ONE)
  synchronizerDayData.save()

  // daily registrar data
  if (registrar) {
    let registrarDayData = getRegistrarDayData(registrar, event)
    registrarDayData.volumeDEI = registrarDayData.volumeDEI.plus(quoteAmount)
    registrarDayData.txCount = registrarDayData.txCount.plus(BIG_INT_ONE)
    registrarDayData.save()
  }
}

function getSynchronizerDayData(event: ethereum.Event): SynchronizerDayData {
  const timestamp = event.block.timestamp.toI32()
  const dayID = timestamp / 86400
  const dayStartTimestamp = dayID * 86400
  let synchronizerDayData = SynchronizerDayData.load(dayID.toString())

  if (synchronizerDayData === null) {
    synchronizerDayData = new SynchronizerDayData(dayID.toString())
    synchronizerDayData.date = dayStartTimestamp
    synchronizerDayData.synchronizer = SYNCHRONIZER_ADDRESS.toHexString()
    synchronizerDayData.volumeDEI = BIG_DECIMAL_ZERO
    synchronizerDayData.txCount = BIG_INT_ZERO
  }

  return synchronizerDayData as SynchronizerDayData
}

function getRegistrarDayData(registar: Registrar, event: ethereum.Event): RegistrarDayData {
  const timestamp = event.block.timestamp.toI32()
  const dayID = timestamp / 86400
  const dayStartTimestamp = dayID * 86400
  const dayPairID = registar.id.concat('-').concat(BigInt.fromI32(dayID).toHexString())

  let registrarDayData = RegistrarDayData.load(dayPairID)
  if (registrarDayData === null) {
    registrarDayData = new RegistrarDayData(dayPairID)
    registrarDayData.date = dayStartTimestamp
    registrarDayData.registrar = registar.id.toString()
    registrarDayData.volumeDEI = BIG_DECIMAL_ZERO
    registrarDayData.txCount = BIG_INT_ZERO
  }

  return registrarDayData as RegistrarDayData
}
