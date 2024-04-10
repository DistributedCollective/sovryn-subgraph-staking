import { VestingCreated as VestingCreatedProxyEvent, TeamVestingCreated as TeamVestingCreatedProxyEvent } from '../../generated/VestingRegistryProxy/VestingProxy'
import { VestingContract as VestingContractTemplate } from '../../generated/templates'
import { VestingContract as VestingLogic } from '../../generated/templates/VestingContract/VestingContract'
import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'

import { DEFAULT_DECIMALS, decimal } from '@protofire/subgraph-toolkit'
import { VestingContract } from '../../generated/schema'
import { createAndReturnUser } from '../entities/User'
import { createAndReturnTransaction } from '../entities/Transaction'
import { VestingContractType } from '../types'

export function handleTeamVestingCreatedProxy(event: TeamVestingCreatedProxyEvent): void {
  const existingContract = VestingContract.load(event.params.vesting.toHexString())
  if (existingContract == null) {
    VestingContractTemplate.create(Address.fromString(event.params.vesting.toHexString()))
    log.info('Team VestingContract_proxy created: {}', [event.params.vesting.toHexString()])
    const entity = new VestingContract(event.params.vesting.toHexString())
    const user = createAndReturnUser(event.params.tokenOwner, event.block.timestamp)
    entity.user = user.id
    entity.cliff = event.params.cliff.toI32()
    entity.duration = event.params.duration.toI32()
    entity.startingBalance = decimal.fromBigInt(event.params.amount, DEFAULT_DECIMALS)
    entity.currentBalance = BigDecimal.zero()
    const transaction = createAndReturnTransaction(event)
    entity.createdAtTransaction = transaction.id
    entity.createdAtTimestamp = transaction.timestamp
    entity.emittedBy = event.address
    entity.type = VestingContractType.Team

    const contract = VestingLogic.bind(event.params.vesting)
    const token = contract.try_SOV()
    const staking = contract.try_staking()

    if (!token.reverted) {
      entity.token = token.value
    }

    if (!staking.reverted) {
      entity.staking = staking.value
    }

    entity.save()
  }
}

export function handleVestingCreatedProxy(event: VestingCreatedProxyEvent): void {
  const existingContract = VestingContract.load(event.params.vesting.toHexString())
  if (existingContract == null) {
    VestingContractTemplate.create(Address.fromString(event.params.vesting.toHexString()))
    log.info('VestingContract created: {}', [event.params.vesting.toHexString()])
    const entity = new VestingContract(event.params.vesting.toHexString())
    const user = createAndReturnUser(event.params.tokenOwner, event.block.timestamp)
    entity.user = user.id
    entity.cliff = event.params.cliff.toI32()
    entity.duration = event.params.duration.toI32()
    entity.startingBalance = decimal.fromBigInt(event.params.amount, DEFAULT_DECIMALS)
    entity.currentBalance = BigDecimal.zero()
    const transaction = createAndReturnTransaction(event)
    entity.createdAtTransaction = transaction.id
    entity.createdAtTimestamp = transaction.timestamp
    entity.emittedBy = event.address
    entity.type = VestingContractType.Rewards

    const contract = VestingLogic.bind(event.params.vesting)
    const token = contract.try_SOV()
    const staking = contract.try_staking()

    if (!token.reverted) {
      entity.token = token.value
    }

    if (!staking.reverted) {
      entity.staking = staking.value
    }

    entity.save()
  }
}
