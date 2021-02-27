import json

import click

from . import azure_cosmos, azure_storage, download, generate


@click.group()
def base():
    pass


@base.command(name='download')
@click.option('--dbpath', default='cf.db', show_default=True)
@click.option('--h5path', default='cf.h5', show_default=True)
@click.option('--users', is_flag=True)
@click.option('--contests', is_flag=True)
@click.option('--standings', is_flag=True)
@click.option('--hacks', is_flag=True)
@click.option('--rating_changes', is_flag=True)
@click.option('--submissions', is_flag=True)
@click.option('--only_move_subs', is_flag=True)
def download_(dbpath, h5path, users, contests, standings, hacks, rating_changes, submissions, only_move_subs):
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
        if not only_move_subs:
            download.submissions(h5path)
        download.move_subs_h5_to_db(h5path)
    click.echo('Done')


@base.command()
@click.option('--dbpath', default='cf.db', show_default=True)
@click.option('--jsonpath', default='achs.json', show_default=True)
@click.option('--also_upload', is_flag=True)
def gen_achs(dbpath, jsonpath, also_upload):
    achs = generate.generate_achievements(dbpath)
    users_with_achievements = generate.to_user_based_dicts(achs)
    with open(jsonpath, 'w') as f:
        json.dump(users_with_achievements, f)
    if also_upload:
        upload_achs(jsonpath)


@base.command()
@click.option('--jsonpath', default='achs.json', show_default=True)
def upload_achs(jsonpath):
    with open(jsonpath) as f:
        users_with_achievements = json.load(f)
    azure_cosmos.save_users(users_with_achievements)


@base.command()
@click.option('--icons_dir', default='icons', show_default=True)
@click.option('--overwrite', is_flag=True)
def upload_icons(icons_dir, overwrite):
    azure_storage.upload_icons(icons_dir, overwrite)


base(prog_name='cfa')
