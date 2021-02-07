from typing import Callable, List, NamedTuple

DEFAULT_ICON_NAME = 'default.svg'

class Grant(NamedTuple):
    handle: str
    info: str

class Achievement:
    def __init__(
            self, *, title: str, brief: str, description: str = None,
            icon_name: str = DEFAULT_ICON_NAME,
            calculate_grants: Callable[[], List[Grant]]):
        self.title = title
        self.brief = brief
        self.description = description or brief
        self.icon_name = icon_name
        self.calculate_grants = calculate_grants

    def __repr__(self):
        return f'Achievement<{self.title}>'

class AchievementWithStats(NamedTuple):
    achievement: Achievement
    grants: List[Grant]
    users_awarded: int
    users_awarded_fraction: float


_achievements: List[Achievement] = []

def register(
        *, title: str, brief: str, description: str = None,
        icon_name: str = DEFAULT_ICON_NAME, ignore: bool = False):
    """Decorator that creates and registers an achievement."""

    def deco(func: Callable[[], List[Grant]]):
        if ignore:
            return
        achievement = Achievement(title=title, brief=brief, description=description,
                                  calculate_grants=func)
        _achievements.append(achievement)
        return func

    return deco


def registered_achievements():
    return _achievements
