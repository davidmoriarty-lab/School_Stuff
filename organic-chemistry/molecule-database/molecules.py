"""Lookup helper for the molecule database.

    import molecules as mdb
    mdb.get('M123')                      # one record (dict)
    mdb.find('2-methylbutane')           # by modern, classic, or common name
    mdb.by_class('alcohol', max_carbons=5)
    mdb.image('M123')                    # absolute path to the PNG
"""
import csv, os
DIR = os.path.dirname(os.path.abspath(__file__))
_rows = None


def load():
    global _rows
    if _rows is None:
        with open(os.path.join(DIR, 'molecules.csv'), newline='') as f:
            _rows = list(csv.DictReader(f))
        for r in _rows:
            r['carbons'] = int(r['carbons']); r['stereocenters'] = int(r['stereocenters'])
    return _rows


def get(mid):
    return next(r for r in load() if r['id'] == mid)


def find(name):
    n = name.lower()
    return [r for r in load() if n in (r['name'].lower(), r['name_classic'].lower(), r['common_name'].lower())]


def by_class(cls, subclass=None, min_carbons=0, max_carbons=99):
    return [r for r in load() if r['class'] == cls and (subclass is None or r['subclass'] == subclass)
            and min_carbons <= r['carbons'] <= max_carbons]


def image(mid):
    return os.path.join(DIR, get(mid)['image'])
