import {
  Approval as ApprovalEvent,
  Transfer as TransferEvent
} from "../../generated/ERC20/ERC20";
import { Approval, Transfer } from "../../generated/schema";

import { createAndReturnTransaction } from "../entities/Transaction";

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.spender = event.params.spender;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let transaction = createAndReturnTransaction(event);
  entity.transaction = transaction.id;
  entity.timestamp = event.block.timestamp;
  entity.emittedBy = event.address;
  entity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let transaction = createAndReturnTransaction(event);
  entity.transaction = transaction.id;
  entity.timestamp = event.block.timestamp;
  entity.emittedBy = event.address;
  entity.save();
}
