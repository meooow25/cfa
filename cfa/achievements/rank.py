from dataclasses import dataclass

from ..achievement import Grant, register
from ..models import User, RatingChange

def register_rank(rank):
    @register(
        title=rank,
        brief="I'm a " + rank,
        description='Have rank ' + rank)
    def func():
        users = User.select().where(User.rank == rank.lower())
        grants = [Grant(user.handle, rank) for user in users]
        return grants

all_ranks = [
    'Newbie',
    'Pupil',
    'Specialist',
    'Expert',
    'Candidate Master',
    'Master',
    'International Master',
    'Grandmaster',
    'International Grandmaster',
    'Legendary Grandmaster',
]

for rank in all_ranks:
    register_rank(rank)
