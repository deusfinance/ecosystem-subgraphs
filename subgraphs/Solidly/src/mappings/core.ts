import {BigInt, BigDecimal, store, Address} from '@graphprotocol/graph-ts'
import {ADDRESS_ZERO, BIG_DECIMAL_ZERO, BIG_INT_ONE, SCALE} from 'const'

import {Pair, Token, Transaction, Mint as MintEvent, Burn as BurnEvent, Swap as SwapEvent} from '../../generated/schema'
import {BaseV1Pair as PairContract, Mint, Burn, Swap, Transfer, Sync} from '../../generated/templates/Pair/BaseV1Pair'
import {updatePairDayData, updateTokenDayData, updateUniswapDayData, updatePairHourData} from './dayUpdates'

import {getFtmPriceInUSD, findFtmPerToken, getTrackedVolumeUSD, getTrackedLiquidityUSD} from '../pricing'
import {convertTokenToDecimal, createUser, createLiquidityPosition, createLiquiditySnapshot} from '../helpers'
import {getBundle, getFactory} from './factory'

function isCompleteMint(mintId: string): boolean {
  const mint = MintEvent.load(mintId)
  return mint ? mint.sender !== null : false
}

export function handleTransfer(event: Transfer): void {
  // ignore initial transfers prior to initial adds
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.amount.equals(BigInt.fromI32(1000))) return

  // get pair and load contract
  let pair = Pair.load(event.address.toHexString())
  if (!pair) return
  let pairContract = PairContract.bind(event.address)

  // user stats
  let from = event.params.from
  createUser(from)
  let to = event.params.to
  createUser(to)

  // liquidity token amount being transfered
  let value = convertTokenToDecimal(event.params.amount, SCALE)

  // get or create transaction
  let transactionHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(transactionHash)
  if (!transaction) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.burns = []
    transaction.swaps = []
  }

  // mints
  let mints = transaction.mints
  if (from.toHexString() == ADDRESS_ZERO) {
    // update total supply
    pair.totalSupply = pair.totalSupply.plus(value)
    pair.save()

    // create new mint if no mints so far or if last one is done already
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
      let mint = new MintEvent(
        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(mints.length).toString())
      )
      mint.transaction = transaction.id
      mint.pair = pair.id
      mint.to = to
      mint.liquidity = value
      mint.timestamp = transaction.timestamp
      mint.transaction = transaction.id
      mint.save()

      // update mints in transaction
      transaction.mints = mints.concat([mint.id])

      // save entities
      transaction.save()
    }
  }

  // case where direct send first on FTM withdrawals
  if (event.params.to.toHexString() == pair.id) {
    let burns = transaction.burns
    let burn = new BurnEvent(
      event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
    )
    burn.transaction = transaction.id
    burn.pair = pair.id
    burn.liquidity = value
    burn.timestamp = transaction.timestamp
    burn.to = event.params.to
    burn.sender = event.params.from
    burn.needsComplete = true
    burn.transaction = transaction.id
    burn.save()

    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    burns.push(burn.id)
    transaction.burns = burns
    transaction.save()
  }

  // burn
  if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.from.toHexString() == pair.id) {
    pair.totalSupply = pair.totalSupply.minus(value)
    pair.save()

    // this is a new instance of a logical burn
    let burns = transaction.burns
    let burn: BurnEvent
    if (burns.length > 0) {
      let currentBurn = BurnEvent.load(burns[burns.length - 1])
      if (currentBurn && currentBurn.needsComplete) {
        burn = currentBurn
      } else {
        burn = new BurnEvent(
          event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
        )
        burn.transaction = transaction.id
        burn.needsComplete = false
        burn.pair = pair.id
        burn.liquidity = value
        burn.transaction = transaction.id
        burn.timestamp = transaction.timestamp
      }
    } else {
      burn = new BurnEvent(
        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString())
      )
      burn.transaction = transaction.id
      burn.needsComplete = false
      burn.pair = pair.id
      burn.liquidity = value
      burn.transaction = transaction.id
      burn.timestamp = transaction.timestamp
    }

    // if this logical burn included a fee mint, account for this
    if (mints.length !== 0 && !isCompleteMint(mints[mints.length - 1])) {
      let mint = MintEvent.load(mints[mints.length - 1])
      if (mint) {
        burn.feeTo = mint.to
        burn.feeLiquidity = mint.liquidity
      }
      // remove the logical mint
      store.remove('Mint', mints[mints.length - 1])

      // TODO: Consider using .slice().pop() to protect against unintended
      // side effects for other code paths.
      mints.pop()
      transaction.mints = mints
      transaction.save()
    }
    burn.save()
    // if accessing last one, replace it
    if (burn.needsComplete) {
      // TODO: Consider using .slice(0, -1).concat() to protect against
      // unintended side effects for other code paths.
      burns[burns.length - 1] = burn.id
    }
    // else add new one
    else {
      // TODO: Consider using .concat() for handling array updates to protect
      // against unintended side effects for other code paths.
      burns.push(burn.id)
    }
    transaction.burns = burns
    transaction.save()
  }

  if (from.toHexString() != ADDRESS_ZERO && from.toHexString() != pair.id) {
    let fromUserLiquidityPosition = createLiquidityPosition(event.address, from)
    fromUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(pairContract.balanceOf(from), SCALE)
    fromUserLiquidityPosition.save()
    createLiquiditySnapshot(fromUserLiquidityPosition, event)
  }

  if (event.params.to.toHexString() != ADDRESS_ZERO && to.toHexString() != pair.id) {
    let toUserLiquidityPosition = createLiquidityPosition(event.address, to)
    toUserLiquidityPosition.liquidityTokenBalance = convertTokenToDecimal(pairContract.balanceOf(to), SCALE)
    toUserLiquidityPosition.save()
    createLiquiditySnapshot(toUserLiquidityPosition, event)
  }

  transaction.save()
}

