# %%
import datetime as dt

# from . import models
import models
from models import User, Contest, Problem, ContestProblem, Submission, Hack, RanklistRow, RatingChange, ProblemResult, ParticipantType
from peewee import chunked

# %%
models.init('cf.db')
models.connect()
models.create_tables()

# %%
import time
import requests
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
        return j['result']
    raise Exception(j)

# %%
user_list = api_get('user.ratedList?activeOnly=false')
print(len(user_list), 'rated users')

# %%
to_insert, to_update = [], []
for u in user_list:
    try:
        user = User.get(User.handle == u['handle'])
        user.contribution = u['contribution']
        user.rank = u['rank']
        user.rating = u['rating']
        user.max_rank = u['maxRank']
        user.max_rating = u['maxRating']
        user.last_online_time = dt.datetime.utcfromtimestamp(u['lastOnlineTimeSeconds'])
        user.registration_time = dt.datetime.utcfromtimestamp(u['registrationTimeSeconds'])
        user.friend_of_count = u['friendOfCount']
        to_update.append(user)
    except User.DoesNotExist:
        to_insert.append(dict(
            handle=u['handle'],
            contribution=u['contribution'],
            rank=u['rank'],
            rating=u['rating'],
            max_rank=u['maxRank'],
            max_rating=u['maxRating'],
            last_online_time=dt.datetime.utcfromtimestamp(u['lastOnlineTimeSeconds']),
            registration_time=dt.datetime.utcfromtimestamp(u['registrationTimeSeconds']),
            friend_of_count=u['friendOfCount'],
        ))

# %%
with models.db.atomic():
    for piece in chunked(to_insert, 10000):
        User.insert_many(piece).execute()
    User.bulk_update(
        to_update,
        [User.contribution, User.rank, User.rating, User.max_rank, User.max_rating,
             User.last_online_time, User.registration_time, User.friend_of_count],
        batch_size=10000)

print(User.select().count(), 'users in db')

# %%
contest_list = api_get('contest.list')
data = []
for c in contest_list:
    data.append(dict(
        id=c['id'],
        name=c['name'],
        start_time=dt.datetime.utcfromtimestamp(c['startTimeSeconds']),
    ))
Contest.insert_many(data).on_conflict_ignore().execute()

print(Contest.select().count(), 'contests in db')

# %%
done = set()

# %%
known = [
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
]
for c in Contest.select():
    if c.id in done or ContestProblem.select().where(ContestProblem.contest == c).exists():
        continue

    done.add(c.id)
    with models.db.atomic():
        print('contest', c.id, c.name)
        try:
            j = api_get('contest.standings?contestId=%s' % c.id)
        except Exception as e:
            print(e)
            print()
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
        print(rc, 'problems')

        data = []
        for p in problems:
            data.append(dict(
                contest=c,
                problem=Problem.get(
                    Problem.name == p['name'], Problem.contest_start_time == c.start_time),
                index=p['index'],
            ))
        rc = ContestProblem.insert_many(data).execute()
        print(rc, 'contest problems')

        users_seen = set()
        data = []
        data_pr = []
        for r in rows:
            party = r['party']
            if len(party['members']) > 1:
                continue  # Skip teams
            handle = party['members'][0]['handle']
            if (c.id, handle) in known:
                continue
            if handle in users_seen:
                raise Exception(c.id, handle)

            users_seen.add(handle)
            try:
                user = User.get(User.handle == handle)
            except User.DoesNotExist:
                # user participated in this unrated contest and never in another rated contest
                # skip i guess
                print('skipping user', handle)
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
        print(rc, 'ranklist rows')

        for piece in chunked(data_pr, 10000):
            rc = ProblemResult.insert_many(piece).execute()
        print(rc, 'problem result rows')

        print('')

# %%
done = set()

# %%
for c in Contest.select():
    if c.id in done or Hack.select().where(Hack.contest_id == c.id).exists():
        continue

    done.add(c.id)
    print('contest', c.id, c.name)
    try:
        hacks = api_get('contest.hacks?contestId=%s' % c.id)
    except Exception as e:
        print(e)
        print()
        continue

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
            # example "md5" in contest 21 Codeforces Alpha Round #21 (Codeforces format)
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
    print(rc, 'hacks')
    print('')

# %%
done = set()

# %%

known = (
    (447, 'kasim'),
    (472, 'a00920'),
    (472, 'yuki2006'),
    (615, "Altitude"),
    (615, "InnocentFool"),
    (615, "bohuss"),
    (615, "elgris"),
    (615, "mohamedazab"),
)

for c in Contest.select():
    if c.id in done or RatingChange.select().where(RatingChange.contest == c).exists():
        continue

    print('contest', c.id, c.name)
    done.add(c.id)
    try:
        changes = api_get('contest.ratingChanges?contestId=%s' % c.id)
    except Exception as e:
        print(e)
        print()
        continue

    seen = set()

    data = []
    for d in changes:
        if d['handle'] in seen:
            if (c.id, d['handle']) in known:
                continue
        seen.add(d['handle'])
        data.append(dict(
            contest=c,
            user=User.get(User.handle == d['handle']),
            rank=d['rank'],
            old_rating=d['oldRating'],
            new_rating=d['newRating'],
            update_time=dt.datetime.utcfromtimestamp(d['ratingUpdateTimeSeconds']),
        ))

    rc = RatingChange.insert_many(data).execute()
    print(rc, 'rating changes')
    print('')

# %%
done = set()

# for efficiency
user_map = {u.handle: u for u in User.select()}

# %%
for c in Contest.select():
    if c.id in done or Submission.select().where(Submission.contest == c).exists():
        continue

    print('contest', c.id, c.name)
    done.add(c.id)
    try:
        subs = api_get('contest.status?contestId=%s' % c.id)
    except Exception as e:
        print(e)
        print()
        continue
    print('got resp')

    data = []
    for s in subs:
        party = s['author']
        if len(party['members']) != 1:
            continue # skip teams and ghosts
        handle = party['members'][0]['handle']
        try:
            author = user_map[handle]
        except KeyError:
            continue # not rated user
        typ = ParticipantType[party['participantType']]
        # if typ == ParticipantType.PRACTICE or typ == ParticipantType.VIRTUAL:
        #     continue
        data.append((
            s['id'],
            c,
            ContestProblem.get(
                ContestProblem.contest == c,
                ContestProblem.index == s['problem']['index']),
            author,
            typ.value,
            s['programmingLanguage'],
            Submission.Verdict[s['verdict']].value,
            s['testset'],
            s['passedTestCount'],
        ))

    rc = 0
    with models.db.atomic():
        for piece in chunked(data, 20000):
            rc += Submission.insert_many(piece, fields=[
                Submission.id,
                Submission.contest,
                Submission.problem,
                Submission.author,
                Submission.type,
                Submission.programming_language,
                Submission.verdict,
                Submission.testset,
                Submission.passed_test_count,
            ]).execute()
    print(rc, 'submissions of', len(subs))
    print('')

# %%
