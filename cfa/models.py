from enum import Enum, auto

import requests
from peewee import SqliteDatabase, Model
from peewee import CharField, DateTimeField, ForeignKeyField, IntegerField, FloatField

# - Put a small max length on char fields (default is 255)
# - Put lazy_load=False on foreign keys so that peewee doesn't auto query them when you forget to
#   do a join.

db = SqliteDatabase(None)

class BaseModel(Model):
    class Meta:
        database = db


class ParticipantType(Enum):
    CONTESTANT = 1
    PRACTICE = 2
    VIRTUAL = 3
    MANAGER = 4
    OUT_OF_COMPETITION = 5


class User(BaseModel):
    handle = CharField(unique=True, max_length=32)
    contribution = IntegerField()
    rank = CharField(max_length=32)
    rating = IntegerField()
    max_rank = CharField(max_length=32)
    max_rating = IntegerField()
    last_online_time = DateTimeField()
    registration_time = DateTimeField()
    friend_of_count = IntegerField()


class Contest(BaseModel):
    id = IntegerField(primary_key=True)
    name = CharField()
    start_time = DateTimeField()


class Problem(BaseModel):
    name = CharField(max_length=128)
    contest_start_time = DateTimeField()
    rating = IntegerField(null=True)
    tags = CharField()

    class Meta:
        indexes = (
            (('name', 'contest_start_time'), True),  # assumes name + contest start time is unique
        )


class ContestProblem(BaseModel):
    contest = ForeignKeyField(Contest, index=True, lazy_load=False)
    index = CharField(max_length=8)
    problem = ForeignKeyField(Problem, lazy_load=False)

    class Meta:
        indexes = (
            (('contest', 'index'), True),
        )


class Submission(BaseModel):
    id = IntegerField(primary_key=True)
    contest = ForeignKeyField(Contest, lazy_load=False)
    problem = ForeignKeyField(ContestProblem, lazy_load=False)
    author = ForeignKeyField(User, lazy_load=False)
    type = IntegerField()  # ParticipationType
    programming_language = CharField(max_length=32)
    verdict = IntegerField()
    testset = IntegerField()
    passed_test_count = IntegerField()
    time_consumed_millis = IntegerField()
    memory_consumed_bytes = IntegerField()

    class TestSet(Enum):
        SAMPLES = 1
        PRETESTS = 2
        TESTS = 3
        CHALLENGES = 4
        TESTS1 = 5
        TESTS2 = 6
        TESTS3 = 7
        TESTS4 = 8
        TESTS5 = 9
        TESTS6 = 10
        TESTS7 = 11
        TESTS8 = 12
        TESTS9 = 13
        TESTS10 = 14

    class Verdict(Enum):
        FAILED = 1
        OK = 2
        PARTIAL = 3
        COMPILATION_ERROR = 4
        RUNTIME_ERROR = 5
        WRONG_ANSWER = 6
        PRESENTATION_ERROR = 7
        TIME_LIMIT_EXCEEDED = 8
        MEMORY_LIMIT_EXCEEDED = 9
        IDLENESS_LIMIT_EXCEEDED = 10
        SECURITY_VIOLATED = 11
        CRASHED = 12
        INPUT_PREPARATION_CRASHED = 13
        CHALLENGED = 14
        SKIPPED = 15
        TESTING = 16
        REJECTED = 17

        SUBMITTED = 18  # Not documented
        # can be absent?


class Hack(BaseModel):
    id = IntegerField(primary_key=True)
    contest = ForeignKeyField(Contest, lazy_load=False)
    problem = ForeignKeyField(ContestProblem, lazy_load=False)
    hacker = ForeignKeyField(User, lazy_load=False)
    defender = ForeignKeyField(User, lazy_load=False)
    verdict = IntegerField()

    class Verdict(Enum):
        HACK_SUCCESSFUL = 1
        HACK_UNSUCCESSFUL = 2
        INVALID_INPUT = 3
        GENERATOR_INCOMPILABLE = 4
        GENERATOR_CRASHED = 5
        IGNORED = 6
        TESTING = 7
        OTHER = 8


class RanklistRow(BaseModel):
    contest = ForeignKeyField(Contest, lazy_load=False)
    user = ForeignKeyField(User, lazy_load=False)
    participant_type = IntegerField()  # ParticipantType
    rank = IntegerField()
    points = FloatField()
    penalty = IntegerField()
    successful_hack_count = IntegerField()
    unsuccessful_hack_count = IntegerField()

    class Meta:
        indexes = (
            (('contest', 'user', 'participant_type'), True),
        )


class ProblemResult(BaseModel):
    contest = ForeignKeyField(Contest, lazy_load=False)
    user = ForeignKeyField(User, lazy_load=False)
    problem_index = CharField(max_length=8)
    points = FloatField()
    penalty = IntegerField()
    rejected_attempt_count = IntegerField()
    best_submission_time_seconds = IntegerField()

    class Meta:
        indexes = (
            (('contest', 'user', 'problem_index'), True),
        )


class RatingChange(BaseModel):
    contest = ForeignKeyField(Contest, lazy_load=False)
    user = ForeignKeyField(User, lazy_load=False)
    rank = IntegerField()
    old_rating = IntegerField()
    new_rating = IntegerField()
    update_time = DateTimeField()

    class Meta:
        indexes = (
            (('contest', 'user'), True),
        )


def init(db_path):
    db.init(db_path)

def connect():
    db.connect()

def create_tables():
    db.create_tables([
        User, Contest, Problem, ContestProblem, Submission, Hack, RanklistRow, ProblemResult,
        RatingChange])

def close():
    return db.close()
