import json

import click

from . import azure_cosmos, azure_storage, download, generate


@click.group()
def base():
    pass


@base.command()
@click.option('--input', type=click.Choice(['dbgen', 'json']), required=True)
@click.option('--output', type=click.Choice(['json', 'cosmos']), required=True)
@click.option('--dbpath', default='cf.db', show_default=True)
@click.option('--jsonpath', default='achs.json', show_default=True)
def gen(input, output, dbpath, jsonpath):
    if input == 'dbgen':
        achs = generate.generate_achievements(dbpath)
        users_with_achievements = generate.to_user_based_dicts(achs)
    else: # json
        with open(jsonpath) as f:
            users_with_achievements = json.load(f)

    if output == 'json':
        with open(jsonpath, 'w') as f:
            json.dump(users_with_achievements, f)
    else: # cosmos
        azure_cosmos.save(users_with_achievements)


@base.command(name='download')
@click.option('--dbpath', default='cf.db', show_default=True)
@click.option('--users', is_flag=True)
@click.option('--contests', is_flag=True)
@click.option('--standings', is_flag=True)
@click.option('--hacks', is_flag=True)
@click.option('--rating_changes', is_flag=True)
@click.option('--submissions', is_flag=True)
def download_(dbpath, users, contests, standings, hacks, rating_changes, submissions):
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
    click.secho('Done')


@base.command()
@click.option('--icons_dir', default='icons', show_default=True)
@click.option('--overwrite', is_flag=True)
def upload_icons(icons_dir, overwrite):
    azure_storage.upload_icons(icons_dir, overwrite)


base(prog_name='cfa')
