import {
  DelegateChanged as DelegateChangedEvent,
  ExtendedStakingDuration as ExtendedStakingDurationEvent,
  TokensStaked as TokensStakedEvent,
  TokensWithdrawn as TokensWithdrawnEvent,
  StakingWithdrawn as StakingWithdrawnEvent,
  DelegateStakeChanged as DelegateStakeChangedEvent,
} from '../../generated/Staking/Staking'
import { DEFAULT_DECIMALS, ZERO_ADDRESS, decimal } from '@protofire/subgraph-toolkit'
import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { createAndReturnTransaction } from '../entities/Transaction'
import { createAndReturnUser } from '../entities/User'
import { ADMIN_CONTRACTS, CHAIN, GENESIS_VESTING_END, GENESIS_VESTING_START, NETWORK } from '../constants'
import { StakeHistoryAction, VestingContractType, VestingHistoryActionItem } from '../types'
import { FeeSharingTokensTransferred, Transaction } from '../../generated/schema'
import { createAndReturnV2DelegateChanged, createAndReturnV2ExtendedStakingDuration, createAndReturnV2StakingWithdrawn, createAndReturnV2TokensStaked } from '../entities/V2Stake'
import { createOrUpdateStake, incrementDelegatedAmount, incrementVestingStakedAmount, removeStakeIfEmpty } from '../entities/Stake'
import { createAndReturnStakeHistoryItem } from '../entities/StakeHistoryItem'
import { VestingContract } from '../../generated/schema'
import { createAndReturnVestingContract, decrementVestingContractBalance, incrementVestingContractBalance } from '../entities/VestingContract'
import { createAndReturnVestingHistoryItem } from '../entities/VestingHistoryItem'
import { decrementUserStakeHistory, incrementUserStakeHistory } from '../entities/UserStakeHistory'

export function handleDelegateChanged(event: DelegateChangedEvent): void {
  createAndReturnTransaction(event)
  createAndReturnV2DelegateChanged(event)
  const delegator = event.params.delegator.toHexString()
  const fromDelegate = event.params.fromDelegate.toHexString()
  const toDelegate = event.params.toDelegate.toHexString()
  const isUserDelegated =
    fromDelegate != ZERO_ADDRESS && toDelegate != ZERO_ADDRESS && fromDelegate != toDelegate && delegator == event.transaction.from.toHexString()
  if (isUserDelegated) {
    createAndReturnUser(event.params.toDelegate, event.block.timestamp)
    incrementDelegatedAmount(fromDelegate, toDelegate, event.params.lockedUntil)
  }
  
  // on rsk testnet, one of the lockedUntil values is 1614429908000, which is too big for i32
  const lockedUntil = CHAIN == 'rsk' && NETWORK == 'testnet' && event.params.lockedUntil.toString() == '1614429908000' ? BigInt.fromString('1614429908') : event.params.lockedUntil

  createAndReturnStakeHistoryItem({
    event,
    user: delegator,
    action: StakeHistoryAction.Delegate,
    amount: BigDecimal.zero(),
    token: ZERO_ADDRESS,
    lockedUntil: lockedUntil,
    delegatee: toDelegate,
  })
}

export function handleDelegateStakeChanged(event: DelegateStakeChangedEvent): void {
  createAndReturnUser(event.params.delegate, event.block.timestamp)
  const stake = createOrUpdateStake(event)
  removeStakeIfEmpty(stake)
}

export function handleExtendedStakingDuration(event: ExtendedStakingDurationEvent): void {
  createAndReturnV2ExtendedStakingDuration(event)
  const staker = event.params.staker.toHexString()
  createAndReturnTransaction(event)
  createAndReturnStakeHistoryItem({
    event,
    user: staker,
    action: StakeHistoryAction.ExtendStake,
    amount: BigDecimal.zero(),
    token: ZERO_ADDRESS,
    lockedUntil: event.params.newDate,
    delegatee: ZERO_ADDRESS,
  })
}

