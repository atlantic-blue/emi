import { ICON_SIZE, type IconName, icon, iconNames, icons } from '../src/icons';
import { stroke } from '../src/space';

describe('the icon set in the tokens', () => {
  it('names every drawing it carries, and carries every drawing it names', () => {
    expect(Object.keys(icons).sort()).toEqual([...iconNames].sort());
  });

  it('holds a drawing for each name, on the 24 grid, at the icon stroke', () => {
    for (const name of iconNames) {
      const found = icons[name];

      expect(found.name).toBe(name);
      expect(found.size).toBe(ICON_SIZE);
      expect(found.strokeWidth).toBe(stroke.icon);
      expect(found.body.length).toBeGreaterThan(0);
    }
  });

  it('lays the grid out at 24 points on both axes', () => {
    expect(ICON_SIZE).toBe(24);
  });

  it('gives back the drawing a name asks for', () => {
    expect(icon('lock')).toBe(icons.lock);
  });

  it('fails on a name nothing was drawn for', () => {
    expect(() => icon('period-pants')).toThrow('no icon named period-pants');
  });

  it('keeps the names in one order, so the contact sheet and the module agree', () => {
    expect([...iconNames]).toEqual([...iconNames].sort());
  });

  it('types a name, so a screen that asks for a drawing nobody has does not build', () => {
    const named: IconName = 'calendar';

    expect(iconNames).toContain(named);
  });
});
