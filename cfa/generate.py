import time
from dataclasses import asdict, dataclass, field
from typing import List

from . import models, achievements
from .achievement import AchievementWithStats, registered_achievements

def generate_achievements(db_path) -> List[AchievementWithStats]:
    if models.db.is_closed():
        models.init(db_path)
        models.connect()

    achs = registered_achievements()

    total_users = models.User.select().count()

    achievements_with_stats = []
    for ach in achs:
        start = time.monotonic()
        grants = ach.calculate_grants()
        elapsed = time.monotonic() - start

        users_awarded = len(set(grant.handle for grant in grants))
        users_awarded_fraction = users_awarded / total_users
        achievements_with_stats.append(
            AchievementWithStats(ach, grants, users_awarded, users_awarded_fraction))
        print(ach, f'{elapsed:.2f}s', len(grants), 'grants')

    return achievements_with_stats


def to_user_based_dicts(achievements: List[AchievementWithStats]) -> List[dict]:

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
        handle: str
        achievements: List[Achievement] = field(default_factory=list)

    by_handle = {}
    for ach_with_stats in achievements:
        by_handle_inner = {}
        ach = ach_with_stats.achievement
        for grant in ach_with_stats.grants:
            if grant.handle not in by_handle_inner:
                by_handle_inner[grant.handle] = Achievement(ach.title, ach.brief, ach.description,
                                                            ach_with_stats.users_awarded,
                                                            ach_with_stats.users_awarded_fraction)
            by_handle_inner[grant.handle].grant_infos.append(grant.info)

        for handle, ach in by_handle_inner.items():
            if handle not in by_handle:
                by_handle[handle] = User(handle)
            by_handle[handle].achievements.append(ach)

    return list(map(asdict, by_handle.values()))
