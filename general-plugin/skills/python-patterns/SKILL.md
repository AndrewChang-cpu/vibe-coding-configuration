---
name: python-patterns
description: Living Python patterns and project standards — Protocol, dataclasses, context managers, async/await, type hints, dependency injection, package organization. Consulted automatically by vibe:work for Python files. Update this file as codebase standards evolve.
---

# Python Patterns

> Living document. Start from these defaults and update as your codebase standards evolve.
> Referenced by: vibe:work (before implementing .py files), python-reviewer (as enforcement source of truth).

## Protocol (Duck Typing)

Use `Protocol` for structural subtyping — type safety without inheritance:

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...

class UserRepository:
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...

def process_entity(repo: Repository, id: str) -> None:
    entity = repo.find_by_id(id)
```

## Dataclasses as DTOs

```python
from dataclasses import dataclass, field

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
    tags: list[str] = field(default_factory=list)

@dataclass(frozen=True)
class User:
    """Immutable entity."""
    id: str
    name: str
    email: str
```

## Context Managers

```python
from contextlib import contextmanager
from typing import Generator

@contextmanager
def database_transaction(db) -> Generator[None, None, None]:
    try:
        yield
        db.commit()
    except Exception:
        db.rollback()
        raise
```

## Generators

```python
def read_large_file(filename: str):
    with open(filename, 'r') as f:
        for line in f:
            yield line.strip()

# Generator pipeline (lazy, memory-efficient)
numbers = (x for x in range(100))
evens = (x for x in numbers if x % 2 == 0)
squares = (x**2 for x in evens)
```

## Decorators

```python
from functools import wraps
import time

def timing(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.2f}s")
        return result
    return wrapper
```

## Async/Await

```python
import asyncio

async def fetch_user(user_id: str) -> dict:
    await asyncio.sleep(0.1)
    return {"id": user_id}

async def fetch_all(user_ids: list[str]) -> list[dict]:
    return await asyncio.gather(*[fetch_user(uid) for uid in user_ids])
```

```python
class AsyncDatabase:
    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
```

## Type Hints

```python
from typing import TypeVar, Generic

T = TypeVar('T')

class Repository(Generic[T]):
    def find_by_id(self, id: str) -> T | None: ...

# Union types (Python 3.10+)
def process(value: str | int | None) -> str:
    match value:
        case str():   return value.upper()
        case int():   return str(value)
        case None:    return "empty"
```

## Dependency Injection

```python
class UserService:
    def __init__(
        self,
        repository: Repository,
        logger: Logger,
        cache: Cache | None = None,
    ):
        self.repository = repository
        self.logger = logger
        self.cache = cache
```

## Package Organization

```
project/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── domain/          # Business logic
│       ├── services/        # Application services
│       └── infrastructure/  # External dependencies
├── tests/
│   ├── unit/
│   └── integration/
└── pyproject.toml
```

```python
# __init__.py — explicit exports
from .models import User, Product
from .services import UserService

__all__ = ['User', 'Product', 'UserService']
```

## Error Handling

```python
class DomainError(Exception):
    pass

class UserNotFoundError(DomainError):
    def __init__(self, user_id: str):
        self.user_id = user_id
        super().__init__(f"User {user_id} not found")

class ValidationError(DomainError):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(f"{field}: {message}")
```

## Property Decorators

```python
class User:
    def __init__(self, name: str):
        self._name = name
        self._email: str | None = None

    @property
    def name(self) -> str:
        return self._name

    @property
    def email(self) -> str | None:
        return self._email

    @email.setter
    def email(self, value: str) -> None:
        if '@' not in value:
            raise ValueError("Invalid email")
        self._email = value
```

## Functional Patterns

```python
from functools import reduce

def pipe(*functions):
    def inner(arg):
        return reduce(lambda x, f: f(x), functions, arg)
    return inner

process = pipe(str.strip, str.lower, lambda s: s.replace(' ', '_'))
result = process("  Hello World  ")  # "hello_world"
```

## Key Rules (enforce these)

- Always use type annotations on public functions
- Prefer `frozen=True` dataclasses for value objects
- Use `Protocol` instead of ABC for duck-typed interfaces
- Never use mutable default arguments — use `field(default_factory=...)`
- Use `is None` / `is not None`, never `== None`
- Use `logging` not `print` in non-script code
- Use `str | None` union syntax (Python 3.10+) not `Optional[str]`
- Keep functions small and single-purpose — one thing, at one level of abstraction
- Limit to ≤3 parameters; wrap related args into a dataclass/argument object
- No flag arguments — split `f(..., flag: bool)` into two named functions
- Don't return `None` as a sentinel that forces caller null-checks — return an empty collection, a value object, or raise
