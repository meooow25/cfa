import datetime as dt
import logging
import time

import requests
from peewee import chunked
from tqdm import tqdm

from . import models
from . import tmodels
from .models import User, Contest, Problem, ContestProblem, Submission, Hack, RanklistRow, RatingChange, ProblemResult, ParticipantType


logger = logging.getLogger(__name__)

API_BASE = 'https://codeforces.com/api/'

last = 0
cooldown = 1

def api_get(path):
    global last
    wait = last + cooldown - time.time()
    if wait > 0:
        time.sleep(wait)
    r = requests.get(API_BASE + path)
    j = r.json()
    last = time.time()
    if 'result' in j:
        # Sometimes for small responses it's not gzipped
        # enc = r.headers.get('Content-Encoding')
        # assert enc == 'gzip', f'Got encoding {enc} {j}'
        return j['result']
    raise Exception(j)


def init(db_path):
    models.init(db_path)
    models.create_tables()


def users():
    user_list = api_get('user.ratedList?activeOnly=false')
    logger.info('%s rated users fetched', len(user_list))

    # TODO: Add Mike. Mike is not rated but of course people will want to check his achievements.

    to_insert = ((
        u['handle'],
        u['contribution'],
        User.Rank.from_api_string(u['rank']).value,
        u['rating'],
        User.Rank.from_api_string(u['maxRank']).value,
        u['maxRating'],
        dt.datetime.utcfromtimestamp(u['lastOnlineTimeSeconds']),
        dt.datetime.utcfromtimestamp(u['registrationTimeSeconds']),
        u['friendOfCount'],
    ) for u in user_list)

    with models.db.atomic():
        for chunk in chunked(to_insert, 20000):
            User.insert_many(chunk).execute()

    logger.info('%s users in db', User.select().count())


def contests():
    contest_list = api_get('contest.list')
    logger.info('%s contests fetched', len(contest_list))

    data = []
    for c in contest_list:
        if 'Технокубок' in c['name']:
            # Technocup contests that show up in contest list but bug out on all other endpoints.
            continue
        data.append(dict(
            id=c['id'],
            name=c['name'],
            start_time=dt.datetime.utcfromtimestamp(c['startTimeSeconds']),
        ))
    Contest.insert_many(data).execute()

    logger.info('%s contests in db', Contest.select().count())


