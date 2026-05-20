try:
    import psycopg2
    print("psycopg2: ok")
except ImportError:
    print("psycopg2: no")
try:
    import asyncpg
    print("asyncpg: ok")
except ImportError:
    print("asyncpg: no")
try:
    import sqlalchemy
    print("sqlalchemy: ok")
except ImportError:
    print("sqlalchemy: no")
