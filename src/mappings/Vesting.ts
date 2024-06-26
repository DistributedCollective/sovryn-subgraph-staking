import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { VotesDelegated as VotesDelegatedEvent } from '../../generated/templates/VestingContract/VestingContract'
import { ZERO_ADDRESS } from '@protofire/subgraph-toolkit'
import { VestingContract } from '../../generated/schema'
import { createAndReturnUser } from '../entities/User'
import { createAndReturnStakeHistoryItem } from '../entities/StakeHistoryItem'
import { StakeHistoryAction, VestingHistoryActionItem } from '../types'
import { createAndReturnVestingHistoryItem } from '../entities/VestingHistoryItem'

export function handleVotesDelegated(event: VotesDelegatedEvent): void {
  const vesting = VestingContract.load(event.address.toHexString())
  if (vesting != null) {
    vesting.delegate = createAndReturnUser(event.params.delegatee, event.block.timestamp).id
    vesting.save()

    createAndReturnVestingHistoryItem({
      staker: event.address.toHexString(),
      action: VestingHistoryActionItem.DelegateChanged,
      amount: BigDecimal.zero(),
      lockedUntil: BigInt.zero(),
      totalStaked: BigDecimal.zero(),
      delegatee: event.params.delegatee.toHexString(),
      event,
    })

    createAndReturnStakeHistoryItem({
      user: vesting.user,
      action: StakeHistoryAction.DelegateVested,
      amount: BigDecimal.zero(),
      token: ZERO_ADDRESS,
      lockedUntil: BigInt.zero(),
      delegatee: event.params.delegatee.toHexString(),
      event,
    })
  }
}
