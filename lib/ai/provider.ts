import "server-only";

import type {
  GenerateTripInput,
  GenerateTripOutput,
  ParseTripInput,
  ParseTripOutput,
  RegenerateTripInput,
  RegenerateTripOutput,
  RepairJsonInput,
} from "./types";

export interface LLMProvider {
  readonly providerName: string;

  parseTrip(input: ParseTripInput): Promise<ParseTripOutput>;

  generateTrip(input: GenerateTripInput): Promise<GenerateTripOutput>;

  regenerateTrip(input: RegenerateTripInput): Promise<RegenerateTripOutput>;

  repairJson<T>(input: RepairJsonInput<T>): Promise<T>;
}
