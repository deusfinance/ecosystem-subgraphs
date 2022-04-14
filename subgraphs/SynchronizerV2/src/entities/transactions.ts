import {Address, BigInt, BigDecimal, ethereum} from '@graphprotocol/graph-ts'

import {Synchronizer as ISynchronizer} from '../../generated/Synchronizer/Synchronizer'
import {Partner, Registrar, Transaction} from '../../generated/schema'
import {BIG_DECIMAL_ZERO, SCALE} from 'const'
import {convertAmountToDecimal, getAction, getPartnerFee} from '../helpers'
import {PLATFORM_ADDRESS, SYNCHRONIZER_ADDRESS} from '../../constants'

export function createTransaction(
  event: ethereum.Event,
  method: string,
  partnerId: Address,
  recipient: Address,
  registrar: Address,
  amountIn: BigInt,
  price: BigInt,
  feeAmount: BigInt
): Transaction {
  const id = event.transaction.hash.toHexString()

  const tx = new Transaction(id)
  tx.timestamp = event.block.timestamp
  tx.block = event.block.number
  tx.method = method
  tx.from = event.transaction.from
  tx.to = recipient
  tx.registrar = registrar.toHexString()
  tx.price = convertAmountToDecimal(price, SCALE)
  tx.amountIn = convertAmountToDecimal(amountIn, SCALE)
  tx.amountOut = getAmountOut(partnerId, registrar, amountIn, price, method)

  const partnerInstance = Partner.load(partnerId.toHexString())
  const platformInstance = Partner.load(PLATFORM_ADDRESS.toHexString())
  const registrarInstance = Registrar.load(registrar.toHexString())

  const platformFee =
    platformInstance && registrarInstance ? getPartnerFee(platformInstance, registrarInstance.type) : BIG_DECIMAL_ZERO
  const partnerFee =
    partnerInstance && registrarInstance ? getPartnerFee(partnerInstance, registrarInstance.type) : BIG_DECIMAL_ZERO
  const feeAmountBD = convertAmountToDecimal(feeAmount, SCALE)

  tx.partner = partnerId.toHexString()
  tx.platformFee = getFeeShare(feeAmountBD, platformFee, partnerFee)
  tx.partnerFee = getFeeShare(feeAmountBD, partnerFee, platformFee)
  tx.save()

  return tx as Transaction
}

function getFeeShare(feeAmount: BigDecimal, fee: BigDecimal, feeSibling: BigDecimal): BigDecimal {
  const totalFee = fee.plus(feeSibling)
  if (fee.equals(BIG_DECIMAL_ZERO) || totalFee.equals(BIG_DECIMAL_ZERO)) return BIG_DECIMAL_ZERO
  return fee.div(totalFee).times(feeAmount)
}

function getAmountOut(
  partnerId: Address,
  registrar: Address,
  amountIn: BigInt,
  price: BigInt,
  method: string
): BigDecimal {
  const contract = ISynchronizer.bind(SYNCHRONIZER_ADDRESS)
  const result = contract.getAmountOut(partnerId, registrar, amountIn, price, getAction(method))
  return convertAmountToDecimal(result, SCALE)
}
