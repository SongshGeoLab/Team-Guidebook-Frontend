import { describe, expect, it } from 'vitest';
import {
  isTranslation,
  pickLocalized,
  pickLocalizedList,
  resolveLocalized,
  splitTranslationId,
  translationIndex,
} from '../src/utils/localized';

describe('splitTranslationId', () => {
  it('recognises a translation suffix', () => {
    expect(splitTranslationId('song-shuang.en')).toEqual({
      baseId: 'song-shuang',
      lang: 'en',
    });
  });

  it('leaves a base id alone', () => {
    expect(splitTranslationId('song-shuang')).toEqual({ baseId: 'song-shuang' });
  });

  it('handles nested paths, which library ids are', () => {
    expect(splitTranslationId('词条/Git.en')).toEqual({ baseId: '词条/Git', lang: 'en' });
  });

  it('does not mistake a dot in a name for a locale suffix', () => {
    expect(splitTranslationId('v1.2-notes')).toEqual({ baseId: 'v1.2-notes' });
    expect(isTranslation('v1.2-notes')).toBe(false);
  });
});

describe('pickLocalized', () => {
  const person = { name: '宋爽', name_en: 'Shuang Song', role: '研究组长' };

  it('returns the translation for en', () => {
    expect(pickLocalized(person, 'name', 'en')).toBe('Shuang Song');
  });

  it('returns the base value for zh even when a translation exists', () => {
    expect(pickLocalized(person, 'name', 'zh')).toBe('宋爽');
  });

  it('falls back to the base language when the translation is absent', () => {
    // A field with no English is the normal state of a vault mid-translation.
    // The reader gets Chinese, never an empty heading.
    expect(pickLocalized(person, 'role', 'en')).toBe('研究组长');
  });

  it('treats a whitespace-only translation as absent', () => {
    expect(pickLocalized({ name: '宋爽', name_en: '   ' }, 'name', 'en')).toBe('宋爽');
  });

  it('returns undefined when neither exists, rather than an empty string', () => {
    expect(pickLocalized(person, 'nickname', 'en')).toBeUndefined();
  });

  it('ignores a non-string translation instead of rendering [object Object]', () => {
    expect(pickLocalized({ name: '宋爽', name_en: { x: 1 } }, 'name', 'en')).toBe('宋爽');
  });
});

describe('pickLocalizedList', () => {
  const data = { interests: ['人水系统', '主体建模'], interests_en: ['Human-water systems'] };

  it('returns the translated list for en', () => {
    expect(pickLocalizedList(data, 'interests', 'en')).toEqual(['Human-water systems']);
  });

  it('falls back when the translated list is missing or empty', () => {
    expect(pickLocalizedList({ interests: ['人水系统'] }, 'interests', 'en')).toEqual(['人水系统']);
    expect(pickLocalizedList({ interests: ['人水系统'], interests_en: [] }, 'interests', 'en')).toEqual([
      '人水系统',
    ]);
  });

  it('returns an empty array rather than undefined for a missing field', () => {
    expect(pickLocalizedList({}, 'interests', 'zh')).toEqual([]);
  });
});

describe('translationIndex', () => {
  const overlays = [
    { id: '通讯录/ada.en' },
    { id: '通讯录/ada.zh' },
    { id: '图书馆/项目/proj.en' },
    { id: '图书馆/词条/Git.en' },
  ];

  it('strips the collection prefix so overlays key by base id', () => {
    const index = translationIndex(overlays, '通讯录', 'en');
    expect([...index.keys()]).toEqual(['ada']);
    expect(index.get('ada')?.id).toBe('通讯录/ada.en');
  });

  it('ignores overlays belonging to other collections', () => {
    // 图书馆/项目/ sits *under* 图书馆/, so a naive prefix test would let a
    // project overlay through as a library one.
    const index = translationIndex(overlays, '图书馆/项目', 'en');
    expect([...index.keys()]).toEqual(['proj']);
  });

  it('keeps nested paths, which library ids are', () => {
    const index = translationIndex(overlays, '图书馆', 'en');
    expect(index.has('词条/Git')).toBe(true);
  });

  it('selects only the requested locale', () => {
    expect(translationIndex(overlays, '通讯录', 'zh').get('ada')?.id).toBe('通讯录/ada.zh');
  });

  it('tolerates a prefix given with a trailing slash', () => {
    expect(translationIndex(overlays, '通讯录/', 'en').has('ada')).toBe(true);
  });
});

describe('resolveLocalized', () => {
  const entries = [{ id: 'ada' }, { id: 'bob' }];
  const overlays = [{ id: '通讯录/ada.en' }];

  it('renders the translated body for en when one exists', () => {
    const index = translationIndex(overlays, '通讯录', 'en');
    const [ada] = resolveLocalized(entries, 'en', index);
    expect(ada.bodySource.id).toBe('通讯录/ada.en');
    expect(ada.hasTranslation).toBe(true);
  });

  it('falls back to the base body and says so', () => {
    const index = translationIndex(overlays, '通讯录', 'en');
    const bob = resolveLocalized(entries, 'en', index)[1];
    expect(bob.bodySource.id).toBe('bob');
    expect(bob.hasTranslation).toBe(false);
  });

  it('never uses an English body on the Chinese route', () => {
    const index = translationIndex(overlays, '通讯录', 'zh');
    const [ada] = resolveLocalized(entries, 'zh', index);
    expect(ada.bodySource.id).toBe('ada');
    expect(ada.hasTranslation).toBe(false);
  });

  it('works with no translations at all', () => {
    expect(resolveLocalized(entries, 'en').map((r) => r.hasTranslation)).toEqual([false, false]);
  });

  it('drops a translation that leaked into the base collection', () => {
    // Belt and braces behind the loader exclusion globs: a leak would collide
    // with the page it translates in getStaticPaths and fail the build.
    const leaked = [{ id: 'ada' }, { id: 'ada.en' }];
    expect(resolveLocalized(leaked, 'en').map((r) => r.entry.id)).toEqual(['ada']);
  });

  it('ignores an orphan overlay whose base was deleted', () => {
    const index = translationIndex([{ id: '通讯录/gone.en' }], '通讯录', 'en');
    expect(resolveLocalized(entries, 'en', index).map((r) => r.hasTranslation)).toEqual([
      false,
      false,
    ]);
  });
});
