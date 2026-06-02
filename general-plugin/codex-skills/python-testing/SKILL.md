---
name: python-testing
description: Living Python testing patterns — pytest fixtures, parametrize, mocking, coverage, async testing, conftest structure. Consulted automatically by test-driven-development and add-tests skills for Python projects. Update as codebase-specific conventions emerge.
---

# Python Testing

> Living document. Start from these defaults and update as your codebase testing conventions evolve.
> Referenced by: test-driven-development skill (RED phase), add-tests skill.

## Framework

Use **pytest**. All tests follow `test_*.py` / `*_test.py` naming.

## Fixtures

```python
import pytest

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = Session(bind=engine)
    yield session
    session.close()

def test_user_repo(db_session):
    repo = UserRepository(db_session)
    user = repo.create(name="Alice", email="alice@example.com")
    assert user.id is not None
```

### Fixture Scopes

```python
@pytest.fixture(scope="function")  # default: per test
@pytest.fixture(scope="class")     # per test class
@pytest.fixture(scope="module")    # per module
@pytest.fixture(scope="session")   # once per test run
```

### Fixture Dependencies

```python
@pytest.fixture
def user_repository(db_session):   # depends on db_session
    return UserRepository(db_session)
```

## Parametrize

```python
@pytest.mark.parametrize("email,expected", [
    ("user@example.com", True),
    ("invalid",          False),
    ("",                 False),
])
def test_email_validation(email, expected):
    assert validate_email(email) == expected
```

## Markers

```python
@pytest.mark.unit
def test_calculate_total(): ...

@pytest.mark.integration
def test_database_connection(): ...

@pytest.mark.slow
def test_large_dataset(): ...
```

```bash
pytest -m unit              # run only unit tests
pytest -m "not slow"        # skip slow tests
```

Register markers in `pytest.ini` / `pyproject.toml`:
```ini
[tool.pytest.ini_options]
markers = [
    "unit: fast unit tests",
    "integration: integration tests requiring infrastructure",
    "slow: slow tests",
]
```

## Mocking

```python
from unittest.mock import Mock, patch

def test_service_with_mock():
    mock_repo = Mock()
    mock_repo.find_by_id.return_value = User(id="1", name="Alice")
    service = UserService(mock_repo)
    user = service.get_user("1")
    assert user.name == "Alice"
    mock_repo.find_by_id.assert_called_once_with("1")

@patch('myapp.services.EmailService')
def test_send_notification(mock_email):
    service = NotificationService()
    service.send("user@example.com", "Hello")
    mock_email.send.assert_called_once()
```

## Coverage

```bash
pytest --cov=src --cov-report=term-missing
pytest --cov=src --cov-report=html
```

```ini
# pyproject.toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=80"
```

## Async Testing

```python
import pytest

@pytest.mark.asyncio
async def test_async_fetch():
    user = await fetch_user("1")
    assert user.name == "Alice"

@pytest.fixture
async def async_client():
    client = AsyncClient()
    await client.connect()
    yield client
    await client.disconnect()
```

## conftest.py

```python
# tests/conftest.py
import pytest

@pytest.fixture(scope="session")
def app():
    return create_app(testing=True)

@pytest.fixture
def client(app):
    return app.test_client()

def pytest_configure(config):
    config.addinivalue_line("markers", "unit: unit tests")
    config.addinivalue_line("markers", "integration: integration tests")
```

## Test Directory Structure

```
tests/
├── unit/
│   ├── test_models.py
│   ├── test_services.py
│   └── test_utils.py
├── integration/
│   ├── test_database.py
│   └── test_api.py
└── conftest.py
```

## Exception Testing

```python
def test_raises():
    with pytest.raises(ValueError):
        validate_age(-1)

def test_exception_message():
    with pytest.raises(ValueError, match="Age must be positive"):
        validate_age(-1)
```

## Approximate Comparisons

```python
def test_float():
    assert 0.1 + 0.2 == pytest.approx(0.3)
```

## Property-Based Testing (hypothesis)

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a
```

## Test Helpers

```python
# tests/helpers.py
def create_test_user(**kwargs):
    defaults = {"name": "Test User", "email": "test@example.com", "age": 25}
    return User(**{**defaults, **kwargs})
```

## Key Rules

- Prefer real infrastructure over mocks for persistence (testcontainers or in-memory)
- Use `pytest.fixture` over setup/teardown methods
- One assertion per test when possible
- Fixture scope: use `session` for expensive setup, `function` for stateful fixtures
- Always run `pytest --cov` to catch untested paths
