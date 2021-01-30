import os
import time
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from typing import List

from azure.cosmos import CosmosClient

from .achievement import AchievementWithStats

# 400 requests units per second free, let's say we save at most 200 times per sec
COSMOS_DB_RATE_PER_SEC = 200


@dataclass
class Achievement:
    title: str
    brief: str
    description: str
    users_awarded: int
    users_awarded_fraction: float
    grant_infos: List[str] = field(default_factory=list)


@dataclass
class User:
    id: str
    achievements: List[Achievement] = field(default_factory=list)


def save(achievements: List[AchievementWithStats]):
    dicts = to_user_dicts(achievements)
    print(dicts[0])
    limiter = RateLimiter(COSMOS_DB_RATE_PER_SEC, 1)
    container = get_client()
    now = time.monotonic()
    for dict_ in dicts:
        limiter.wait()
        # container.upsert_item(dict_)
    print('saved', len(dicts), time.monotonic() - now)

def get_client() -> CosmosClient:
    conn_str = os.environ['AZURE_COSMOS_CONN_STRING']
    client = CosmosClient.from_connection_string(conn_str=conn_str)
    database = client.get_database_client('database1')
    container = database.get_container_client('container2')
    return container

def to_user_dicts(achievements: List[AchievementWithStats]) -> List[User]:
    dicts = {}
    for achievement_with_stats in achievements:
        dicts1 = {}
        for grant in achievement_with_stats.grants:
            if grant.handle not in dicts1:
                dicts1[grant.handle] = Achievement(
                                            achievement_with_stats.achievement.title,
                                            achievement_with_stats.achievement.brief,
                                            achievement_with_stats.achievement.description,
                                            achievement_with_stats.users_awarded,
                                            achievement_with_stats.users_awarded_fraction)
            dicts1[grant.handle].grant_infos.append(grant.info)

        for handle, ach in dicts1.items():
            if handle not in dicts:
                dicts[handle] = User(handle)
            dicts[handle].achievements.append(ach)

    return list(map(asdict, dicts.values()))


class RateLimiter:
    def __init__(self, times: int, per: float):
        self.times = times
        self.per = per
        self.past = deque(maxlen=self.times)

    def wait(self):
        now = time.monotonic()
        if len(self.past) == self.times:
            until = self.past[0] + self.per
            if until > now:
                time.sleep(until - now)
            self.past.popleft()
        self.past.append(now)