export function handleSync(event: Sync): void {
  let pair = Pair.load(event.address.toHexString())
  if (!pair) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)

  let factory = getFactory()
  if (!token0 || !token1) return

  // reset factory liquidity by subtracting only tracked liquidity
  factory.totalLiquidityFTM = factory.totalLiquidityFTM.minus(pair.trackedReserveFTM)

  // reset token total liquidity amounts
  token0.totalLiquidity = token0.totalLiquidity.minus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.minus(pair.reserve1)

  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

  if (pair.reserve1.notEqual(BIG_DECIMAL_ZERO)) pair.token0Price = pair.reserve0.div(pair.reserve1)
  else pair.token0Price = BIG_DECIMAL_ZERO
  if (pair.reserve0.notEqual(BIG_DECIMAL_ZERO)) pair.token1Price = pair.reserve1.div(pair.reserve0)
  else pair.token1Price = BIG_DECIMAL_ZERO

  pair.save()

  // update FTM price now that reserves could have changed
  let bundle = getBundle()
  bundle.ftmPrice = getFtmPriceInUSD()
  bundle.save()

  token0.derivedFTM = findFtmPerToken(token0, pair.stable)
  token0.save()
  token1.derivedFTM = findFtmPerToken(token1, pair.stable)
  token1.save()

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityFTM: BigDecimal
  if (bundle.ftmPrice.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityFTM = getTrackedLiquidityUSD(pair.reserve0, token0, pair.reserve1, token1).div(bundle.ftmPrice)
  } else {
    trackedLiquidityFTM = BIG_DECIMAL_ZERO
  }

  // use derived amounts within pair
  pair.trackedReserveFTM = trackedLiquidityFTM
  pair.reserveFTM = pair.reserve0.times(token0.derivedFTM).plus(pair.reserve1.times(token1.derivedFTM))
  pair.reserveUSD = pair.reserveFTM.times(bundle.ftmPrice)

  // use tracked amounts globally
  factory.totalLiquidityFTM = factory.totalLiquidityFTM.plus(trackedLiquidityFTM)
  factory.totalLiquidityUSD = factory.totalLiquidityFTM.times(bundle.ftmPrice)

  // now correctly set liquidity amounts for each token
  token0.totalLiquidity = token0.totalLiquidity.plus(pair.reserve0)
  token1.totalLiquidity = token1.totalLiquidity.plus(pair.reserve1)

  // save entities
  pair.save()
  factory.save()
  token0.save()
  token1.save()
}

