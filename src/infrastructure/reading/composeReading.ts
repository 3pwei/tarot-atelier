import type { Deck } from "@/domain/deck/deck";
import type { TarotSuit } from "@/domain/deck/types";
import {
  detectPositionRole,
  type PositionRole,
} from "@/domain/reading/positionRole";
import {
  detectQuestionTopic,
  type QuestionTopic,
} from "@/domain/reading/questionTopic";
import { detectSensitiveTopics } from "@/domain/reading/readingSafety";
import {
  READING_SCHEMA_VERSION,
  type CardReading,
  type ReadingCardRef,
  type ReadingPositionRequest,
  type ReadingRequest,
  type ReadingResult,
} from "@/domain/reading/types";
import {
  readCard,
  symbolismOf,
  type CardSources,
  type ReadCard,
} from "@/infrastructure/reading/cardContent";
import {
  fillTemplate,
  type DeckReadingContent,
  type ReadingPhrases,
} from "@/infrastructure/reading/content/readingContent";

/** At most this many reflection questions and suggestions per reading. */
export const MAX_REFLECTIONS = 3;
export const MAX_SUGGESTIONS = 3;

/** FNV-1a: a small, stable hash, so the same request reads the same way. */
function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

type Pick = <T>(options: readonly T[], slot: string) => T;

function pickerFor(request: ReadingRequest): Pick {
  const seed = JSON.stringify(request);
  return (options, slot) => {
    const choice = options[hashText(`${seed}|${slot}`) % options.length];
    if (choice === undefined) throw new Error(`No options for ${slot}`);
    return choice;
  };
}

interface Composer extends CardSources {
  readonly mainQuestion: string | undefined;
  /** Absent for questions that need a professional rather than a topic line. */
  readonly topic: QuestionTopic | undefined;
  readonly pick: Pick;
}

/** Positions that look ahead read better with an angle that suggests action. */
const ACTION_ROLES: ReadonlySet<PositionRole> = new Set(["advice", "future"]);

/**
 * The angles that suit a position: descriptive ones for the past, the present
 * and the people involved; action-oriented ones for advice and what comes next.
 */
function suitedAngles(
  angles: readonly string[],
  role: PositionRole,
  actionPrefixes: readonly string[],
): readonly string[] {
  const wantsAction = ACTION_ROLES.has(role);
  return angles.filter(
    (angle) =>
      actionPrefixes.some((prefix) => angle.startsWith(prefix)) === wantsAction,
  );
}

/** Like `suitedAngles`, but falls back to every angle when none fits. */
function anglesForRole(
  angles: readonly string[],
  role: PositionRole,
  actionPrefixes: readonly string[],
): readonly string[] {
  const suited = suitedAngles(angles, role, actionPrefixes);
  return suited.length > 0 ? suited : angles;
}

/**
 * How a card relates to the main question: the position's link to it, one
 * more of the card's angles applied to it, and a line for its topic.
 */
function mainQuestionSentences(
  composer: Composer,
  slot: string,
  roleName: PositionRole,
  linkAngles: readonly string[],
  mainQuestion: string,
): readonly string[] {
  const { phrases, pick } = composer;
  const anchor = fillTemplate(
    pick(phrases.roles[roleName].anchors, `${slot}:anchor`),
    { mainQuestion },
  );
  const cardLink =
    linkAngles.length > 0
      ? [
          fillTemplate(pick(phrases.cardLink, `${slot}:link`), {
            angle: pick(linkAngles, `${slot}:linkAngle`),
          }),
        ]
      : [];
  const topicLine = composer.topic
    ? [phrases.topics[composer.topic][roleName]]
    : [];
  return [anchor, ...cardLink, ...topicLine];
}

/**
 * One paragraph per card: what the card means, what it means in this
 * position, and how that relates to the main question. The position's
 * question itself is never quoted back.
 */
function primaryReading(
  composer: Composer,
  position: ReadingPositionRequest,
  read: ReadCard,
): CardReading {
  const slot = `p${position.index}`;
  const { phrases } = composer;
  // Without a written core, the first angle is the theme and the position
  // sentence uses another one, so the two sentences never repeat.
  const [theme = read.entry.symbolism, ...otherAngles] = read.entry.angles;
  const core =
    read.entry.core ??
    fillTemplate(composer.pick(phrases.minorCore, `${slot}:core`), {
      card: read.card.name.zhHant,
      orientation: phrases.orientationLabels[read.mode],
      theme,
    });
  const roleName = detectPositionRole(position.question);
  const role = phrases.roles[roleName];
  const positionAngles = anglesForRole(
    read.entry.core || otherAngles.length === 0
      ? read.entry.angles
      : otherAngles,
    roleName,
    phrases.actionAnglePrefixes,
  );
  const positionAngle = composer.pick(positionAngles, `${slot}:angle`);
  // The extra angle is optional, so an unsuited one is left out, not forced in.
  const linkAngles = suitedAngles(
    read.entry.angles.filter(
      (angle) =>
        angle !== positionAngle &&
        (read.entry.core !== undefined || angle !== theme),
    ),
    roleName,
    phrases.actionAnglePrefixes,
  );
  const sentences = [
    core,
    fillTemplate(role.position, { angle: positionAngle }),
    ...(composer.mainQuestion
      ? mainQuestionSentences(
          composer,
          slot,
          roleName,
          linkAngles,
          composer.mainQuestion,
        )
      : []),
  ];
  return {
    cardId: read.card.id,
    cardName: read.card.name.zhHant,
    orientation: position.primary.orientation,
    meaningMode: read.mode,
    symbolism: symbolismOf(composer.phrases, read),
    interpretation: sentences.join(""),
  };
}

