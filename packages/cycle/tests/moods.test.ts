import {
  findMood,
  isKnownMood,
  loggableMoods,
  moodGroup,
  moodSlugs,
  moods,
  moodsIn,
  symptomsOutsideTheMoodPicker,
  unknownMoodSlugs,
} from '../src/moods';
import { type Symptom, symptomSlugs, symptoms, symptomsInGroup } from '../src/symptoms';

/** A day she saved, whose moods must still resolve. */
const anOldDay = { moods: ['calm', 'low-mood'], symptoms: ['cramps'] };

function retire(slug: string, on: string): readonly Symptom[] {
  return symptoms.map((symptom) =>
    symptom.slug === slug ? { ...symptom, retiredOn: on } : symptom,
  );
}

describe('the moods she can pick', () => {
  it('is the mood group of the catalogue, and nothing written a second time', () => {
    expect(moods).toEqual(symptomsInGroup(moodGroup));
    expect(moods).toHaveLength(10);
  });

  it('holds every mood slug the catalogue holds, and no slug from another group', () => {
    const outside = moodSlugs.filter((slug) => !symptomSlugs.includes(slug));
    const fromAnotherGroup = moods.filter((mood) => mood.group !== moodGroup);

    expect(outside).toEqual([]);
    expect(fromAnotherGroup).toEqual([]);
  });

  it('leaves every other group to the symptom list, so no word is offered twice', () => {
    const offered = symptomsOutsideTheMoodPicker();
    const shared = offered.filter((symptom) => moodSlugs.includes(symptom.slug));

    expect(shared).toEqual([]);
    expect(offered).toHaveLength(symptoms.length - moods.length);
    expect(offered).toHaveLength(60);
  });
});

describe('reading a record', () => {
  it('resolves every mood slug an old record names', () => {
    expect(unknownMoodSlugs(anOldDay.moods)).toEqual([]);
  });

  it('names the mood a slug points at', () => {
    expect(findMood('mood-swings')?.name).toBe('Mood swings');
  });

  it('refuses a slug the catalogue never held, and names it', () => {
    expect(unknownMoodSlugs(['calm', 'ecstatic', 'Calm'])).toEqual(['ecstatic', 'Calm']);
  });

  it('refuses a symptom from another group, because a symptom is not a mood', () => {
    expect(unknownMoodSlugs(anOldDay.symptoms)).toEqual(['cramps']);
    expect(isKnownMood('fatigue')).toBe(false);
  });
});

describe('a retired mood', () => {
  const afterCalmRetires = retire('calm', '2027-03-01');

  it('still reads on an old record', () => {
    expect(unknownMoodSlugs(anOldDay.moods, afterCalmRetires)).toEqual([]);
    expect(findMood('calm', afterCalmRetires)?.name).toBe('Calm');
  });

  it('is never offered again', () => {
    expect(loggableMoods(afterCalmRetires).map((mood) => mood.slug)).not.toContain('calm');
    expect(loggableMoods(afterCalmRetires)).toHaveLength(9);
    expect(moodsIn(afterCalmRetires)).toHaveLength(10);
  });
});