export function handleMint(event: Mint): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (!transaction) return

  let pair = Pair.load(event.address.toHexString())
  if (!pair) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (!token0 || !token1) return

  // update exchange info (except balances, sync will cover that)
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(BIG_INT_ONE)
  token1.txCount = token1.txCount.plus(BIG_INT_ONE)

  // get new amounts of USD and FTM for tracking
  let bundle = getBundle()
  let amountTotalUSD = token1.derivedFTM
    .times(token1Amount)
    .plus(token0.derivedFTM.times(token0Amount))
    .times(bundle.ftmPrice)

  // update txn counts
  let factory = getFactory()
  pair.txCount = pair.txCount.plus(BIG_INT_ONE)
  factory.txCount = factory.txCount.plus(BIG_INT_ONE)

  // save entities
  token0.save()
  token1.save()
  pair.save()
  factory.save()

  let mints = transaction.mints
  if (mints.length > 0) {
    let mint = MintEvent.load(mints[mints.length - 1])
    if (mint) {
      mint.sender = event.params.sender
      mint.amount0 = token0Amount
      mint.amount1 = token1Amount
      mint.logIndex = event.logIndex
      mint.amountUSD = amountTotalUSD
      mint.save()

      // update the LP position
      let liquidityPosition = createLiquidityPosition(event.address, changetype<Address>(mint.to))
      createLiquiditySnapshot(liquidityPosition, event)
    }
  }

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updateUniswapDayData(event)
  updateTokenDayData(token0, event)
  updateTokenDayData(token1, event)
}

export function handleBurn(event: Burn): void {
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (!transaction) return

  let pair = Pair.load(event.address.toHexString())
  if (!pair) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (!token0 || !token1) return

  //update token info
  let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
  let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

  // update txn counts
  token0.txCount = token0.txCount.plus(BIG_INT_ONE)
  token1.txCount = token1.txCount.plus(BIG_INT_ONE)

  // get new amounts of USD and FTM for tracking
  let bundle = getBundle()
  let amountTotalUSD = token1.derivedFTM
    .times(token1Amount)
    .plus(token0.derivedFTM.times(token0Amount))
    .times(bundle.ftmPrice)

  // update txn counts
  let factory = getFactory()
  factory.txCount = factory.txCount.plus(BIG_INT_ONE)
  pair.txCount = pair.txCount.plus(BIG_INT_ONE)

  // update global counter and save
  token0.save()
  token1.save()
  pair.save()
  factory.save()

  let burns = transaction.burns
  if (burns.length > 0) {
    let burn = BurnEvent.load(burns[burns.length - 1])
    if (burn) {
      burn.sender = event.params.sender
      burn.amount0 = token0Amount
      burn.amount1 = token1Amount
      burn.logIndex = event.logIndex
      burn.amountUSD = amountTotalUSD
      burn.save()

      // update the LP position
      let liquidityPosition = createLiquidityPosition(event.address, changetype<Address>(burn.sender))
      createLiquiditySnapshot(liquidityPosition, event)
    }
  }

  // update day entities
  updatePairDayData(event)
  updatePairHourData(event)
  updateUniswapDayData(event)
  updateTokenDayData(token0, event)
  updateTokenDayData(token1, event)
}

