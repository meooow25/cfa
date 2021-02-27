from peewee import fn

from ..achievement import Grant, register
from ..models import User, RanklistRow

MAX_WINNERS = 10

common = ('Team participation is ignored. Out of competition participation is ignored. Contests '
         f'with more than {MAX_WINNERS} winners are ignored.')

@register(
    title='Winner',
    brief='Won a contest',
    description=f'Win a Codeforces contest. {common}')
def winner():
    return calculate_grants_for_rank(1)


@register(
    title='Runner-up',
    brief='Ranked second in a contest',
    description=f'Rank second in a Codeforces contest. {common}')
def runner_up():
    return calculate_grants_for_rank(2)


@register(
    title='Top 10',
    brief='Ranked in the top 10 in a contest',
    description=f'Have rank between 3 and 10 in a Codeforces contest. {common}')
def top_10():
    return calculate_grants_for_rank(3, 10)


@register(
    title='Top 100',
    brief='Ranked in the top 100 in a contest',
    description=f'Have rank between 11 and 100 in a Codeforces contest. {common}')
def top_100():
    return calculate_grants_for_rank(11, 100)


def calculate_grants_for_rank(rank_min, rank_max=None):
    if rank_max is None:
        rank_max = rank_min

    bad_contests = (
        RanklistRow.select(RanklistRow.contest)
            .where(RanklistRow.rank == 1)
            .group_by(RanklistRow.contest)
            .having(fn.COUNT(1) > MAX_WINNERS))

    rows = (
        RanklistRow.select(RanklistRow, User)
            .join(User)
            .where(
                RanklistRow.rank >= rank_min,
                RanklistRow.rank <= rank_max,
                RanklistRow.contest.not_in(bad_contests)))

    info_fmt = 'Awarded for rank {} in contest {}'
    return [Grant(row.user.handle, info_fmt.format(row.rank, row.contest_id)) for row in rows]
