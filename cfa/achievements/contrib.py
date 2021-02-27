import datetime as dt

from ..achievement import Grant, register
from ..models import User


@register(
    title='Contributor I',
    brief='Have at least 1 contribution',
    description='Have between 1 and 4 contribution')
def contributor_i():
    users = User.select().where(User.contribution >= 1, User.contribution < 5)
    info_fmt = 'Contribution {}'
    grants = [Grant(user.handle, info_fmt.format(user.contribution)) for user in users]
    return grants


@register(
    title='Contributor II',
    brief='Have at least 5 contribution',
    description='Have between 5 and 24 contribution')
def contributor_ii():
    users = User.select().where(User.contribution >= 5, User.contribution < 25)
    info_fmt = 'Contribution {}'
    grants = [Grant(user.handle, info_fmt.format(user.contribution)) for user in users]
    return grants


@register(
    title='Contributor III',
    brief='Have at least 25 contribution',
    description='Have between 25 and 99 contribution')
def contributor_iii():
    users = User.select().where(User.contribution >= 25, User.contribution < 100)
    info_fmt = 'Contribution {}'
    grants = [Grant(user.handle, info_fmt.format(user.contribution)) for user in users]
    return grants


@register(
    title='Contributor IV',
    brief='Have at least 100 contribution')
def contributor_iv():
    users = User.select().where(User.contribution >= 100)
    info_fmt = 'Contribution {}'
    grants = [Grant(user.handle, info_fmt.format(user.contribution)) for user in users]
    return grants
