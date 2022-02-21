import {BigDecimal} from '@graphprotocol/graph-ts'
import {BIG_INT_ONE, PLATFORM_ADDRESS, SYNCHRONIZER_ADDRESS} from 'const'
import {Registrar, Transaction, Synchronizer, Partner} from '../../generated/schema'

export function getSynchronizer(): Synchronizer {
  const synchronizerId = SYNCHRONIZER_ADDRESS.toHexString()
  let synchronizer = Synchronizer.load(synchronizerId)
  if (!synchronizer) {
    synchronizer = new Synchronizer(synchronizerId)
  }
  return synchronizer
}

export function updateGlobalData(tx: Transaction): void {
  const totalFee = tx.daoFee.plus(tx.partnerFee)
  const quoteAmount = getQuoteAmount(tx.amountIn, tx.amountOut, totalFee, tx.method)

  let synchronizer = getSynchronizer()
  synchronizer.totalVolumeDEI = synchronizer.totalVolumeDEI.plus(quoteAmount)
  synchronizer.txCount = synchronizer.txCount.plus(BIG_INT_ONE)
  synchronizer.daoFees = synchronizer.daoFees.plus(tx.daoFee)
  synchronizer.partnerFees = synchronizer.partnerFees.plus(tx.partnerFee)
  synchronizer.save()

  let registrar = Registrar.load(tx.registrar)
  if (registrar) {
    registrar.quoteVolume = registrar.quoteVolume.plus(quoteAmount)
    registrar.paidFees = registrar.paidFees.plus(totalFee)
    registrar.save()
  }

  let partner = Partner.load(tx.partner)
  if (partner) {
    partner.cumulativeFees = partner.cumulativeFees.plus(tx.partnerFee)
    partner.claimableFees = partner.claimableFees.plus(tx.partnerFee)
    partner.save()
  }

  let dao = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (dao) {
    dao.cumulativeFees = dao.cumulativeFees.plus(tx.daoFee)
    dao.claimableFees = dao.claimableFees.plus(tx.daoFee)
    dao.save()
  }
}

function getQuoteAmount(amountIn: BigDecimal, amountOut: BigDecimal, totalFee: BigDecimal, method: string): BigDecimal {
  return method == 'open' ? amountIn : amountOut.plus(totalFee)
}
