// こども：ねらう カードを よむ。
//  - あてた すぐ あと（まえの カードが きえて 3びょう いない）に つぎの カードが ねらいに なったら：
//      EAGER=1 … READ_AFTER ミリびょうで よむ（わくに かまわず）／ EAGER=0 … わくが ひかって 0.15びょうで よむ
//  - それいがいは カードが APPEAR ミリびょう みえてから よむ（ねらいを さだめる）
//  - とおらなければ 1.5びょうで よみなおす
(() => {
  const R2H = { A: 'あ', I: 'い', U: 'う', E: 'え', O: 'お', KA: 'か', KI: 'き', KU: 'く', KE: 'け', KO: 'こ', SA: 'さ', SHI: 'し', SU: 'す', SE: 'せ', SO: 'そ', TA: 'た', CHI: 'ち', TSU: 'つ', TE: 'て', TO: 'と', NA: 'な', NI: 'に', NU: 'ぬ', NE: 'ね', NO: 'の', HA: 'は', HI: 'ひ', FU: 'ふ', HE: 'へ', HO: 'ほ', MA: 'ま', MI: 'み', MU: 'む', ME: 'め', MO: 'も', YA: 'や', YU: 'ゆ', YO: 'よ', RA: 'ら', RI: 'り', RU: 'る', RE: 'れ', RO: 'ろ', WA: 'わ', WO: 'を', N: 'ん' }
  const EAGER = window.__EAGER, READ_AFTER = window.__READ_AFTER || 500, APPEAR = window.__APPEAR || 3500
  const st = (window.__stats = { after: [], other: [], unheard: 0 })
  const seen = new WeakMap()
  let cur = null, curBox = null, since = 0, reads = 0, lastRead = 0, litSince = 0, afterHit = false, lastGone = -1e9
  setInterval(() => {
    const now = performance.now()
    document.querySelectorAll('.will-change-transform').forEach((el) => { if (!seen.has(el)) seen.set(el, now) })
    const tEl = document.querySelector('.scale-110')
    const box = tEl && tEl.closest('.will-change-transform')
    const txt = tEl && tEl.querySelector('.font-roma') && tEl.querySelector('.font-roma').textContent.trim().toUpperCase()
    const lit = !!(tEl && tEl.querySelector('.border-dashed'))
    // まえの ねらいが きえた（あてた）
    if (curBox && !curBox.isConnected) {
      if (reads) (afterHit ? st.after : st.other).push(reads)
      curBox = null; cur = null; lastGone = now
    }
    if (box !== curBox) {
      if (box) { curBox = box; since = now; reads = 0; lastRead = 0; litSince = 0; afterHit = now - lastGone < 3000 }
    }
    if (!curBox || box !== curBox) return
    if (lit && !litSince) litSince = now
    if (!lit) litSince = 0
    let due
    if (reads > 0) due = now - lastRead >= 1500
    else if (afterHit) due = EAGER ? now - since >= READ_AFTER : litSince && now - litSince >= 150
    else due = now - seen.get(box) >= APPEAR && (EAGER || (litSince && now - litSince >= 150))
    if (due && R2H[txt]) {
      reads++; lastRead = now
      if (!window.__say(R2H[txt])) st.unheard++
    }
  }, 20)
})()
