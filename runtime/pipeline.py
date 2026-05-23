"""
Declarative Pipeline Engine (Python Runtime)

Pure functional composition primitives for immutable data transformations.
All operations are referentially transparent with no side effects.

Complexity: pipe/compose are O(n) where n = number of stages.
Memory: each stage produces a new immutable value; no in-place mutation.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import reduce
from typing import Any, Callable, Generic, List, Optional, Tuple, TypeVar

A = TypeVar("A")
B = TypeVar("B")
C = TypeVar("C")
T = TypeVar("T")


@dataclass(frozen=True)
class Result(Generic[T]):
    """Discriminated union: either success with value or failure with error."""

    ok: bool
    value: Optional[T]
    error: Optional[str]

    @staticmethod
    def succeed(value: T) -> "Result[T]":
        return Result(ok=True, value=value, error=None)

    @staticmethod
    def fail(error: str) -> "Result[Any]":
        return Result(ok=False, value=None, error=error)


def compose(f: Callable[[A], B], g: Callable[[B], C]) -> Callable[[A], C]:
    """Compose two transforms left-to-right: f then g."""

    def composed(x: A) -> C:
        return g(f(x))

    return composed


def pipe(initial: T, *stages: Callable[[T], T]) -> T:
    """Pipe a value through an ordered sequence of transforms. O(n) sequential."""
    return reduce(lambda acc, stage: stage(acc), stages, initial)


def lift(transform: Callable[[A], B]) -> Callable[[Result[A]], Result[B]]:
    """Lift a pure function into a Result chain."""

    def lifted(result: Result[A]) -> Result[B]:
        if not result.ok:
            return Result.fail(result.error or "unknown error")
        try:
            return Result.succeed(transform(result.value))  # type: ignore[arg-type]
        except Exception as exc:
            return Result.fail(str(exc))

    return lifted


def guard(predicate: Callable[[T], bool], error_message: str) -> Callable[[Result[T]], Result[T]]:
    """Guard: validate a value against a predicate, short-circuit on failure."""

    def guarded(result: Result[T]) -> Result[T]:
        if not result.ok:
            return result
        if not predicate(result.value):  # type: ignore[arg-type]
            return Result.fail(error_message)
        return result

    return guarded


def chain(initial: Result[T], *stages: Callable[[Result[T]], Result[T]]) -> Result[T]:
    """Chain multiple result-aware transforms."""
    return reduce(lambda acc, stage: stage(acc), stages, initial)


def map_immutable(items: List[A], transform: Callable[[A], B]) -> List[B]:
    """Map over a list with a pure transform. Returns new list."""
    return [transform(item) for item in items]


def filter_immutable(items: List[A], predicate: Callable[[A], bool]) -> List[A]:
    """Filter a list with a predicate. Returns new list."""
    return [item for item in items if predicate(item)]


def partition(items: List[A], predicate: Callable[[A], bool]) -> Tuple[List[A], List[A]]:
    """Partition a list into (matches, non_matches)."""
    matches: List[A] = []
    non_matches: List[A] = []
    for item in items:
        (matches if predicate(item) else non_matches).append(item)
    return (matches, non_matches)


def fold(items: List[A], initial: B, reducer: Callable[[B, A], B]) -> B:
    """Aggregate/reduce a list to a single value."""
    return reduce(reducer, items, initial)
