import asyncio, sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
# つかいかた：python3 run.py [START_MS]（HTMLS=old,new … この フォルダの old.html・new.html。MODE=はやい モード、SECS=60、NOAS=1 で audiostart なし）
MODE = os.environ.get('MODE', 'はやい モード')
from playwright.async_api import async_playwright
async def one(p, html, eager, read_after, start_ms, secs):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1024, 'height': 768})
    await ctx.add_init_script(f"window.__NO_AUDIOSTART={os.environ.get('NOAS','0')};window.__EVENTS={os.environ.get('EVENTS','1')};window.__NOISE={os.environ.get('NOISE','0')};window.__PARTIAL_MIN={os.environ.get('PARTIAL_MIN','3')};window.__START_MS={start_ms};window.__EAGER={1 if eager else 0};window.__READ_AFTER={read_after};")
    await ctx.add_init_script(path=f'{HERE}/mock.js')
    pg = await ctx.new_page()
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    await pg.goto(f'file://{HERE}/{html}.html'); await pg.wait_for_timeout(1000)
    await pg.get_by_text(MODE).first.click(); await pg.wait_for_timeout(600)
    await pg.get_by_text('スタート').first.click(); await pg.wait_for_timeout(300)
    await pg.add_script_tag(path=f'{HERE}/child.js')
    await pg.wait_for_timeout(secs * 1000)
    st = await pg.evaluate('window.__stats')
    await pg.screenshot(path=f'{HERE}/{html}_{int(eager)}.png')
    await b.close()
    a = st['after']; o = st['other']
    f = lambda xs: f"{sum(1 for x in xs if x == 1)}/{len(xs)} ({100*sum(1 for x in xs if x == 1)/max(1,len(xs)):.0f}%) へいきん {sum(xs)/max(1,len(xs)):.2f}かい"
    return f"{html:4} {'あてて ' + str(read_after) + 'ms で よむ' if eager else 'わくが ひかったら よむ'}  あてた すぐ あとの カード：1かいめ {f(a)}   ほか：{f(o)}  きこえなかった {st['unheard']}"
async def main():
    async with async_playwright() as p:
        jobs = [(h, e, ra) for h in os.environ.get('HTMLS','old,new').split(',') for (e, ra) in [(1, 400), (0, 0)]]
        res = await asyncio.gather(*[one(p, h, e, ra, int(sys.argv[1]) if len(sys.argv) > 1 else 300, int(os.environ.get('SECS', 60))) for h, e, ra in jobs])
        print('\n'.join(res))
asyncio.run(main())
