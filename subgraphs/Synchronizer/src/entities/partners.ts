import {Address, BigDecimal, BigInt} from '@graphprotocol/graph-ts'
import {BIG_INT_ZERO, BIG_INT_ONE, BIG_INT_TWO, PLATFORM_ADDRESS, SCALE} from 'const'
import {PartnerManager as IPartnerManager} from '../../generated/PartnerManager/PartnerManager'
import {Partner} from '../../generated/schema'
import {convertAmountToDecimal} from '../helpers'

export function createPartner(manager: Address, partnerId: Address, partnerFee: BigInt[]): void {
  let partner = new Partner(partnerId.toHexString())
  partner.stockFee = convertAmountToDecimal(partnerFee[0], SCALE)
  partner.cryptoFee = convertAmountToDecimal(partnerFee[1], SCALE)
  partner.forexFee = convertAmountToDecimal(partnerFee[2], SCALE)
  partner.save()

  let dao = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (!dao) {
    dao = new Partner(PLATFORM_ADDRESS.toHexString())
    dao.stockFee = convertAmountToDecimal(getPlatformStockFee(manager), SCALE)
    dao.cryptoFee = convertAmountToDecimal(getPlatformCryptoFee(manager), SCALE)
    dao.forexFee = convertAmountToDecimal(getPlatformForexFee(manager), SCALE)
    dao.save()
  }
}

export function withdrawFee(partnerId: Address, partnerFee: BigInt, platformFee: BigInt): void {
  let partner = Partner.load(partnerId.toHexString())
  if (partner) {
    partner.claimableFees = partner.claimableFees.minus(convertAmountToDecimal(partnerFee, SCALE))
    partner.save()
  }

  let dao = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (dao) {
    dao.claimableFees = dao.claimableFees.minus(convertAmountToDecimal(platformFee, SCALE))
    dao.save()
  }
}

function getPlatformStockFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  return contract.platformFee(BIG_INT_ZERO)
}

function getPlatformCryptoFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  return contract.platformFee(BIG_INT_ONE)
}

function getPlatformForexFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  return contract.platformFee(BIG_INT_TWO)
}
