from ..achievement import Grant, register
from ..models import User

def register_rank(rank: User.Rank):
    @register(
        title=rank.title,
        brief=f"I'm a {rank.title}!",
        description=f'Have rank {rank.title}')
    def func():
        users = User.select().where(User.rank == rank.value)
        grants = [Grant(user.handle, rank.title) for user in users]
        return grants

for rank in User.Rank:
    register_rank(rank)
