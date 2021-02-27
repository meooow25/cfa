from peewee import Tuple

from ..achievement import Grant, register
from ..models import ContestProblem, Hack, User


@register(
    title="You didn't even scratch me!",
    brief='Defended a submission against a hack attempt by tourist',
    description='Have one of your submissions unsuccessfully challenged by tourist. There '
                'should be no other successful hack attempts from tourist of your submissions for this '
                'problem.')
def you_didnt_even_scratch_me():
    Hacker = User.alias()
    Defender = User.alias()

    tourist_hacks = (
        Hack.select(Hack, Hacker, Defender, ContestProblem)
            .join(Hacker, on=Hack.hacker)
            .switch(Hack)
            .join(Defender, on=Hack.defender)
            .switch(Hack)
            .join(ContestProblem)
            .where(Hacker.handle == 'tourist'))

    successful_hacks = (
        tourist_hacks.select(Hack.problem, Hack.defender)
            .where(Hack.verdict == Hack.Verdict.HACK_SUCCESSFUL.name))

    failed_hacks = (
        tourist_hacks.select(Hack, Defender, ContestProblem)
            .where(
                Hack.verdict == Hack.Verdict.HACK_UNSUCCESSFUL.name,
                Tuple(Hack.problem, Hack.defender).not_in(successful_hacks)))

    info_fmt = 'Awarded for problem {}{}'
    grants = [Grant(hack.defender.handle, info_fmt.format(hack.contest_id, hack.problem.index))
                for hack in failed_hacks]
    return grants


@register(
    title='Congratulations, you played yourself',
    brief='Successfully hacked your own submission',
    description='Successfully hack your own submission')
def congratulations_you_played_yourself():
    hacks = (
        Hack.select(Hack, User, ContestProblem)
            .join(User, on=Hack.hacker)
            .switch(Hack)
            .join(ContestProblem)
            .where(
                Hack.hacker == Hack.defender,
                Hack.verdict == Hack.Verdict.HACK_SUCCESSFUL.value))

    info_fmt = 'Awarded for hack {} on problem {}{}'
    grants = [
        Grant(hack.hacker.handle, info_fmt.format(hack.id, hack.contest_id, hack.problem.index))
        for hack in hacks]
    return grants
