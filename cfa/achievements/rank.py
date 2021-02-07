from ..achievement import Grant, register
from ..models import User

def register_rank(rank: User.Rank):
    rank_title = rank.title
    @register(
        title=rank_title,
        brief="I'm a " + rank_title,
        description='Have rank ' + rank_title)
    def func():
        users = User.select().where(User.rank == rank.value)
        grants = [Grant(user.handle, rank_title) for user in users]
        return grants

for rank in User.Rank:
    register_rank(rank)
