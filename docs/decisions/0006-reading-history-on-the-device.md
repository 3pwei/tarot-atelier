# ADR 0006: Keep the last ten readings on the device

- Status: Accepted
- Date: 2026-11-20

## Context

A finished round disappeared once the table was cleared, and a generated reading was only held in memory. The owner wanted people to look back at earlier readings, and later to share them (Phase 08).

## Decision

- **Recorded when the last card is opened.** A round enters the history the moment every position is drawn and every card, jumpers included, is revealed, with or without a reading. Generating a reading afterwards adds it to the same record, with the main question it answered; regenerating replaces it.
- **A round is recorded once.** A round is identified by its draws (`roundKeyOf`: each primary instance and the time it was drawn, since instance numbers can start over after clearing). Only a round finished on this table is recorded; a table restored already finished is not, so a record the person deleted stays deleted.
- **The newest ten, on this device only.** Older records are dropped as new ones arrive (`MAX_HISTORY_RECORDS`). There are no accounts or sync, so nothing leaves the device.
- **What a record keeps.** Time, deck, the template's name at the time, the main question, every position's number, question, place and rotation, each card and its orientation, and the reading if there is one. It is a copy, so editing or deleting a template never changes the history.
- **Read-only, but readable again.** A record opens to its cards and reading. 「產生解讀」 (no reading yet) or 「重新解讀」 reads it again with the questions and cards it was recorded with, through the same reading service and daily AI allowance as the table, and the new reading replaces the old one. The questions cannot be edited there. A reading keeps going while the list is shown; opening another record drops it. (Added 2026-11-20.)
- **Deleting.** A record can be deleted alone or with the whole history, each after a question asked inside the panel, so a second dialog never stacks on the first.
- **Versioned storage.** The history is stored under `tarot-atelier:reading-history` with its own `version` (1) and a migration registry. A malformed record is dropped and the rest kept. A stored reading the current reading format cannot read is left off its record rather than losing the round, so a future reading-format change needs a migration here to keep old readings.

## Consequences

- The table's toolbar gains 「歷史紀錄」, beside starting over. On wide screens the history is a drawer at the side of the table; on phones a sheet from the bottom.
- Small faces use the pre-rendered thumbnails, reversed cards turned over, so the history looks like the table and the library.
- Questions are stored on the device in the browser's local storage, like the current table already is.
