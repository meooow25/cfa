import datetime as dt

from ..achievement import Grant, register
from ..models import RatingChange, User


@register(
    title='Hello, world!',
    brief='Created your account in the last 2 months')
def hello_world():
    now = dt.datetime.now()
    two_months_ago = now - dt.timedelta(days=60)
    users = User.select().where(User.registration_time > two_months_ago)
    info_fmt = 'Account created {} days ago'
    grants = [Grant(user.handle, info_fmt.format(int((now - user.registration_time).days)))
                for user in users]
    return grants


@register(
    title='Veteran',
    brief='Created your account at least 10 years ago')
def veteran():
    now = dt.datetime.now()
    ten_years_ago = now - dt.timedelta(days=10 * 365)
    users = User.select().where(User.registration_time < ten_years_ago)
    info_fmt = 'Account created {:.1f} years ago'
    grants = [Grant(user.handle, info_fmt.format((now - user.registration_time).days / 365))
                for user in users]
    return grants


@register(
    title='Celebrity',
    brief='Friend of 1000 or more users')
def celebrity():
    users = User.select().where(User.friend_of_count >= 1000)
    info_fmt = 'Friend of {} users'
    grants = [Grant(user.handle, info_fmt.format(user.friend_of_count)) for user in users]
    return grants


@register(
    title='At my best',
    brief='Currently at peak rating',
    description='Participated in a rated contest in the last 6 months and currently at peak rating')
def at_my_best():
    six_months_ago = dt.datetime.now() - dt.timedelta(days=30 * 6)
    active = RatingChange.select(RatingChange.user).where(RatingChange.update_time > six_months_ago)
    users = User.select().where(User.rating == User.max_rating, User.id.in_(active))
    info_fmt = 'Currently rated {}'
    grants = [Grant(user.handle, info_fmt.format(user.rating)) for user in users]
    return grants
