import time
from typing import List

from . import models
from .models import User, RanklistRow

from .achievement import Achievement, AchievementWithStats, registered_achievements

from . import achievements

def get_achievements() -> List[AchievementWithStats]:
    if models.db.is_closed():
        models.init('cf.db')
        models.connect()

    achs = registered_achievements()

    total_users = User.select().count()

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