function jumperReading(
  composer: Composer,
  position: ReadingPositionRequest,
  ref: ReadingCardRef,
  read: ReadCard,
): CardReading {
  const slot = `p${position.index}:jumper`;
  return {
    cardId: read.card.id,
    cardName: read.card.name.zhHant,
    orientation: ref.orientation,
    meaningMode: read.mode,
    symbolism: symbolismOf(composer.phrases, read),
    interpretation: fillTemplate(composer.pick(composer.phrases.jumper, slot), {
      jumper: read.card.name.zhHant,
      jumperOrientation: composer.phrases.orientationLabels[read.mode],
      jumperAngle: composer.pick(read.entry.angles, `${slot}:angle`),
    }),
  };
}

/** The suit that clearly leads among minor cards, if any. */
function leadingSuit(cards: readonly ReadCard[]): TarotSuit | undefined {
  const counts = new Map<TarotSuit, number>();
  for (const { card } of cards) {
    if (card.category === "minor" && card.suit) {
      counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [first, second] = ranked;
  if (!first || first[1] < 2) return undefined;
  return second && second[1] === first[1] ? undefined : first[0];
}

function synthesisOf(
  composer: Composer,
  request: ReadingRequest,
  primaries: readonly ReadCard[],
): string {
  const { synthesis } = composer.phrases;
  const count = primaries.length;
  const sentences = [
    request.mainQuestion
      ? fillTemplate(synthesis.openingWithMain, {
          mainQuestion: request.mainQuestion,
          count,
        })
      : fillTemplate(synthesis.openingPlain, { count }),
  ];

  if (count === 1) {
    sentences.push(synthesis.single);
  } else {
    const majorCount = primaries.filter(
      (read) => read.card.category === "major",
    ).length;
    const reversedCount = primaries.filter(
      (read) => read.mode === "reversed",
    ).length;
    const suit = leadingSuit(primaries);
    const patterns: string[] = [];
    if (majorCount >= 2 && majorCount * 2 >= count) {
      patterns.push(fillTemplate(synthesis.majorHeavy, { majorCount }));
    }
    if (suit) {
      patterns.push(
        fillTemplate(synthesis.suitLead, {
          suit: composer.phrases.suitNames[suit],
          suitTheme: composer.phrases.suitThemes[suit],
        }),
      );
    }
    if (reversedCount * 2 > count) patterns.push(synthesis.reversedHeavy);
    sentences.push(...(patterns.length > 0 ? patterns : [synthesis.balanced]));
  }

  if (request.positions.some((position) => position.jumper)) {
    sentences.push(synthesis.jumperPresent);
  }
  return sentences.join("");
}

function firstUnique(
  texts: readonly string[],
  limit: number,
): readonly string[] {
  return [...new Set(texts)].slice(0, limit);
}

/**
 * Composes a reading from pre-written content. Pure and deterministic: the
 * same request, deck and content always give the same reading.
 */
export function composeReading(
  request: ReadingRequest,
  deck: Deck,
  content: DeckReadingContent | undefined,
  phrases: ReadingPhrases,
): ReadingResult {
  const sensitiveTopics = detectSensitiveTopics([
    request.mainQuestion ?? "",
    ...request.positions.map((position) => position.question),
  ]);
  const composer: Composer = {
    deck,
    content,
    phrases,
    mainQuestion: request.mainQuestion,
    topic:
      request.mainQuestion && sensitiveTopics.length === 0
        ? detectQuestionTopic(request.mainQuestion)
        : undefined,
    pick: pickerFor(request),
  };

  const reads = request.positions.map((position) => ({
    position,
    primary: readCard(composer, position.primary),
  }));
  const primaries = reads.map((read) => read.primary);
  const positions = reads.map(({ position, primary }) => {
    return {
      index: position.index,
      question: position.question,
      primary: primaryReading(composer, position, primary),
      ...(position.jumper
        ? {
            jumper: jumperReading(
              composer,
              position,
              position.jumper,
              readCard(composer, position.jumper),
            ),
          }
        : {}),
    };
  });

  return {
    schemaVersion: READING_SCHEMA_VERSION,
    deckId: request.deckId,
    source: "prewritten",
    positions,
    synthesis: synthesisOf(composer, request, primaries),
    reflectionQuestions: firstUnique(
      primaries.map((read) => read.entry.reflection),
      MAX_REFLECTIONS,
    ),
    suggestions: firstUnique(
      primaries.map((read) => read.entry.suggestion),
      MAX_SUGGESTIONS,
    ),
    sensitiveTopics,
  };
}