export function handleTokensStaked(event: TokensStakedEvent): void {
  createAndReturnV2TokensStaked(event)
  createAndReturnTransaction(event)
  const amount = decimal.fromBigInt(event.params.amount, DEFAULT_DECIMALS)
  const totalStaked = decimal.fromBigInt(event.params.totalStaked, DEFAULT_DECIMALS)
  let vestingContract = VestingContract.load(event.params.staker.toHexString())
  /** Gensis Vesting contracts did not emit a VestingCreated event. Therefore, they need to be created from here. **/
  const isGenesisContract =
    vestingContract == null &&
    event.block.number <= GENESIS_VESTING_END &&
    event.block.number >= GENESIS_VESTING_START &&
    event.transaction.from.toHexString() != event.params.staker.toHexString()

  if (isGenesisContract) {
    vestingContract = createAndReturnVestingContract({
      vestingAddress: event.params.staker.toHexString(),
      user: event.transaction.from.toHexString(),
      cliff: BigInt.zero(),
      duration: BigInt.zero(),
      balance: amount,
      type: VestingContractType.Genesis,
      event: event,
    })
  }

  if (vestingContract != null) {
    createAndReturnVestingHistoryItem({
      staker: event.params.staker.toHexString(),
      action: VestingHistoryActionItem.TokensStaked,
      amount: amount,
      lockedUntil: event.params.lockedUntil,
      totalStaked: totalStaked,
      delegatee: null,
      event,
    })
    // incrementStakedByVesting(amount)
    if (!isGenesisContract) {
      incrementVestingContractBalance(vestingContract, amount)
    }
    incrementVestingStakedAmount(vestingContract.user, event.params.lockedUntil, amount)
  } else {
    const staker = event.params.staker.toHexString()
    createAndReturnUser(event.params.staker, event.block.timestamp)
    createAndReturnStakeHistoryItem({
      event,
      user: staker,
      action: event.params.amount < event.params.totalStaked ? StakeHistoryAction.IncreaseStake : StakeHistoryAction.Stake,
      amount: amount,
      token: ZERO_ADDRESS,
      lockedUntil: event.params.lockedUntil,
      delegatee: ZERO_ADDRESS,
    })
    incrementUserStakeHistory(event.params.staker, amount)
    // incrementVoluntarilyStaked(amount)
  }
}

export function handleTokensWithdrawn(event: TokensWithdrawnEvent): void {
  const transaction = createAndReturnTransaction(event)
  const amount = decimal.fromBigInt(event.params.amount, DEFAULT_DECIMALS)
  const id = event.transaction.hash.toHex() + event.logIndex.toHex()
  handleStakingOrTokensWithdrawn({
    id,
    transaction: transaction,
    stakingContract: event.address,
    staker: event.params.staker,
    receiver: event.params.receiver,
    lockedUntil: BigInt.zero(),
    totalStaked: BigDecimal.zero(),
    amount: amount,
    event: event,
  })
}

/** This is a copy of handleTokensWithdrawn. The event was renamed but params remained the same. */
export function handleStakingWithdrawn(event: StakingWithdrawnEvent): void {
  createAndReturnV2StakingWithdrawn(event)
  const transaction = createAndReturnTransaction(event)
  const amount = decimal.fromBigInt(event.params.amount, DEFAULT_DECIMALS)
  const id = event.transaction.hash.toHex() + event.logIndex.toHex()
  handleStakingOrTokensWithdrawn({
    id: id,
    transaction: transaction,
    stakingContract: event.address,
    staker: event.params.staker,
    receiver: event.params.receiver,
    amount: amount,
    lockedUntil: event.params.until,
    totalStaked: BigDecimal.zero(),
    event: event,
  })
}

class TokensWithdrawnParams {
  id: string
  transaction: Transaction
  stakingContract: Address
  staker: Address
  receiver: Address
  amount: BigDecimal
  lockedUntil: BigInt
  totalStaked: BigDecimal
  event: ethereum.Event
}

function handleStakingOrTokensWithdrawn(params: TokensWithdrawnParams): void {
  const vesting = VestingContract.load(params.staker.toHexString())

  if (vesting != null) {
    const isRevoked = ADMIN_CONTRACTS.includes(params.receiver.toHexString().toLowerCase()) && vesting.type == VestingContractType.Team
    createAndReturnVestingHistoryItem({
      staker: params.staker.toHexString(),
      action: isRevoked ? VestingHistoryActionItem.TeamTokensRevoked : VestingHistoryActionItem.TokensWithdrawn,
      amount: params.amount,
      lockedUntil: BigInt.zero(),
      totalStaked: BigDecimal.zero(),
      delegatee: null,
      event: params.event,
    })
    decrementVestingContractBalance(params.staker.toHexString(), params.amount)
    // decrementStakedByVesting(params.amount)

    return
  }

  const user = createAndReturnUser(params.staker, params.event.block.timestamp)

  if (user != null) {
    const slashingEvent = FeeSharingTokensTransferred.load(params.transaction.id)
    const slashedAmount = slashingEvent == null ? BigDecimal.zero() : slashingEvent.amount
    createAndReturnStakeHistoryItem({
      event: params.event,
      user: params.receiver.toHexString(),
      action: slashingEvent == null ? StakeHistoryAction.WithdrawStaked : StakeHistoryAction.Unstake,
      amount: params.amount,
      token: ZERO_ADDRESS,
      lockedUntil: BigInt.zero(),
      delegatee: ZERO_ADDRESS,
    })
    decrementUserStakeHistory(params.receiver, params.amount, slashedAmount)
    // decrementVoluntarilyStaked(params.amount.plus(slashedAmount))
  }
}
