import {Address, BigInt} from '@graphprotocol/graph-ts'
import {SCALE, BIG_INT_ZERO, BIG_INT_ONE, BIG_INT_TWO, BIG_DECIMAL_ZERO, BIG_INT_THREE, BIG_INT_FOUR} from 'const'

import {PLATFORM_ADDRESS} from '../../constants'
import {PartnerManager as IPartnerManager} from '../../generated/PartnerManager/PartnerManager'
import {Partner} from '../../generated/schema'
import {convertAmountToDecimal} from '../helpers'

export function addPartnerFee(partnerId: Address, registrarType: BigInt, partnerFee: BigInt): void {
  let partner = Partner.load(partnerId.toHexString())
  if (!partner) {
    partner = new Partner(partnerId.toHexString())

    partner.stockFee = BIG_DECIMAL_ZERO
    partner.cryptoFee = BIG_DECIMAL_ZERO
    partner.forexFee = BIG_DECIMAL_ZERO
    partner.commodityFee = BIG_DECIMAL_ZERO
    partner.miscFee = BIG_DECIMAL_ZERO

    partner.stockVolumeDEI = BIG_DECIMAL_ZERO
    partner.cryptoVolumeDEI = BIG_DECIMAL_ZERO
    partner.forexVolumeDEI = BIG_DECIMAL_ZERO
    partner.commodityVolumeDEI = BIG_DECIMAL_ZERO
    partner.miscVolumeDEI = BIG_DECIMAL_ZERO

    partner.cumulativeFees = BIG_DECIMAL_ZERO
    partner.claimableFees = BIG_DECIMAL_ZERO
  }

  if (registrarType.equals(BIG_INT_ZERO)) {
    partner.stockFee = convertAmountToDecimal(partnerFee, SCALE)
  }
  if (registrarType.equals(BIG_INT_ONE)) {
    partner.cryptoFee = convertAmountToDecimal(partnerFee, SCALE)
  }
  if (registrarType.equals(BIG_INT_TWO)) {
    partner.forexFee = convertAmountToDecimal(partnerFee, SCALE)
  }
  if (registrarType.equals(BIG_INT_THREE)) {
    partner.commodityFee = convertAmountToDecimal(partnerFee, SCALE)
  }
  if (registrarType.equals(BIG_INT_FOUR)) {
    partner.miscFee = convertAmountToDecimal(partnerFee, SCALE)
  }

  partner.save()

  // The platformFee isn't emitted at the constructor, hence we do it now.
  // Trading isn't possible without setting the first partner, ever. Hence
  // why we can assert platformFee *will* exist upon the first trade.
  const platform = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (!platform) addInitialPlatformFee()
}

function addInitialPlatformFee(): void {
  addPartnerFee(PLATFORM_ADDRESS, BIG_INT_ZERO, getPlatformStockFee(PLATFORM_ADDRESS))
  addPartnerFee(PLATFORM_ADDRESS, BIG_INT_ONE, getPlatformCryptoFee(PLATFORM_ADDRESS))
  addPartnerFee(PLATFORM_ADDRESS, BIG_INT_TWO, getPlatformForexFee(PLATFORM_ADDRESS))
  addPartnerFee(PLATFORM_ADDRESS, BIG_INT_THREE, getPlatformCommodityFee(PLATFORM_ADDRESS))
  addPartnerFee(PLATFORM_ADDRESS, BIG_INT_FOUR, getPlatformMiscFee(PLATFORM_ADDRESS))
}

export function withdrawFee(partnerId: Address, partnerFeeAmount: BigInt, platformFeeAmount: BigInt): void {
  let partner = Partner.load(partnerId.toHexString())
  if (partner) {
    partner.claimableFees = partner.claimableFees.minus(convertAmountToDecimal(partnerFeeAmount, SCALE))
    partner.save()
  }

  let platform = Partner.load(PLATFORM_ADDRESS.toHexString())
  if (platform) {
    platform.claimableFees = platform.claimableFees.minus(convertAmountToDecimal(platformFeeAmount, SCALE))
    platform.save()
  }
}

function getPlatformStockFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  const result = contract.try_minPlatformFee(BIG_INT_ZERO)
  return result.reverted ? BIG_INT_ZERO : result.value
}

function getPlatformCryptoFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  const result = contract.try_minPlatformFee(BIG_INT_ONE)
  return result.reverted ? BIG_INT_ZERO : result.value
}

function getPlatformForexFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  const result = contract.try_minPlatformFee(BIG_INT_TWO)
  return result.reverted ? BIG_INT_ZERO : result.value
}

function getPlatformCommodityFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  const result = contract.try_minPlatformFee(BIG_INT_THREE)
  return result.reverted ? BIG_INT_ZERO : result.value
}

function getPlatformMiscFee(manager: Address): BigInt {
  const contract = IPartnerManager.bind(manager)
  const result = contract.try_minPlatformFee(BIG_INT_FOUR)
  return result.reverted ? BIG_INT_ZERO : result.value
}
