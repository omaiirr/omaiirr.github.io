import esprima, pathlib, sys
code = pathlib.Path('assets/js/timer.js').read_text(encoding='utf-8')
try:
    esprima.parseScript(code)
    print('ESPRIMA OK')
except Exception as e:
    print('ESPRIMA ERROR:', e)
    sys.exit(1)
