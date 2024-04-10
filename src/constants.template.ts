import { BigInt } from '@graphprotocol/graph-ts'
import { stringToArray } from './helpers';

export const NETWORK = '{{network}}';
export const CHAIN = '{{chain}}';

export const GENESIS_VESTING_START = BigInt.fromString('{{blocks.genesisVestingBlocks.start}}')
export const GENESIS_VESTING_END = BigInt.fromString('{{blocks.genesisVestingBlocks.end}}')

export const ADMIN_CONTRACTS = stringToArray('{{adminContracts}}')
