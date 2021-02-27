from ..achievement import Grant, register
from ..models import Contest, ParticipantType, Submission, User

@register(
    title='RIP',
    brief='Failed systests in a contest',
    description='Have a submission pass pretests in a contest but fail systests')
def rip():
    # Some contests don't have pretests, assume if there is no submission against pretests there
    # are none for that problem. Surprisingly educational rounds don't have submissions against
    # samples or pretests even though they do have those.

    good_contests = (
        Submission.select(Submission.contest_id)
            .where(Submission.testset == Submission.TestSet.PRETESTS.value))

    subs = (
        Submission.select(Submission.id, Submission.author, Submission.contest_id, User.handle)
            .join(User)
            .switch(Submission)
            .join(Contest)
            .where(
                Submission.contest_id.in_(good_contests),
                Submission.type == ParticipantType.CONTESTANT.value,
                Submission.verdict != Submission.Verdict.OK.value,
                Submission.testset == Submission.TestSet.TESTS.value))

    info_fmt = 'Awarded for submission {} in contest {}'
    return [Grant(sub.author.handle, info_fmt.format(sub.id, sub.contest_id)) for sub in subs]
