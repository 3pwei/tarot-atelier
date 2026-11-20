# ADR 0007: Share a round as an image and text made on the device

- Status: Accepted
- Date: 2026-11-20

## Context

After the reading history (ADR 0006), the owner wanted people to share a round with others. Options were an image and text made on the device, a link carrying the round in its address, or a short link stored on a server.

## Decision

- **Made on the device, no server.** A 4:5 image (1080×1350) is painted on a canvas with the deck's own pre-rendered faces, and plain text is written beside it. Nothing about the round is sent to this site, so the privacy rules stay as they are, and the same code serves a future iOS or Android app.
- **The system share sheet first.** Where the Web Share API can carry files, 「分享圖卡」 opens it with the image and the text. Everywhere else the image is downloaded. 「複製文字」 copies the text alone. All of this sits behind the `Sharer` port (`BrowserSharer` in the browser), so a native app can plug in its own.
- **Questions are shown by default and can be hidden.** 「隱藏我寫的問題」 removes the main question and every position's question, the reading's copies of them included (`shareableRecord`), and paints a new image before anything is shared. Reading text an AI wrote can still echo a question in its own words; that is the reading, not a copy of the question.
- **The image keeps the reading short.** It shows the cards (jumpers tucked over their main card, reversed cards turned over), their names, the position questions and a summary of the whole reading cut at the last full sentence within 100 characters. The text carries the whole synthesis. Both always end with 「僅供娛樂與自我反思」 and the site's address.
- **Where to share from.** The table's reading panel, once every card is open, shares the table as it is, with its reading only if the reading still matches the cards and questions. A record in the history shares inside the history panel, so a second dialog never stacks on the first.

## Consequences

- The share image depends on the pre-rendered thumbnails (`pnpm thumbnails`); a deck without them gets plain kraft faces with the card's name.
- The site's address in the shared content is read from the page, so a DEV preview points to itself and production to games.milespapa.com.