def standings():
    # These appear more than once in the same ranklist ¯\_(ツ)_/¯
    known_repeats = (
        (158, 'r_hero'),
        (158, 'hashlife'),
        (172, 'pepela'),
        (447, 'kasim'),
        (472, 'yuki2006'),
        (472, 'a00920'),
        (615, 'InnocentFool'),
        (615, 'elgris'),
        (615, 'mohamedazab'),
        (615, 'Altitude'),
        (616, 'shankhs'),
    )
    for c in Contest.select():
        if ContestProblem.select().where(ContestProblem.contest == c).exists():
            continue

        with models.db.atomic():
            logger.info('contest %s %s', c.id, c.name)
            try:
                j = api_get('contest.standings?contestId=%s' % c.id)
            except Exception as e:
                logger.info(e)
                continue

            problems = j['problems']
            rows = j['rows']

            data = []
            for p in problems:
                data.append(dict(
                    name=p['name'],
                    contest_start_time=c.start_time,
                    rating=p.get('rating'),
                    tags=p['tags'],
                ))
            rc = Problem.insert_many(data).on_conflict_ignore().execute()
            logger.debug('%s problems added to db', rc)

            data = []
            for p in problems:
                data.append(dict(
                    contest=c,
                    problem=Problem.get(
                        Problem.name == p['name'], Problem.contest_start_time == c.start_time),
                    index=p['index'],
                ))
            rc = ContestProblem.insert_many(data).execute()
            logger.debug('%s contest problems added to db', rc)

            users_seen = set()
            unrated_users = 0
            data = []
            data_pr = []
            for r in rows:
                party = r['party']
                if len(party['members']) > 1:
                    continue  # Skip teams
                handle = party['members'][0]['handle']
                if handle in users_seen:
                    if (c.id, handle) in known_repeats:
                        continue
                    raise Exception(c.id, handle)
                users_seen.add(handle)
                try:
                    user = User.get(User.handle == handle)
                except User.DoesNotExist:
                    unrated_users += 1
                    continue

                participant_type = ParticipantType[party['participantType']]
                assert participant_type == ParticipantType.CONTESTANT
                data.append(dict(
                    contest=c,
                    user=user,
                    participant_type=participant_type.value,
                    rank=r['rank'],
                    points=r['points'],
                    penalty=r['penalty'],
                    successful_hack_count=r['successfulHackCount'],
                    unsuccessful_hack_count=r['unsuccessfulHackCount'],
                ))
                for p, pr in zip(problems, r['problemResults']):
                    if pr['points'] == 0 and pr['rejectedAttemptCount'] == 0:
                        # no attempt
                        continue
                    data_pr.append(dict(
                        contest=c,
                        user=user,
                        problem_index=p['index'],
                        points=pr['points'],
                        penalty=pr.get('penalty', 0),
                        rejected_attempt_count=pr['rejectedAttemptCount'],
                        best_submission_time_seconds=pr.get('bestSubmissionTimeSeconds', 0),
                    ))


            rc = RanklistRow.insert_many(data).execute()
            logger.debug('%s ranklist rows added to db', rc)
            if unrated_users:
                logger.debug('%s unrated users skipped', unrated_users)

            rc = 0
            for chunk in chunked(data_pr, 10000):
                rc += ProblemResult.insert_many(chunk).execute()
            logger.debug('%s problem result rows added to db', rc)


def hacks():
    for c in Contest.select():
        if Hack.select().where(Hack.contest_id == c.id).exists():
            continue

        logger.info('contest %s %s', c.id, c.name)
        try:
            hacks = api_get('contest.hacks?contestId=%s' % c.id)
        except Exception as e:
            logger.info(e)
            continue

        unrated_skipped = 0
        data = []
        for h in hacks:
            hacker = h['hacker']['members']
            defender = h['defender']['members']
            if len(hacker) > 1 or len(defender) > 1:
                continue  # Skip teams
            try:
                hacker = User.get(User.handle == hacker[0]['handle'])
                defender = User.get(User.handle == defender[0]['handle'])
            except User.DoesNotExist:
                # hacker or defender is not rated
                unrated_skipped += 1
                continue
            data.append(dict(
                id=h['id'],
                contest=c,
                problem=ContestProblem.get(
                    ContestProblem.contest == c.id,
                    ContestProblem.index == h['problem']['index']),
                hacker=hacker,
                defender=defender,
                verdict=Hack.Verdict[h['verdict']].value,
            ))

        rc = Hack.insert_many(data).execute()
        logger.debug('%s hacks added to db', rc)
        if unrated_skipped:
            logger.debug('%s hacks involving unrated users skipped', unrated_skipped)


def rating_changes():
    # These appear more than once in the same ranklist ¯\_(ツ)_/¯
    known_repeats = (
        (447, 'kasim'),
        (472, 'a00920'),
        (472, 'yuki2006'),
        (615, 'Altitude'),
        (615, 'InnocentFool'),
        (615, 'bohuss'),
        (615, 'elgris'),
        (615, 'mohamedazab'),
    )
    for c in Contest.select():
        if RatingChange.select().where(RatingChange.contest == c).exists():
            continue

        logger.info('contest %s %s', c.id, c.name)
        try:
            changes = api_get('contest.ratingChanges?contestId=%s' % c.id)
        except Exception as e:
            logger.info(e)
            continue

        seen = set()
        data = []
        for d in changes:
            handle = d['handle']
            if handle in seen:
                if (c.id, handle) in known_repeats:
                    continue
                raise Exception(c.id, handle)
            seen.add(handle)
            data.append(dict(
                contest=c,
                user=User.get(User.handle == handle),
                rank=d['rank'],
                old_rating=d['oldRating'],
                new_rating=d['newRating'],
                update_time=dt.datetime.utcfromtimestamp(d['ratingUpdateTimeSeconds']),
            ))

        rc = RatingChange.insert_many(data).execute()
        logger.debug('%s rating changes added to db', rc)


