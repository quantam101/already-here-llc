import type {
  AiActionInput,
  ContactInput,
  DashboardSnapshot,
  LeadInput,
  LeadRecord,
  OpportunityInput,
  OpportunityRecord,
  OrganizationInput,
  OwnedRecord,
  ReviewActionInput,
} from "./contracts";

export interface QueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  rows: Row[];
  rowCount: number;
}

export interface SqlExecutor {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  transaction<T>(work: (executor: SqlExecutor) => Promise<T>): Promise<T>;
}

export interface OwnedDataRepository {
  createOrganization(input: OrganizationInput): Promise<OwnedRecord>;
  createContact(input: ContactInput): Promise<OwnedRecord>;
  createLead(input: LeadInput): Promise<LeadRecord>;
  createOpportunity(input: OpportunityInput): Promise<OpportunityRecord>;
  createAiAction(input: AiActionInput): Promise<OwnedRecord>;
  recordReviewAction(input: ReviewActionInput): Promise<OwnedRecord>;
  getLead(id: string): Promise<LeadRecord | null>;
  listReviewQueue(limit?: number): Promise<Array<Record<string, unknown>>>;
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
}

export class OwnedDataConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnedDataConfigurationError";
  }
}

export class OwnedDataConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnedDataConflictError";
  }
}

export class OwnedDataNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnedDataNotFoundError";
  }
}
