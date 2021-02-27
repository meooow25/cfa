from ..achievement import Grant, register
from ..models import RatingChange, User

@register(
    title='Perfectly balanced',
    brief='Got zero delta in a rated contest',
    description='Get zero delta in a rated contest')
def perfectly_balanced():
    changes = (
        RatingChange.select(RatingChange, User)
            .join(User)
            .where(RatingChange.old_rating == RatingChange.new_rating))

    info_fmt = 'Awarded for contest {}'
    grants = [Grant(change.user.handle, info_fmt.format(change.contest_id))
              for change in changes]
    return grants