def submissions(h5_path):
    # TODO: There's a memory leak here, figure out what's going on

    # for efficiency
    user_map = {u.handle: u.id for u in User.select()}
    problem_map = {(p.contest_id, p.index): p.id for p in ContestProblem.select()}

    with tmodels.Table.open_append(h5_path) as table:
        group = table.get_or_create_group(table.root, 'submissions')

        for c in Contest.select():
            ctable = table.get_or_create_table(group, f'c{c.id}', tmodels.Submission)

            # pytables has no transactions, so we mark a table as done on completion
            if getattr(ctable.attrs, 'done', False):
                continue
            # Delete all rows from some older incomplete attempt
            ctable.remove_rows(0, ctable.nrows)

            logger.info('contest %s %s', c.id, c.name)
            # The amount of submission for many contests are huge enough to eat up ~2GB of memory and
            # make the program crash.
            # Try in batches
            batch_size = 100_000

            done = 0
            last_ids = set()
            while True:
                try:
                    subs = api_get('contest.status?contestId=%s&from=%d&count=%d' % (c.id, done + 1, batch_size))
                except Exception as e:
                    stre = str(e)
                    if 'not found' in stre or 'not started' in stre:
                        logger.info(e)
                        break
                    raise e

                logger.debug('got %s subs starting at %s', len(subs), done)

                repeated = unrated_author = team = ghost = 0
                cur_ids = set()

                data = []
                for s in subs:
                    id_ = s['id']
                    cur_ids.add(id_)
                    if id_ in last_ids:
                        repeated += 1
                        continue

                    if 'verdict' not in s:
                        logger.debug('no verdict %s', s)
                        continue

                    party = s['author']
                    if len(party['members']) == 0:
                        ghost += 1
                        continue
                    if len(party['members']) > 1:
                        team += 1
                        continue

                    handle = party['members'][0]['handle']
                    try:
                        author_id = user_map[handle]
                    except KeyError:
                        unrated_author += 1
                        continue

                    problem_id = problem_map[(c.id, s['problem']['index'])]
                    typ = ParticipantType[party['participantType']]

                    # Same order as tmodels.Submission
                    data.append((
                        id_,
                        c.id,
                        problem_id,
                        author_id,
                        typ.value,
                        s['programmingLanguage'],
                        Submission.Verdict[s['verdict']].value,
                        Submission.TestSet[s['testset']].value,
                        s['passedTestCount'],
                        s['timeConsumedMillis'],
                        s['memoryConsumedBytes'],
                    ))

                if data:
                    ctable.append(data)
                    ctable.flush()
                
                logger.debug('%s submissions added to db', len(data))
                if repeated or unrated_author or team or ghost:
                    logger.debug('%s repeated, %s unrated author, %s team, %s ghost',
                                 repeated, unrated_author, team, ghost)

                if len(subs) < batch_size:
                    break
                done += len(subs)
                last_ids = cur_ids

            ctable.attrs.done = True


def move_subs_h5_to_db(h5_path):
    batch_size = 20000

    with tmodels.Table.open_read(h5_path) as table, models.db.atomic():
        group = getattr(table.root, 'submissions')
        all_tables = list(group)

        for ctable in tqdm(all_tables, desc='Copying subs to db', ncols=80):            
            with tqdm(total=ctable.nrows, desc=ctable.name, ncols=80, leave=False) as pbar:
                rows = (row[:] for row in ctable)
                for chunk in chunked(rows, batch_size):
                    rc = Submission.insert_many(chunk).execute()
                    pbar.update(rc)
