from peewee import fn

from ..achievement import Grant, register
from ..models import User, RanklistRow

MAX_WINNERS = 10


@register(
    title='Winner',
    brief='Won a Codeforces contest',
    description='Win a Codeforces contest. Team participation is ignored. Out of '
                f'competition participation is ignored. Contests with more than {MAX_WINNERS} '
                'winners are ignored.')
def winner():
    return calculate_grants_for_rank(1)


@register(
    title='Runner-up',
    brief='Ranked second in a Codeforces contest',
    description='Rank second in any Codeforces contest. Team participation is ignored. Out of '
                'competition participation is ignored. Contests with more than '
                f'{MAX_WINNERS} winners are ignored.')
def runner_up():
    return calculate_grants_for_rank(2)


def calculate_grants_for_rank(rank):
    bad_contests = (
        RanklistRow.select(RanklistRow.contest)
            .where(RanklistRow.rank == 1)
            .group_by(RanklistRow.contest)
            .having(fn.COUNT(1) > MAX_WINNERS))

    rows = (
        RanklistRow.select(RanklistRow, User)
            .join(User)
            .where(
                RanklistRow.rank == rank,
                RanklistRow.contest.not_in(bad_contests)))

    info_fmt = 'Awarded for contest {}'
    return [Grant(row.user.handle, info_fmt.format(row.contest_id)) for row in rows]
