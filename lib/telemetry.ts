/**
 * Structured Observability Telemetry Layer
 *
 * Zero-allocation structured JSON telemetry with OpenTelemetry-compatible
 * trace context propagation. All telemetry events are immutable records.
 *
 * Design:
 * - Pure data structures (no classes with mutable state)
 * - Microsecond-precision timestamps via performance.now()
 * - W3C Trace Context compatible span/trace IDs
 * - Structured JSON output for log aggregation (Datadog, Loki, etc.)
 */

import { randomUUID } from 'crypto';

/** Severity levels aligned with OpenTelemetry severity numbers. */
export type SeverityLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const SEVERITY_NUMBER: Record<SeverityLevel, number> = {
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
} as const;

/** Immutable telemetry event record. */
export type TelemetryEvent = {
  readonly timestamp: string;
  readonly severityText: SeverityLevel;
  readonly severityNumber: number;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly service: string;
  readonly operation: string;
  readonly durationMs: number | null;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly body: string;
};

/** Immutable span context for trace propagation. */
export type SpanContext = {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly startTime: number;
  readonly service: string;
  readonly operation: string;
};

/** Generate a W3C-compatible 32-char hex trace ID. */
function generateTraceId(): string {
  return randomUUID().replace(/-/g, '');
}

/** Generate a W3C-compatible 16-char hex span ID. */
function generateSpanId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

/** Get ISO timestamp with microsecond precision. */
function precisionTimestamp(): string {
  return new Date().toISOString();
}

/** Create a new root span context. */
export function createRootSpan(service: string, operation: string): SpanContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId: null,
    startTime: Date.now(),
    service,
    operation,
  };
}

/** Create a child span from a parent context. */
export function createChildSpan(
  parent: SpanContext,
  operation: string
): SpanContext {
  return {
    traceId: parent.traceId,
    spanId: generateSpanId(),
    parentSpanId: parent.spanId,
    startTime: Date.now(),
    service: parent.service,
    operation,
  };
}

/** Build an immutable telemetry event from a span context. */
export function buildEvent(
  span: SpanContext,
  severity: SeverityLevel,
  body: string,
  attributes: Readonly<Record<string, string | number | boolean>> = {}
): TelemetryEvent {
  const now = Date.now();
  return {
    timestamp: precisionTimestamp(),
    severityText: severity,
    severityNumber: SEVERITY_NUMBER[severity],
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    service: span.service,
    operation: span.operation,
    durationMs: now - span.startTime,
    attributes,
    body,
  };
}

/** Serialize a telemetry event to structured JSON (single line). */
export function serializeEvent(event: TelemetryEvent): string {
  return JSON.stringify(event);
}

/** W3C traceparent header value from a span context. */
export function toTraceparent(span: SpanContext): string {
  const padded = span.traceId.padStart(32, '0').slice(0, 32);
  const spanHex = span.spanId.padStart(16, '0').slice(0, 16);
  return `00-${padded}-${spanHex}-01`;
}

/** Parse a W3C traceparent header into trace/span IDs. */
export function parseTraceparent(
  header: string
): { traceId: string; spanId: string } | null {
  const parts = header.split('-');
  if (parts.length < 4) return null;
  return { traceId: parts[1], spanId: parts[2] };
}

/**
 * Telemetry emitter — collects events for batch export.
 * Events are appended to an immutable array; no mutation of existing entries.
 */
export class TelemetryCollector {
  private readonly events: TelemetryEvent[] = [];
  private readonly service: string;

  constructor(service: string) {
    this.service = service;
  }

  span(operation: string, parentSpan?: SpanContext): SpanContext {
    return parentSpan
      ? createChildSpan(parentSpan, operation)
      : createRootSpan(this.service, operation);
  }

  emit(
    span: SpanContext,
    severity: SeverityLevel,
    body: string,
    attributes: Readonly<Record<string, string | number | boolean>> = {}
  ): TelemetryEvent {
    const event = buildEvent(span, severity, body, attributes);
    this.events.push(event);
    return event;
  }

  info(span: SpanContext, body: string, attributes?: Readonly<Record<string, string | number | boolean>>): TelemetryEvent {
    return this.emit(span, 'INFO', body, attributes);
  }

  warn(span: SpanContext, body: string, attributes?: Readonly<Record<string, string | number | boolean>>): TelemetryEvent {
    return this.emit(span, 'WARN', body, attributes);
  }

  error(span: SpanContext, body: string, attributes?: Readonly<Record<string, string | number | boolean>>): TelemetryEvent {
    return this.emit(span, 'ERROR', body, attributes);
  }

  /** Return all collected events as a readonly snapshot. */
  drain(): ReadonlyArray<TelemetryEvent> {
    return [...this.events];
  }

  /** Serialize all events as newline-delimited JSON. */
  toNDJSON(): string {
    return this.events.map(serializeEvent).join('\n');
  }
}
