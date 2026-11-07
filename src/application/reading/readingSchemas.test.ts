import { describe, expect, it } from "vitest";
import {
  readingRequestIdSchema,
  readingRequestSchema,
  readingResultSchema,
} from "@/application/reading/readingSchemas";
import {
  REQUEST_ID,
  resultFor,
  validRequest,
} from "@/application/reading/testing/readingDoubles";
import { READING_TONES } from "@/domain/reading/types";

const accepts = (value: unknown) =>
  readingRequestSchema.safeParse(value).success;

describe("readingRequestSchema", () => {
  it("accepts a request built from the domain", () => {
    expect(accepts(validRequest)).toBe(true);
  });

  it.each(READING_TONES)("accepts the %s tone", (tone) => {
    expect(accepts({ ...validRequest, tone })).toBe(true);
  });

  it.each([
    ["an unknown tone", { ...validRequest, tone: "sarcastic" }],
    ["another schema version", { ...validRequest, schemaVersion: "2.0.0" }],
    ["no positions", { ...validRequest, positions: [] }],
    ["an extra field", { ...validRequest, apiKey: "secret" }],
    [
      "a blank question",
      {
        ...validRequest,
        positions: [{ ...validRequest.positions[0], question: "  " }],
      },
    ],
    [
      "positions out of order",
      { ...validRequest, positions: [...validRequest.positions].reverse() },
    ],
    [
      "an empty card ID",
      {
        ...validRequest,
        positions: [
          {
            ...validRequest.positions[0],
            primary: { id: "", orientation: "upright" },
          },
        ],
      },
    ],
    [
      "a coordinate off the table",
      {
        ...validRequest,
        positions: [{ ...validRequest.positions[0], x: 1.5 }],
      },
    ],
    [
      "more than twelve positions",
      {
        ...validRequest,
        positions: Array.from({ length: 13 }, (_, i) => ({
          ...validRequest.positions[0],
          index: i + 1,
        })),
      },
    ],
  ])("refuses %s", (_, value) => {
    expect(accepts(value)).toBe(false);
  });
});

describe("readingResultSchema", () => {
  it("accepts a well-formed result", () => {
    expect(readingResultSchema.safeParse(resultFor(validRequest)).success).toBe(
      true,
    );
  });

  it("refuses runaway text and missing sections", () => {
    const result = resultFor(validRequest);
    expect(
      readingResultSchema.safeParse({
        ...result,
        synthesis: "字".repeat(2_001),
      }).success,
    ).toBe(false);
    expect(
      readingResultSchema.safeParse({ ...result, reflectionQuestions: [] })
        .success,
    ).toBe(false);
  });
});

describe("readingRequestIdSchema", () => {
  it("accepts a UUID and refuses anything else", () => {
    expect(readingRequestIdSchema.safeParse(REQUEST_ID).success).toBe(true);
    expect(readingRequestIdSchema.safeParse("retry-1").success).toBe(false);
  });
});
