import os
import logging
import time
from dataclasses import asdict, dataclass, field
from typing import List
from urllib.parse import urljoin

from . import achievements  # registers individual achievements

from . import models
from .achievement import AchievementWithStats, registered_achievements


logger = logging.getLogger(__name__)


def generate_achievements(db_path) -> List[AchievementWithStats]:
    models.init(db_path)

    achs = registered_achievements()

    total_users = models.User.select().count()

    achievements_with_stats = []
    for ach in achs:
        grants = ach.calculate_grants()
        users_awarded = len(set(grant.handle for grant in grants))
        users_awarded_fraction = users_awarded / total_users
        achievements_with_stats.append(
            AchievementWithStats(ach, grants, users_awarded, users_awarded_fraction))
        logger.info('%s, %s grants', ach, len(grants))

    return achievements_with_stats


def to_user_based_dicts(achievements: List[AchievementWithStats]) -> List[dict]:

    @dataclass
    class Achievement:
        title: str
        brief: str
        description: str
        icon_url: str
        users_awarded: int
        users_awarded_fraction: float
        grant_infos: List[str] = field(default_factory=list)

    @dataclass
    class User:
        handle: str
        achievements: List[Achievement] = field(default_factory=list)
    
    icon_url_base = os.environ['ACHIEVEMENT_ICON_URL_BASE']

    by_handle = {}
    for ach_with_stats in achievements:
        by_handle_inner = {}
        ach = ach_with_stats.achievement

        for grant in ach_with_stats.grants:
            if grant.handle not in by_handle_inner:
                by_handle_inner[grant.handle] = Achievement(
                    ach.title, ach.brief, ach.description, urljoin(icon_url_base, ach.icon_name),
                    ach_with_stats.users_awarded, ach_with_stats.users_awarded_fraction)
            by_handle_inner[grant.handle].grant_infos.append(grant.info)

        for handle, ach in by_handle_inner.items():
            if handle not in by_handle:
                by_handle[handle] = User(handle)
            by_handle[handle].achievements.append(ach)

    return list(map(asdict, by_handle.values()))
