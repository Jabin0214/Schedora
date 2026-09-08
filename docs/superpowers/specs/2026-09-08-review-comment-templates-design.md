# Review Comment Templates Design

## Goal

Add a fixed, copy-ready Review Comments section to the existing Templates page. It will sit alongside the current report-description templates without changing their selection, management, or data model.

## Page structure

The page continues to start with the existing inspection-type selector and `General 整体描述` card. Below it, a new `Review Comments` section displays three scenario cards in this order:

1. `租金上涨 & 续签固定租期` — rent increase and fixed-term renewal.
2. `转为周期性租约` — transition to periodic tenancy.
3. `租金保持不变` — no rent increase / rent hold.

Each card contains a Chinese title, a short Chinese explanation of when to use the wording, an English template with editable placeholders shown as bracketed text, an English example, and a Copy button.

## Copy behaviour

Each card's Copy button writes only its English template to the clipboard. It does not copy the Chinese explanation or example. Success and failure feedback reuse the page's existing messages.

## Data and scope

The three cards and their text are front-end constants for this first release. No API, database migration, or manager changes are needed. Future work can replace these constants with user-managed template records without affecting the current report-description template system.

## Error handling and verification

The section renders after existing template data has loaded, so it follows the page's current loading and error states. Verify that the original report-description flow still works, all three cards are visible in order, and each Copy button places precisely its template text on the clipboard.