export function handleSwap(event: Swap): void {
  let pair = Pair.load(event.address.toHexString())
  if (!pair) return

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (!token0 || !token1) return

  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

  // totals for volume updates
  let amount0Total = amount0Out.plus(amount0In)
  let amount1Total = amount1Out.plus(amount1In)

  // FTM/USD prices
  let bundle = getBundle()

  // get total amounts of derived USD and FTM for tracking
  let derivedAmountFTM = token1.derivedFTM
    .times(amount1Total)
    .plus(token0.derivedFTM.times(amount0Total))
    .div(BigDecimal.fromString('2'))
  let derivedAmountUSD = derivedAmountFTM.times(bundle.ftmPrice)

  // only accounts for volume through white listed tokens
  let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0, amount1Total, token1, pair)

  let trackedAmountFTM: BigDecimal
  if (bundle.ftmPrice.equals(BIG_DECIMAL_ZERO)) {
    trackedAmountFTM = BIG_DECIMAL_ZERO
  } else {
    trackedAmountFTM = trackedAmountUSD.div(bundle.ftmPrice)
  }

  // update token0 global volume and token liquidity stats
  token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD)
  token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update token1 global volume and token liquidity stats
  token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD)
  token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD)

  // update txn counts
  token0.txCount = token0.txCount.plus(BIG_INT_ONE)
  token1.txCount = token1.txCount.plus(BIG_INT_ONE)

  // update pair volume data, use tracked amount if we have it as its probably more accurate
  pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD)
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
  pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD)
  pair.txCount = pair.txCount.plus(BIG_INT_ONE)
  pair.save()

  // update global values, only used tracked amounts for volume
  let factory = getFactory()
  factory.totalVolumeUSD = factory.totalVolumeUSD.plus(trackedAmountUSD)
  factory.totalVolumeFTM = factory.totalVolumeFTM.plus(trackedAmountFTM)
  factory.untrackedVolumeUSD = factory.untrackedVolumeUSD.plus(derivedAmountUSD)
  factory.txCount = factory.txCount.plus(BIG_INT_ONE)

  // save entities
  pair.save()
  token0.save()
  token1.save()
  factory.save()

  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.swaps = []
    transaction.burns = []
  }
  let swaps = transaction.swaps
  let swap = new SwapEvent(
    event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(swaps.length).toString())
  )

  // update swap event
  swap.transaction = transaction.id
  swap.pair = pair.id
  swap.timestamp = transaction.timestamp
  swap.transaction = transaction.id
  swap.sender = event.params.sender
  swap.amount0In = amount0In
  swap.amount1In = amount1In
  swap.amount0Out = amount0Out
  swap.amount1Out = amount1Out
  swap.to = event.params.to
  swap.from = event.transaction.from
  swap.logIndex = event.logIndex
  // use the tracked amount if we have it
  swap.amountUSD = trackedAmountUSD === BIG_DECIMAL_ZERO ? derivedAmountUSD : trackedAmountUSD
  swap.save()

  // update the transaction

  // TODO: Consider using .concat() for handling array updates to protect
  // against unintended side effects for other code paths.
  swaps.push(swap.id)
  transaction.swaps = swaps
  transaction.save()

  // update day entities
  let pairDayData = updatePairDayData(event)
  let pairHourData = updatePairHourData(event)
  let uniswapDayData = updateUniswapDayData(event)
  let token0DayData = updateTokenDayData(token0, event)
  let token1DayData = updateTokenDayData(token1, event)

  // swap specific updating
  uniswapDayData.dailyVolumeUSD = uniswapDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  uniswapDayData.dailyVolumeFTM = uniswapDayData.dailyVolumeFTM.plus(trackedAmountFTM)
  uniswapDayData.dailyVolumeUntracked = uniswapDayData.dailyVolumeUntracked.plus(derivedAmountUSD)
  uniswapDayData.save()

  // swap specific updating for pair
  pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total)
  pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total)
  pairDayData.dailyVolumeUSD = pairDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  pairDayData.save()

  // update hourly pair data
  pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total)
  pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total)
  pairHourData.hourlyVolumeUSD = pairHourData.hourlyVolumeUSD.plus(trackedAmountUSD)
  pairHourData.save()

  // swap specific updating for token0
  token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(amount0Total)
  token0DayData.dailyVolumeFTM = token0DayData.dailyVolumeFTM.plus(amount0Total.times(token0.derivedFTM))
  token0DayData.dailyVolumeUSD = token0DayData.dailyVolumeUSD.plus(
    amount0Total.times(token0.derivedFTM).times(bundle.ftmPrice)
  )
  token0DayData.save()

  // swap specific updating
  token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total)
  token1DayData.dailyVolumeFTM = token1DayData.dailyVolumeFTM.plus(amount1Total.times(token1.derivedFTM))
  token1DayData.dailyVolumeUSD = token1DayData.dailyVolumeUSD.plus(
    amount1Total.times(token1.derivedFTM).times(bundle.ftmPrice)
  )
  token1DayData.save()
}
