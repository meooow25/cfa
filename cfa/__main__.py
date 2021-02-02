import click

from . import download
from . import generate, cosmos


@click.group()
def base():
    pass

@base.command()
def genach():
    ach = generate.get_achievements()
    # cosmos.save(ach)

@base.command(name='download')
@click.option('--dbpath', default='cf.db', show_default=True)
@click.option('--users', is_flag=True)
@click.option('--contests', is_flag=True)
@click.option('--standings', is_flag=True)
@click.option('--hacks', is_flag=True)
@click.option('--rating_changes', is_flag=True)
@click.option('--submissions', is_flag=True)
def dl(dbpath, users, contests, standings, hacks, rating_changes, submissions):
    if not any((users, contests, standings, hacks, rating_changes, submissions)):
        click.secho('Nothing to download', fg='red')
        return
    click.echo('Downloading to ' + dbpath)
    click.echo()
    download.init(dbpath)
    if users:
        download.users()
    if contests:
        download.contests()
    if standings:
        download.standings()
    if hacks:
        download.hacks()
    if rating_changes:
        download.rating_changes()
    if submissions:
        download.submissions()
    click.secho('Done', fg='green')

base(prog_name='cfa')
